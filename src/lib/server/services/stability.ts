// src/lib/server/services/stability.ts
// Turns the game's existing records into the regime stability the civilians
// feel, and moves their numbers on a slow population tick.
//
// Nothing here needs a new table: war crimes come from ihlViolations (through
// ihlScores), environmental policy from states.exploitationPolicy, conscription
// pressure from the standing army against the region population, education and
// opinion from the regions, wages from factories, and cyber/psyops from the
// live stateEffects. Stability itself is derived on read; only the population
// tick writes (regions.population, already used for strike casualties).
//
// No SvelteKit virtual modules here (tests import this file).
import { count, eq, inArray } from "drizzle-orm";
import type { Database } from "../db";
import { factories, militaryUnits, regions, states, wars } from "../schema";
import {
	POPULATION_FLOOR,
	STABILITY,
	regionPopulation,
	populationDelta,
	regimeStability,
	type ExploitationPolicyLike,
	type StabilityResult
} from "#lib/config/index.js";
import { regionOpinions } from "./politics/civic.service";
import { ihlScores } from "./military/ihl";
import { activeEffects } from "./military/state-effects";

type CyberEffectKind = "grid_degraded" | "c2_degraded" | "defence_blinded" | "supply_disrupted";
const CYBER_KINDS: CyberEffectKind[] = ["grid_degraded", "c2_degraded", "defence_blinded", "supply_disrupted"];

const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
const group = <T>(rows: T[], key: (row: T) => number | null | undefined) => {
	const out = new Map<number, T[]>();
	for (const row of rows) {
		const k = key(row);
		if (k == null) continue;
		out.set(k, [...(out.get(k) ?? []), row]);
	}
	return out;
};

/** Everything a caller might want about a state's civilian mood. */
export interface StateStabilityInfo {
	stability: StabilityResult;
	/** The state is a belligerent in an active war (used for mortality). */
	atWar: boolean;
	/** The state is defending (rally-round-the-flag). */
	defending: boolean;
	/** Soldiers per 1,000 civilians. */
	conscription: number;
	/** Current civilian population of the state. */
	population: number;
	environment: ExploitationPolicyLike;
}

/**
 * Compute stability (and the facts behind it) for many states in a handful of
 * queries. States with no row in the result do not exist.
 */
export async function stateStabilitiesInfo(
	db: Database,
	stateIds: number[],
	now: Date = new Date()
): Promise<Map<number, StateStabilityInfo>> {
	const ids = [...new Set(stateIds)];
	const out = new Map<number, StateStabilityInfo>();
	if (!ids.length) return out;

	const [stateRows, regionRows, unitRows, wageRows, effects, activeWars, ihl] = await Promise.all([
		db
			.select({ id: states.id, policy: states.exploitationPolicy, blocId: states.blocId })
			.from(states)
			.where(inArray(states.id, ids)),
		db
			.select({
				id: regions.id,
				stateId: regions.stateId,
				population: regions.population,
				terrain: regions.terrain,
				infrastructure: regions.infrastructure,
				economy: regions.economy,
				education: regions.education,
				hospitals: regions.hospitals
			})
			.from(regions)
			.where(inArray(regions.stateId, ids)),
		db
			.select({ stateId: militaryUnits.stateId, n: count() })
			.from(militaryUnits)
			.where(inArray(militaryUnits.stateId, ids))
			.groupBy(militaryUnits.stateId),
		db
			.select({ stateId: regions.stateId, wage: factories.workerWage })
			.from(factories)
			.innerJoin(regions, eq(factories.regionId, regions.id))
			.where(inArray(regions.stateId, ids)),
		activeEffects(db, ids, { now }),
		db
			.select({
				attackerId: wars.attackerId,
				defenderId: wars.defenderId,
				attackerBlocId: wars.attackerBlocId,
				defenderBlocId: wars.defenderBlocId
			})
			.from(wars)
			.where(eq(wars.status, "active")),
		ihlScores(db, ids, now)
	]);

	const opinions = await regionOpinions(
		db,
		regionRows.map((r) => r.id),
		now
	);
	const regionsByState = group(regionRows, (r) => r.stateId);
	const unitsByState = new Map(unitRows.map((r) => [r.stateId, Number(r.n)]));
	const wagesByState = group(wageRows, (r) => r.stateId);

	for (const s of stateRows) {
		const rs = regionsByState.get(s.id) ?? [];
		const population = rs.reduce((sum, r) => sum + regionPopulation(r), 0);
		const conscription = population > 0 ? ((unitsByState.get(s.id) ?? 0) / population) * 1000 : 0;
		const opinion = avg(rs.map((r) => opinions.get(r.id) ?? STABILITY.BASE));
		const education = avg(rs.map((r) => Number(r.education ?? 0)));
		const wages = avg((wagesByState.get(s.id) ?? []).map((r) => Number(r.wage)));

		const on = effects.filter((e) => e.stateId === s.id);
		const cyber = on.filter((e) => CYBER_KINDS.includes(e.kind as CyberEffectKind)).reduce((sum, e) => sum + e.magnitude, 0);
		const propagandaFor = on.filter((e) => e.kind === "morale_boost").reduce((sum, e) => sum + e.magnitude, 0);
		const propagandaAgainst = on.filter((e) => e.kind === "morale_shaken").reduce((sum, e) => sum + e.magnitude, 0);

		const attacking = activeWars.some(
			(w) =>
				w.attackerId === s.id ||
				(s.blocId != null && w.attackerBlocId === s.blocId) ||
				w.defenderId === s.id ||
				(s.blocId != null && w.defenderBlocId === s.blocId)
		);
		const defending = activeWars.some(
			(w) =>
				(w.defenderId === s.id || (s.blocId != null && w.defenderBlocId === s.blocId)) && w.attackerId !== s.id
		);

		const stability = regimeStability({
			opinion,
			ihlScore: ihl.get(s.id) ?? 0,
			environment: s.policy,
			conscription,
			education,
			wages: wages > 0 || (wagesByState.get(s.id) ?? []).length ? wages : STABILITY.WAGE_REFERENCE,
			cyber,
			propagandaFor,
			propagandaAgainst,
			defending
		});

		out.set(s.id, { stability, atWar: attacking, defending, conscription, population, environment: s.policy });
	}
	return out;
}

/** Regime stability per state, the common read-only shape. */
export async function stateStabilities(
	db: Database,
	stateIds: number[],
	now: Date = new Date()
): Promise<Map<number, StabilityResult>> {
	const info = await stateStabilitiesInfo(db, stateIds, now);
	return new Map([...info].map(([id, i]) => [id, i.stability]));
}

/** One state's stability, or null when it does not exist. */
export async function stateStability(
	db: Database,
	stateId: number,
	now: Date = new Date()
): Promise<StabilityResult | null> {
	return (await stateStabilities(db, [stateId], now)).get(stateId) ?? null;
}

export interface PopulationTickResult {
	regionsChanged: number;
	gained: number;
	lost: number;
	net: number;
	days: number;
}

/**
 * Grow or shrink every region's civilian population by one tick. Run by the
 * weekly `/api/cron/population` job. Stateless regions get natural growth but
 * none of the war/environment/conscription pressures.
 */
export async function populationTick(
	db: Database,
	now: Date = new Date(),
	days = 7
): Promise<PopulationTickResult> {
	const [regionRows, statesWithId] = await Promise.all([
		db
			.select({
				id: regions.id,
				stateId: regions.stateId,
				population: regions.population,
				terrain: regions.terrain,
				infrastructure: regions.infrastructure,
				economy: regions.economy,
				education: regions.education,
				hospitals: regions.hospitals
			})
			.from(regions),
		db.select({ id: states.id }).from(states)
	]);
	const info = await stateStabilitiesInfo(
		db,
		statesWithId.map((s) => s.id),
		now
	);

	const result: PopulationTickResult = { regionsChanged: 0, gained: 0, lost: 0, net: 0, days };
	for (const row of regionRows) {
		const s = row.stateId != null ? info.get(row.stateId) : undefined;
		const current = regionPopulation(row);
		const delta = populationDelta(current, {
			days,
			atWar: s?.atWar ?? false,
			environment: s?.environment ?? "standard",
			conscription: s?.conscription ?? 0,
			stability: s?.stability.score ?? 60
		});
		if (!delta) continue;
		const next = Math.max(POPULATION_FLOOR, current + delta);
		await db.update(regions).set({ population: next }).where(eq(regions.id, row.id));
		result.regionsChanged++;
		if (next > current) result.gained += next - current;
		else result.lost += current - next;
		result.net += next - current;
	}
	return result;
}
