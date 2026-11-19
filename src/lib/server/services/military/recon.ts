// src/lib/server/services/military/recon.ts
// Reconnaissance against the database: launching a sensor over a region,
// resolving finished missions into intel reports, reading a side's reports
// and pictures, and the intel modifiers a battle round uses.
//
// A "side" is a state plus every state in its bloc: reports are filed for the
// launcher's state and readable by the whole side. What a pass sees is decided
// in intel.ts; every tunable lives in config/game/recon.config.ts.
//
// No SvelteKit virtual modules at the top level (tests import this file);
// push notifications are loaded lazily.
import { and, desc, eq, gt, gte, inArray, lte, notInArray, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	battleParticipants,
	battles,
	intelReports,
	militaryUnits,
	reconMissions,
	regionBorders,
	regions,
	residences,
	stateBuildings,
	states,
	transactionHistory,
	userWallets,
	wars,
	type IntelFindings,
	type IntelReport,
	type ReconMission
} from "../../schema";
import { debitWallet, InsufficientFundsError } from "../../money";
import {
	INTEL_VALID_HOURS,
	SENSORS,
	SENSOR_IDS,
	airDefenceStrength,
	hash32,
	regionConditions,
	seededRandom,
	type SensorId,
	type ViewConditions
} from "#lib/config/index.js";
import { fuseIntel, scanRegion, sideModifiers, type IntelPicture, type SideModifiers } from "./intel";
import { c2Degradation, deceptionFor, reconDelayFactor } from "./state-effects";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const MINUTE = 60_000;
const HOUR = 3600_000;
/** Artillery that acted within this window still shows a thermal signature. */
const FIRING_SIGNATURE_MS = 6 * HOUR;

/** A recon action the player should see the reason for. */
export class ReconError extends Error {}

export interface Side {
	stateId: number;
	blocId: number | null;
	/** The state and its bloc partners: everyone who shares intel. */
	stateIds: number[];
}

/** The state and its bloc partners. */
export async function sideOf(db: Db, stateId: number): Promise<Side> {
	const [state] = await db.select({ blocId: states.blocId }).from(states).where(eq(states.id, stateId));
	const blocId = state?.blocId ?? null;
	if (!blocId) return { stateId, blocId: null, stateIds: [stateId] };
	const members = await db.select({ id: states.id }).from(states).where(eq(states.blocId, blocId));
	return { stateId, blocId, stateIds: [...new Set([stateId, ...members.map((m) => m.id)])] };
}

/** The side a player belongs to: the state of the region they are in. */
export async function viewerSide(db: Db, userId: string): Promise<Side | null> {
	const [row] = await db
		.select({ stateId: regions.stateId })
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(residences.userId, userId))
		.limit(1);
	return row?.stateId ? sideOf(db, row.stateId) : null;
}

/** State ids at war with `side` (either way round, bloc wars included). */
export async function enemiesOf(db: Db, side: Side): Promise<Set<number>> {
	const active = await db.select().from(wars).where(eq(wars.status, "active"));
	if (!active.length) return new Set();
	const allStates = await db.select({ id: states.id, blocId: states.blocId }).from(states);
	const onSide = (stateId: number, blocId: number | null, s: { id: number; blocId: number | null }) =>
		s.id === stateId || (blocId !== null && s.blocId === blocId);
	const mine = (s: { id: number; blocId: number | null }) => side.stateIds.includes(s.id);
	const enemies = new Set<number>();
	for (const w of active) {
		const attackers = allStates.filter((s) => onSide(w.attackerId, w.attackerBlocId, s));
		const defenders = allStates.filter((s) => onSide(w.defenderId, w.defenderBlocId, s));
		if (attackers.some(mine)) defenders.forEach((s) => !mine(s) && enemies.add(s.id));
		if (defenders.some(mine)) attackers.forEach((s) => !mine(s) && enemies.add(s.id));
	}
	return enemies;
}

/** Why `side` can't send recon over the region, or null if it can. */
export async function reconTargetReason(
	db: Db,
	side: Side,
	region: { id: number; stateId: number | null }
): Promise<string | null> {
	// Your side's own region is a target only while an enemy is attacking it.
	const [battle] = await db
		.select({ attackerStateId: battles.attackerStateId, defenderStateId: battles.defenderStateId })
		.from(battles)
		.where(and(eq(battles.regionId, region.id), eq(battles.status, "ongoing")))
		.limit(1);
	const inBattle =
		!!battle && (side.stateIds.includes(battle.attackerStateId) || side.stateIds.includes(battle.defenderStateId));
	if (inBattle) return null;
	if (!region.stateId) return "Recon only flies over territory held by a state.";
	if (side.stateIds.includes(region.stateId)) return "This region is held by your side.";
	if (!(await enemiesOf(db, side)).has(region.stateId)) return "Your state isn't at war with this region's state.";
	return null;
}

/** Whether `side` holds a region bordering `regionId` (ground radar range). */
async function sideBorders(db: Db, side: Side, regionId: number) {
	const [row] = await db
		.select({ id: regionBorders.id })
		.from(regionBorders)
		.innerJoin(
			regions,
			or(
				and(eq(regionBorders.regionId, regionId), eq(regions.id, regionBorders.neighborId)),
				and(eq(regionBorders.neighborId, regionId), eq(regions.id, regionBorders.regionId))
			)
		)
		.where(inArray(regions.stateId, side.stateIds))
		.limit(1);
	return !!row;
}

/** When `sensor` is next available to this player (null = now). */
export async function sensorCooldownEndsAt(
	db: Db,
	userId: string,
	side: Side,
	sensor: SensorId,
	now = new Date()
): Promise<Date | null> {
	const s = SENSORS[sensor];
	const since = new Date(now.getTime() - s.cooldownMinutes * MINUTE);
	const [last] = await db
		.select({ launchedAt: reconMissions.launchedAt })
		.from(reconMissions)
		.where(
			and(
				eq(reconMissions.sensor, sensor),
				s.cooldownScope === "state" ? eq(reconMissions.stateId, side.stateId) : eq(reconMissions.launchedBy, userId),
				gte(reconMissions.launchedAt, since)
			)
		)
		.orderBy(desc(reconMissions.launchedAt))
		.limit(1);
	return last ? new Date(last.launchedAt.getTime() + s.cooldownMinutes * MINUTE) : null;
}

export interface SensorOption {
	id: SensorId;
	label: string;
	short: string;
	kind: string;
	platform: string;
	cost: number;
	durationMinutes: number;
	cooldownMinutes: number;
	cooldownScope: "user" | "state";
	cooldownEndsAt: string | null;
	blockedReason: string | null;
}

/** Everything the UI needs to offer recon over a region. */
export async function reconOptions(db: Db, userId: string, regionId: number, now = new Date()) {
	const side = await viewerSide(db, userId);
	if (!side)
		return { side: null, targetReason: "You need to live in a state to run recon.", sensors: [], inFlight: [] };
	const [region] = await db
		.select({ id: regions.id, stateId: regions.stateId })
		.from(regions)
		.where(eq(regions.id, regionId));
	if (!region) return { side, targetReason: "Region not found.", sensors: [], inFlight: [] };
	const targetReason = await reconTargetReason(db, side, region);
	const borders = await sideBorders(db, side, regionId);
	const sensors: SensorOption[] = await Promise.all(
		SENSOR_IDS.map(async (id) => {
			const s = SENSORS[id];
			const cd = await sensorCooldownEndsAt(db, userId, side, id, now);
			return {
				id,
				label: s.label,
				short: s.short,
				kind: s.kind,
				platform: s.platform,
				cost: s.cost,
				durationMinutes: s.durationMinutes,
				cooldownMinutes: s.cooldownMinutes,
				cooldownScope: s.cooldownScope,
				cooldownEndsAt: cd?.toISOString() ?? null,
				blockedReason: s.requiresBorder && !borders ? "Needs a region of yours next door." : null
			};
		})
	);
	const inFlight = await db
		.select({
			id: reconMissions.id,
			sensor: reconMissions.sensor,
			completesAt: reconMissions.completesAt,
			launchedBy: reconMissions.launchedBy
		})
		.from(reconMissions)
		.where(
			and(
				eq(reconMissions.targetRegionId, regionId),
				eq(reconMissions.status, "in_progress"),
				inArray(reconMissions.stateId, side.stateIds)
			)
		);
	return {
		side,
		targetReason,
		sensors,
		inFlight: inFlight.map((m) => ({ ...m, completesAt: m.completesAt.toISOString() }))
	};
}

/**
 * Launch a recon mission: checks target, range and cooldown, charges the
 * player and queues the pass, all in one transaction. The wallet row (and,
 * for satellites, the state row) is locked first, so two concurrent launches
 * can't both slip past the cooldown or overdraw the wallet.
 */
export async function launchRecon(
	db: Database,
	input: { userId: string; regionId: number; sensor: SensorId; now?: Date }
): Promise<ReconMission> {
	const now = input.now ?? new Date();
	const s = SENSORS[input.sensor];
	if (!s) throw new ReconError("Unknown sensor.");

	return db.transaction(async (tx) => {
		const [wallet] = await tx
			.select({ userId: userWallets.userId })
			.from(userWallets)
			.where(eq(userWallets.userId, input.userId))
			.for("update");
		if (!wallet) throw new ReconError("You have no wallet yet.");

		const side = await viewerSide(tx, input.userId);
		if (!side) throw new ReconError("You need to live in a state to run recon.");
		if (s.cooldownScope === "state") {
			await tx.select({ id: states.id }).from(states).where(eq(states.id, side.stateId)).for("update");
		}

		const [region] = await tx
			.select({ id: regions.id, stateId: regions.stateId })
			.from(regions)
			.where(eq(regions.id, input.regionId));
		if (!region) throw new ReconError("Region not found.");
		const reason = await reconTargetReason(tx, side, region);
		if (reason) throw new ReconError(reason);
		if (s.requiresBorder && !(await sideBorders(tx, side, region.id))) {
			throw new ReconError("Ground radar needs a region of yours next door.");
		}

		const cooldown = await sensorCooldownEndsAt(tx, input.userId, side, input.sensor, now);
		if (cooldown && cooldown > now) {
			const mins = Math.ceil((cooldown.getTime() - now.getTime()) / MINUTE);
			throw new ReconError(
				s.cooldownScope === "state"
					? `${s.label} is overhead again in ${mins} min.`
					: `Your ${s.label.toLowerCase()} is ready again in ${mins} min.`
			);
		}

		let balanceAfter: number;
		try {
			balanceAfter = await debitWallet(tx, input.userId, s.cost);
		} catch (err) {
			if (err instanceof InsufficientFundsError) throw new ReconError(`Recon costs $${s.cost.toLocaleString()}.`);
			throw err;
		}

		const [mission] = await tx
			.insert(reconMissions)
			.values({
				launchedBy: input.userId,
				stateId: side.stateId,
				targetRegionId: region.id,
				targetStateId: region.stateId,
				sensor: input.sensor,
				cost: s.cost,
				launchedAt: now,
				// Sensor links jammed by a C2 disruption: the pass takes longer.
				completesAt: new Date(
					now.getTime() + s.durationMinutes * MINUTE * (await reconDelayFactor(tx, side.stateId, now))
				)
			})
			.returning();
		await tx.insert(transactionHistory).values({
			userId: input.userId,
			transactionType: "recon_mission",
			amount: -s.cost,
			balanceAfter,
			description: `Recon: ${s.label}`,
			relatedEntityType: "region",
			relatedEntityId: region.id
		});
		return mission!;
	});
}

/** Look at a region through one mission's sensor. */
async function observe(
	tx: Tx,
	mission: ReconMission,
	opts: { rng: () => number; conditions?: (region: typeof regions.$inferSelect) => ViewConditions }
): Promise<IntelFindings> {
	const [region] = await tx.select().from(regions).where(eq(regions.id, mission.targetRegionId));
	const side = await sideOf(tx, mission.stateId);
	const hostile = (stateId: number) => !side.stateIds.includes(stateId);

	const [owner] = region?.stateId
		? await tx.select({ id: states.id, name: states.name }).from(states).where(eq(states.id, region.stateId))
		: [];

	const stationed = (
		await tx
			.select({
				id: militaryUnits.id,
				unitType: militaryUnits.unitType,
				stateId: militaryUnits.stateId,
				isTraining: militaryUnits.isTraining
			})
			.from(militaryUnits)
			.where(and(eq(militaryUnits.regionId, mission.targetRegionId), sql`${militaryUnits.health} > 0`))
	).filter((u) => hostile(u.stateId));

	const units = new Map(stationed.map((u) => [u.id, u]));
	let recentlyFired = 0;
	let battleSnapshot: IntelFindings["battle"] = null;

	const battle = await tx.query.battles.findFirst({
		where: and(eq(battles.regionId, mission.targetRegionId), eq(battles.status, "ongoing")),
		with: { participants: { with: { unit: true } }, attackerState: true, defenderState: true }
	});
	if (battle) {
		const standing = battle.participants.filter((p) => p.currentStrength > 0);
		const side_ = (s: string) => standing.filter((p) => p.side === s);
		battleSnapshot = {
			id: battle.id,
			phase: battle.phase,
			attackerStateId: battle.attackerStateId,
			attackerStateName: battle.attackerState?.name ?? null,
			defenderStateId: battle.defenderStateId,
			defenderStateName: battle.defenderState?.name ?? null,
			attacker: {
				units: side_("attacker").length,
				strength: side_("attacker").reduce((s, p) => s + p.currentStrength, 0)
			},
			defender: {
				units: side_("defender").length,
				strength: side_("defender").reduce((s, p) => s + p.currentStrength, 0)
			}
		};
		const cutoff = mission.completesAt.getTime() - FIRING_SIGNATURE_MS;
		for (const p of standing) {
			if (!hostile(p.unit.stateId)) continue;
			units.set(p.unit.id, {
				id: p.unit.id,
				unitType: p.unit.unitType,
				stateId: p.unit.stateId,
				isTraining: p.unit.isTraining
			});
			if (p.unit.unitType === "artillery" && (p.isEngaged || (p.lastActionAt && p.lastActionAt.getTime() >= cutoff))) {
				recentlyFired++;
			}
		}
	}

	const airDefenceUnits = [...units.values()].filter((u) => u.unitType === "air_defence" && !u.isTraining).length;
	// Covert ops: jammed sensors see less; planted intel may fool the pass.
	const [jammed, planted] = await Promise.all([
		c2Degradation(tx, mission.stateId, mission.completesAt),
		deceptionFor(tx, side.stateIds, mission.targetRegionId, mission.completesAt)
	]);

	const [{ value: underConstruction }] = await tx
		.select({ value: sql<number>`count(*)::int` })
		.from(stateBuildings)
		.where(and(eq(stateBuildings.regionId, mission.targetRegionId), eq(stateBuildings.isUnderConstruction, true)));

	// Ground radar no longer flies: any legacy in-progress pass is rendered
	// and scored as the satellite's SAR sensor.
	const sensor: SensorId = mission.sensor === "ground_radar" ? "sat_sar" : (mission.sensor as SensorId);
	return scanRegion({
		sensor,
		conditions: region
			? (opts.conditions?.(region) ?? regionConditions(region, mission.completesAt))
			: { weather: "clear", night: false, cover: "open" },
		hostileUnitTypes: [...units.values()].map((u) => u.unitType),
		recentlyFired,
		airDefenceUnits,
		radarLevels: region?.radar ?? 0,
		owner: { id: owner?.id ?? null, name: owner?.name ?? null },
		buildings: region
			? {
					infrastructure: region.infrastructure ?? 0,
					economy: region.economy ?? 0,
					education: region.education ?? 0,
					hospitals: region.hospitals ?? 0,
					fortifications: region.fortifications ?? 0,
					radar: region.radar ?? 0,
					underConstruction
				}
			: null,
		battle: battleSnapshot,
		rng: opts.rng,
		degradation: jammed / 100,
		// Its own draw, so planted intel doesn't shift the pass's other rolls.
		deception: planted ? { magnitude: planted, roll: seededRandom(hash32(mission.id, 0xdec0))() } : null
	});
}

export interface ResolveOptions {
	now?: Date;
	/** Random source per mission (default: seeded by mission id, so passes are reproducible). */
	rng?: (missionId: number) => () => number;
	/** Override weather/cover (tests). */
	conditions?: (region: typeof regions.$inferSelect) => ViewConditions;
	/** Send the launcher a push notification (default true). */
	notify?: boolean;
	limit?: number;
}

/**
 * File reports for every mission whose pass is done. Each mission is claimed
 * with a conditional UPDATE inside its own transaction, so concurrent callers
 * (page loads, the cron) never file the same report twice. Returns the reports.
 */
export async function resolveReconMissions(db: Database, opts: ResolveOptions = {}): Promise<IntelReport[]> {
	const now = opts.now ?? new Date();
	const due = await db
		.select({ id: reconMissions.id })
		.from(reconMissions)
		.where(and(eq(reconMissions.status, "in_progress"), lte(reconMissions.completesAt, now)))
		.orderBy(reconMissions.completesAt)
		.limit(opts.limit ?? 100);

	const filed: IntelReport[] = [];
	for (const { id } of due) {
		const report = await db.transaction(async (tx) => {
			const [mission] = await tx
				.update(reconMissions)
				.set({ status: "completed", completedAt: now })
				.where(and(eq(reconMissions.id, id), eq(reconMissions.status, "in_progress")))
				.returning();
			if (!mission) return null;
			const rng = opts.rng?.(mission.id) ?? seededRandom(hash32(mission.id, 0x4ec0));
			const findings = await observe(tx, mission, { rng, conditions: opts.conditions });
			const [row] = await tx
				.insert(intelReports)
				.values({
					missionId: mission.id,
					stateId: mission.stateId,
					regionId: mission.targetRegionId,
					targetStateId: findings.ownerStateId,
					filedBy: mission.launchedBy,
					sensor: mission.sensor,
					findings,
					observedAt: mission.completesAt,
					expiresAt: new Date(mission.completesAt.getTime() + INTEL_VALID_HOURS * HOUR)
				})
				.returning();
			return row!;
		});
		if (report) filed.push(report);
	}

	if (opts.notify !== false && filed.length) {
		void (async () => {
			const { sendNotificationIfEnabled } = await import("../push-notification.service");
			await Promise.allSettled(
				filed
					.filter((r) => r.filedBy)
					.map((r) =>
						sendNotificationIfEnabled(r.filedBy!, "notifyBattleResults", {
							title: "Intel report filed",
							body:
								r.findings.outcome === "intercepted"
									? "Your drone was shot down."
									: `${SENSORS[r.sensor as SensorId]?.label ?? "Recon"} pass complete.`,
							icon: "/favicon.png",
							badge: "/badge.png",
							data: { url: `/intel#report-${r.id}`, tag: `intel-${r.id}` }
						})
					)
			);
		})().catch((err) => console.error("Recon notification error:", err));
	}
	return filed;
}

// ── Reading ─────────────────────────────────────────────────────────────────

/** Reports a side may read, newest first. */
export async function sideReports(
	db: Db,
	stateIds: number[],
	opts: { regionIds?: number[]; freshOnly?: boolean; now?: Date; limit?: number } = {}
): Promise<IntelReport[]> {
	if (!stateIds.length) return [];
	const now = opts.now ?? new Date();
	const conds = [inArray(intelReports.stateId, stateIds)];
	if (opts.regionIds) {
		if (!opts.regionIds.length) return [];
		conds.push(inArray(intelReports.regionId, opts.regionIds));
	}
	if (opts.freshOnly) conds.push(gt(intelReports.expiresAt, now));
	const q = db
		.select()
		.from(intelReports)
		.where(and(...conds))
		.orderBy(desc(intelReports.observedAt), desc(intelReports.id));
	return opts.limit ? q.limit(opts.limit) : q;
}

/** One report, only if the side may read it. */
export async function reportForSide(db: Db, stateIds: number[], reportId: number) {
	if (!stateIds.length) return null;
	const [row] = await db
		.select()
		.from(intelReports)
		.where(and(eq(intelReports.id, reportId), inArray(intelReports.stateId, stateIds)));
	return row ?? null;
}

/** A side's fused picture of each region it has fresh intel on. */
export async function picturesByRegion(
	db: Db,
	stateIds: number[],
	opts: { regionIds?: number[]; now?: Date } = {}
): Promise<Map<number, IntelPicture>> {
	const now = opts.now ?? new Date();
	const reports = await sideReports(db, stateIds, { regionIds: opts.regionIds, freshOnly: true, now });
	const byRegion = new Map<number, IntelReport[]>();
	for (const r of reports) byRegion.set(r.regionId, [...(byRegion.get(r.regionId) ?? []), r]);
	return new Map([...byRegion].map(([regionId, rs]) => [regionId, fuseIntel(rs, now)]));
}

// ── Battles ─────────────────────────────────────────────────────────────────

export interface BattleIntel {
	attacker: SideModifiers;
	defender: SideModifiers;
	attackerPicture: IntelPicture | null;
	defenderPicture: IntelPicture | null;
}

/**
 * Intel modifiers for both sides of a battle: each side's fresh picture of the
 * battle region (where the enemy is fighting), counter-battery from thermal
 * fixes, and the enemy's air defence (engaged AA units, plus the defender's AA
 * stationed in the region) against air strikes.
 */
export async function battleIntel(
	db: Db,
	battle: { id: number; regionId: number; attackerStateId: number; defenderStateId: number },
	engaged: { attackers: { unit: { unitType: string } }[]; defenders: { unit: { unitType: string } }[] },
	now = new Date()
): Promise<BattleIntel> {
	const [attackerSide, defenderSide] = await Promise.all([
		sideOf(db, battle.attackerStateId),
		sideOf(db, battle.defenderStateId)
	]);
	const [attackerPics, defenderPics, regionRows] = await Promise.all([
		picturesByRegion(db, attackerSide.stateIds, { regionIds: [battle.regionId], now }),
		picturesByRegion(db, defenderSide.stateIds, { regionIds: [battle.regionId], now }),
		db.select({ radar: regions.radar }).from(regions).where(eq(regions.id, battle.regionId))
	]);
	const regionRadar = regionRows[0]?.radar ?? 0;

	const participantIds = await db
		.select({ unitId: battleParticipants.unitId })
		.from(battleParticipants)
		.where(eq(battleParticipants.battleId, battle.id));
	const stationedAA = await db
		.select({ id: militaryUnits.id })
		.from(militaryUnits)
		.where(
			and(
				eq(militaryUnits.regionId, battle.regionId),
				eq(militaryUnits.unitType, "air_defence"),
				eq(militaryUnits.isTraining, false),
				sql`${militaryUnits.health} > 0`,
				inArray(militaryUnits.stateId, defenderSide.stateIds),
				participantIds.length
					? notInArray(
							militaryUnits.id,
							participantIds.map((p) => p.unitId)
						)
					: undefined
			)
		);

	const count = (list: { unit: { unitType: string } }[], type: string) =>
		list.filter((p) => p.unit.unitType === type).length;
	const attackerPicture = attackerPics.get(battle.regionId) ?? null;
	const defenderPicture = defenderPics.get(battle.regionId) ?? null;

	return {
		attacker: sideModifiers({
			picture: attackerPicture,
			ownArtilleryEngaged: count(engaged.attackers, "artillery") > 0,
			enemyAirDefenceUnits: airDefenceStrength(
				count(engaged.defenders, "air_defence") + stationedAA.length,
				regionRadar
			)
		}),
		defender: sideModifiers({
			picture: defenderPicture,
			ownArtilleryEngaged: count(engaged.defenders, "artillery") > 0,
			enemyAirDefenceUnits: count(engaged.attackers, "air_defence")
		}),
		attackerPicture,
		defenderPicture
	};
}

// Re-exported for routes, so they import recon from one place.
export { fuseIntel, isFresh } from "./intel";
export type { IntelPicture, SideModifiers } from "./intel";
