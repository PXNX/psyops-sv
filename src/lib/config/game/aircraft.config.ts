// Air arm: the squadron types a state can train, what each one is good at,
// and how far it reaches. Roles are shared by the battle resolver, the naval
// strike pass and the aerial map mode, so adding a squadron here changes the
// same numbers everywhere.

export type AircraftId =
	| "transport_aircraft"
	| "bomber"
	| "tanker_aircraft"
	| "fighterjet"
	| "close_air_support"
	| "naval_bomber"
	| "helicopter";

export type AirRole =
	| "transport"
	| "bombing"
	| "refuel"
	| "air_superiority"
	| "close_support"
	| "naval_strike"
	| "utility";

export interface AircraftDef {
	id: AircraftId;
	label: string;
	short: string;
	roles: AirRole[];
	/** Raw attack/defence used by battle and strike resolution. */
	attack: number;
	defense: number;
	/** Reach in sea hexes from its home region. */
	rangeHexes: number;
	/** Troops/supply a transport can lift. */
	transportCapacity: number;
	/** Fuel a tanker can pass on. */
	refuelCapacity: number;
	/** Anti-submarine strength (naval bombers and helicopters). */
	antiSub: number;
	fuelCapacity: number;
	fuelPerSortie: number;
	blurb: string;
}

export const AIRCRAFT: Record<AircraftId, AircraftDef> = {
	transport_aircraft: {
		id: "transport_aircraft",
		label: "Transport aircraft",
		short: "AIRLIFT",
		roles: ["transport"],
		attack: 8,
		defense: 20,
		rangeHexes: 7,
		transportCapacity: 400,
		refuelCapacity: 0,
		antiSub: 0,
		fuelCapacity: 160,
		fuelPerSortie: 20,
		blurb: "Lifts troops and supply between regions; slow and defenceless without an escort."
	},
	bomber: {
		id: "bomber",
		label: "Bomber",
		short: "BOMB",
		roles: ["bombing"],
		attack: 80,
		defense: 22,
		rangeHexes: 9,
		transportCapacity: 0,
		refuelCapacity: 0,
		antiSub: 0,
		fuelCapacity: 240,
		fuelPerSortie: 40,
		blurb: "Long-range strategic bombing of industry and infrastructure deep inland."
	},
	tanker_aircraft: {
		id: "tanker_aircraft",
		label: "Tanker aircraft",
		short: "TANKER",
		roles: ["refuel"],
		attack: 6,
		defense: 25,
		rangeHexes: 8,
		transportCapacity: 0,
		refuelCapacity: 300,
		antiSub: 0,
		fuelCapacity: 200,
		fuelPerSortie: 25,
		blurb: "Refuels friendly aircraft in flight, extending every strike's reach."
	},
	fighterjet: {
		id: "fighterjet",
		label: "Fighter jet",
		short: "FIGHTER",
		roles: ["air_superiority"],
		attack: 65,
		defense: 45,
		rangeHexes: 6,
		transportCapacity: 0,
		refuelCapacity: 0,
		antiSub: 0,
		fuelCapacity: 180,
		fuelPerSortie: 30,
		blurb: "Wins air superiority and intercepts hostile aircraft before they reach the fleet."
	},
	close_air_support: {
		id: "close_air_support",
		label: "Close air support",
		short: "CAS",
		roles: ["close_support"],
		attack: 55,
		defense: 30,
		rangeHexes: 4,
		transportCapacity: 0,
		refuelCapacity: 0,
		antiSub: 0,
		fuelCapacity: 140,
		fuelPerSortie: 22,
		blurb: "Flies short sorties directly in support of ground troops in battle."
	},
	naval_bomber: {
		id: "naval_bomber",
		label: "Naval bomber",
		short: "NAVBOMB",
		roles: ["naval_strike"],
		attack: 75,
		defense: 28,
		rangeHexes: 8,
		transportCapacity: 0,
		refuelCapacity: 0,
		antiSub: 8,
		fuelCapacity: 220,
		fuelPerSortie: 36,
		blurb: "Strikes surface ships from coastal airfields and hunts submarines offshore."
	},
	helicopter: {
		id: "helicopter",
		label: "Helicopter",
		short: "HELO",
		roles: ["utility", "transport", "naval_strike"],
		attack: 22,
		defense: 24,
		rangeHexes: 3,
		transportCapacity: 80,
		refuelCapacity: 0,
		antiSub: 10,
		fuelCapacity: 120,
		fuelPerSortie: 18,
		blurb: "Versatile rotorcraft: lifts small parties and is the sharpest submarine hunter in the air."
	}
};

export const AIRCRAFT_IDS = Object.keys(AIRCRAFT) as AircraftId[];
export const AIR_ROLES: AirRole[] = ["transport", "bombing", "refuel", "air_superiority", "close_support", "naval_strike", "utility"];

export const AIR_ROLE_LABEL: Record<AirRole, string> = {
	transport: "Airlift",
	bombing: "Strategic bombing",
	refuel: "Aerial refuelling",
	air_superiority: "Air superiority",
	close_support: "Close air support",
	naval_strike: "Naval strike",
	utility: "Utility / ASW"
};

export function aircraft(id: string): AircraftDef | undefined {
	return AIRCRAFT[id as AircraftId];
}

/** Sum of a role's attack strength for a list of unit types. */
export function roleStrength(types: string[], role: AirRole): number {
	return types.reduce((sum, t) => {
		const def = aircraft(t);
		return sum + (def?.roles.includes(role) ? def.attack : 0);
	}, 0);
}
