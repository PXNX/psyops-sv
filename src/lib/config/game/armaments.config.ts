// src/lib/config/game/armaments.config.ts
// A separate market for military hardware. Anything sold to a state outside
// the seller's bloc needs the sign-off of that state's defence minister (or
// its president); sales inside the bloc are free to trade.
import { CIVILIAN_WORK } from "./workforce.config";

/** The finished goods that count as armaments. */
export const ARMAMENT_GOODS = [
	"rifles",
	"ammunition",
	"artillery",
	"vehicles",
	"explosives"
] as const;
export type ArmamentGood = (typeof ARMAMENT_GOODS)[number];

export const ARMAMENTS = {
	/** Minimum offer. */
	MIN_QUANTITY: 1,
	/** Maximum units in one offer. */
	MAX_QUANTITY: 100_000,
	/** The office that signs off on sales beyond the bloc. */
	APPROVING_MINISTRY: "defense" as const,
	/** Flat fee per approved external sale, paid into the seller's treasury. */
	EXPORT_TAX_PERCENT: 5
} as const;

export function isArmament(good: string): good is ArmamentGood {
	return (ARMAMENT_GOODS as readonly string[]).includes(good);
}

/** Reference value of one unit, for suggested prices and reporting. */
export function armamentValue(good: string): number {
	return CIVILIAN_WORK.GOOD_VALUE[good] ?? CIVILIAN_WORK.DEFAULT_GOOD_VALUE;
}
