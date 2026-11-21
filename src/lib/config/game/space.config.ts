// Space: satellites, launch, navigation, early warning and anti-satellite warfare.
//
// A state's space programme is a constellation of satellites, each of a kind:
//   - reconnaissance (EO/IR/SAR) sharpens intel and adds wide-area passes;
//   - navigation (GPS/INS) gives precision-guided weapons their accuracy;
//   - communications links the army and keeps command from degrading;
//   - early warning spots missile launches and incoming strikes.
//
// Satellites are fragile. An anti-satellite strike can blind a rival's
// constellation, and jamming an uplink degrades it for a while. Because space
// supports every other domain, losing it quietly hurts everywhere.
//
// Pure data and pure functions only: the client imports this for the space
// overview, the server for resolution (services/military/space.ts).

export type SatelliteKind = "recon" | "navigation" | "comms" | "early_warning";
export type Orbit = "leo" | "meo" | "geo";
export type SatelliteStatus = "operational" | "damaged" | "destroyed";

export interface SatelliteKindSpec {
	label: string;
	blurb: string;
	/** Treasury cost to build and launch one. */
	cost: number;
	/** Hours from launch until it is operational. */
	launchHours: number;
	/** Hull/health points; a hit below zero destroys it. */
	health: number;
	/** Upkeep per day in treasury. */
	upkeepPerDay: number;
	/** Which orbit it flies. */
	orbit: Orbit;
	/** Bonuses at full health. */
	reconBonus: number;
	gpsBonus: number;
	commsBonus: number;
	earlyWarningBonus: number;
}

export const SATELLITE_KINDS: Record<SatelliteKind, SatelliteKindSpec> = {
	recon: {
		label: "Reconnaissance satellite",
		blurb: "Wide-area optical and radar passes: fresh intel on any region, weather permitting.",
		cost: 250_000,
		launchHours: 12,
		health: 100,
		upkeepPerDay: 8_000,
		orbit: "leo",
		reconBonus: 0.12,
		gpsBonus: 0,
		commsBonus: 0,
		earlyWarningBonus: 0
	},
	navigation: {
		label: "Navigation satellite",
		blurb: "A GPS/INS constellation: precision-guided weapons land where they are aimed.",
		cost: 300_000,
		launchHours: 16,
		health: 100,
		upkeepPerDay: 10_000,
		orbit: "meo",
		reconBonus: 0,
		gpsBonus: 0.08,
		commsBonus: 0,
		earlyWarningBonus: 0
	},
	comms: {
		label: "Communications satellite",
		blurb: "Relays that keep command links alive when the enemy jams the ground network.",
		cost: 180_000,
		launchHours: 8,
		health: 100,
		upkeepPerDay: 6_000,
		orbit: "geo",
		reconBonus: 0,
		gpsBonus: 0,
		commsBonus: 0.1,
		earlyWarningBonus: 0
	},
	early_warning: {
		label: "Early-warning satellite",
		blurb: "Sees missile launches and inbound strikes early, giving air defence and civilians time.",
		cost: 350_000,
		launchHours: 20,
		health: 100,
		upkeepPerDay: 12_000,
		orbit: "geo",
		reconBonus: 0,
		gpsBonus: 0,
		commsBonus: 0,
		earlyWarningBonus: 0.15
	}
};

export const SATELLITE_KIND_IDS = Object.keys(SATELLITE_KINDS) as SatelliteKind[];

export const ORBIT_LABEL: Record<Orbit, string> = {
	leo: "Low Earth orbit",
	meo: "Medium Earth orbit",
	geo: "Geostationary orbit"
};

/** How much harder a satellite in each orbit is to hit. */
export const ORBIT_ASAT_DIFFICULTY: Record<Orbit, number> = { leo: 0, meo: 0.08, geo: 0.18 };

// ── Constellation effects ───────────────────────────────────────────────────

export interface Constellation {
	recon: number;
	navigation: number;
	comms: number;
	early_warning: number;
}

export const EMPTY_CONSTELLATION: Constellation = { recon: 0, navigation: 0, comms: 0, early_warning: 0 };

/**
 * Effect strength from a number of healthy satellites of a kind, with
 * diminishing returns (two satellites are better than one, ten are not ten
 * times better). Caps at 0.6.
 */
export function constellationStrength(count: number, perSatellite: number): number {
	if (count <= 0) return 0;
	return Math.round(Math.min(0.6, count * perSatellite * (1 - 1 / (count + 1))) * 1000) / 1000;
}

/** GPS accuracy multiplier for a state: 1 without a constellation, up to 1 + GPS_MAX. */
export const GPS_MAX_BONUS = 0.25;

export function gpsFactor(navigationSatellites: number): number {
	const strength = constellationStrength(navigationSatellites, SATELLITE_KINDS.navigation.gpsBonus);
	return Math.round((1 + GPS_MAX_BONUS * Math.min(1, strength / 0.4)) * 1000) / 1000;
}

/** Recon confidence bonus from reconnaissance satellites (added to intel confidence). */
export function satelliteReconBonus(reconSatellites: number): number {
	return constellationStrength(reconSatellites, SATELLITE_KINDS.recon.reconBonus);
}

/** Command resilience from comms satellites: how much of a C2 disruption they cancel. */
export function satelliteCommsResilience(commsSatellites: number): number {
	return Math.min(0.8, constellationStrength(commsSatellites, SATELLITE_KINDS.comms.commsBonus) * 2);
}

/** Share of an incoming strike's civilian harm avoided by early warning (evacuation, shelters). */
export function earlyWarningMitigation(earlyWarningSatellites: number): number {
	return Math.min(0.3, constellationStrength(earlyWarningSatellites, SATELLITE_KINDS.early_warning.earlyWarningBonus));
}

/** Daily upkeep of a constellation. */
export function constellationUpkeep(constellation: Constellation): number {
	return SATELLITE_KIND_IDS.reduce((sum, kind) => sum + constellation[kind] * SATELLITE_KINDS[kind].upkeepPerDay, 0);
}

// ── Space operations ────────────────────────────────────────────────────────

export type SpaceOpKind = "asat_strike" | "uplink_jam" | "orbital_sabotage";

export interface SpaceOpSpec {
	label: string;
	blurb: string;
	cost: number;
	durationHours: number;
	cooldownHours: number;
	/** Only against a state you are at war with (or holding a casus belli on). */
	needsWar: boolean;
	/** Damage a success does to the target satellite. */
	damage: number;
	/** Base success chance against an undefended constellation. */
	baseSuccess: number;
	/** Base attribution chance. */
	baseAttribution: number;
}

export const SPACE_OPS: Record<SpaceOpKind, SpaceOpSpec> = {
	asat_strike: {
		label: "Anti-satellite strike",
		blurb: "A direct-ascent interceptor or a co-orbital killer hits one enemy satellite. Loud, expensive and hard to hide.",
		cost: 400_000,
		durationHours: 0,
		cooldownHours: 48,
		needsWar: false,
		damage: 100,
		baseSuccess: 0.55,
		baseAttribution: 0.7
	},
	uplink_jam: {
		label: "Uplink jam",
		blurb: "Jam a satellite's ground link: it is degraded for a day, and its constellation bonus shrinks.",
		cost: 90_000,
		durationHours: 24,
		cooldownHours: 12,
		needsWar: false,
		damage: 35,
		baseSuccess: 0.65,
		baseAttribution: 0.3
	},
	orbital_sabotage: {
		label: "Orbital sabotage",
		blurb: "A compromised ground station or supply chain damages a satellite quietly. Cheap, slow to trace, rarely fatal.",
		cost: 150_000,
		durationHours: 0,
		cooldownHours: 24,
		needsWar: false,
		damage: 55,
		baseSuccess: 0.5,
		baseAttribution: 0.2
	}
};

export const SPACE_OP_KINDS = Object.keys(SPACE_OPS) as SpaceOpKind[];

export interface AsatOdds {
	success: number;
	attribution: number;
}

/** Odds of a space operation against a satellite in `orbit`, given the target's space defence level. */
export function spaceOpOdds(
	kind: SpaceOpKind,
	orbit: Orbit,
	defenceLevel: number,
	atWar: boolean
): AsatOdds {
	const spec = SPACE_OPS[kind];
	const orbitPenalty = kind === "asat_strike" ? ORBIT_ASAT_DIFFICULTY[orbit] : 0;
	const defence = Math.min(0.4, defenceLevel * 0.06);
	const peace = atWar ? 0 : 0.12;
	return {
		success: Math.round(Math.max(0.05, Math.min(0.95, spec.baseSuccess - orbitPenalty - defence)) * 100) / 100,
		attribution: Math.round(Math.max(0.02, Math.min(0.95, spec.baseAttribution + peace + defence)) * 100) / 100
	};
}

/** Damage one successful operation does to a satellite's health. */
export function spaceOpDamage(kind: SpaceOpKind): number {
	return SPACE_OPS[kind].damage;
}

/** Space defence level: each level costs this to raise, up to MAX_LEVEL. */
export const SPACE_DEFENCE = {
	MAX_LEVEL: 4,
	BASE_COST: 120_000,
	/** Per level: enemy space-operation success drops by this. */
	SUCCESS_PER_LEVEL: 0.06
} as const;

export function spaceDefenceUpgradeCost(level: number): number | null {
	if (level >= SPACE_DEFENCE.MAX_LEVEL) return null;
	return SPACE_DEFENCE.BASE_COST * (level + 1);
}
