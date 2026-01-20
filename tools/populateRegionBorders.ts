import { readFile, writeFile } from "fs/promises";
import Delaunator from "delaunator";

interface Region {
	id: number;
	latitude: number;
	longitude: number;
}

// Haversine distance formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

async function parseRegionsFromSQL(): Promise<Region[]> {
	console.log("Reading insert_regions.sql...\n");

	const sqlContent = await readFile("./insert_regions.sql", "utf-8");
	const regions: Region[] = [];

	// Parse INSERT statements: INSERT INTO regions (id, latitude, longitude) VALUES (1, 42, 9);
	const insertRegex = /INSERT INTO regions \(id, latitude, longitude\) VALUES \((\d+), ([-\d.]+), ([-\d.]+)\);/g;

	let match;
	while ((match = insertRegex.exec(sqlContent)) !== null) {
		const id = parseInt(match[1]);
		const latitude = parseFloat(match[2]);
		const longitude = parseFloat(match[3]);

		if (!isNaN(id) && !isNaN(latitude) && !isNaN(longitude)) {
			regions.push({ id, latitude, longitude });
		}
	}

	console.log(`Parsed ${regions.length} regions from SQL file\n`);
	return regions;
}

async function populateRegionBorders() {
	console.log("Generating region borders SQL file...\n");

	// Parse regions from insert-regions.sql
	const regionsWithCoords = await parseRegionsFromSQL();

	console.log(`Found ${regionsWithCoords.length} regions with coordinates\n`);

	if (regionsWithCoords.length < 3) {
		console.error("Need at least 3 regions to create borders");
		return;
	}

	// Prepare points for Delaunay triangulation
	const points: [number, number][] = regionsWithCoords.map((r) => [r.longitude, r.latitude]);

	console.log("Computing Delaunay triangulation...\n");

	// Compute Delaunay triangulation
	const delaunay = Delaunator.from(points);

	// Extract borders from triangulation
	const borderSet = new Set<string>();
	const bordersList: Array<{
		regionId: number;
		neighborId: number;
		distanceKm: number;
	}> = [];

	// Process each triangle
	for (let i = 0; i < delaunay.triangles.length; i += 3) {
		const a = delaunay.triangles[i];
		const b = delaunay.triangles[i + 1];
		const c = delaunay.triangles[i + 2];

		// Each triangle creates 3 potential borders
		const edges = [
			[a, b],
			[b, c],
			[c, a]
		];

		for (const [idx1, idx2] of edges) {
			const region1 = regionsWithCoords[idx1];
			const region2 = regionsWithCoords[idx2];

			// Create a unique key (always smaller ID first)
			const [smaller, larger] = region1.id < region2.id ? [region1, region2] : [region2, region1];
			const key = `${smaller.id}-${larger.id}`;

			// Skip if we've already processed this border
			if (borderSet.has(key)) continue;
			borderSet.add(key);

			// Calculate distance
			const distance = haversineDistance(region1.latitude, region1.longitude, region2.latitude, region2.longitude);

			bordersList.push({
				regionId: smaller.id,
				neighborId: larger.id,
				distanceKm: Math.round(distance * 100) / 100 // Round to 2 decimals
			});
		}
	}

	console.log(`Found ${bordersList.length} unique borders\n`);

	// Generate SQL file
	let sql = `-- Region Borders Population Script
-- Generated: ${new Date().toISOString()}
-- Total borders: ${bordersList.length}

-- Clear existing borders (optional - uncomment if needed)
-- DELETE FROM region_borders;

-- Insert region borders
INSERT INTO region_borders (region_id, neighbor_id, distance_km)
VALUES\n`;

	// Add values
	const values = bordersList.map((b) => `  (${b.regionId}, ${b.neighborId}, ${b.distanceKm})`);
	sql += values.join(",\n");
	sql += "\nON CONFLICT DO NOTHING;\n";

	// Add statistics as comments
	const avgDistance = bordersList.reduce((sum, b) => sum + b.distanceKm, 0) / bordersList.length;
	const maxDistance = Math.max(...bordersList.map((b) => b.distanceKm));
	const minDistance = Math.min(...bordersList.map((b) => b.distanceKm));

	sql += `\n-- Statistics:
-- Total borders: ${bordersList.length}
-- Average distance: ${avgDistance.toFixed(2)} km
-- Min distance: ${minDistance.toFixed(2)} km
-- Max distance: ${maxDistance.toFixed(2)} km\n`;

	// Write to file
	await writeFile("./region_borders.sql", sql);

	console.log("✓ Created region_borders.sql");
	console.log("\nStatistics:");
	console.log(`  Total borders: ${bordersList.length}`);
	console.log(`  Average distance: ${avgDistance.toFixed(2)} km`);
	console.log(`  Min distance: ${minDistance.toFixed(2)} km`);
	console.log(`  Max distance: ${maxDistance.toFixed(2)} km`);

	// Sample some borders
	console.log("\nSample borders:");
	for (let i = 0; i < Math.min(5, bordersList.length); i++) {
		const border = bordersList[i];
		console.log(`  Region ${border.regionId} ↔ Region ${border.neighborId}: ${border.distanceKm} km`);
	}
}

populateRegionBorders()
	.then(() => {
		console.log("\nDone!");
		process.exit(0);
	})
	.catch((err) => {
		console.error("Error:", err);
		process.exit(1);
	});
