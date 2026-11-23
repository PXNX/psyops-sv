// Artificial intelligence: a state's computing capability and what it buys.
//
// AI is not a unit and never holds ground. It is a capability level (0-5)
// that makes every other domain a little sharper:
//   - cyber offence and defence (pattern-finding, automated exploitation);
//   - reconnaissance fusion (more of a picture from fewer passes);
//   - targeting (air strikes and artillery pick the right aim point);
//   - industry (factory shifts waste less material);
//   - customs (smuggling and blockade-running are spotted sooner).
//
// Raising the level needs money, chips and rare earths — and from level three
// onward, server hardware and whole datacenters. The higher tiers are built on
// the computing chain (industry.config.ts), so a state that sells all its
// chips abroad stays clever but poor, and one without power or cooling water
// cannot think at all.
//
// Pure data and pure functions only: the client imports this for the AI page,
// the server for resolution (services/military/ai.ts).

export const AI_MAX_LEVEL = 5;

export interface AiLevelSpec {
	label: string;
	blurb: string;
	/** Treasury cost of reaching this level from the one below. */
	cost: number;
	/** Chips taken from the state stockpile to reach this level. */
	chips: number;
	/** Rare earths taken from the state stockpile. */
	rareEarth: number;
	/** Server hardware consumed to reach this level (computing base). */
	hardware: number;
	/** Datacenters consumed to reach this level; the top tiers need real sites. */
	datacenters: number;
	/** Cyber operation success bonus (fraction). */
	cyberOffence: number;
	/** Cyber defence bonus (fraction; lowers enemy success). */
	cyberDefence: number;
	/** Added to the side's intel confidence in battle and targeting. */
	reconFusion: number;
	/** Multiplier on factory shift output. */
	production: number;
	/** Extra smuggling/blockade-run detection chance. */
	detection: number;
	/** Research points per day (flavour and future unlocks). */
	researchPerDay: number;
}

export const AI_LEVELS: AiLevelSpec[] = [
	{
		label: "No programme",
		blurb: "Calculators and clerks. Nothing is automated.",
		cost: 0,
		chips: 0,
		rareEarth: 0,
		hardware: 0,
		datacenters: 0,
		cyberOffence: 0,
		cyberDefence: 0,
		reconFusion: 0,
		production: 1,
		detection: 0,
		researchPerDay: 0
	},
	{
		label: "Analytics office",
		blurb: "Statistical models and a small data team: better forecasts, modest automation.",
		cost: 250_000,
		chips: 40,
		rareEarth: 5,
		hardware: 0,
		datacenters: 0,
		cyberOffence: 0.04,
		cyberDefence: 0.04,
		reconFusion: 0.03,
		production: 1.02,
		detection: 0.03,
		researchPerDay: 1
	},
	{
		label: "Machine-learning bureau",
		blurb: "Trained models in signals, logistics and customs. Cyber operations get sharper.",
		cost: 600_000,
		chips: 120,
		rareEarth: 15,
		hardware: 6_000,
		datacenters: 0,
		cyberOffence: 0.08,
		cyberDefence: 0.08,
		reconFusion: 0.06,
		production: 1.05,
		detection: 0.06,
		researchPerDay: 2
	},
	{
		label: "Autonomous systems command",
		blurb: "Drone swarms, automated targeting and adaptive networks. Factories waste less.",
		cost: 1_400_000,
		chips: 300,
		rareEarth: 40,
		hardware: 15_000,
		datacenters: 1,
		cyberOffence: 0.13,
		cyberDefence: 0.12,
		reconFusion: 0.1,
		production: 1.09,
		detection: 0.1,
		researchPerDay: 4
	},
	{
		label: "Integrated AI state",
		blurb: "One fused picture across ministries, fleets and fronts. Hard to surprise, harder to spoof.",
		cost: 3_000_000,
		chips: 700,
		rareEarth: 90,
		hardware: 30_000,
		datacenters: 2,
		cyberOffence: 0.18,
		cyberDefence: 0.17,
		reconFusion: 0.14,
		production: 1.13,
		detection: 0.14,
		researchPerDay: 7
	},
	{
		label: "Frontier programme",
		blurb: "Frontier models and bespoke silicon. The state thinks faster than its rivals can react.",
		cost: 6_000_000,
		chips: 1_500,
		rareEarth: 200,
		hardware: 60_000,
		datacenters: 3,
		cyberOffence: 0.24,
		cyberDefence: 0.22,
		reconFusion: 0.18,
		production: 1.18,
		detection: 0.18,
		researchPerDay: 12
	}
];

export function aiLevelSpec(level: number): AiLevelSpec {
	return AI_LEVELS[Math.max(0, Math.min(AI_MAX_LEVEL, Math.floor(level)))]!;
}

/** Cost of the next level, or null at the cap. */
export function aiUpgradeCost(
	level: number
): { cost: number; chips: number; rareEarth: number; hardware: number; datacenters: number } | null {
	if (level >= AI_MAX_LEVEL) return null;
	const next = aiLevelSpec(level + 1);
	return {
		cost: next.cost,
		chips: next.chips,
		rareEarth: next.rareEarth,
		hardware: next.hardware,
		datacenters: next.datacenters
	};
}

/** AI's multiplier on a factory shift's output. */
export function aiProductionFactor(level: number): number {
	return aiLevelSpec(level).production;
}

/** AI's bonus to a side's intel confidence (added, then clamped by the caller). */
export function aiReconBonus(level: number): number {
	return aiLevelSpec(level).reconFusion;
}

/** AI's bonus to cyber operation success. */
export function aiCyberOffence(level: number): number {
	return aiLevelSpec(level).cyberOffence;
}

/** AI's contribution to cyber defence (lowers the attacker's success). */
export function aiCyberDefence(level: number): number {
	return aiLevelSpec(level).cyberDefence;
}

/** AI's added chance to catch smuggling and blockade runners. */
export function aiDetectionBonus(level: number): number {
	return aiLevelSpec(level).detection;
}

/** Total research a state has banked after `days` at `level`. */
export function aiResearch(level: number, days: number): number {
	return Math.floor(aiLevelSpec(level).researchPerDay * Math.max(0, days));
}
