// Reconnaissance, weather and intel-driven combat: every tunable in one place.
//
// A recon pass flies one sensor over a region. What it sees depends on the
// sensor, the region's weather and cover, the time of day and (for drones)
// the region's air defence. Passes are fused into one intel picture per
// region; in battle, a side's picture of the enemy scales its indirect fire,
// its general effectiveness and its counter-battery fire.
//
// Pure data and pure functions only: the client imports this for the weather
// shown on the map, the server for everything else.

// ── Sensors ─────────────────────────────────────────────────────────────────

// Radar is not a recon sensor: ground radar belongs to air defence (see
// RADAR_AD_EQUIVALENT below and the radar installation in buildings.config.ts).
// The only radar imagery is the satellite's SAR pass.
export type SensorId = "drone_eo" | "drone_ir" | "sat_eo" | "sat_ir" | "sat_sar";
export type SensorKind = "visual" | "thermal" | "radar";
export type SensorPlatform = "drone" | "satellite";

/** What a sensor can tell apart. Units are grouped by signature. */
export type UnitCategory = "infantry" | "vehicle" | "artillery" | "air";
export const UNIT_CATEGORIES: UnitCategory[] = ["infantry", "vehicle", "artillery", "air"];

export const UNIT_CATEGORY: Record<string, UnitCategory> = {
	infantry: "infantry",
	armor: "vehicle",
	mechanized: "vehicle",
	air_defence: "vehicle",
	artillery: "artillery",
	fighter_squadron: "air",
	bomber_squadron: "air"
};

export interface SensorConfig {
	label: string;
	short: string;
	platform: SensorPlatform;
	kind: SensorKind;
	/** Currency charged on launch. */
	cost: number;
	/** Minutes from launch until the report is filed. */
	durationMinutes: number;
	/**
	 * Minutes before the same sensor can be used again. Drones and radar cool
	 * down per player; a satellite's revisit time is shared by the whole state.
	 */
	cooldownMinutes: number;
	cooldownScope: "user" | "state";
	/** Base chance of detecting each category in clear daylight over open ground. */
	base: Record<UnitCategory, number>;
	/** Visual passes identify exact unit types and see buildings. */
	identifiesTypes: boolean;
	seesBuildings: boolean;
	/** Thermal passes pick up recently fired artillery positions. */
	detectsFiring: boolean;
	/** Whether the sensor needs a friendly region next door (none today). */
	requiresBorder: boolean;
}

export const SENSORS: Record<SensorId, SensorConfig> = {
	drone_eo: {
		label: "Drone · visual",
		short: "UAV EO",
		platform: "drone",
		kind: "visual",
		cost: 1500,
		durationMinutes: 10,
		cooldownMinutes: 30,
		cooldownScope: "user",
		base: { infantry: 0.85, vehicle: 0.9, artillery: 0.85, air: 0.8 },
		identifiesTypes: true,
		seesBuildings: true,
		detectsFiring: false,
		requiresBorder: false
	},
	drone_ir: {
		label: "Drone · thermal",
		short: "UAV IR",
		platform: "drone",
		kind: "thermal",
		cost: 2500,
		durationMinutes: 10,
		cooldownMinutes: 30,
		cooldownScope: "user",
		base: { infantry: 0.55, vehicle: 0.9, artillery: 0.9, air: 0.85 },
		identifiesTypes: false,
		seesBuildings: false,
		detectsFiring: true,
		requiresBorder: false
	},
	sat_eo: {
		label: "Satellite · visual (EO)",
		short: "SAT EO",
		platform: "satellite",
		kind: "visual",
		cost: 6000,
		durationMinutes: 30,
		cooldownMinutes: 180,
		cooldownScope: "state",
		base: { infantry: 0.7, vehicle: 0.85, artillery: 0.8, air: 0.9 },
		identifiesTypes: true,
		seesBuildings: true,
		detectsFiring: false,
		requiresBorder: false
	},
	sat_ir: {
		label: "Satellite · infrared",
		short: "SAT IR",
		platform: "satellite",
		kind: "thermal",
		cost: 8000,
		durationMinutes: 30,
		cooldownMinutes: 240,
		cooldownScope: "state",
		base: { infantry: 0.35, vehicle: 0.8, artillery: 0.85, air: 0.8 },
		identifiesTypes: false,
		seesBuildings: false,
		detectsFiring: true,
		requiresBorder: false
	},
	sat_sar: {
		label: "Satellite · radar (SAR)",
		short: "SAT SAR",
		platform: "satellite",
		kind: "radar",
		cost: 10000,
		durationMinutes: 30,
		cooldownMinutes: 360,
		cooldownScope: "state",
		base: { infantry: 0.1, vehicle: 0.9, artillery: 0.85, air: 0.9 },
		identifiesTypes: false,
		seesBuildings: true,
		detectsFiring: false,
		requiresBorder: false
	}
};

export const SENSOR_IDS = Object.keys(SENSORS) as SensorId[];

// ── Weather, daylight and cover ─────────────────────────────────────────────

export type Weather = "clear" | "cloudy" | "rain" | "fog";
export type Cover = "open" | "forest" | "urban" | "mountain";

export const WEATHER_LABEL: Record<Weather, string> = {
	clear: "Clear",
	cloudy: "Overcast",
	rain: "Rain",
	fog: "Fog"
};
export const COVER_LABEL: Record<Cover, string> = {
	open: "Open ground",
	forest: "Forest",
	urban: "Urban",
	mountain: "Mountains"
};

/** Weather holds for this many hours, then rolls again (per region). */
export const WEATHER_WINDOW_HOURS = 3;
/** Relative odds of each weather type in a window. */
export const WEATHER_ODDS: Record<Weather, number> = { clear: 0.45, cloudy: 0.3, rain: 0.15, fog: 0.1 };
/** Local solar hours that count as night. */
export const NIGHT_FROM_HOUR = 20;
export const NIGHT_UNTIL_HOUR = 6;

/** Detection multiplier per sensor and weather. 0 = the pass sees nothing. */
export const WEATHER_FACTOR: Record<SensorId, Record<Weather, number>> = {
	// Drones fly under the cloud base, but rain and fog blind them.
	drone_eo: { clear: 1, cloudy: 0.9, rain: 0.5, fog: 0.25 },
	drone_ir: { clear: 1, cloudy: 0.95, rain: 0.6, fog: 0.6 },
	// Clouds block optical satellites entirely; IR gets partly through.
	sat_eo: { clear: 1, cloudy: 0, rain: 0, fog: 0.3 },
	sat_ir: { clear: 1, cloudy: 0.35, rain: 0.3, fog: 0.7 },
	// Radar sees through all of it.
	sat_sar: { clear: 1, cloudy: 1, rain: 0.95, fog: 1 }
};

/** Detection multiplier at night. Thermal works better in the cold dark. */
export const NIGHT_FACTOR: Record<SensorId, number> = {
	drone_eo: 0.35,
	drone_ir: 1.1,
	sat_eo: 0,
	sat_ir: 1.1,
	sat_sar: 1
};

/** Detection multiplier per sensor kind and ground cover. */
export const COVER_FACTOR: Record<SensorKind, Record<Cover, number>> = {
	visual: { open: 1, forest: 0.5, urban: 0.6, mountain: 0.7 },
	thermal: { open: 1, forest: 0.8, urban: 0.7, mountain: 0.85 },
	radar: { open: 1, forest: 0.75, urban: 0.6, mountain: 0.65 }
};

/** Battle terrain → the cover it gives. */
export const TERRAIN_COVER: Record<string, Cover> = {
	plains: "open",
	desert: "open",
	forest: "forest",
	jungle: "forest",
	urban: "urban",
	hills: "mountain",
	mountain: "mountain"
};

// ── Detection ───────────────────────────────────────────────────────────────

/** Below this chance a category counts as not observed at all. */
export const DETECTION_THRESHOLD = 0.2;
/**
 * Count error: a category seen with chance p is reported within
 * ±ESTIMATE_ERROR·(1-p) of its true size.
 */
export const ESTIMATE_ERROR = 0.6;

// ── Air defence ─────────────────────────────────────────────────────────────

/**
 * Radar installations cue the air defence. Each radar-coverage level in a
 * region counts as this many air-defence units for interception, so knocking
 * the radars down opens the airspace (see the radar building and strike target).
 */
export const RADAR_AD_EQUIVALENT = 0.5;

/** Chance each enemy air-defence unit in the region adds to shooting a drone down. */
export const AD_DRONE_INTERCEPT_PER_UNIT = 0.25;
export const AD_DRONE_INTERCEPT_MAX = 0.9;
/** A drone that survives still flies evasively: its detection drops by this share of the intercept chance. */
export const AD_DRONE_EVASION_PENALTY = 0.5;

/** Air-defence units a region can bring to bear, radar cueing included. */
export function airDefenceStrength(adUnits: number, radarLevels = 0): number {
	return Math.max(0, adUnits) + Math.max(0, radarLevels) * RADAR_AD_EQUIVALENT;
}

// ── Intel lifetime and fusion ───────────────────────────────────────────────

/** Hours a report stays fresh. */
export const INTEL_VALID_HOURS = 24;
/** A report loses up to this share of its weight as it ages towards stale. */
export const INTEL_AGE_DECAY = 0.5;
/** Picture confidence thresholds for the low / medium / high labels. */
export const CONFIDENCE_LEVELS = { low: 0.15, medium: 0.45, high: 0.75 } as const;

// ── Intel in combat ─────────────────────────────────────────────────────────

/** Units whose fire depends on targeting data. */
export const INDIRECT_FIRE_TYPES = ["artillery", "bomber_squadron", "fighter_squadron"] as const;
export const AIR_STRIKE_TYPES = ["bomber_squadron", "fighter_squadron"] as const;

export const COMBAT_INTEL = {
	/** Indirect fire output with no targeting intel; rises linearly to 1 at full confidence. */
	INDIRECT_FIRE_BLIND: 0.5,
	/** Every unit's output: blind attacks at the low end, full intel at the high end. */
	GENERAL_BLIND: 0.9,
	GENERAL_FULL: 1.1,
	/** With a thermal fix on enemy firing positions and own guns engaged, enemy artillery loses up to this share. */
	COUNTER_BATTERY_MAX: 0.4,
	/** Each enemy air-defence unit cuts air strikes by this share, down to the floor. */
	AD_STRIKE_REDUCTION_PER_UNIT: 0.15,
	AD_STRIKE_FLOOR: 0.35
} as const;

// ── Deterministic helpers ───────────────────────────────────────────────────

/** 32-bit integer hash (deterministic, good enough for game rolls). */
export function hash32(...parts: number[]): number {
	let h = 0x811c9dc5;
	for (const part of parts) {
		let x = Math.floor(part) | 0;
		for (let i = 0; i < 4; i++) {
			h ^= x & 0xff;
			h = Math.imul(h, 0x01000193);
			x >>>= 8;
		}
	}
	h ^= h >>> 16;
	h = Math.imul(h, 0x85ebca6b);
	h ^= h >>> 13;
	return h >>> 0;
}

/** A seeded random generator returning [0, 1). */
export function seededRandom(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Weather over a region right now: the same for everyone, rolled per window. */
export function weatherAt(regionId: number, at: Date = new Date()): Weather {
	const window = Math.floor(at.getTime() / (WEATHER_WINDOW_HOURS * 3600_000));
	const roll = hash32(regionId, window, 0x5eed) / 4294967296;
	let acc = 0;
	for (const [weather, odds] of Object.entries(WEATHER_ODDS) as [Weather, number][]) {
		acc += odds;
		if (roll < acc) return weather;
	}
	return "clear";
}

/** Local solar hour (0-24) at a longitude. */
export function localHour(longitude: number, at: Date = new Date()): number {
	const utc = at.getUTCHours() + at.getUTCMinutes() / 60;
	return (((utc + longitude / 15) % 24) + 24) % 24;
}

export function isNight(longitude: number, at: Date = new Date()): boolean {
	const h = localHour(longitude, at);
	return h >= NIGHT_FROM_HOUR || h < NIGHT_UNTIL_HOUR;
}

/**
 * A region's terrain: its stored value, else derived from the region (built-up
 * regions are urban, the rest is spread deterministically by id).
 */
export function regionTerrain(region: { id: number; terrain?: string | null; infrastructure?: number | null }) {
	if (region.terrain) return region.terrain;
	if ((region.infrastructure ?? 0) >= 4) return "urban";
	const pool = ["plains", "plains", "forest", "forest", "hills", "mountain", "plains", "forest"];
	return pool[hash32(region.id, 0x7e44) % pool.length]!;
}

export function regionCover(region: { id: number; terrain?: string | null; infrastructure?: number | null }): Cover {
	return TERRAIN_COVER[regionTerrain(region)] ?? "open";
}

export interface ViewConditions {
	weather: Weather;
	night: boolean;
	cover: Cover;
}

/** Everything that affects what a sensor sees over a region right now. */
export function regionConditions(
	region: { id: number; longitude?: string | number | null; terrain?: string | null; infrastructure?: number | null },
	at: Date = new Date()
): ViewConditions {
	return {
		weather: weatherAt(region.id, at),
		night: isNight(Number(region.longitude ?? 0), at),
		cover: regionCover(region)
	};
}

/** Chance (0-1) that a sensor detects a unit category under these conditions. */
export function detectionChance(sensor: SensorId, category: UnitCategory, c: ViewConditions): number {
	const s = SENSORS[sensor];
	const p =
		s.base[category] *
		WEATHER_FACTOR[sensor][c.weather] *
		(c.night ? NIGHT_FACTOR[sensor] : 1) *
		COVER_FACTOR[s.kind][c.cover];
	return Math.max(0, Math.min(1, p));
}

/** Chance that a drone is shot down by `adUnits` enemy air-defence units. */
export function droneInterceptChance(adUnits: number): number {
	return Math.min(AD_DRONE_INTERCEPT_MAX, Math.max(0, adUnits) * AD_DRONE_INTERCEPT_PER_UNIT);
}

/** Share of an air strike that gets through `adUnits` enemy air-defence units. */
export function airStrikeFactor(adUnits: number): number {
	return Math.max(COMBAT_INTEL.AD_STRIKE_FLOOR, 1 - Math.max(0, adUnits) * COMBAT_INTEL.AD_STRIKE_REDUCTION_PER_UNIT);
}

export function confidenceLevel(confidence: number): "none" | "low" | "medium" | "high" {
	if (confidence >= CONFIDENCE_LEVELS.high) return "high";
	if (confidence >= CONFIDENCE_LEVELS.medium) return "medium";
	if (confidence >= CONFIDENCE_LEVELS.low) return "low";
	return "none";
}
