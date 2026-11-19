// Civilian population: how many people live in a region, how densely, and
// how much of it is built-up. Distinct from "residents" (the players living
// somewhere): civilians are the non-player population that airstrikes,
// cyber attacks and psyops act on.
//
// A region stores its civilians in regions.population once something has
// changed them (strike casualties); until then the figure is derived
// deterministically from the region id, its buildings and its terrain, so
// no data migration is needed. Always read it through regionPopulation().
//
// Pure data and pure functions only: imported by client and server.
import { hash32, regionTerrain } from "./recon.config";

/** Bounds of a derived (never changed) region population. */
export const POPULATION_MIN = 50_000;
export const POPULATION_MAX = 2_000_000;
/** A region never drops below this many civilians, whatever happens to it. */
export const POPULATION_FLOOR = 1_000;

/** Civilians per building level (a built-up region is a populous one). */
export const POPULATION_PER_LEVEL = {
	infrastructure: 80_000,
	education: 30_000,
	hospitals: 30_000,
	economy: 20_000
} as const;

/** How terrain scales a region's population (cities draw people, mountains don't). */
export const TERRAIN_POPULATION: Record<string, number> = {
	urban: 1.6,
	plains: 1,
	desert: 0.45,
	forest: 0.7,
	jungle: 0.6,
	hills: 0.8,
	mountain: 0.5
};

/** Land area bounds in km²; urban regions are compact. */
export const AREA_MIN_KM2 = 2_000;
export const AREA_SPAN_KM2 = 10_000;
export const URBAN_AREA_FACTOR = 0.5;

export interface PopulationRegion {
	id: number;
	population?: number | null;
	terrain?: string | null;
	infrastructure?: number | null;
	economy?: number | null;
	education?: number | null;
	hospitals?: number | null;
}

/** What a region's population would be if nothing had ever changed it. */
export function derivedPopulation(region: PopulationRegion): number {
	const roll = hash32(region.id, 0x9091) / 4294967296;
	// Skewed towards small: most regions are towns, a few are metropolises.
	const base = 60_000 + roll * roll * 900_000;
	const built =
		(region.infrastructure ?? 0) * POPULATION_PER_LEVEL.infrastructure +
		(region.education ?? 0) * POPULATION_PER_LEVEL.education +
		(region.hospitals ?? 0) * POPULATION_PER_LEVEL.hospitals +
		(region.economy ?? 0) * POPULATION_PER_LEVEL.economy;
	const terrain = TERRAIN_POPULATION[regionTerrain(region)] ?? 1;
	const raw = (base + built) * terrain;
	return Math.round(Math.min(POPULATION_MAX, Math.max(POPULATION_MIN, raw)) / 100) * 100;
}

/** A region's civilian population: the stored figure, else the derived one. */
export function regionPopulation(region: PopulationRegion): number {
	return region.population && region.population > 0 ? region.population : derivedPopulation(region);
}

/** A region's land area in km² (deterministic). */
export function regionAreaKm2(region: { id: number; terrain?: string | null; infrastructure?: number | null }): number {
	const area = AREA_MIN_KM2 + (hash32(region.id, 0xa4ea) % AREA_SPAN_KM2);
	return Math.round(regionTerrain(region) === "urban" ? area * URBAN_AREA_FACTOR : area);
}

/** Civilians per km². */
export function regionDensity(region: PopulationRegion): number {
	return regionPopulation(region) / regionAreaKm2(region);
}

/** "1.2M", "640k", "8,400" */
export function formatPopulation(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
	if (n >= 10_000) return `${Math.round(n / 1000)}k`;
	return Math.round(n).toLocaleString("en-US");
}
