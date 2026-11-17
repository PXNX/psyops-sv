// tools/map/deposits.ts: initial resource deposits per region.
//
// Deterministic: the same region always gets the same deposits, so rebuilding
// changes nothing. Based on the region's real position:
//   - wood follows forest belts (tropics, temperate and boreal latitudes) and
//     is scarce in the big deserts and the far north;
//   - coal, iron and copper can turn up anywhere, but are much likelier and
//     larger in the world's well-known basins and mining districts.
// Capacities are in resource units; a standard mine takes ~10 per shift.

export type Resource = "iron" | "copper" | "coal" | "wood";
export interface Deposit {
	regionId: number;
	resourceType: Resource;
	capacity: number;
}

type Box = [latMin: number, latMax: number, lonMin: number, lonMax: number];
const inBox = (lat: number, lon: number, [a, b, c, d]: Box) => lat >= a && lat <= b && lon >= c && lon <= d;

const DESERTS: Box[] = [
	[15, 32, -17, 33], // Sahara
	[14, 32, 35, 60], // Arabia
	[36, 45, 52, 70], // Karakum / Kyzylkum
	[37, 46, 75, 115], // Taklamakan / Gobi
	[-32, -18, 118, 145], // Australian interior
	[-28, -18, -71, -68], // Atacama
	[30, 38, -118, -104], // US Southwest
	[-29, -18, 13, 22] // Namib / Kalahari
];

const BASINS: Record<Exclude<Resource, "wood">, Box[]> = {
	coal: [
		[36, 42, -85, -77], // Appalachia
		[50, 52.5, 6, 20], // Ruhr to Silesia
		[52, 56, -4, 0], // Britain
		[47, 49, 36, 40], // Donbas
		[52, 56, 84, 90], // Kuzbass
		[34, 42, 108, 120], // North China
		[-35, -22, 145, 152], // East Australia
		[-28, -24, 27, 31], // Witbank
		[21, 25, 82, 88] // Jharia
	],
	iron: [
		[48, 50, 5, 7], // Lorraine
		[66, 69, 18, 22], // Kiruna
		[52, 60, 57, 62], // Urals
		[47, 48.5, 32, 35], // Kryvyi Rih
		[46, 48.5, -93, -88], // Mesabi
		[-24, -20, 115, 121], // Pilbara
		[-21, -18, -45, -42], // Minas Gerais
		[38, 42, 120, 125] // Anshan
	],
	copper: [
		[-35, -12, -75, -67], // Andes
		[-14, -10, 25, 29], // Copperbelt
		[31, 47, -114, -108], // Arizona to Montana
		[52, 60, 57, 62], // Urals
		[34.5, 35.7, 32, 34.5] // Cyprus
	]
};

// Base chance a region has a deposit, and capacity range (units).
const BASE: Record<Resource, { chance: number; min: number; max: number }> = {
	wood: { chance: 0, min: 3000, max: 25_000 }, // chance comes from the forest model
	coal: { chance: 0.32, min: 2000, max: 20_000 },
	iron: { chance: 0.28, min: 2000, max: 18_000 },
	copper: { chance: 0.22, min: 1500, max: 14_000 }
};
const BASIN_CHANCE = 0.92;
const BASIN_RICHNESS = 2.2;

function forestChance(lat: number, lon: number): number {
	const a = Math.abs(lat);
	let p = a < 12 ? 0.9 : a < 25 ? 0.45 : a < 35 ? 0.35 : a < 50 ? 0.65 : a < 66 ? 0.95 : a < 72 ? 0.45 : 0.05;
	if (DESERTS.some((d) => inBox(lat, lon, d))) p *= 0.12;
	return p;
}

/** mulberry32 seeded from (region, resource) so results never change between runs. */
function rng(regionId: number, resource: Resource): () => number {
	let seed = regionId * 2654435761 + [...resource].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function generateDeposits(regions: { id: number; latitude: number; longitude: number }[]): Deposit[] {
	const out: Deposit[] = [];
	for (const r of regions) {
		for (const resource of ["iron", "copper", "coal", "wood"] as const) {
			const rand = rng(r.id, resource);
			const { min, max } = BASE[resource];
			const inBasin = resource !== "wood" && BASINS[resource].some((b) => inBox(r.latitude, r.longitude, b));
			const chance =
				resource === "wood" ? forestChance(r.latitude, r.longitude) : inBasin ? BASIN_CHANCE : BASE[resource].chance;
			if (rand() >= chance) continue;
			// Skewed towards small deposits; a few large ones.
			let capacity = min + (max - min) * rand() ** 2;
			if (inBasin) capacity *= BASIN_RICHNESS;
			out.push({ regionId: r.id, resourceType: resource, capacity: Math.round(capacity / 100) * 100 });
		}
	}
	return out;
}
