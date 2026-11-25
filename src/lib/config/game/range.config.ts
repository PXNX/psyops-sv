// Reach of the air arm and the fleet. Aircraft fly from an airbase (a region
// building enacted by law) and only reach targets within their type's
// `rangeHexes` of it; ships sail only as far as the fuel in their tanks
// carries them. Shared by the services that enforce it and the consoles that
// explain it, so the numbers in the UI and the checks always agree.
import { aircraft } from "./aircraft.config";
import { hexDistance, hexFromLatLon, type Hex, type ShipClassDef } from "./fleet.config";

export interface RangeVerdict {
	ok: boolean;
	/** Hex steps from base (or ship) to target; null when there is no base. */
	distance: number | null;
	range: number;
	/** Why the order is refused, in player language. */
	reason: string | null;
}

/** A region's position on the theatre's hex grid. */
export function regionHex(region: { latitude: number | string; longitude: number | string }): Hex {
	return hexFromLatLon(Number(region.latitude), Number(region.longitude));
}

/** Older squadron unit types flown by the strike planner, mapped onto the air arm. */
const AIRCRAFT_ALIASES: Record<string, string> = { bomber_squadron: "bomber", fighter_squadron: "fighterjet" };

/** The air-arm definition of a unit type, including the older squadron types. */
export function aircraftOf(unitType: string) {
	return aircraft(AIRCRAFT_ALIASES[unitType] ?? unitType);
}

/** Whether a squadron based at `base` (null: not at an airbase) can reach `target`. */
export function airReach(unitType: string, base: Hex | null, target: Hex): RangeVerdict {
	const def = aircraftOf(unitType);
	if (!def) return { ok: false, distance: null, range: 0, reason: "That unit is not an aircraft." };
	if (!base)
		return {
			ok: false,
			distance: null,
			range: def.rangeHexes,
			reason: "The squadron is not stationed at an airbase. Rebase it first."
		};
	const distance = hexDistance(base, target);
	if (distance > def.rangeHexes)
		return {
			ok: false,
			distance,
			range: def.rangeHexes,
			reason: `Out of range: the target is ${distance} hexes from the airbase, a ${def.label.toLowerCase()} reaches ${def.rangeHexes}.`
		};
	return { ok: true, distance, range: def.rangeHexes, reason: null };
}

/** The closest airbase to `from`, or null when there is none. */
export function nearestAirbase<T extends { hex: Hex }>(from: Hex, bases: T[]): T | null {
	let best: T | null = null;
	let bestDistance = Infinity;
	for (const base of bases) {
		const d = hexDistance(from, base.hex);
		if (d < bestDistance) {
			best = base;
			bestDistance = d;
		}
	}
	return best;
}

/** How many hexes a ship can still sail on the fuel it carries. */
export function shipReachHexes(def: Pick<ShipClassDef, "fuelPerHex">, fuel: number): number {
	if (def.fuelPerHex <= 0) return Infinity;
	return Math.max(0, Math.floor(fuel / def.fuelPerHex));
}

/** Full-tank endurance of a ship class, in hexes. */
export function shipEnduranceHexes(def: Pick<ShipClassDef, "fuelPerHex" | "fuelCapacity">): number {
	return shipReachHexes(def, def.fuelCapacity);
}

/** Whether a route of `steps` hexes is within the ship's fuel range. */
export function shipMoveReach(
	def: Pick<ShipClassDef, "fuelPerHex" | "label">,
	fuel: number,
	steps: number
): RangeVerdict {
	const range = shipReachHexes(def, fuel);
	if (steps > range)
		return {
			ok: false,
			distance: steps,
			range,
			reason: `Out of range: the route is ${steps} hexes, the ${def.label.toLowerCase()} has fuel for ${range}. Refuel at a port first.`
		};
	return { ok: true, distance: steps, range, reason: null };
}
