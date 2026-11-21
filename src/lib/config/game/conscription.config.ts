// src/lib/config/game/conscription.config.ts
// How many of a state's people are under arms decides the conscription regime
// it effectively lives under. There is no new database column: the band is
// derived from the standing army against the civilian population, exactly as
// a conscription law shows up in the real world — in the share of a country's
// children who never get to be civilians.
//
// That band then reaches into three places at once:
//   - the labour pool (draftees cannot also work the factories),
//   - replication (families are delayed and separated), and
//   - mortality (training accidents, disease and combat take their toll).
//
// Pure data and pure functions only (client and server).
export type ConscriptionBandKey = "volunteer" | "limited" | "general" | "total";

export interface ConscriptionBand {
	key: ConscriptionBandKey;
	label: string;
	/** Pressure at or above which this band applies, in soldiers per 1,000 civilians. */
	from: number;
	/** Share of the labour pool a conscripted population still supplies. */
	workforceFactor: number;
	/** Multiplier on the birth rate. */
	replicationFactor: number;
	/** Extra annual deaths on top of baseline mortality. */
	mortalityAdd: number;
	/** Stability points at this level of conscription. */
	stability: number;
}

export const CONSCRIPTION_BANDS: ConscriptionBand[] = [
	{
		key: "volunteer",
		label: "Volunteer army",
		from: 0,
		workforceFactor: 1,
		replicationFactor: 1,
		mortalityAdd: 0,
		stability: 0
	},
	{
		key: "limited",
		label: "Limited conscription",
		from: 10,
		workforceFactor: 0.92,
		replicationFactor: 0.92,
		mortalityAdd: 0.003,
		stability: -4
	},
	{
		key: "general",
		label: "General conscription",
		from: 30,
		workforceFactor: 0.78,
		replicationFactor: 0.75,
		mortalityAdd: 0.012,
		stability: -10
	},
	{
		key: "total",
		label: "Total war mobilisation",
		from: 80,
		workforceFactor: 0.6,
		replicationFactor: 0.5,
		mortalityAdd: 0.03,
		stability: -18
	}
];

/** A band's name, for labels and logs. */
export const conscriptionLabel = (key: ConscriptionBandKey) =>
	CONSCRIPTION_BANDS.find((b) => b.key === key)!.label;

/** Soldiers per 1,000 people (civilians plus soldiers). */
export function conscriptionPressure(soldiers: number, civilians: number): number {
	if (soldiers <= 0) return 0;
	const total = Math.max(1, soldiers + Math.max(0, civilians));
	return Math.round((soldiers / total) * 1000 * 10) / 10;
}

/** The regime a state with `perMille` soldiers per 1,000 people lives under. */
export function conscriptionBand(perMille: number): ConscriptionBand {
	return [...CONSCRIPTION_BANDS].reverse().find((b) => perMille >= b.from) ?? CONSCRIPTION_BANDS[0]!;
}

/** Share of the nominal labour pool actually available after the draft. */
export function conscriptionWorkforce(perMille: number): number {
	return conscriptionBand(perMille).workforceFactor;
}
