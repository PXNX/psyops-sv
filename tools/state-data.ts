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

// Enhanced name cleaning for better geocoding results
function cleanStateName(name: string): string {
	return name
		.replace(/\(.*?\)/g, "") // Remove parentheses
		.replace(/\d+/g, "") // Remove numbers
		.trim();
}

// Try multiple search strategies
async function getCoordinatesWithFallback(stateName: string): Promise<{ lat: number; lon: number } | null> {
	// Strategy 1: Try exact name with Wikipedia
	let coords = await getCoordinatesFromWikipedia(stateName);
	if (coords) return coords;

	// Strategy 2: Try exact name with OSM
	coords = await getCoordinatesFromOSM(stateName);
	if (coords) return coords;

	// Strategy 3: Try cleaned name with Wikipedia
	const cleanedName = cleanStateName(stateName);
	if (cleanedName !== stateName) {
		coords = await getCoordinatesFromWikipedia(cleanedName);
		if (coords) return coords;

		coords = await getCoordinatesFromOSM(cleanedName);
		if (coords) return coords;
	}

	// Strategy 4: Try adding country context for ambiguous names
	const withCountry = await tryWithCountryContext(stateName);
	if (withCountry) return withCountry;

	return null;
}

async function tryWithCountryContext(stateName: string): Promise<{ lat: number; lon: number } | null> {
	// Common HOI4 state patterns
	const countryHints = [
		"Germany",
		"France",
		"United Kingdom",
		"Soviet Union",
		"United States",
		"Japan",
		"Italy",
		"Poland"
	];

	for (const country of countryHints.slice(0, 2)) {
		// Limit to avoid too many requests
		const searchTerm = `${stateName}, ${country}`;
		const coords = await getCoordinatesFromOSM(searchTerm);
		if (coords) {
			console.log(`  ✓ Found with context: ${country}`);
			return coords;
		}
		await new Promise((resolve) => setTimeout(resolve, 300));
	}

	return null;
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

			// Use enhanced geocoding with fallbacks
			const coords = await getCoordinatesWithFallback(name);

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
			await new Promise((resolve) => setTimeout(resolve, 600));
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
		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(stateName)}&srlimit=1&origin=*`;

		const searchResponse = await fetch(searchUrl);
		const searchData = await searchResponse.json();

		if (!searchData.query?.search?.length) {
			console.log(`  ⚠ Wikipedia: No article found`);
			return null;
		}

		const pageTitle = searchData.query.search[0].title;

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
		console.log(`  ✗ Wikipedia error`);
		return null;
	}
}

async function getCoordinatesFromOSM(stateName: string): Promise<{ lat: number; lon: number } | null> {
	try {
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
		console.log(`  ✗ OSM error`);
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
	lines.push("-- Insert regions with coordinates");
	lines.push("INSERT INTO regions (id, latitude, longitude, oil, aluminium, rubber, tungsten, steel, chromium)");
	lines.push("VALUES");

	const rows: string[] = [];

	for (const state of states) {
		const values: (string | number)[] = [state.id];

		// Only include states with coordinates for the main insert
		if (state.latitude !== undefined && state.longitude !== undefined) {
			values.push(state.latitude, state.longitude);
			values.push(state.resources.oil ?? 0);
			values.push(state.resources.aluminium ?? 0);
			values.push(state.resources.rubber ?? 0);
			values.push(state.resources.tungsten ?? 0);
			values.push(state.resources.steel ?? 0);
			values.push(state.resources.chromium ?? 0);

			rows.push(`  (${values.join(", ")})`);
		}
	}

	lines.push(rows.join(",\n"));
	lines.push("ON CONFLICT (id) DO NOTHING;");
	lines.push("");

	// Separate section for regions without coordinates
	const statesWithoutCoords = states.filter((s) => !s.latitude || !s.longitude);
	if (statesWithoutCoords.length > 0) {
		lines.push("-- Regions without coordinates (needs manual geocoding)");
		lines.push("-- Uncomment and add coordinates once available");
		for (const state of statesWithoutCoords) {
			lines.push(`-- INSERT INTO regions (id, latitude, longitude) VALUES (${state.id}, NULL, NULL); -- ${state.name}`);
		}
	}

	return lines.join("\n");
}

function generateMissingCoordinatesReport(states: StateResource[]): string {
	const missing = states.filter((s) => !s.latitude || !s.longitude);
	const lines: string[] = [];

	lines.push("# Missing Coordinates Report");
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push(`Total missing: ${missing.length}\n`);
	lines.push("## Regions requiring manual geocoding:\n");

	for (const state of missing) {
		lines.push(`- ID ${state.id}: ${state.name}`);
		lines.push(`  - Google search: https://www.google.com/search?q=${encodeURIComponent(state.name + " coordinates")}`);
		lines.push("");
	}

	return lines.join("\n");
}

async function main() {
	console.log("Enhanced HOI4 SQL Insert Generator\n");
	console.log("=".repeat(50) + "\n");

	const states = await fetchStateResources();

	if (states.length === 0) {
		console.error("No states found. Exiting.");
		return;
	}

	const statesWithCoords = states.filter((s) => s.latitude !== undefined && s.longitude !== undefined);
	const statesWithoutCoords = states.filter((s) => s.latitude === undefined || s.longitude === undefined);

	console.log("\n" + "=".repeat(50));
	console.log("STATISTICS");
	console.log("=".repeat(50));
	console.log(`Total states: ${states.length}`);
	console.log(
		`States with coordinates: ${statesWithCoords.length} (${((statesWithCoords.length / states.length) * 100).toFixed(1)}%)`
	);
	console.log(`States without coordinates: ${statesWithoutCoords.length}\n`);

	const sql = generateSQLInserts(states);
	await writeFile("./insert_regions.sql", sql);
	console.log("✓ Generated insert_regions.sql");

	const missingReport = generateMissingCoordinatesReport(states);
	await writeFile("./missing_coordinates.md", missingReport);
	console.log("✓ Generated missing_coordinates.md");

	console.log("\n✓ All files generated successfully!");
	console.log("\nNext steps:");
	console.log("1. Review missing_coordinates.md for regions without coordinates");
	console.log("2. Manually add coordinates for missing regions");
	console.log("3. Run insert_regions.sql to populate your database");
}

main().catch(console.error);
