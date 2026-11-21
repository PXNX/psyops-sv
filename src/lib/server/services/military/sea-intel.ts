// src/lib/server/services/military/sea-intel.ts
// Sea reconnaissance: sonar sweeps, maritime patrol radar and satellite SAR
// over a hex instead of a region. Sonar is the only reliable way to find a
// submarine; radar and SAR see surface hulls and mines. Reports are kept per
// state and expire, so the map only shows enemy ships a fresh pass found.
//
// No SvelteKit virtual modules at the top level (tests import this file).
import { and, desc, eq, inArray, lte } from "drizzle-orm";
import type { Database } from "../../db";
import { debitWallet, InsufficientFundsError } from "../../money";
import {
	fleetShips,
	navalMines,
	seaIntelMissions,
	states,
	transactionHistory,
	userWallets,
	type SeaIntelFindings
} from "../../schema";
import {
	SEA_INTEL_VALID_HOURS,
	SEA_SENSORS,
	SEA_SENSOR_IDS,
	hexDistance,
	hexesInRange,
	inBounds,
	shipClass,
	type Hex,
	type SeaSensorId
} from "#lib/config/index.js";
import { viewerSide, type Side } from "./recon";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

const MINUTE = 60_000;
const HOUR = 3_600_000;

export class SeaIntelError extends Error {}

/** When the sensor can next be used by this player (or by the whole side). */
export async function seaIntelCooldownEndsAt(db: Db, userId: string, side: Side, sensor: SeaSensorId, now = new Date()): Promise<Date | null> {
	const s = SEA_SENSORS[sensor];
	const condition =
		s.cooldownScope === "state"
			? and(eq(seaIntelMissions.stateId, side.stateId), eq(seaIntelMissions.sensor, sensor))
			: and(eq(seaIntelMissions.launchedBy, userId), eq(seaIntelMissions.sensor, sensor));
	const [last] = await db
		.select({ launchedAt: seaIntelMissions.launchedAt })
		.from(seaIntelMissions)
		.where(condition)
		.orderBy(desc(seaIntelMissions.launchedAt))
		.limit(1);
	return last ? new Date(last.launchedAt.getTime() + s.cooldownMinutes * MINUTE) : null;
}

export interface SeaSensorOption {
	id: SeaSensorId;
	label: string;
	short: string;
	kind: string;
	cost: number;
	durationMinutes: number;
	radius: number;
	detects: { surface: number; sub: number; mine: number };
	cooldownEndsAt: string | null;
}

/** Sensor menu and in-flight passes for a hex. */
export async function seaIntelOptions(db: Db, userId: string, hex: Hex, now = new Date()) {
	const side = await viewerSide(db, userId);
	if (!side) return { side: null, sensors: [] as SeaSensorOption[], inFlight: [] as { id: number; sensor: string; completesAt: string }[] };
	const sensors: SeaSensorOption[] = await Promise.all(
		SEA_SENSOR_IDS.map(async (id) => {
			const s = SEA_SENSORS[id];
			const cd = await seaIntelCooldownEndsAt(db, userId, side, id, now);
			return {
				id,
				label: s.label,
				short: s.short,
				kind: s.kind,
				cost: s.cost,
				durationMinutes: s.durationMinutes,
				radius: s.radius,
				detects: s.detects,
				cooldownEndsAt: cd && cd > now ? cd.toISOString() : null
			};
		})
	);
	const inFlight = await db
		.select({ id: seaIntelMissions.id, sensor: seaIntelMissions.sensor, completesAt: seaIntelMissions.completesAt })
		.from(seaIntelMissions)
		.where(
			and(
				eq(seaIntelMissions.q, hex.q),
				eq(seaIntelMissions.r, hex.r),
				eq(seaIntelMissions.status, "in_progress"),
				eq(seaIntelMissions.stateId, side.stateId)
			)
		);
	return {
		side,
		sensors,
		inFlight: inFlight.map((m) => ({ ...m, completesAt: m.completesAt.toISOString() }))
	};
}

/** Launch a sea pass, charging the player's wallet. */
export async function launchSeaIntel(
	db: Database,
	input: { userId: string; q: number; r: number; sensor: SeaSensorId; now?: Date }
) {
	const now = input.now ?? new Date();
	const sensor = SEA_SENSORS[input.sensor];
	if (!sensor) throw new SeaIntelError("Unknown sea sensor.");
	if (!inBounds({ q: input.q, r: input.r })) throw new SeaIntelError("That hex is outside the naval theatre.");

	return db.transaction(async (tx) => {
		const [wallet] = await tx.select({ userId: userWallets.userId }).from(userWallets).where(eq(userWallets.userId, input.userId)).for("update");
		if (!wallet) throw new SeaIntelError("You have no wallet yet.");
		const side = await viewerSide(tx, input.userId);
		if (!side) throw new SeaIntelError("You need to live in a state to run sea recon.");
		if (sensor.cooldownScope === "state")
			await tx.select({ id: states.id }).from(states).where(eq(states.id, side.stateId)).for("update");
		const cooldown = await seaIntelCooldownEndsAt(tx, input.userId, side, input.sensor, now);
		if (cooldown && cooldown > now) {
			const mins = Math.ceil((cooldown.getTime() - now.getTime()) / MINUTE);
			throw new SeaIntelError(`${sensor.label} is ready again in ${mins} min.`);
		}
		let balanceAfter: number;
		try {
			balanceAfter = await debitWallet(tx, input.userId, sensor.cost);
		} catch (err) {
			if (err instanceof InsufficientFundsError) throw new SeaIntelError(`Sea recon costs $${sensor.cost.toLocaleString()}.`);
			throw err;
		}
		const [mission] = await tx
			.insert(seaIntelMissions)
			.values({
				stateId: side.stateId,
				launchedBy: input.userId,
				sensor: input.sensor,
				q: input.q,
				r: input.r,
				cost: sensor.cost,
				launchedAt: now,
				completesAt: new Date(now.getTime() + sensor.durationMinutes * MINUTE)
			})
			.returning();
		await tx.insert(transactionHistory).values({
			userId: input.userId,
			transactionType: "recon_mission",
			amount: sensor.cost,
			balanceAfter,
			description: `${sensor.label} over hex ${input.q},${input.r}`
		});
		return mission;
	});
}

/** Resolve passes whose sweep has finished. */
export async function resolveSeaIntelMissions(db: Database, now = new Date(), rng: () => number = Math.random) {
	let resolved = 0;
	const due = await db
		.select()
		.from(seaIntelMissions)
		.where(and(eq(seaIntelMissions.status, "in_progress"), lte(seaIntelMissions.completesAt, now)));
	const ships = await db.select().from(fleetShips);
	const mines = await db.select().from(navalMines);

	for (const mission of due) {
		const sensor = SEA_SENSORS[mission.sensor as SeaSensorId];
		if (!sensor) {
			await db.update(seaIntelMissions).set({ status: "completed", observedAt: now }).where(eq(seaIntelMissions.id, mission.id));
			resolved++;
			continue;
		}
		const area = hexesInRange({ q: mission.q, r: mission.r }, sensor.radius);
		const areaKeys = new Set(area.map((h) => `${h.q},${h.r}`));
		const contacts: Record<string, number> = {};
		let found = 0;
		let rolls = 0;
		for (const ship of ships) {
			if (ship.status === "sunk" || !areaKeys.has(`${ship.q},${ship.r}`)) continue;
			const def = shipClass(ship.shipClass);
			const kind = def?.category === "submarine" ? "sub" : "surface";
			const chance = sensor.detects[kind];
			rolls++;
			if (rng() >= chance) continue;
			const key = sensor.identifiesTypes && kind === "surface" ? ship.shipClass : kind;
			contacts[key] = (contacts[key] ?? 0) + 1;
			found++;
		}
		let seenMines = 0;
		for (const mine of mines) {
			if (!areaKeys.has(`${mine.q},${mine.r}`)) continue;
			rolls++;
			if (rng() < sensor.detects.mine) seenMines++;
		}
		const findings: SeaIntelFindings = {
			contacts,
			mines: seenMines,
			confidence: rolls ? Math.round(((found + seenMines) / rolls) * 100) : 0
		};
		await db
			.update(seaIntelMissions)
			.set({ status: "completed", findings, observedAt: now })
			.where(eq(seaIntelMissions.id, mission.id));
		resolved++;
	}
	return resolved;
}

/** Latest fresh report covering a hex, for fog-of-war and the Intel panels. */
export async function latestSeaIntel(
	db: Db,
	stateIds: number[],
	hex: Hex,
	now = new Date(),
	validHours = SEA_INTEL_VALID_HOURS
) {
	if (!stateIds.length) return null;
	const reports = await db
		.select()
		.from(seaIntelMissions)
		.where(and(inArray(seaIntelMissions.stateId, stateIds), eq(seaIntelMissions.status, "completed")))
		.orderBy(desc(seaIntelMissions.observedAt))
		.limit(100);
	const cutoff = now.getTime() - validHours * HOUR;
	return (
		reports.find((r) => {
			if (!r.observedAt || r.observedAt.getTime() < cutoff) return false;
			const sensor = SEA_SENSORS[r.sensor as SeaSensorId];
			return sensor && hexDistance({ q: r.q, r: r.r }, hex) <= sensor.radius;
		}) ?? null
	);
}

/** Which hexes the side currently sees, with their freshest findings. */
export async function seaPicture(db: Db, stateIds: number[], now = new Date()) {
	if (!stateIds.length) return {} as Record<string, SeaIntelFindings & { sensor: string; observedAt: string }>;
	const reports = await db
		.select()
		.from(seaIntelMissions)
		.where(and(inArray(seaIntelMissions.stateId, stateIds), eq(seaIntelMissions.status, "completed")))
		.orderBy(desc(seaIntelMissions.observedAt));
	const cutoff = now.getTime() - SEA_INTEL_VALID_HOURS * HOUR;
	const picture: Record<string, SeaIntelFindings & { sensor: string; observedAt: string }> = {};
	for (const report of reports) {
		if (!report.observedAt || report.observedAt.getTime() < cutoff || !report.findings) continue;
		const sensor = SEA_SENSORS[report.sensor as SeaSensorId];
		if (!sensor) continue;
		for (const h of hexesInRange({ q: report.q, r: report.r }, sensor.radius)) {
			const key = `${h.q},${h.r}`;
			if (!picture[key]) picture[key] = { ...report.findings, sensor: report.sensor, observedAt: report.observedAt.toISOString() };
		}
	}
	return picture;
}

/** Recent sea passes for the intel log. */
export async function seaIntelLedger(db: Db, stateId: number, limit = 20) {
	return db
		.select()
		.from(seaIntelMissions)
		.where(eq(seaIntelMissions.stateId, stateId))
		.orderBy(desc(seaIntelMissions.launchedAt))
		.limit(limit);
}
