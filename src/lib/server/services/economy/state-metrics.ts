// State metrics for the dossier: an explainable power rating (with a breakdown
// and a ranking of every state), an activity-based GDP estimate and the list of
// creditors behind a state's debt. All figures are derived from live tables so
// the numbers always match what the game actually tracks.
//
// No SvelteKit virtual modules at the top level: integration tests import this
// file directly.

import { and, eq, gte, isNull } from "drizzle-orm";
import type { Database } from "../../db";
import {
	accounts,
	fleetShips,
	militaryUnits,
	powerPlants,
	regions,
	stateEnergy,
	stateTaxes,
	stateTreasury,
	taxRevenue,
	states,
	userProfiles
} from "../../schema";
import { stateBonds } from "../../schema-investments";
import { MILITARY_UNIT_TEMPLATES, regionPopulation } from "#lib/config/index.js";
import { REAL_DAY_MS } from "#lib/utils/game-time.js";

const YEAR_MS = 365 * REAL_DAY_MS;

/** Components of a state's power. Each is a raw count/value plus a weight. */
export interface PowerComponent {
	key: string;
	label: string;
	value: number;
	detail: string;
	weight: number;
	points: number;
}

export interface StatePower {
	score: number;
	storedRating: number;
	components: PowerComponent[];
}

export interface StateRankingRow {
	id: number;
	name: string;
	score: number;
	rating: number;
	regions: number;
	population: number;
}

export interface GdpBreakdown {
	gdp: number;
	debt: number;
	debtToGdp: number | null;
	taxesAnnual: number;
	taxesBasis: number;
	taxRate: number;
	consumption: number;
	population: number;
}

export interface DebtCreditor {
	userId: string;
	name: string;
	principal: number;
	bonds: number;
	firstAt: string;
	latestAt: string;
	maturesAt: string;
}

/** Weights used by the published rating formula (kept small and readable). */
export const POWER_WEIGHTS = {
	territory: 12,
	population: 1,
	military: 2,
	ships: 15,
	industry: 20,
	energy: 0.5,
	infrastructure: 8,
	education: 6,
	hospitals: 6,
	fortifications: 5,
	radar: 4,
	grid: 7,
	storage: 5
} as const;

/** Region building levels that contribute to power, with their report labels.
 *  `economy` (the power-plant level) is deliberately absent: its output is
 *  already counted by the Industry and Energy components above. */
export const POWER_BUILDINGS = [
	{ key: "infrastructure", label: "Infrastructure", weight: POWER_WEIGHTS.infrastructure },
	{ key: "education", label: "Education", weight: POWER_WEIGHTS.education },
	{ key: "hospitals", label: "Hospitals", weight: POWER_WEIGHTS.hospitals },
	{ key: "fortifications", label: "Fortifications", weight: POWER_WEIGHTS.fortifications },
	{ key: "radar", label: "Radar coverage", weight: POWER_WEIGHTS.radar },
	{ key: "grid", label: "Power grid", weight: POWER_WEIGHTS.grid },
	{ key: "storage", label: "Energy storage", weight: POWER_WEIGHTS.storage }
] as const;

/** Credits of annual consumption attributed to each civilian. */
export const GDP_PER_CAPITA = 1200;
/** Fallback tax rate when a state has no active taxes (fraction, 0–1). */
export const GDP_DEFAULT_TAX_RATE = 0.15;

type Acc = {
	regions: number;
	regionRating: number;
	population: number;
	military: number;
	ships: number;
	industry: number;
	energy: number;
} & Record<(typeof POWER_BUILDINGS)[number]["key"], number>;

const emptyAcc = (): Acc => ({
	regions: 0,
	regionRating: 0,
	population: 0,
	military: 0,
	ships: 0,
	industry: 0,
	energy: 0,
	infrastructure: 0,
	education: 0,
	hospitals: 0,
	fortifications: 0,
	radar: 0,
	grid: 0,
	storage: 0
});

function componentsFor(a: Acc, population: number): PowerComponent[] {
	return [
		{
			key: "territory",
			label: "Territory",
			value: a.regions,
			detail: `${a.regions} region${a.regions === 1 ? "" : "s"} · local rating ${a.regionRating}`,
			weight: POWER_WEIGHTS.territory,
			points: a.regions * POWER_WEIGHTS.territory
		},
		{
			key: "population",
			label: "Population",
			value: population,
			detail: `${population.toLocaleString()} civilians`,
			weight: POWER_WEIGHTS.population,
			points: Math.round((population / 1000) * POWER_WEIGHTS.population)
		},
		{
			key: "military",
			label: "Armed forces",
			value: a.military,
			detail: `${a.military} attack + defence points`,
			weight: POWER_WEIGHTS.military,
			points: Math.round((a.military / 10) * POWER_WEIGHTS.military)
		},
		{
			key: "ships",
			label: "Fleet",
			value: a.ships,
			detail: `${a.ships} hull${a.ships === 1 ? "" : "s"}`,
			weight: POWER_WEIGHTS.ships,
			points: a.ships * POWER_WEIGHTS.ships
		},
		{
			key: "industry",
			label: "Industry",
			value: a.industry,
			detail: `${a.industry} MW of plant capacity`,
			weight: POWER_WEIGHTS.industry,
			points: Math.round((a.industry / 100) * POWER_WEIGHTS.industry)
		},
		{
			key: "energy",
			label: "Energy grid",
			value: a.energy,
			detail: `${a.energy} MW produced`,
			weight: POWER_WEIGHTS.energy,
			points: Math.round(a.energy * POWER_WEIGHTS.energy)
		},
		...POWER_BUILDINGS.map((b) => ({
			key: b.key,
			label: b.label,
			value: a[b.key],
			detail: `${a[b.key]} level${a[b.key] === 1 ? "" : "s"} across ${a.regions} region${a.regions === 1 ? "" : "s"}`,
			weight: b.weight,
			points: a[b.key] * b.weight
		}))
	];
}

const scoreFor = (a: Acc, population: number) => componentsFor(a, population).reduce((sum, c) => sum + c.points, 0);

/**
 * Compute the power breakdown for every state in one pass of grouped queries,
 * then return one state's details plus the full ranking. The score is an
 * explainable weighted sum — it is shown next to (not instead of) the stored
 * `states.rating`, which is editor-controlled and may be zero.
 */
export async function statePowerReport(db: Database, focusStateId: number): Promise<{
	focus: StatePower | null;
	ranking: StateRankingRow[];
}> {
	const [stateRows, regionRows, unitRows, shipRows, plantRows, energyRows] = await Promise.all([
		db.select({ id: states.id, name: states.name, rating: states.rating }).from(states),
		db
			.select({
				id: regions.id,
				stateId: regions.stateId,
				rating: regions.rating,
				population: regions.population,
				terrain: regions.terrain,
				infrastructure: regions.infrastructure,
				economy: regions.economy,
				education: regions.education,
				hospitals: regions.hospitals,
				fortifications: regions.fortifications,
				radar: regions.radar,
				grid: regions.grid,
				storage: regions.storage
			})
			.from(regions),
		db.select({ stateId: militaryUnits.stateId, unitType: militaryUnits.unitType }).from(militaryUnits),
		db.select({ stateId: fleetShips.stateId }).from(fleetShips),
		db.select({ stateId: powerPlants.stateId, powerOutput: powerPlants.powerOutput }).from(powerPlants),
		db.select({ stateId: stateEnergy.stateId, production: stateEnergy.totalProduction }).from(stateEnergy)
	]);

	const byState = new Map<number, Acc>();
	const acc = (id: number | null): Acc | null => {
		if (id == null) return null;
		let a = byState.get(id);
		if (!a) { a = emptyAcc(); byState.set(id, a); }
		return a;
	};
	const derivedPop = new Map<number, number>();
	for (const r of regionRows) {
		const a = acc(r.stateId);
		if (a) {
			a.regions += 1;
			a.regionRating += r.rating ?? 0;
			a.population += r.population ?? 0;
			for (const b of POWER_BUILDINGS) a[b.key] += Number(r[b.key] ?? 0);
		}
		const derived = regionPopulation(r);
		if (r.stateId != null) derivedPop.set(r.stateId, (derivedPop.get(r.stateId) ?? 0) + derived);
	}
	for (const u of unitRows) {
		const a = acc(u.stateId);
		if (!a) continue;
		const t = MILITARY_UNIT_TEMPLATES[u.unitType];
		a.military += t ? t.baseAttack + t.baseDefense : 10;
	}
	for (const s of shipRows) acc(s.stateId)!.ships += 1;
	for (const p of plantRows) acc(p.stateId)!.industry += p.powerOutput ?? 0;
	for (const e of energyRows) acc(e.stateId)!.energy += e.production ?? 0;

	const populationOf = (id: number, a: Acc) => Math.max(a.population, derivedPop.get(id) ?? 0);
	const ranking: StateRankingRow[] = stateRows
		.map((s) => {
			const a = byState.get(s.id) ?? emptyAcc();
			return {
				id: s.id,
				name: s.name,
				score: scoreFor(a, populationOf(s.id, a)),
				rating: s.rating ?? 0,
				regions: a.regions,
				population: populationOf(s.id, a)
			};
		})
		.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));

	const focusRow = stateRows.find((s) => s.id === focusStateId);
	const focusA = byState.get(focusStateId) ?? emptyAcc();
	const focus = focusRow
		? {
				score: ranking.find((r) => r.id === focusStateId)?.score ?? 0,
				storedRating: focusRow.rating ?? 0,
				components: componentsFor(focusA, populationOf(focusStateId, focusA))
			}
		: null;

	return { focus, ranking };
}

/**
 * GDP is estimated from observed state activity: annualised tax receipts grossed
 * up by the average tax rate (the taxable base), plus per-capita household
 * consumption. Debt/GDP is the percentage that ratio represents.
 */
export async function stateGdp(db: Database, stateId: number, debt: number): Promise<GdpBreakdown> {
	const now = new Date();
	const [taxRows, taxRates, regionRows] = await Promise.all([
		db
			.select({ amount: taxRevenue.amount })
			.from(taxRevenue)
			.where(and(eq(taxRevenue.stateId, stateId), gte(taxRevenue.collectedAt, new Date(now.getTime() - YEAR_MS)))),
		db.select({ taxRate: stateTaxes.taxRate, isActive: stateTaxes.isActive }).from(stateTaxes).where(eq(stateTaxes.stateId, stateId)),
		db
			.select({
				population: regions.population,
				id: regions.id,
				terrain: regions.terrain,
				infrastructure: regions.infrastructure,
				economy: regions.economy,
				education: regions.education,
				hospitals: regions.hospitals
			})
			.from(regions)
			.where(eq(regions.stateId, stateId))
	]);

	const taxesAnnual = taxRows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
	const active = taxRates.filter((r) => r.isActive !== false);
	const taxRate = active.length
		? active.reduce((sum, r) => sum + Number(r.taxRate ?? 0), 0) / active.length / 100
		: GDP_DEFAULT_TAX_RATE;
	const basis = taxRate > 0 ? taxesAnnual / Math.min(1, Math.max(0.01, taxRate)) : taxesAnnual;
	const population = regionRows.reduce((sum, r) => sum + regionPopulation(r), 0);
	const consumption = population * GDP_PER_CAPITA;
	const gdp = Math.round(basis + consumption);

	return {
		gdp,
		debt,
		debtToGdp: gdp > 0 ? Math.round((debt / gdp) * 1000) / 10 : null,
		taxesAnnual,
		taxesBasis: Math.round(basis),
		taxRate,
		consumption,
		population
	};
}

/** Outstanding bonds grouped by lender, so the debt can be traced to people. */
export async function stateDebtCreditors(db: Database, stateId: number): Promise<{ creditors: DebtCreditor[]; total: number }> {
	const rows = await db
		.select({
			userId: stateBonds.userId,
			principal: stateBonds.principal,
			purchasedAt: stateBonds.purchasedAt,
			maturesAt: stateBonds.maturesAt,
			name: userProfiles.name
		})
		.from(stateBonds)
		.leftJoin(accounts, eq(stateBonds.userId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(and(eq(stateBonds.stateId, stateId), isNull(stateBonds.redeemedAt)));

	const byUser = new Map<string, DebtCreditor & { first: number; latest: number; matures: number }>();
	for (const r of rows) {
		const bought = new Date(r.purchasedAt).getTime();
		const matures = new Date(r.maturesAt).getTime();
		const entry = byUser.get(r.userId) ?? {
			userId: r.userId,
			name: r.name ?? "Unknown lender",
			principal: 0,
			bonds: 0,
			firstAt: r.purchasedAt.toISOString(),
			latestAt: r.purchasedAt.toISOString(),
			maturesAt: r.maturesAt.toISOString(),
			first: bought,
			latest: bought,
			matures
		};
		entry.principal += Number(r.principal ?? 0);
		entry.bonds += 1;
		if (bought < entry.first) { entry.first = bought; entry.firstAt = r.purchasedAt.toISOString(); }
		if (bought > entry.latest) { entry.latest = bought; entry.latestAt = r.purchasedAt.toISOString(); }
		if (matures > entry.matures) { entry.matures = matures; entry.maturesAt = r.maturesAt.toISOString(); }
		byUser.set(r.userId, entry);
	}
	const creditors = [...byUser.values()]
		.map(({ first: _f, latest: _l, matures: _m, ...rest }) => rest)
		.sort((a, b) => b.principal - a.principal);
	return { creditors, total: creditors.reduce((sum, c) => sum + c.principal, 0) };
}
