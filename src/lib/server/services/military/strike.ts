// src/lib/server/services/military/strike.ts
// Airstrikes against the database: who may order one, what the commander
// knows before ordering it (the planner's inputs), launching and resolving a
// strike in one transaction, the lasting effects it leaves, the strike log,
// and the modifiers battles and factories read.
//
// The maths (odds, damage, civilian harm, IHL findings) is pure and lives in
// config/game/strike.config.ts; standing and consequences in ihl.config.ts.
//
// No SvelteKit virtual modules at the top level (tests import this file);
// notifications are loaded lazily.
import { and, desc, eq, gt, gte, inArray, lte, ne, notInArray, or, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
	battleParticipants,
	battles,
	governmentBudgetTransactions,
	ihlViolations,
	inboxMessages,
	militaryUnits,
	ministers,
	presidents,
	regionBorders,
	regionEffects,
	regions,
	states,
	stateTreasury,
	strikes,
	wars,
	type Strike,
	type StrikeDamage
} from "../../schema";
import { creditTreasury } from "../../money";
import {
	SORTIE_COOLDOWN_HOURS,
	INTERCEPTED_AIRCRAFT_DAMAGE,
	TARGETS,
	TIER_CONFIG,
	WEAPONS,
	WEAPON_IDS,
	STRIKE_TIERS,
	effectMagnitude,
	hash32,
	ihlEmbargoFactor,
	ihlMoraleFactor,
	levelsDestroyed,
	planStrike,
	regionAreaKm2,
	regionConditions,
	regionPopulation,
	reparationsOwed,
	rollStrike,
	seededRandom,
	stackedPenalty,
	unitDamage,
	violationPoints,
	type StrikeContext,
	type StrikeEffectKind,
	type StrikePlan,
	type StrikeRoll,
	type StrikeTarget,
	type StrikeTier,
	type StrikeWeapon,
	type ViewConditions
} from "#lib/config/index.js";
import { picturesByRegion, sideOf, type Side } from "./recon";
import { ihlScoreOf, ihlScores } from "./ihl";
import { reduceRegionPopulation } from "../population";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const HOUR = 3600_000;

/** A strike that can't be ordered for a reason the commander should see. */
export class StrikeError extends Error {}

// ── Authority ───────────────────────────────────────────────────────────────

export interface StrikeAuthority {
	stateId: number;
	stateName: string;
	role: "president" | "defense";
}

/**
 * Who may order strikes: the president of a state, or its defence minister
 * (the same people who command the state's war effort; war itself is declared
 * by the president or parliament).
 */
export async function strikeAuthority(db: Db, userId: string): Promise<StrikeAuthority | null> {
	const [president] = await db
		.select({ stateId: presidents.stateId, stateName: states.name })
		.from(presidents)
		.innerJoin(states, eq(presidents.stateId, states.id))
		.where(eq(presidents.userId, userId))
		.limit(1);
	if (president) return { ...president, role: "president" };
	const [minister] = await db
		.select({ stateId: ministers.stateId, stateName: states.name })
		.from(ministers)
		.innerJoin(states, eq(ministers.stateId, states.id))
		.where(and(eq(ministers.userId, userId), eq(ministers.ministry, "defense")))
		.limit(1);
	return minister ? { ...minister, role: "defense" } : null;
}

// ── War and range ───────────────────────────────────────────────────────────

/** The active war that puts `side` against `targetStateId` (bloc wars included), or null. */
export async function warAgainst(db: Db, side: Side, targetStateId: number): Promise<number | null> {
	const active = await db.select().from(wars).where(eq(wars.status, "active"));
	if (!active.length) return null;
	const [target] = await db.select({ blocId: states.blocId }).from(states).where(eq(states.id, targetStateId));
	const targetBloc = target?.blocId ?? null;
	const onSide = (stateId: number, blocId: number | null, s: { id: number; blocId: number | null }) =>
		s.id === stateId || (blocId !== null && s.blocId === blocId);
	const me = { id: side.stateId, blocId: side.blocId };
	const them = { id: targetStateId, blocId: targetBloc };
	for (const w of active) {
		if (onSide(w.attackerId, w.attackerBlocId, me) && onSide(w.defenderId, w.defenderBlocId, them)) return w.id;
		if (onSide(w.defenderId, w.defenderBlocId, me) && onSide(w.attackerId, w.attackerBlocId, them)) return w.id;
	}
	return null;
}

/** Border crossings from the nearest region `side` holds to `regionId` (null beyond `max`). */
export async function hopsFromSide(db: Db, side: Side, regionId: number, max = 3): Promise<number | null> {
	let frontier = [regionId];
	const seen = new Set(frontier);
	for (let d = 0; d <= max; d++) {
		const owned = await db
			.select({ id: regions.id })
			.from(regions)
			.where(and(inArray(regions.id, frontier), inArray(regions.stateId, side.stateIds)))
			.limit(1);
		if (owned.length) return d;
		if (d === max) break;
		const borders = await db
			.select({ a: regionBorders.regionId, b: regionBorders.neighborId })
			.from(regionBorders)
			.where(or(inArray(regionBorders.regionId, frontier), inArray(regionBorders.neighborId, frontier)));
		const next: number[] = [];
		for (const { a, b } of borders) {
			for (const id of [a, b]) {
				if (!seen.has(id)) {
					seen.add(id);
					next.push(id);
				}
			}
		}
		if (!next.length) break;
		frontier = next;
	}
	return null;
}

// ── What is in the region ───────────────────────────────────────────────────

interface HostileUnit {
	unitId: number;
	name: string;
	unitType: string;
	health: number;
	/** Set when the unit fights in the region's ongoing battle. */
	participantId: number | null;
	currentStrength: number;
	isEngaged: boolean;
	joinedAt: Date | null;
}

/** Units hostile to `side` in the region: stationed there or fighting in its battle. */
async function hostileUnits(db: Db, side: Side, regionId: number) {
	const [battle] = await db
		.select()
		.from(battles)
		.where(and(eq(battles.regionId, regionId), eq(battles.status, "ongoing")))
		.limit(1);
	const fighting = battle
		? await db
				.select({
					participantId: battleParticipants.id,
					currentStrength: battleParticipants.currentStrength,
					isEngaged: battleParticipants.isEngaged,
					joinedAt: battleParticipants.joinedAt,
					unitId: militaryUnits.id,
					name: militaryUnits.name,
					unitType: militaryUnits.unitType,
					health: militaryUnits.health,
					stateId: militaryUnits.stateId,
					isTraining: militaryUnits.isTraining
				})
				.from(battleParticipants)
				.innerJoin(militaryUnits, eq(battleParticipants.unitId, militaryUnits.id))
				.where(and(eq(battleParticipants.battleId, battle.id), gt(battleParticipants.currentStrength, 0)))
		: [];
	const fightingIds = fighting.map((p) => p.unitId);
	const stationed = await db
		.select({
			unitId: militaryUnits.id,
			name: militaryUnits.name,
			unitType: militaryUnits.unitType,
			health: militaryUnits.health,
			stateId: militaryUnits.stateId,
			isTraining: militaryUnits.isTraining
		})
		.from(militaryUnits)
		.where(
			and(
				eq(militaryUnits.regionId, regionId),
				gt(militaryUnits.health, 0),
				fightingIds.length ? notInArray(militaryUnits.id, fightingIds) : undefined
			)
		);
	const hostile = (stateId: number) => !side.stateIds.includes(stateId);
	const units: (HostileUnit & { isTraining: boolean })[] = [
		// In battle first: engaged units, then the earliest to join.
		...fighting
			.filter((p) => hostile(p.stateId))
			.sort(
				(a, b) =>
					Number(b.isEngaged) - Number(a.isEngaged) || new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
			),
		...stationed
			.filter((u) => hostile(u.stateId))
			.map((u) => ({ ...u, participantId: null, currentStrength: u.health, isEngaged: false, joinedAt: null }))
	];
	const ownTroopsEngaged = fighting.some((p) => !hostile(p.stateId));
	return { battle: battle ?? null, units, ownTroopsEngaged };
}

// ── Planning ────────────────────────────────────────────────────────────────

type RegionRow = typeof regions.$inferSelect;

/** What the attacker's side knows about a region, and the truth, as strike contexts. */
async function strikeContexts(
	db: Db,
	side: Side,
	region: RegionRow,
	now: Date,
	conditions?: (region: RegionRow) => ViewConditions
) {
	const [hostile, pictures] = await Promise.all([
		hostileUnits(db, side, region.id),
		picturesByRegion(db, side.stateIds, { regionIds: [region.id], now })
	]);
	const picture = pictures.get(region.id) ?? null;
	const population = regionPopulation(region);
	const shared = {
		conditions: conditions?.(region) ?? regionConditions(region, now),
		intelConfidence: picture?.confidence ?? 0,
		buildingsSeen: !!picture?.buildings,
		ownTroopsEngaged: hostile.ownTroopsEngaged,
		population,
		density: population / regionAreaKm2(region)
	};
	const activeAd = hostile.units.filter((u) => u.unitType === "air_defence" && !u.isTraining).length;
	// Air defence is only known from a visual pass that identified unit types.
	const knownAd = picture?.unitTypes ? (picture.unitTypes.find((t) => t.unitType === "air_defence")?.count ?? 0) : null;
	const known: StrikeContext = { ...shared, adUnits: knownAd ?? 0, enemyUnits: picture?.knownUnits ?? 0 };
	const truth: StrikeContext = { ...shared, adUnits: activeAd, enemyUnits: hostile.units.length };
	return { known, truth, knownAd, picture, hostile };
}

export interface WeaponOption {
	id: StrikeWeapon;
	cost: number;
	reason: string | null;
	aircraft: { id: number; name: string; unitType: string } | null;
}

export interface StrikeOptions {
	authority: StrikeAuthority | null;
	/** Why the viewer can't order a strike here at all (null = they can). */
	reason: string | null;
	warId: number | null;
	treasury: number;
	ihlScore: number;
	embargoFactor: number;
	context: StrikeContext | null;
	intel: { level: string; confidence: number; latestObservedAt: string | null; buildingsSeen: boolean } | null;
	adKnown: boolean;
	hops: number | null;
	battleId: number | null;
	tierCooldowns: Record<StrikeTier, string | null>;
	weapons: WeaponOption[];
}

/** When each tier is next available to the state (null = now). */
async function tierCooldowns(db: Db, stateId: number, now: Date): Promise<Record<StrikeTier, Date | null>> {
	const out = {} as Record<StrikeTier, Date | null>;
	for (const tier of STRIKE_TIERS) {
		const hours = TIER_CONFIG[tier].cooldownHours;
		const [last] = await db
			.select({ createdAt: strikes.createdAt })
			.from(strikes)
			.where(
				and(
					eq(strikes.attackerStateId, stateId),
					eq(strikes.tier, tier),
					gte(strikes.createdAt, new Date(now.getTime() - hours * HOUR))
				)
			)
			.orderBy(desc(strikes.createdAt))
			.limit(1);
		const ends = last ? new Date(last.createdAt.getTime() + hours * HOUR) : null;
		out[tier] = ends && ends > now ? ends : null;
	}
	return out;
}

/** An aircraft of the state able to fly this weapon's sortie now, else null. */
async function availableAircraft(db: Db, stateId: number, weapon: StrikeWeapon, now: Date) {
	const types = WEAPONS[weapon].requires;
	if (!types) return null;
	const candidates = await db
		.select({
			id: militaryUnits.id,
			name: militaryUnits.name,
			unitType: militaryUnits.unitType,
			health: militaryUnits.health
		})
		.from(militaryUnits)
		.where(
			and(
				eq(militaryUnits.stateId, stateId),
				inArray(militaryUnits.unitType, types),
				eq(militaryUnits.isTraining, false),
				gt(militaryUnits.health, 0)
			)
		)
		.orderBy(desc(militaryUnits.health));
	if (!candidates.length) return null;
	const busy = await db
		.select({ unitId: strikes.unitId })
		.from(strikes)
		.where(
			and(
				inArray(
					strikes.unitId,
					candidates.map((c) => c.id)
				),
				gte(strikes.createdAt, new Date(now.getTime() - SORTIE_COOLDOWN_HOURS * HOUR))
			)
		);
	const busyIds = new Set(busy.map((b) => b.unitId));
	return candidates.find((c) => !busyIds.has(c.id)) ?? null;
}

const AIRCRAFT_LABEL: Record<string, string> = { bomber_squadron: "bomber", fighter_squadron: "fighter" };

/** Everything the strike planner needs for one region. */
export async function strikeOptions(
	db: Db,
	userId: string,
	regionId: number,
	now = new Date()
): Promise<StrikeOptions> {
	const empty: StrikeOptions = {
		authority: null,
		reason: null,
		warId: null,
		treasury: 0,
		ihlScore: 0,
		embargoFactor: 1,
		context: null,
		intel: null,
		adKnown: false,
		hops: null,
		battleId: null,
		tierCooldowns: { strategic: null, operational: null, tactical: null },
		weapons: []
	};
	const authority = await strikeAuthority(db, userId);
	if (!authority) return { ...empty, reason: "Only a president or defence minister can order airstrikes." };
	const [region] = await db.select().from(regions).where(eq(regions.id, regionId));
	if (!region) return { ...empty, authority, reason: "Region not found." };
	const side = await sideOf(db, authority.stateId);
	if (!region.stateId) return { ...empty, authority, reason: "Unclaimed land has nothing to strike." };
	if (side.stateIds.includes(region.stateId))
		return { ...empty, authority, reason: "This region is held by your side." };
	const warId = await warAgainst(db, side, region.stateId);
	if (!warId) return { ...empty, authority, reason: "Your state isn't at war with this region's state." };

	const [[treasury], score, contexts, hops, cooldowns] = await Promise.all([
		db
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, authority.stateId)),
		ihlScoreOf(db, authority.stateId, now),
		strikeContexts(db, side, region, now),
		hopsFromSide(db, side, region.id),
		tierCooldowns(db, authority.stateId, now)
	]);
	const embargo = ihlEmbargoFactor(score);
	const weapons: WeaponOption[] = [];
	for (const id of WEAPON_IDS) {
		const w = WEAPONS[id];
		const aircraft = await availableAircraft(db, authority.stateId, id, now);
		let reason: string | null = null;
		if (w.requires && !aircraft)
			reason = `Needs a ready ${w.requires.map((t) => AIRCRAFT_LABEL[t]).join(" or ")} squadron (one sortie per ${SORTIE_COOLDOWN_HOURS} h).`;
		else if (w.maxHops !== null && (hops === null || hops > w.maxHops))
			reason = `Out of range: reaches ${w.maxHops} border${w.maxHops === 1 ? "" : "s"} beyond your lines.`;
		weapons.push({
			id,
			cost: Math.round(w.cost * embargo),
			reason,
			aircraft: aircraft ? { id: aircraft.id, name: aircraft.name, unitType: aircraft.unitType } : null
		});
	}
	const pic = contexts.picture;
	return {
		authority,
		reason: null,
		warId,
		treasury: treasury?.balance ?? 0,
		ihlScore: score,
		embargoFactor: embargo,
		context: contexts.known,
		intel: pic
			? {
					level: pic.level,
					confidence: pic.confidence,
					latestObservedAt: pic.latestObservedAt,
					buildingsSeen: !!pic.buildings
				}
			: null,
		adKnown: contexts.knownAd !== null,
		hops,
		battleId: contexts.hostile.battle?.id ?? null,
		tierCooldowns: Object.fromEntries(STRIKE_TIERS.map((t) => [t, cooldowns[t]?.toISOString() ?? null])) as Record<
			StrikeTier,
			string | null
		>,
		weapons
	};
}

// ── Launching ───────────────────────────────────────────────────────────────

export interface LaunchInput {
	userId: string;
	regionId: number;
	target: StrikeTarget;
	weapon: StrikeWeapon;
	now?: Date;
	/** Random source (default: seeded from state, region and time, so a strike is reproducible). */
	rng?: () => number;
	/** Override weather/night/cover (tests). */
	conditions?: (region: RegionRow) => ViewConditions;
	/** Push notifications and inbox messages (default true). */
	notify?: boolean;
}

export interface LaunchResult {
	strike: Strike;
	/** What the commander saw (known air defence and intel). */
	plan: StrikePlan;
	roll: StrikeRoll;
	violations: { kind: string; points: number }[];
}

/**
 * Order and resolve a strike in one transaction: checks authority, war,
 * tier cooldown, range and aircraft; charges the treasury (with the arms
 * embargo surcharge); rolls interception, accuracy and harm; applies damage,
 * effects and civilian casualties; records IHL violations and pays
 * reparations. The treasury row is locked first, so two strikes of one state
 * can't both slip past a cooldown or overdraw it.
 */
export async function launchStrike(db: Database, input: LaunchInput): Promise<LaunchResult> {
	const now = input.now ?? new Date();
	const t = TARGETS[input.target];
	const w = WEAPONS[input.weapon];
	if (!t) throw new StrikeError("Unknown target.");
	if (!w) throw new StrikeError("Unknown weapon.");
	if (!w.tiers.includes(t.tier)) throw new StrikeError(`${w.label} can't fly ${t.tier} strikes.`);

	const result = await db.transaction(async (tx) => {
		const authority = await strikeAuthority(tx, input.userId);
		if (!authority) throw new StrikeError("Only a president or defence minister can order airstrikes.");
		const [treasury] = await tx
			.select({ balance: stateTreasury.balance })
			.from(stateTreasury)
			.where(eq(stateTreasury.stateId, authority.stateId))
			.for("update");

		const [region] = await tx.select().from(regions).where(eq(regions.id, input.regionId)).for("update");
		if (!region) throw new StrikeError("Region not found.");
		if (!region.stateId) throw new StrikeError("Unclaimed land has nothing to strike.");
		const side = await sideOf(tx, authority.stateId);
		if (side.stateIds.includes(region.stateId)) throw new StrikeError("This region is held by your side.");
		const warId = await warAgainst(tx, side, region.stateId);
		if (!warId) throw new StrikeError("Your state isn't at war with this region's state.");

		const cooldown = (await tierCooldowns(tx, authority.stateId, now))[t.tier];
		if (cooldown) {
			const mins = Math.ceil((cooldown.getTime() - now.getTime()) / 60_000);
			throw new StrikeError(
				`Your ${t.tier} strike assets are re-arming: ready in ${mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`}.`
			);
		}
		if (w.maxHops !== null) {
			const hops = await hopsFromSide(tx, side, region.id);
			if (hops === null || hops > w.maxHops) throw new StrikeError(`${w.label}: target out of range.`);
		}
		const aircraft = await availableAircraft(tx, authority.stateId, input.weapon, now);
		if (w.requires && !aircraft) throw new StrikeError(`${w.label} needs a ready aircraft squadron.`);

		const contexts = await strikeContexts(tx, side, region, now, input.conditions);

		const score = await ihlScoreOf(tx, authority.stateId, now);
		const cost = Math.round(w.cost * ihlEmbargoFactor(score));
		if ((treasury?.balance ?? 0) < cost) {
			throw new StrikeError(`The treasury can't pay for this strike ($${cost.toLocaleString("en-US")}).`);
		}
		const [paid] = await tx
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${cost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${cost}`,
				updatedAt: now
			})
			.where(and(eq(stateTreasury.stateId, authority.stateId), gte(stateTreasury.balance, cost)))
			.returning({ balance: stateTreasury.balance });
		if (!paid) throw new StrikeError(`The treasury can't pay for this strike ($${cost.toLocaleString("en-US")}).`);

		// What the commander saw decides IHL; the truth decides the outcome.
		const seen = planStrike(input.target, input.weapon, contexts.known);
		const actual = planStrike(input.target, input.weapon, contexts.truth);
		const rng = input.rng ?? seededRandom(hash32(authority.stateId, region.id, Math.floor(now.getTime() / 1000)));
		const roll = rollStrike(actual, rng);

		const damage: StrikeDamage = {};
		// Interception: an aircraft flying the sortie takes hits.
		if (roll.outcome === "intercepted" && aircraft) {
			const health = Math.max(0, aircraft.health - INTERCEPTED_AIRCRAFT_DAMAGE);
			await tx.update(militaryUnits).set({ health, updatedAt: now }).where(eq(militaryUnits.id, aircraft.id));
			damage.aircraftLost = { unitId: aircraft.id, name: aircraft.name, damage: aircraft.health - health };
		}

		// Region levels.
		const levels = levelsDestroyed(input.target, input.weapon, roll);
		if (levels && t.stat) {
			const current = region[t.stat] ?? 0;
			const after = Math.max(0, current - levels);
			if (after !== current) {
				await tx
					.update(regions)
					.set({ [t.stat]: after } as Partial<typeof regions.$inferInsert>)
					.where(eq(regions.id, region.id));
				damage.levels = { [t.stat]: current - after };
			}
		}

		// Lasting effect on the region's owner.
		const magnitude = effectMagnitude(input.target, input.weapon, roll.damageScale);
		let effectRow: { kind: StrikeEffectKind; magnitude: number; expiresAt: Date } | null = null;
		if (magnitude > 0 && t.effect) {
			effectRow = { kind: t.effect.kind, magnitude, expiresAt: new Date(now.getTime() + t.effect.hours * HOUR) };
			damage.effect = { ...effectRow, expiresAt: effectRow.expiresAt.toISOString() };
		}

		// Units: engaged battle units first, then the rest; SEAD only hits air defence.
		const pool =
			input.target === "air_defence"
				? contexts.hostile.units.filter((u) => u.unitType === "air_defence")
				: input.target === "units"
					? contexts.hostile.units
					: [];
		let points = pool.length ? unitDamage(input.weapon, roll) : 0;
		const hit: NonNullable<StrikeDamage["units"]> = [];
		for (const u of pool) {
			if (points <= 0) break;
			const strength = u.participantId ? u.currentStrength : u.health;
			const taken = Math.min(points, strength);
			if (taken <= 0) continue;
			points -= taken;
			const left = strength - taken;
			if (u.participantId) {
				await tx
					.update(battleParticipants)
					.set({
						currentStrength: left,
						damageTaken: sql`${battleParticipants.damageTaken} + ${taken}`,
						...(left === 0 ? { destroyedAt: now } : {})
					})
					.where(eq(battleParticipants.id, u.participantId));
			}
			await tx
				.update(militaryUnits)
				.set({ health: Math.max(0, u.health - taken), updatedAt: now })
				.where(eq(militaryUnits.id, u.unitId));
			hit.push({ unitId: u.unitId, name: u.name, unitType: u.unitType, damage: taken, destroyed: left === 0 });
		}
		if (hit.length) damage.units = hit;

		if (roll.civilianCasualties > 0) await reduceRegionPopulation(tx, region.id, roll.civilianCasualties);

		const [strike] = await tx
			.insert(strikes)
			.values({
				attackerStateId: authority.stateId,
				targetStateId: region.stateId,
				warId,
				regionId: region.id,
				battleId: contexts.hostile.battle?.id ?? null,
				orderedBy: input.userId,
				tier: t.tier,
				target: input.target,
				weapon: input.weapon,
				unitId: aircraft?.id ?? null,
				cost,
				outcome: roll.outcome,
				interceptChance: Math.round(seen.interceptChance * 100),
				accuracy: Math.round(seen.accuracy * 100),
				intelConfidence: Math.round(seen.targetingConfidence * 100),
				conditions: contexts.truth.conditions,
				exposedCivilians: seen.exposed,
				expectedCasualties: seen.expectedCasualties,
				civilianCasualties: roll.civilianCasualties,
				protectedTarget: t.protected,
				damage,
				createdAt: now
			})
			.returning();

		if (effectRow) {
			await tx.insert(regionEffects).values({
				regionId: region.id,
				stateId: region.stateId,
				kind: effectRow.kind,
				magnitude: effectRow.magnitude,
				strikeId: strike!.id,
				startsAt: now,
				expiresAt: effectRow.expiresAt
			});
		}

		await tx.insert(governmentBudgetTransactions).values({
			stateId: authority.stateId,
			transactionType: "airstrike",
			amount: -cost,
			balanceAfter: paid.balance,
			description: `Airstrike: ${w.label} on ${t.label.toLowerCase()}`,
			authorizedBy: input.userId,
			metadata: JSON.stringify({ strikeId: strike!.id, regionId: region.id }),
			createdAt: now
		});

		// IHL: the most severe finding carries the casualty points.
		const findings = [...seen.ihl].sort((a, b) => b.severity - a.severity || b.points - a.points);
		const violations: { kind: string; points: number }[] = [];
		let owed = 0;
		for (const [i, f] of findings.entries()) {
			const casualties = i === 0 ? roll.civilianCasualties : 0;
			const pts = violationPoints(f.points, casualties);
			await tx.insert(ihlViolations).values({
				stateId: authority.stateId,
				victimStateId: region.stateId,
				warId,
				strikeId: strike!.id,
				kind: f.kind,
				severity: f.severity,
				points: pts,
				casualties,
				reason: f.reason,
				createdAt: now
			});
			violations.push({ kind: f.kind, points: pts });
			owed += reparationsOwed(pts, casualties);
		}
		if (owed > 0) {
			const [fined] = await tx
				.update(stateTreasury)
				.set({
					balance: sql`greatest(0, ${stateTreasury.balance} - ${owed})`,
					totalSpent: sql`${stateTreasury.totalSpent} + least(${stateTreasury.balance}, ${owed})`,
					updatedAt: now
				})
				.where(eq(stateTreasury.stateId, authority.stateId))
				.returning({ balance: stateTreasury.balance });
			const reparations = Math.min(owed, paid.balance);
			if (reparations > 0) {
				const victimBalance = await creditTreasury(tx, region.stateId, reparations);
				await tx.insert(governmentBudgetTransactions).values([
					{
						stateId: authority.stateId,
						transactionType: "reparations",
						amount: -reparations,
						balanceAfter: fined?.balance ?? 0,
						description: `Reparations for strike #${strike!.id}`,
						authorizedBy: input.userId,
						metadata: JSON.stringify({ strikeId: strike!.id }),
						createdAt: now
					},
					{
						stateId: region.stateId,
						transactionType: "reparations",
						amount: reparations,
						balanceAfter: victimBalance,
						description: `Reparations received for strike #${strike!.id}`,
						authorizedBy: input.userId,
						metadata: JSON.stringify({ strikeId: strike!.id }),
						createdAt: now
					}
				]);
				damage.reparations = reparations;
				await tx.update(strikes).set({ damage }).where(eq(strikes.id, strike!.id));
				strike!.damage = damage;
			}
		}

		return { strike: strike!, plan: seen, roll, violations, side, attackerName: authority.stateName };
	});

	if (input.notify !== false) {
		void notifyStrike(db, result.strike, result.attackerName, result.side, result.violations.length > 0).catch((err) =>
			console.error("Strike notification error:", err)
		);
	}
	return { strike: result.strike, plan: result.plan, roll: result.roll, violations: result.violations };
}

const OUTCOME_LABEL: Record<string, string> = {
	hit: "hit",
	partial: "partly hit",
	miss: "missed",
	intercepted: "was intercepted"
};

/** Tell the struck state's president, and the violator's bloc partners about violations. */
async function notifyStrike(db: Database, strike: Strike, attackerName: string, side: Side, violated: boolean) {
	const { sendNotificationIfEnabled } = await import("../push-notification.service");
	const target = TARGETS[strike.target].label.toLowerCase();
	if (strike.targetStateId) {
		const [president] = await db
			.select({ userId: presidents.userId })
			.from(presidents)
			.where(eq(presidents.stateId, strike.targetStateId));
		if (president) {
			await sendNotificationIfEnabled(president.userId, "notifyBattleResults", {
				title: "Air raid",
				body: `${attackerName} struck ${target}: it ${OUTCOME_LABEL[strike.outcome]}.${strike.civilianCasualties ? ` ${strike.civilianCasualties} civilians killed.` : ""}`,
				icon: "/favicon.png",
				badge: "/badge.png",
				data: { url: `/region/${strike.regionId}#strikes`, tag: `strike-${strike.id}` }
			});
		}
	}
	if (!violated || !side.blocId) return;
	const partners = await db
		.select({ userId: presidents.userId, stateId: presidents.stateId })
		.from(presidents)
		.innerJoin(states, eq(presidents.stateId, states.id))
		.where(and(eq(states.blocId, side.blocId), ne(states.id, strike.attackerStateId)));
	if (!partners.length) return;
	await db.insert(inboxMessages).values(
		partners.map((p) => ({
			recipientId: p.userId,
			senderId: p.userId,
			messageType: "system" as const,
			stateId: strike.attackerStateId,
			subject: `⚖️ IHL violation reported: ${attackerName}`,
			content: `Your bloc partner ${attackerName} carried out a strike on ${target} that violates international humanitarian law (${strike.civilianCasualties} civilian casualties). See its IHL record on the state page. A bloc can expel a state with a violator record with a third of the votes.`
		}))
	);
}

// ── Effects ─────────────────────────────────────────────────────────────────

/** Active strike effects on regions, newest first. */
export async function activeEffects(db: Db, regionIds: number[], now = new Date()) {
	if (!regionIds.length) return [];
	return db
		.select()
		.from(regionEffects)
		.where(
			and(
				inArray(regionEffects.regionId, regionIds),
				gt(regionEffects.expiresAt, now),
				lte(regionEffects.startsAt, now)
			)
		)
		.orderBy(desc(regionEffects.expiresAt));
}

/** Factory output multiplier in a region (industry strikes). */
export async function industryFactor(db: Db, regionId: number, now = new Date()): Promise<number> {
	const rows = (await activeEffects(db, [regionId], now)).filter((e) => e.kind === "industry");
	return (
		1 -
		stackedPenalty(
			"industry",
			rows.map((r) => r.magnitude)
		)
	);
}

/** Share of a state's energy capacity knocked out by grid strikes (0-cap). */
export async function energyPenalty(db: Db, stateId: number, now = new Date()): Promise<number> {
	const rows = await db
		.select({ magnitude: regionEffects.magnitude })
		.from(regionEffects)
		.where(
			and(
				eq(regionEffects.stateId, stateId),
				eq(regionEffects.kind, "energy"),
				gt(regionEffects.expiresAt, now),
				lte(regionEffects.startsAt, now)
			)
		);
	return stackedPenalty(
		"energy",
		rows.map((r) => r.magnitude)
	);
}

/** Factory output multiplier from strikes: the state's grid damage times the region's industry damage. */
export async function strikeProductionFactor(
	db: Db,
	stateId: number | null,
	regionId: number,
	now = new Date()
): Promise<number> {
	const [energy, industry] = await Promise.all([
		stateId ? energyPenalty(db, stateId, now) : Promise.resolve(0),
		industryFactor(db, regionId, now)
	]);
	return (1 - energy) * industry;
}

/** A state's energy capacity with the share knocked out by grid strikes taken offline. */
export async function withStrikeEnergy<T extends { totalProduction: number }>(
	db: Db,
	stateId: number | null,
	energy: T,
	now = new Date()
): Promise<T & { strikeDamaged: number }> {
	const penalty = stateId ? await energyPenalty(db, stateId, now) : 0;
	return {
		...energy,
		totalProduction: Math.floor(energy.totalProduction * (1 - penalty)),
		strikeDamaged: Math.round(penalty * 100)
	};
}

export interface BattleStrikeModifiers {
	/** Output multiplier per side: supply × IHL morale. */
	attacker: number;
	defender: number;
	supply: { attacker: number; defender: number };
	morale: { attacker: number; defender: number };
}

export const NEUTRAL_STRIKE_MODIFIERS: BattleStrikeModifiers = {
	attacker: 1,
	defender: 1,
	supply: { attacker: 1, defender: 1 },
	morale: { attacker: 1, defender: 1 }
};

/**
 * What strikes and IHL standing do to a battle: supply effects in the battle
 * region and the regions next to it hurt the side whose state suffers them,
 * and each side's lead state fights with its IHL morale factor.
 */
export async function battleStrikeModifiers(
	db: Db,
	battle: { regionId: number; attackerStateId: number; defenderStateId: number },
	now = new Date()
): Promise<BattleStrikeModifiers> {
	const borders = await db
		.select({ a: regionBorders.regionId, b: regionBorders.neighborId })
		.from(regionBorders)
		.where(or(eq(regionBorders.regionId, battle.regionId), eq(regionBorders.neighborId, battle.regionId)));
	const area = [...new Set([battle.regionId, ...borders.flatMap((r) => [r.a, r.b])])];
	const [effects, attackerSide, defenderSide, scores] = await Promise.all([
		activeEffects(db, area, now),
		sideOf(db, battle.attackerStateId),
		sideOf(db, battle.defenderStateId),
		ihlScores(db, [battle.attackerStateId, battle.defenderStateId], now)
	]);
	const supplyFor = (side: Side) =>
		1 -
		stackedPenalty(
			"supply",
			effects
				.filter((e) => e.kind === "supply" && e.stateId !== null && side.stateIds.includes(e.stateId))
				.map((e) => e.magnitude)
		);
	const supply = { attacker: supplyFor(attackerSide), defender: supplyFor(defenderSide) };
	const morale = {
		attacker: ihlMoraleFactor(scores.get(battle.attackerStateId) ?? 0),
		defender: ihlMoraleFactor(scores.get(battle.defenderStateId) ?? 0)
	};
	const r3 = (n: number) => Math.round(n * 1000) / 1000;
	return {
		attacker: r3(supply.attacker * morale.attacker),
		defender: r3(supply.defender * morale.defender),
		supply,
		morale
	};
}

// ── Log ─────────────────────────────────────────────────────────────────────

export interface StrikeLogEntry {
	id: number;
	tier: StrikeTier;
	target: StrikeTarget;
	weapon: StrikeWeapon;
	outcome: Strike["outcome"];
	regionId: number;
	attackerStateId: number;
	attackerStateName: string | null;
	targetStateId: number | null;
	targetStateName: string | null;
	warId: number | null;
	battleId: number | null;
	interceptChance: number;
	accuracy: number;
	intelConfidence: number;
	conditions: Strike["conditions"];
	expectedCasualties: number;
	civilianCasualties: number;
	protectedTarget: boolean;
	damage: StrikeDamage;
	violations: { kind: string; severity: number }[];
	createdAt: string;
}

/** Strikes by region, war, battle or state (as attacker or target), newest first. */
export async function strikeLog(
	db: Db,
	filter: { regionId?: number; warId?: number; battleId?: number; stateId?: number },
	limit = 20
): Promise<StrikeLogEntry[]> {
	const conds = [];
	if (filter.regionId) conds.push(eq(strikes.regionId, filter.regionId));
	if (filter.warId) conds.push(eq(strikes.warId, filter.warId));
	if (filter.battleId) conds.push(eq(strikes.battleId, filter.battleId));
	if (filter.stateId)
		conds.push(or(eq(strikes.attackerStateId, filter.stateId), eq(strikes.targetStateId, filter.stateId)));
	const rows = await db
		.select()
		.from(strikes)
		.where(conds.length ? and(...conds) : undefined)
		.orderBy(desc(strikes.createdAt), desc(strikes.id))
		.limit(limit);
	if (!rows.length) return [];
	const stateIds = [
		...new Set(rows.flatMap((r) => [r.attackerStateId, r.targetStateId]).filter((x): x is number => !!x))
	];
	const [names, violations] = await Promise.all([
		db.select({ id: states.id, name: states.name }).from(states).where(inArray(states.id, stateIds)),
		db
			.select({ strikeId: ihlViolations.strikeId, kind: ihlViolations.kind, severity: ihlViolations.severity })
			.from(ihlViolations)
			.where(
				inArray(
					ihlViolations.strikeId,
					rows.map((r) => r.id)
				)
			)
	]);
	const nameOf = new Map(names.map((n) => [n.id, n.name]));
	return rows.map((r) => ({
		id: r.id,
		tier: r.tier,
		target: r.target,
		weapon: r.weapon,
		outcome: r.outcome,
		regionId: r.regionId,
		attackerStateId: r.attackerStateId,
		attackerStateName: nameOf.get(r.attackerStateId) ?? null,
		targetStateId: r.targetStateId,
		targetStateName: r.targetStateId ? (nameOf.get(r.targetStateId) ?? null) : null,
		warId: r.warId,
		battleId: r.battleId,
		interceptChance: r.interceptChance,
		accuracy: r.accuracy,
		intelConfidence: r.intelConfidence,
		conditions: r.conditions,
		expectedCasualties: r.expectedCasualties,
		civilianCasualties: r.civilianCasualties,
		protectedTarget: r.protectedTarget,
		damage: r.damage,
		violations: violations.filter((v) => v.strikeId === r.id).map((v) => ({ kind: v.kind, severity: v.severity })),
		createdAt: r.createdAt.toISOString()
	}));
}

/** Regions struck in the last `hours`, with the latest strike each (for the map). */
export async function recentlyStruckRegions(db: Db, hours = 24, now = new Date()) {
	const rows = await db
		.select({
			regionId: strikes.regionId,
			outcome: strikes.outcome,
			civilianCasualties: strikes.civilianCasualties,
			createdAt: strikes.createdAt
		})
		.from(strikes)
		.where(gt(strikes.createdAt, new Date(now.getTime() - hours * HOUR)))
		.orderBy(desc(strikes.createdAt));
	const out = new Map<number, { count: number; casualties: number; lastAt: string; lastOutcome: string }>();
	for (const r of rows) {
		const e = out.get(r.regionId);
		if (e) {
			e.count++;
			e.casualties += r.civilianCasualties;
		} else
			out.set(r.regionId, {
				count: 1,
				casualties: r.civilianCasualties,
				lastAt: r.createdAt.toISOString(),
				lastOutcome: r.outcome
			});
	}
	return out;
}
