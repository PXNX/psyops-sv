// Research: the long game behind every domain.
//
// Each area is overseen by one cabinet portfolio and advances in levels. Money
// buys progress; labs (and a good AI programme) produce research points per
// day. Levels give a small, compounding bonus to the thing the area studies:
// better hospitals, tougher antivirus defences, sharper space systems, more
// efficient power, cleaner production, and so on.
//
// Nothing here touches the database. The client shows the trees and costs; the
// server (services/government/research.ts) spends points against the same
// functions, so a drift between the two is a bug in both places at once.

import type { MinisterRole } from "./government.config";

export interface ResearchAreaSpec {
	label: string;
	blurb: string;
	/** Cabinet portfolio that owns this area. */
	portfolio: MinisterRole;
	/** Highest reachable level. */
	maxLevel: number;
	/** Treasury cost of level 1. */
	baseCost: number;
	/** Cost multiplier per level. */
	costGrowth: number;
	/** Effect per level, as a fraction (or multiplier bonus where noted). */
	effectPerLevel: number;
	/** Short description of what the bonus does. */
	effect: string;
	/** Areas that must reach a level first. */
	requires: Partial<Record<string, number>>;
}

export const RESEARCH_AREAS: Record<string, ResearchAreaSpec> = {
	health: {
		label: "Public Health",
		blurb: "Sanitation, vaccines and a healthier population.",
		portfolio: "science_health",
		maxLevel: 5,
		baseCost: 400_000,
		costGrowth: 1.55,
		effectPerLevel: 0.03,
		effect: "reduces civilian mortality",
		requires: {}
	},
	antivirus: {
		label: "Antivirus & Bio-defence",
		blurb: "Detection, containment and countermeasures for bio attacks.",
		portfolio: "science_health",
		maxLevel: 5,
		baseCost: 700_000,
		costGrowth: 1.6,
		effectPerLevel: 0.05,
		effect: "reduces damage from biological attacks and epidemics",
		requires: { health: 1 }
	},
	pharmaceuticals: {
		label: "Pharmaceuticals",
		blurb: "Domestic drug production, so care survives a blockade.",
		portfolio: "science_health",
		maxLevel: 4,
		baseCost: 600_000,
		costGrowth: 1.6,
		effectPerLevel: 0.04,
		effect: "improves hospital capacity and reduces supply dependence",
		requires: { health: 2 }
	},
	power_efficiency: {
		label: "Power Efficiency",
		blurb: "Better turbines, grid management and waste heat recovery.",
		portfolio: "economy_energy",
		maxLevel: 5,
		baseCost: 500_000,
		costGrowth: 1.5,
		effectPerLevel: 0.04,
		effect: "cuts the fuel every power plant burns",
		requires: {}
	},
	production: {
		label: "Production Methods",
		blurb: "Leaner shifts and better machine tools.",
		portfolio: "economy_energy",
		maxLevel: 5,
		baseCost: 450_000,
		costGrowth: 1.5,
		effectPerLevel: 0.04,
		effect: "raises factory output per shift",
		requires: {}
	},
	fabrication: {
		label: "Fabrication",
		blurb: "Precision tooling for chips, electronics and electronics-grade parts.",
		portfolio: "economy_energy",
		maxLevel: 4,
		baseCost: 900_000,
		costGrowth: 1.65,
		effectPerLevel: 0.05,
		effect: "improves chip readiness and equipment output",
		requires: { production: 1 }
	},
	ai: {
		label: "Artificial Intelligence",
		blurb: "Models that sharpen cyber, recon and industry at once.",
		portfolio: "economy_energy",
		maxLevel: 5,
		baseCost: 1_200_000,
		costGrowth: 1.7,
		effectPerLevel: 0.03,
		effect: "adds research points per day and boosts AI capability",
		requires: { fabrication: 1 }
	},
	trade: {
		label: "Trade Networks",
		blurb: "Better lanes, paperwork and partners.",
		portfolio: "foreign_trade",
		maxLevel: 4,
		baseCost: 400_000,
		costGrowth: 1.5,
		effectPerLevel: 0.04,
		effect: "increases trade-lane revenue",
		requires: {}
	},
	supply_chains: {
		label: "Supply-chain Resilience",
		blurb: "Routing around closures, blockades and bad terrain.",
		portfolio: "foreign_trade",
		maxLevel: 4,
		baseCost: 550_000,
		costGrowth: 1.55,
		effectPerLevel: 0.04,
		effect: "reduces losses from disrupted supply lines",
		requires: { trade: 1 }
	},
	land_defence: {
		label: "Land Defence",
		blurb: "Fortifications, armour and infantry doctrine.",
		portfolio: "defence_interior",
		maxLevel: 5,
		baseCost: 600_000,
		costGrowth: 1.55,
		effectPerLevel: 0.04,
		effect: "improves ground combat effectiveness",
		requires: {}
	},
	air_defence: {
		label: "Air Defence",
		blurb: "Radar, interception and hardened airfields.",
		portfolio: "defence_interior",
		maxLevel: 5,
		baseCost: 700_000,
		costGrowth: 1.55,
		effectPerLevel: 0.04,
		effect: "improves air combat and strike survival",
		requires: { land_defence: 1 }
	},
	naval_defence: {
		label: "Naval Defence",
		blurb: "Hulls, sonar and sea-lane protection.",
		portfolio: "defence_interior",
		maxLevel: 4,
		baseCost: 650_000,
		costGrowth: 1.55,
		effectPerLevel: 0.04,
		effect: "improves sea control and convoy survival",
		requires: { land_defence: 1 }
	},
	space: {
		label: "Space Systems",
		blurb: "Launchers, satellites and resilient orbits.",
		portfolio: "defence_interior",
		maxLevel: 4,
		baseCost: 1_000_000,
		costGrowth: 1.65,
		effectPerLevel: 0.04,
		effect: "improves GPS, recon and satellite survivability",
		requires: { ai: 1 }
	},
	interior_security: {
		label: "Interior Security",
		blurb: "Policing, counter-infiltration and border control.",
		portfolio: "defence_interior",
		maxLevel: 4,
		baseCost: 450_000,
		costGrowth: 1.5,
		effectPerLevel: 0.03,
		effect: "reduces infiltration and smuggling success",
		requires: {}
	}
};

export type ResearchAreaId = keyof typeof RESEARCH_AREAS;

export const RESEARCH_AREA_IDS = Object.keys(RESEARCH_AREAS) as ResearchAreaId[];

/** Levels already completed in every area. */
export type ResearchLevels = Partial<Record<ResearchAreaId, number>>;

/** Round costs to a tidy number so the UI reads well. */
const tidy = (n: number) => Math.round(n / 1000) * 1000;

export function researchArea(id: string): ResearchAreaSpec | null {
	return RESEARCH_AREAS[id] ?? null;
}

export function levelOf(levels: ResearchLevels, id: ResearchAreaId): number {
	return Math.max(0, Math.min(RESEARCH_AREAS[id].maxLevel, Math.floor(levels[id] ?? 0)));
}

/** Cost of advancing from `level` to the next one, or null at the cap. */
export function researchCost(id: ResearchAreaId, level: number): number | null {
	const spec = RESEARCH_AREAS[id];
	const current = Math.max(0, Math.floor(level));
	if (current >= spec.maxLevel) return null;
	return tidy(spec.baseCost * Math.pow(spec.costGrowth, current));
}

/** Treasury needed to go from `from` up to `to` (capped at the area's max). */
export function researchTotalCost(id: ResearchAreaId, from: number, to: number): number {
	let total = 0;
	for (let level = Math.max(0, Math.floor(from)); level < Math.min(to, RESEARCH_AREAS[id].maxLevel); level++) {
		total += researchCost(id, level) ?? 0;
	}
	return total;
}

/** Whether every prerequisite area has at least its required level. */
export function researchPrerequisitesMet(id: ResearchAreaId, levels: ResearchLevels): boolean {
	return Object.entries(RESEARCH_AREAS[id].requires).every(
		([other, needed]) => levelOf(levels, other as ResearchAreaId) >= (needed ?? 0)
	);
}

/** An area can be advanced when it is unlocked and not yet maxed. */
export function canResearch(id: ResearchAreaId, levels: ResearchLevels): boolean {
	return researchPrerequisitesMet(id, levels) && researchCost(id, levelOf(levels, id)) !== null;
}

/** Fractional bonus a completed level provides. */
export function researchBonus(id: ResearchAreaId, levels: ResearchLevels): number {
	return levelOf(levels, id) * RESEARCH_AREAS[id].effectPerLevel;
}

/** Areas of a cabinet portfolio. */
export function portfolioResearch(portfolio: MinisterRole): ResearchAreaId[] {
	return RESEARCH_AREA_IDS.filter((id) => RESEARCH_AREAS[id].portfolio === portfolio);
}

/** Areas a state may currently advance, in stable declaration order. */
export function availableResearch(levels: ResearchLevels): ResearchAreaId[] {
	return RESEARCH_AREA_IDS.filter((id) => canResearch(id, levels));
}

/** Research points produced per day by `labs` labs at a given AI level. */
export function researchPointsPerDay(labs: number, aiLevel = 0): number {
	return Math.max(0, Math.floor(labs)) * (1 + 0.25 * Math.max(0, aiLevel));
}

/** Progress towards the next level, clamped to 0..1. */
export function researchProgress(points: number, cost: number | null): number {
	if (cost === null || cost <= 0) return 1;
	return Math.max(0, Math.min(1, points / cost));
}

/** Total treasury spent on an area up to its current level. */
export function researchSpent(id: ResearchAreaId, levels: ResearchLevels): number {
	return researchTotalCost(id, 0, levelOf(levels, id));
}
