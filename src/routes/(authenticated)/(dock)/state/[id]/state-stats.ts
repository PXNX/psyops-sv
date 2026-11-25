// The figures on a state's page, as the viewer may see them: exact for their
// own state, an estimate with an interval (or hidden) for foreign states.
import type { StateIntel } from "#lib/server/services/military/state-intel.js";
import type { Estimate, StatSpec } from "#lib/utils/intel-estimate.js";

export const RESOURCE_NAMES = ["oil", "steel", "chromium", "tungsten", "rubber", "aluminium"] as const;
export type ResourceName = (typeof RESOURCE_NAMES)[number];

const SPECS = {
	civilians: { group: "population", scale: 1_000 },
	residents: { group: "population", scale: 10 },
	regionPopulation: { group: "population", hideBelow: 0.1, scale: 5 },
	power: { group: "military", hideBelow: 0.15, scale: 100 },
	debt: { group: "economy", hideBelow: 0.2, scale: 10_000 },
	gdp: { group: "economy", hideBelow: 0.1, scale: 10_000 },
	debtToGdp: { group: "economy", hideBelow: 0.3, scale: 20 },
	energyUsed: { group: "energy", hideBelow: 0.25, scale: 50 },
	energyAvailable: { group: "energy", hideBelow: 0.25, scale: 50 },
	resource: { group: "resources", hideBelow: 0.1, scale: 20 }
} satisfies Record<string, StatSpec>;

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
