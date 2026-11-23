// Datacenters: what the last link in the fabrication chain actually buys.
//
// Chips → electronics → hardware → datacenter. A state's stock of hardware and
// datacenters is its civilian computing base: the same machines that run AI
// programmes also find exploits, correlate signals and hide their own traffic.
// The base is physical, so it can be throttled by a brownout, poisoned water,
// a supply-chain strike or a blockade — see the energy, civilian-supply and
// logistics configs for the ways it can be denied.
//
// The numbers here are deliberately modest per site and capped: a handful of
// datacenters sharpens a state, it does not make it omniscient.
//
// Pure data and pure functions only: both client and server import this.

export const DATACENTER_BONUS = {
	/** Fully supplied computing sites counted before the cap applies. */
	CAP: 6,
	/** Loose hardware contributes one site's worth of capacity per this many units. */
	HARDWARE_PER_SITE: 60,
	/** Added chance a cyber operation succeeds, per site. */
	CYBER_OFFENCE_PER_SITE: 0.03,
	/** Lowered chance an operation is attributed, per site. */
	ATTRIBUTION_PER_SITE: 0.015,
	/** Added difficulty for a target's own cyber defence, per site. */
	CYBER_DEFENCE_PER_SITE: 0.025,
	/** Extra research points banked each day, per site. */
	RESEARCH_PER_SITE: 2
} as const;

/** A site needs a lot of steady power and cooling water to actually work. */
export const DATACENTER_SITE = {
	MIN_ELECTRICITY_SUFFICIENCY: 0.85,
	MIN_WATER_SUFFICIENCY: 0.85
} as const;

/** Whether a built site has the utilities it needs to contribute. */
export function datacenterOperational(electricity: number, water: number): boolean {
	return (
		electricity >= DATACENTER_SITE.MIN_ELECTRICITY_SUFFICIENCY &&
		water >= DATACENTER_SITE.MIN_WATER_SUFFICIENCY
	);
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * How many sites' worth of computing a state actually has. A built datacenter
 * counts in full; loose hardware counts more slowly, so building a site is
 * the efficient choice but a stockpile still helps.
 */
export function datacenterCapacity(hardware: number, datacenters: number): number {
	const loose = Math.floor(Math.max(0, hardware) / DATACENTER_BONUS.HARDWARE_PER_SITE);
	return Math.min(DATACENTER_BONUS.CAP, Math.max(0, Math.floor(datacenters)) + loose);
}

export interface DatacenterCyberBonus {
	/** Fraction added to the attacker's cyber success chance. */
	offence: number;
	/** Fraction added to a defender's cyber resistance. */
	defence: number;
	/** Fraction subtracted from attribution (negative = more deniable). */
	attribution: number;
}

/** Cyber/hacking edge from a computing base, as fractions for operationOdds. */
export function datacenterCyberBonus(hardware: number, datacenters: number): DatacenterCyberBonus {
	const sites = datacenterCapacity(hardware, datacenters);
	return {
		offence: round3(sites * DATACENTER_BONUS.CYBER_OFFENCE_PER_SITE),
		defence: round3(sites * DATACENTER_BONUS.CYBER_DEFENCE_PER_SITE),
		attribution: round3(-sites * DATACENTER_BONUS.ATTRIBUTION_PER_SITE)
	};
}

/** Research points per day contributed by the same computing base. */
export function datacenterResearch(hardware: number, datacenters: number): number {
	return datacenterCapacity(hardware, datacenters) * DATACENTER_BONUS.RESEARCH_PER_SITE;
}
