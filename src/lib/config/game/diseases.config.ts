// src/lib/config/game/diseases.config.ts
// Biological diseases are an outbreak pressure on the civilian population.
// Each disease has a daily spread rate, a share of cases lost each day and a
// mortality rate applied to active cases. What actually happens is scaled by
// three things the state can build: hospitals, clean water and nutrition.
// Pure data and pure functions only (client and server).
export type DiseaseId = "influenza" | "cholera" | "typhus";

export interface Disease {
	id: DiseaseId;
	label: string;
	icon: string;
	description: string;
	/** Daily growth multiplier on active cases before mitigation (0.2 = +20%/day). */
	spreadRate: number;
	/** Daily share of active cases that die before mitigation. */
	mortalityRate: number;
	/** Daily share of active cases that recover. */
	recoveryRate: number;
	/** Cases a new outbreak starts with. */
	seedCases: number;
	/** How strongly each protection slows this disease (0-1 weights). */
	protection: { hospital: number; water: number; nutrition: number };
}

export const DISEASES: Record<DiseaseId, Disease> = {
	influenza: {
		id: "influenza",
		label: "Influenza",
		icon: "🤒",
		description: "A respiratory virus. Crowded, exhausted regions let it rip through a workforce.",
		spreadRate: 0.22,
		mortalityRate: 0.0015,
		recoveryRate: 0.08,
		seedCases: 40,
		protection: { hospital: 0.55, water: 0.1, nutrition: 0.3 }
	},
	cholera: {
		id: "cholera",
		label: "Cholera",
		icon: "💧",
		description: "Waterborne. Spreads where piped water fails and markets cannot feed the poor.",
		spreadRate: 0.28,
		mortalityRate: 0.003,
		recoveryRate: 0.06,
		seedCases: 25,
		protection: { hospital: 0.4, water: 0.6, nutrition: 0.2 }
	},
	typhus: {
		id: "typhus",
		label: "Typhus",
		icon: "🦠",
		description: "A disease of filth and hunger, common where supply lines and clinics have collapsed.",
		spreadRate: 0.18,
		mortalityRate: 0.004,
		recoveryRate: 0.05,
		seedCases: 20,
		protection: { hospital: 0.4, water: 0.3, nutrition: 0.5 }
	}
};

export const DISEASE_IDS = Object.keys(DISEASES) as DiseaseId[];

export const DISEASE_RULES = {
	/** Daily chance a region with failing water/food seeds an outbreak. */
	EMERGENCE_PER_DAY: 0.004,
	/** A need below this sufficiency makes an outbreak more likely. */
	EMERGENCE_THRESHOLD: 0.85,
	/** Fraction of the source's cases that seed a neighbouring region. */
	BORDER_SEED_SHARE: 0.08,
	/** Outbreaks end once active cases fall below this. */
	END_BELOW_CASES: 2,
	/** Outbreaks cannot run longer than this many days without attention. */
	MAX_DURATION_DAYS: 60
} as const;

export interface DiseaseProtection {
	/** Share of hospital demand that can be met (0-1). */
	hospital: number;
	/** Water sufficiency (0-1). */
	water: number;
	/** Food/nutrition sufficiency (0-1). */
	nutrition: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Share of a disease's harm that gets through. Good hospitals, clean water and
 * nutrition each block part of it, weighted by what actually fights that
 * illness; a fully protected region still has a small residual risk.
 */
export function diseaseHarmFactor(disease: Disease, protection: DiseaseProtection): number {
	const blocked =
		disease.protection.hospital * clamp01(protection.hospital) +
		disease.protection.water * clamp01(protection.water) +
		disease.protection.nutrition * clamp01(protection.nutrition);
	return Math.round(Math.max(0.1, 1 - blocked) * 1000) / 1000;
}

/** Daily new cases for an outbreak before recoveries. */
export function diseaseSpread(disease: Disease, cases: number, harm: number): number {
	return Math.round(Math.max(0, cases) * disease.spreadRate * harm);
}

/** Civilian deaths in a day from an outbreak. */
export function diseaseDeaths(disease: Disease, cases: number, harm: number): number {
	return Math.max(0, Math.floor(Math.max(0, cases) * disease.mortalityRate * harm));
}

/** Daily recoveries from an outbreak. */
export function diseaseRecoveries(disease: Disease, cases: number): number {
	return Math.max(0, Math.floor(Math.max(0, cases) * disease.recoveryRate));
}

/** Buildings that blunt outbreaks, for the disease panel's "what helps" list. */
export const DISEASE_COUNTERMEASURES = [
	{ label: "Hospitals", icon: "🏥", detail: "Beds and staff treat the sick and cut both spread and deaths." },
	{ label: "Clean water", icon: "💧", detail: "Water works keep cholera and typhus from taking hold." },
	{ label: "Nutrition", icon: "🌾", detail: "Food sufficiency keeps the workforce strong enough to survive infection." },
	{ label: "Field clinics", icon: "⚕️", detail: "Civic clinics add capacity where state hospitals are thin." }
] as const;
