// The figures on a state's page, as the viewer may see them: exact for their
// own state, an estimate with an interval (or hidden) for foreign states.
import {
	estimateRank,
	exactStat,
	type Estimate,
	type IntelGroup,
	type StateIntel,
	type StatSpec
} from "#lib/utils/intel-estimate.js";

export const RESOURCE_NAMES = ["oil", "steel", "chromium", "tungsten", "rubber", "aluminium"] as const;
export type ResourceName = (typeof RESOURCE_NAMES)[number];

export const SPECS = {
	civilians: { group: "population", scale: 1_000 },
	residents: { group: "population", scale: 10 },
	regionPopulation: { group: "population", hideBelow: 0.1, scale: 5 },
	power: { group: "military", hideBelow: 0.15, scale: 100 },
	debt: { group: "economy", hideBelow: 0.2, scale: 10_000 },
	gdp: { group: "economy", hideBelow: 0.1, scale: 10_000 },
	debtToGdp: { group: "economy", hideBelow: 0.3, scale: 20 },
	energyUsed: { group: "energy", hideBelow: 0.25, scale: 50 },
	energyAvailable: { group: "energy", hideBelow: 0.25, scale: 50 },
	resource: { group: "resources", hideBelow: 0.1, scale: 20 },
	// Subpages: the detail behind the headline figures.
	regionResidents: { group: "population", hideBelow: 0.1, scale: 5 },
	regionDensity: { group: "population", hideBelow: 0.1, scale: 10 },
	workforce: { group: "population", hideBelow: 0.15, scale: 1_000 },
	ratePerThousand: { group: "population", hideBelow: 0.25, scale: 10 },
	growthPercent: { group: "population", hideBelow: 0.25, scale: 2, nonNegative: false },
	contribution: { group: "population", hideBelow: 0.4, scale: 100, nonNegative: false },
	outbreakCases: { group: "population", scale: 100 },
	underArms: { group: "military", hideBelow: 0.15, scale: 100 },
	perThousand: { group: "military", hideBelow: 0.15, scale: 10 },
	powerPart: { hideBelow: 0.25, scale: 20 },
	money: { group: "economy", hideBelow: 0.2, scale: 10_000 },
	energyMw: { group: "energy", hideBelow: 0.25, scale: 50 },
	energyPercent: { group: "energy", hideBelow: 0.25, scale: 20 },
	energyCount: { group: "energy", hideBelow: 0.25, scale: 5 }
} satisfies Record<string, StatSpec | Omit<StatSpec, "group">>;

export interface RawStateStats {
	civilians: number;
	residents: number;
	power: number;
	debt: number;
	gdp: number;
	debtToGdp: number | null;
	energy: { used: number; available: number } | null;
	regions: { id: number; population: number }[];
	resources: Record<ResourceName, number>;
}

export interface StateStats {
	civilians: Estimate;
	residents: Estimate;
	power: Estimate;
	debt: Estimate;
	gdp: Estimate;
	debtToGdp: Estimate | null;
	energy: { used: Estimate; available: Estimate } | null;
	regionPopulation: Record<number, Estimate>;
	resources: Partial<Record<ResourceName, Estimate>>;
}

export function stateStats(intel: StateIntel, raw: RawStateStats): StateStats {
	const e = intel.estimate;
	const resources: Partial<Record<ResourceName, Estimate>> = {};
	for (const name of RESOURCE_NAMES) {
		// A state without a resource shows nothing, as before.
		if (raw.resources[name]) resources[name] = e(`resource:${name}`, raw.resources[name], SPECS.resource);
	}
	return {
		civilians: e("civilians", raw.civilians, SPECS.civilians),
		residents: e("residents", raw.residents, SPECS.residents),
		power: e("power", raw.power, SPECS.power),
		debt: e("debt", raw.debt, SPECS.debt),
		gdp: e("gdp", raw.gdp, SPECS.gdp),
		debtToGdp: raw.debtToGdp == null ? null : e("debtToGdp", raw.debtToGdp, SPECS.debtToGdp),
		energy: raw.energy
			? {
					used: e("energyUsed", raw.energy.used, SPECS.energyUsed),
					available: e("energyAvailable", raw.energy.available, SPECS.energyAvailable)
				}
			: null,
		regionPopulation: Object.fromEntries(
			raw.regions.map((r) => [r.id, e(`region:${r.id}`, r.population, SPECS.regionPopulation)])
		),
		resources
	};
}

// ── Subpages ────────────────────────────────────────────────────────────────
// Each takes the true figures a subpage loads and returns what the viewer may
// see. Stat keys match the main page's, so the same figure shows the same
// estimate on both. Public facts (names, region ownership, the stored rating,
// tax rates, bond grades) pass through unchanged.

const rankDesc =
	<T>(by: (row: T) => Estimate) =>
	(a: T, b: T) =>
		estimateRank(by(b)) - estimateRank(by(a));

/** Which intel group sheds light on each power component. */
const POWER_GROUP: Record<string, IntelGroup> = {
	population: "population",
	military: "military",
	ships: "military",
	fortifications: "military",
	radar: "military",
	industry: "energy",
	energy: "energy",
	grid: "energy",
	storage: "energy"
};

export interface RawPowerComponent {
	key: string;
	label: string;
	value: number;
	detail: string;
	weight: number;
	points: number;
}

/** The power page: score, its components and the ranking of every state. */
export function powerView(
	intel: StateIntel,
	focus: { score: number; storedRating: number; components: RawPowerComponent[] } | null,
	ranking: { id: number; name: string; score: number; rating: number; regions: number; population: number }[],
	intelFor: (stateId: number) => StateIntel
) {
	const view = focus && {
		score: intel.estimate("power", focus.score, SPECS.power),
		storedRating: focus.storedRating,
		components: focus.components.map((c) => {
			// Territory is a count of regions on the map: public.
			if (c.key === "territory" || intel.exact) {
				return {
					key: c.key,
					label: c.label,
					detail: c.detail as string | null,
					value: exactStat(c.value, "military"),
					points: exactStat(c.points, "military")
				};
			}
			const spec = { ...SPECS.powerPart, group: POWER_GROUP[c.key] ?? "economy" };
			return {
				key: c.key,
				label: c.label,
				detail: null,
				// Population is the civilian count: the same estimate as everywhere else.
				value:
					c.key === "population"
						? intel.estimate("civilians", c.value, SPECS.civilians)
						: intel.estimate(`power:${c.key}:value`, c.value, spec),
				points: intel.estimate(`power:${c.key}`, c.points, spec)
			};
		})
	};
	const rows = ranking
		.map((r) => {
			const i = intelFor(r.id);
			return {
				id: r.id,
				name: r.name,
				rating: r.rating,
				regions: r.regions,
				score: i.estimate("power", r.score, SPECS.power),
				population: i.estimate("civilians", r.population, SPECS.civilians)
			};
		})
		.sort(rankDesc((r) => r.score));
	return { power: view, ranking: rows };
}

/** The residents page: players living in each region and in total. */
export function residentsView(
	intel: StateIntel,
	regions: { id: number; name: string; population: number }[],
	history: number[]
) {
	const total = regions.reduce((sum, r) => sum + r.population, 0);
	return {
		total: intel.estimate("residents", total, SPECS.residents),
		regions: regions
			.map((r) => ({
				id: r.id,
				name: r.name,
				population: intel.estimate(`residents:region:${r.id}`, r.population, SPECS.regionResidents)
			}))
			.sort(rankDesc((r) => r.population)),
		// A day-by-day series can't be fogged meaningfully, so foreigners don't get it.
		history: intel.exact ? history : null
	};
}

export interface RawGdp {
	gdp: number;
	debtToGdp: number | null;
	taxesAnnual: number;
	taxesBasis: number;
	taxRate: number;
	consumption: number;
	population: number;
}

/** The debt page: debt, the GDP estimate behind debt/GDP, and the lender book. */
export function debtView<C extends { total: number }>(
	intel: StateIntel,
	raw: {
		debt: number;
		gdp: RawGdp;
		creditors: C;
		risk: { components: { key: string; label: string; detail: string; points: number }[] };
	}
) {
	const e = intel.estimate;
	return {
		debt: e("debt", raw.debt, SPECS.debt),
		gdp: {
			gdp: e("gdp", raw.gdp.gdp, SPECS.gdp),
			debtToGdp: raw.gdp.debtToGdp == null ? null : e("debtToGdp", raw.gdp.debtToGdp, SPECS.debtToGdp),
			// Tax rates are published law.
			taxRate: raw.gdp.taxRate,
			taxesAnnual: e("gdp:taxes", raw.gdp.taxesAnnual, SPECS.money),
			taxesBasis: e("gdp:basis", raw.gdp.taxesBasis, SPECS.money),
			consumption: e("gdp:consumption", raw.gdp.consumption, SPECS.money),
			population: e("civilians", raw.gdp.population, SPECS.civilians)
		},
		// Who lent and how much stays with the treasury; foreigners see the sum only.
		creditors: intel.exact ? raw.creditors : null,
		lenderTotal: e("debt:lenders", raw.creditors.total, SPECS.money),
		// The rating itself is public (bonds are sold on it); the line quoting
		// the treasury's books is not.
		riskComponents: raw.risk.components.map((c) =>
			!intel.exact && c.key === "debt" ? { ...c, detail: "owed against the cash in its treasury" } : c
		)
	};
}

export interface RawCivilians {
	civilians: number;
	trend: number[];
	regions: {
		id: number;
		name: string;
		logo: string;
		population: number;
		density: number;
		workforce: number;
		workforceShare: number;
	}[];
	demographics: {
		fertility: number;
		mortality: number;
		annualRate: number;
		netPerYear: number;
		contributions: { label: string; value: number }[];
	};
	manpower: { underArms: number; perThousand: number; regime: string; available: number };
	workforce: number;
	outbreaks: { id: number; cases: number }[];
}

/** The civilians page: population, vital rates, manpower and the regional split. */
export function civiliansView<O extends { id: number; cases: number }>(
	intel: StateIntel,
	raw: Omit<RawCivilians, "outbreaks"> & { outbreaks: O[] }
) {
	const e = intel.estimate;
	const perK = (n: number) => Math.round(n * 10_000) / 10;
	return {
		civilians: e("civilians", raw.civilians, SPECS.civilians),
		trend: intel.exact ? raw.trend : null,
		regions: raw.regions
			.map((r) => ({
				id: r.id,
				name: r.name,
				logo: r.logo,
				population: e(`region:${r.id}`, r.population, SPECS.regionPopulation),
				density: e(`density:${r.id}`, r.density, SPECS.regionDensity),
				workforce: e(`workforce:${r.id}`, r.workforce, SPECS.workforce),
				workforceShare: intel.exact ? r.workforceShare : null
			}))
			.sort(rankDesc((r) => r.population)),
		demographics: {
			fertility: e("fertility", perK(raw.demographics.fertility), SPECS.ratePerThousand),
			mortality: e("mortality", perK(raw.demographics.mortality), SPECS.ratePerThousand),
			annualRate: e("growth", Math.round(raw.demographics.annualRate * 1000) / 10, SPECS.growthPercent),
			contributions: raw.demographics.contributions.map((c) => ({
				label: c.label,
				value: e(`growth:${c.label}`, Math.round(c.value), SPECS.contribution)
			}))
		},
		manpower: {
			// The service regime is law, announced in public.
			regime: raw.manpower.regime,
			underArms: e("underArms", raw.manpower.underArms, SPECS.underArms),
			perThousand: e("underArms:perK", raw.manpower.perThousand, SPECS.perThousand),
			available: e("manpower", raw.manpower.available, SPECS.civilians)
		},
		workforce: e("workforce", raw.workforce, SPECS.workforce),
		// Which disease broke out where is news; the case count is an estimate.
		outbreaks: raw.outbreaks.map((o) => ({ ...o, cases: e(`outbreak:${o.id}`, o.cases, SPECS.outbreakCases) }))
	};
}

export interface RawEnergyUsage {
	production: number;
	used: number;
	perCapita: number;
	components: { key: string; label: string; detail: string; mw: number; share: number }[];
	fuel: { civilian: number; military: number; exported: number };
	factors: { fuel: number; maintenance: number };
	plants: number;
	plantOutput: number;
	gridLevels: number;
	storageLevels: number;
	regions: number;
	lastTick: string | null;
}

/** The energy usage page: the ledger, the policy split, and the consumption ranking. */
export function energyUsageView(
	intel: StateIntel,
	usage: RawEnergyUsage | null,
	ranking: { id: number; name: string; used: number; perCapita: number; population: number }[],
	history: { at: string; power: number; usedPower: number }[],
	intelFor: (stateId: number) => StateIntel
) {
	const e = intel.estimate;
	const view = usage && {
		production: e("energyProduction", usage.production, SPECS.energyMw),
		used: e("energyUsed", usage.used, SPECS.energyUsed),
		utilisation: e(
			"energyUtilisation",
			usage.production > 0 ? Math.round((usage.used / usage.production) * 100) : 0,
			SPECS.energyPercent
		),
		perCapita: e("energyPerCapita", usage.perCapita, SPECS.energyMw),
		components: usage.components.map((c) => ({
			key: c.key,
			label: c.label,
			detail: c.detail,
			mw: e(`energy:${c.key}`, c.mw, SPECS.energyMw),
			share: e(`energy:${c.key}:share`, c.share, SPECS.energyPercent)
		})),
		fuel: {
			civilian: e("fuel:civilian", usage.fuel.civilian, SPECS.energyMw),
			military: e("fuel:military", usage.fuel.military, SPECS.energyMw),
			exported: e("fuel:exported", usage.fuel.exported, SPECS.energyMw)
		},
		factors: {
			fuel: e("energy:fuelFactor", usage.factors.fuel, SPECS.energyPercent),
			maintenance: e("energy:maintenance", usage.factors.maintenance, SPECS.energyPercent)
		},
		plants: e("energy:plants", usage.plants, SPECS.energyCount),
		plantOutput: e("energy:plantOutput", usage.plantOutput, SPECS.energyMw),
		gridLevels: e("energy:grid", usage.gridLevels, SPECS.energyCount),
		storageLevels: e("energy:storage", usage.storageLevels, SPECS.energyCount),
		// Region count and the (global) tick time are public.
		regions: usage.regions,
		lastTick: usage.lastTick
	};
	const rows = ranking
		.map((r) => {
			const i = intelFor(r.id);
			return {
				id: r.id,
				name: r.name,
				used: i.estimate("energyUsed", r.used, SPECS.energyUsed),
				perCapita: i.estimate("energyPerCapita", r.perCapita, SPECS.energyMw),
				population: i.estimate("civilians", r.population, SPECS.civilians)
			};
		})
		.sort(rankDesc((r) => r.used));
	return { usage: view, ranking: rows, history: intel.exact ? history : [] };
}
