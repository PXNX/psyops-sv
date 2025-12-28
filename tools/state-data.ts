import { writeFile } from "fs/promises";

interface StateResource {
	id: number;
	name: string;
	latitude?: number;
	longitude?: number;
	resources: {
		oil?: number;
		aluminium?: number;
		rubber?: number;
		tungsten?: number;
		steel?: number;
		chromium?: number;
	};
}

async function fetchStateResources(): Promise<StateResource[]> {
	console.log("Fetching HOI4 state resources from hoi4cheats.com...\n");

	try {
		const response = await fetch("https://hoi4cheats.com/states");
		const html = await response.text();

		const states: StateResource[] = [];
		const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;

		let match;
		let count = 0;
		while ((match = tableRowRegex.exec(html)) !== null) {
			const row = match[1];

			// Extract state name and ID
			const nameMatch = /<td[^>]*>(.*?)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>/.exec(row);
			if (!nameMatch) continue;

			const name = nameMatch[1].trim();
			const id = parseInt(nameMatch[2].trim());

			if (!name || isNaN(id)) continue;

			console.log(`Processing ${++count}: ${name} (ID: ${id})`);

			// Try Wikipedia first, then OSM
			let coords = await getCoordinatesFromWikipedia(name);
			if (!coords) {
				coords = await getCoordinatesFromOSM(name);
			}

			// Extract resources
			const resources: StateResource["resources"] = {};

			const resourcePatterns = {
				oil: /oil[^>]*>(\d+)|(\d+)[^<]*oil/gi,
				aluminium: /aluminium[^>]*>(\d+)|(\d+)[^<]*aluminium/gi,
				rubber: /rubber[^>]*>(\d+)|(\d+)[^<]*rubber/gi,
				tungsten: /tungsten[^>]*>(\d+)|(\d+)[^<]*tungsten/gi,
				steel: /steel[^>]*>(\d+)|(\d+)[^<]*steel/gi,
				chromium: /chromium[^>]*>(\d+)|(\d+)[^<]*chromium/gi
			};

			for (const [resource, pattern] of Object.entries(resourcePatterns)) {
				const resourceMatch = pattern.exec(row);
				if (resourceMatch) {
					const value = parseInt(resourceMatch[1] || resourceMatch[2]);
					if (!isNaN(value) && value > 0) {
						resources[resource as keyof typeof resources] = value;
					}
				}
			}

			states.push({
				id,
				name,
				latitude: coords?.lat,
				longitude: coords?.lon,
				resources
			});

			// Rate limiting for API calls
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		console.log(`\nFound ${states.length} states\n`);
		return states;
	} catch (error) {
		console.error("Failed to fetch state resources:", error);
		return [];
	}
}

async function getCoordinatesFromWikipedia(stateName: string): Promise<{ lat: number; lon: number } | null> {
	try {
		// Step 1: Search Wikipedia for the location
		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(stateName)}&srlimit=1&origin=*`;

		const searchResponse = await fetch(searchUrl);
		const searchData = await searchResponse.json();

		if (!searchData.query?.search?.length) {
			console.log(`  ⚠ Wikipedia: No article found`);
			return null;
		}

		const pageTitle = searchData.query.search[0].title;

		// Step 2: Get coordinates from the page
		const coordUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&titles=${encodeURIComponent(pageTitle)}&origin=*`;

		const coordResponse = await fetch(coordUrl);
		const coordData = await coordResponse.json();

		const pages = coordData.query?.pages;
		if (!pages) {
			console.log(`  ⚠ Wikipedia: No coordinate data`);
			return null;
		}

		const page = Object.values(pages)[0] as any;

		if (page.coordinates && page.coordinates.length > 0) {
			const coords = page.coordinates[0];
			console.log(`  ✓ Wikipedia: ${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`);
			return {
				lat: coords.lat,
				lon: coords.lon
			};
		}

		console.log(`  ⚠ Wikipedia: No coordinates in article`);
		return null;
	} catch (error) {
		console.log(`  ✗ Wikipedia error:`, error);
		return null;
	}
}

async function getCoordinatesFromOSM(stateName: string): Promise<{ lat: number; lon: number } | null> {
	try {
		// Use Nominatim (OpenStreetMap's geocoding service)
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(stateName)}&limit=1`;

		const response = await fetch(url, {
			headers: {
				"User-Agent": "HOI4-Database-Generator/1.0 (Educational Purpose)"
			}
		});

		const data = await response.json();

		if (data && data.length > 0) {
			const result = data[0];
			console.log(`  ✓ OSM: ${parseFloat(result.lat).toFixed(4)}, ${parseFloat(result.lon).toFixed(4)}`);
			return {
				lat: parseFloat(result.lat),
				lon: parseFloat(result.lon)
			};
		}

		console.log(`  ⚠ OSM: No results found`);
		return null;
	} catch (error) {
		console.log(`  ✗ OSM error:`, error);
		return null;
	}
}

function generateSQLInserts(states: StateResource[]): string {
	const lines: string[] = [];

	lines.push("-- HOI4 Regions SQL Insert Statements");
	lines.push("-- Generated from hoi4cheats.com with Wikipedia/OSM coordinates");
	lines.push(`-- Total regions: ${states.length}`);
	lines.push(`-- Regions with coordinates: ${states.filter((s) => s.latitude && s.longitude).length}`);
	lines.push(`-- Generated at: ${new Date().toISOString()}`);
	lines.push("");
	lines.push("BEGIN;");
	lines.push("");

	for (const state of states) {
		const columns = ["id"];
		const values: (string | number)[] = [state.id];

		// Only add lat/lon if we have them
		if (state.latitude !== undefined && state.longitude !== undefined) {
			columns.push("latitude", "longitude");
			values.push(state.latitude, state.longitude);
		}

		// Add all resource columns if they exist
		if (state.resources.oil !== undefined) {
			columns.push("oil");
			values.push(state.resources.oil);
		}
		if (state.resources.aluminium !== undefined) {
			columns.push("aluminium");
			values.push(state.resources.aluminium);
		}
		if (state.resources.rubber !== undefined) {
			columns.push("rubber");
			values.push(state.resources.rubber);
		}
		if (state.resources.tungsten !== undefined) {
			columns.push("tungsten");
			values.push(state.resources.tungsten);
		}
		if (state.resources.steel !== undefined) {
			columns.push("steel");
			values.push(state.resources.steel);
		}
		if (state.resources.chromium !== undefined) {
			columns.push("chromium");
			values.push(state.resources.chromium);
		}

		const insert = `INSERT INTO regions (${columns.join(", ")}) VALUES (${values.join(", ")});`;
		lines.push(insert);
	}

	lines.push("");
	lines.push("COMMIT;");

	return lines.join("\n");
}

function generateUpdatedSchema(): string {
	return `-- Updated regions table schema matching your actual schema

export const regions = pgTable("regions", {
	id: integer("id").primaryKey(), // Changed from generatedByDefaultAsIdentity - use HOI4 state ID
	latitude: decimal("latitude"), // Changed from notNull() to optional
	longitude: decimal("longitude"), // Changed from notNull() to optional
	stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
	rating: integer("rating").default(0),
	infrastructure: integer("infrastructure").default(0),
	economy: integer("powerplants").default(0),
	education: integer("education").default(0),
	hospitals: integer("hospitals").default(0),
	fortifications: integer("fortifications").default(0),
	oil: integer("oil").default(0),
	aluminium: integer("aluminium").default(0),
	rubber: integer("rubber").default(0),
	tungsten: integer("tungsten").default(0),
	steel: integer("steel").default(0),
	chromium: integer("chromium").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Note: Make sure to remove .generatedByDefaultAsIdentity() from id
// and remove .notNull() from latitude/longitude to allow null values`;
}

function generateRegionMapping(states: StateResource[]): string {
	const lines: string[] = [];

	lines.push("// HOI4 Region ID to Name mapping");
	lines.push("export const REGION_NAMES: Record<number, string> = {");

	for (const state of states) {
		lines.push(`  ${state.id}: "${state.name.replace(/"/g, '\\"')}",`);
	}

	lines.push("};");
	lines.push("");
	lines.push("// Region coordinates for mapping (only regions with known coordinates)");
	lines.push("export const REGION_COORDS: Record<number, { lat: number; lon: number }> = {");

	for (const state of states) {
		if (state.latitude !== undefined && state.longitude !== undefined) {
			lines.push(`  ${state.id}: { lat: ${state.latitude}, lon: ${state.longitude} },`);
		}
	}

	lines.push("};");

	return lines.join("\n");
}

async function main() {
	console.log("HOI4 SQL Insert Generator with Wikipedia + OSM Geocoding\n");
	console.log("=".repeat(50) + "\n");

	const states = await fetchStateResources();

	if (states.length === 0) {
		console.error("No states found. Exiting.");
		return;
	}

	const statesWithResources = states.filter((s) => Object.keys(s.resources).length > 0);
	const statesWithCoords = states.filter((s) => s.latitude !== undefined && s.longitude !== undefined);
	const statesWithoutCoords = states.filter((s) => s.latitude === undefined || s.longitude === undefined);

	console.log("\n" + "=".repeat(50));
	console.log("STATISTICS");
	console.log("=".repeat(50));
	console.log(`Total states: ${states.length}`);
	console.log(`States with resources: ${statesWithResources.length}`);
	console.log(`States with coordinates: ${statesWithCoords.length}`);
	console.log(`States without coordinates: ${statesWithoutCoords.length}\n`);

	if (statesWithoutCoords.length > 0) {
		console.log("States without coordinates:");
		statesWithoutCoords.slice(0, 10).forEach((state) => {
			console.log(`  - ${state.name} (ID: ${state.id})`);
		});
		if (statesWithoutCoords.length > 10) {
			console.log(`  ... and ${statesWithoutCoords.length - 10} more`);
		}
		console.log("");
	}

	if (statesWithResources.length > 0) {
		console.log("Sample states with resources:");
		statesWithResources.slice(0, 3).forEach((state) => {
			console.log(`  ${state.name} (ID: ${state.id})`);
			if (state.latitude && state.longitude) {
				console.log(`    Location: ${state.latitude.toFixed(4)}, ${state.longitude.toFixed(4)}`);
			} else {
				console.log(`    Location: No coordinates found`);
			}
			Object.entries(state.resources).forEach(([resource, amount]) => {
				console.log(`    - ${resource}: ${amount}`);
			});
		});
		console.log("  ...\n");
	}

	const sql = generateSQLInserts(states);
	await writeFile("./insert_regions.sql", sql);
	console.log("✓ Generated insert_regions.sql");

	const schema = generateUpdatedSchema();
	await writeFile("./regions_schema.ts", schema);
	console.log("✓ Generated regions_schema.ts");

	const regionMapping = generateRegionMapping(states);
	await writeFile("./region_mapping.ts", regionMapping);
	console.log("✓ Generated region_mapping.ts");

	console.log("\n✓ All files generated successfully!");
	console.log("\nNote: Coordinates sourced from Wikipedia API and OpenStreetMap.");
	console.log("Regions without coordinates will need manual geocoding or can be left null.");
}

main().catch(console.error);
