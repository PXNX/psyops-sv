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
// ── Directed missions ───────────────────────────────────────────────────────
// A player picks a squadron, a mission and a target; the resolver applies the
// effect when the sortie returns. Every mission consumes fuel and pays the
// flying crew experience.

export type AirMissionKind =
	| "strategic_bombing"
	| "logistic_strike"
	| "naval_bombing"
	| "transport"
	| "recon"
	| "refuel"
	| "battlefield_support";

export type AirTargetKind = "region" | "hex" | "friendly_region";

export interface AirMissionDef {
	label: string;
	blurb: string;
	/** The role the flying squadron must have. */
	role: AirRole;
	target: AirTargetKind;
	durationHours: number;
	fuelCost: number;
	/** Damage/supply/fuel magnitude of the sortie. */
	magnitude: number;
}

export const AIR_MISSIONS: Record<AirMissionKind, AirMissionDef> = {
	strategic_bombing: {
		label: "Strategic bombing",
		blurb: "Hits a region's industry and infrastructure from the air.",
		role: "bombing",
		target: "region",
		durationHours: 3,
		fuelCost: 40,
		magnitude: 2
	},
	logistic_strike: {
		label: "Logistic strike",
		blurb: "Cuts the region's roads and supply stocks; convoys and fronts suffer.",
		role: "bombing",
		target: "region",
		durationHours: 2,
		fuelCost: 30,
		magnitude: 25
	},
	naval_bombing: {
		label: "Naval bombing",
		blurb: "Attacks enemy ships in a sea hex from a coastal airfield.",
		role: "naval_strike",
		target: "hex",
		durationHours: 2,
		fuelCost: 35,
		magnitude: 45
	},
	transport: {
		label: "Airlift",
		blurb: "Ferries troops and supply from one of your regions to another.",
		role: "transport",
		target: "friendly_region",
		durationHours: 2,
		fuelCost: 25,
		magnitude: 120
	},
	recon: {
		label: "Reconnaissance",
		blurb: "Sweeps a sea hex for ships and mines, or photographs a region.",
		role: "utility",
		target: "hex",
		durationHours: 1,
		fuelCost: 20,
		magnitude: 100
	},
	refuel: {
		label: "Refuel mission",
		blurb: "Tanker aircraft pass fuel to ships or squadrons at the destination.",
		role: "refuel",
		target: "friendly_region",
		durationHours: 1,
		fuelCost: 15,
		magnitude: 200
	},
	battlefield_support: {
		label: "Battlefield support",
		blurb: "Flies close support over a battle, easing the front line's supply pressure.",
		role: "close_support",
		target: "region",
		durationHours: 1,
		fuelCost: 25,
		magnitude: 20
	}
};

export const AIR_MISSION_IDS = Object.keys(AIR_MISSIONS) as AirMissionKind[];

export function roleStrength(types: string[], role: AirRole): number {
	return types.reduce((sum, t) => {
		const def = aircraft(t);
		return sum + (def?.roles.includes(role) ? def.attack : 0);
	}, 0);
}
