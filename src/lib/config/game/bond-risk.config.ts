// Why a state's bonds yield what they do. The yield is not a flat number: it
// is priced from the state's ability to service its debt. Every input is a
// game-world signal the player can also see on the state's pages.
export const BOND_RISK = {
	/** Base risk before any signal is applied. */
	BASE_RISK: 15,
	BASE_RATE: 4,
	/** Rate = BASE_RATE + (risk / 100) * SPREAD, then clamped and rounded. */
	SPREAD: 6,
	MIN_RATE: 3,
	MAX_RATE: 12,

	DEBT_TO_GDP_PER_POINT: 0.25,
	DEBT_TO_GDP_CAP: 30,
	THIN_CUSHION: 12,
	WEAK_CUSHION: 6,
	AT_WAR: 18,
	CAPITULATED: 25,
	INSTABILITY_PER_POINT: 0.4,
	INSTABILITY_CAP: 15,
	STABLE_DISCOUNT: 5,
	NO_BLOC: 4
} as const;

export type BondGrade = "A" | "B" | "C" | "D" | "E";

export const BOND_GRADES: { grade: BondGrade; from: number; label: string }[] = [
	{ grade: "A", from: 0, label: "Sound" },
	{ grade: "B", from: 22, label: "Steady" },
	{ grade: "C", from: 38, label: "Watch" },
	{ grade: "D", from: 55, label: "Speculative" },
	{ grade: "E", from: 72, label: "Distressed" }
];

export function bondGrade(risk: number): BondGrade {
	let grade: BondGrade = "A";
	for (const row of BOND_GRADES) if (risk >= row.from) grade = row.grade;
	return grade;
}

/** The annual coupon percent implied by a risk score. */
export function bondYield(risk: number): number {
	const raw = BOND_RISK.BASE_RATE + (Math.max(0, Math.min(100, risk)) / 100) * BOND_RISK.SPREAD;
	return Math.round(Math.max(BOND_RISK.MIN_RATE, Math.min(BOND_RISK.MAX_RATE, raw)));
}
