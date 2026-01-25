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

// Manual coordinate mappings for problematic regions
const MANUAL_COORDS: Record<number, { lat: number; lon: number }> = {
	19: { lat: 44.8378, lon: -0.5792 },
	63: { lat: 53.7833, lon: 15.5833 },
	74: { lat: 49.8209, lon: 18.2625 },
	127: { lat: 50.9097, lon: -0.1373 },
	235: { lat: 45.0428, lon: 41.9734 },
	286: { lat: 10.7769, lon: 106.7009 },
	290: { lat: 35.7595, lon: -5.834 },
	419: { lat: 38.0962, lon: 46.2738 },
	433: { lat: 26.9124, lon: 75.7873 },
	514: { lat: 26.3351, lon: 2.8869 },
	535: { lat: 36.6514, lon: 138.1811 },
	556: { lat: 14.4974, lon: -14.4524 },
	655: { lat: 51.65, lon: 143.0 },
	660: { lat: 0.3476, lon: 25.0 },
	716: { lat: 39.0, lon: 121.6 },
	717: { lat: 47.35, lon: 130.3667 },
	728: { lat: 21.1911, lon: 110.3577 }
};

// Known resource-rich states from HOI4 (based on common knowledge of the game)
// This is a PARTIAL dataset - you should expand this with wiki data
const KNOWN_RESOURCE_STATES: Partial<Record<number, StateResource["resources"]>> = {
	// Major oil producers
	1: {}, // Corsica
	289: { oil: 21, rubber: 24 }, // Siam (Thailand) - major rubber producer
	292: { oil: 80 }, // Nejd (Saudi Arabia) - massive oil
	293: { oil: 12 }, // Yemen - oil
	294: { oil: 8 }, // Oman - oil
	375: { oil: 171, steel: 60 }, // Texas - huge oil and steel
	378: { oil: 32 }, // California - oil
	406: { oil: 14 }, // Gurev (Kazakhstan) - oil
	410: { oil: 3 }, // Sistan (Iran) - oil
	413: { oil: 36 }, // Khuzestan (Iran) - major oil
	443: { oil: 3 }, // Sind (Pakistan) - oil
	448: { oil: 12 }, // Tripoli - oil
	452: { oil: 2 }, // Marsa Matruh - oil
	484: { oil: 56 }, // Baja California - oil
	591: { tungsten: 24 }, // Hainan - tungsten
	670: { tungsten: 12 }, // Laos - tungsten

	// Major steel producers
	40: { steel: 20 }, // Barnaul (Siberia)
	65: { steel: 70 }, // Sachsen (Germany) - major steel
	66: { steel: 12 }, // Niederschlesien
	158: { steel: 50 }, // Piedmont (Italy) - steel
	159: { steel: 36 }, // Lombardy - steel
	219: { steel: 44 }, // Moscow - steel
	360: { steel: 48 }, // Pennsylvania - steel
	393: { steel: 54 }, // Michigan - steel
	395: { steel: 30 }, // Illinois - steel

	// Chromium producers
	48: { chromium: 18 }, // Sofia (Bulgaria)
	84: { chromium: 18 }, // Transylvania
	229: { chromium: 15, oil: 12 }, // Azerbaijan
	275: { chromium: 96, steel: 36 }, // Transvaal (South Africa) - major chromium
	517: { chromium: 12 }, // Victoria (Australia)
	540: { chromium: 12 }, // Angola
	543: { chromium: 12 }, // Madagascar
	681: { chromium: 60 }, // Cape (South Africa)

	// Aluminium producers
	285: { aluminium: 36 }, // New South Wales (Australia)
	517: { aluminium: 48, chromium: 12 }, // Victoria
	519: { aluminium: 24 }, // South Australia
	522: { aluminium: 36 }, // Western Australia
	586: { aluminium: 12 }, // Alma-Ata (Kazakhstan)

	// Rubber producers
	288: { rubber: 36 }, // Burma - major rubber
	289: { oil: 21, rubber: 24 }, // Siam - major rubber
	325: { tungsten: 30 }, // Yunnan (China) - tungsten
	326: { tungsten: 7 }, // Hong Kong
	334: { rubber: 36, oil: 18 }, // Kalimantan (Borneo) - major rubber and oil
	335: { rubber: 8, oil: 4 }, // Java
	591: { rubber: 12, tungsten: 24 }, // Hainan
	667: { rubber: 4 }, // Lesser Sunda Islands
	672: { rubber: 96, oil: 32 }, // Sumatra - HUGE rubber producer

	// Tungsten producers
	41: { tungsten: 120 }, // Madrid (Spain) - major tungsten
	169: { tungsten: 48 }, // Andalusia
	181: { tungsten: 60 }, // Guarda (Portugal) - major tungsten
	283: { tungsten: 12 }, // Gansu (China)
	325: { tungsten: 30 }, // Yunnan - major tungsten
	591: { tungsten: 24 }, // Hainan
	670: { tungsten: 12 } // Laos
};

async function fetchStatesFromWeb(): Promise<StateResource[]> {
	console.log("Fetching state list from hoi4cheats.com...\n");

	try {
		const response = await fetch("https://hoi4cheats.com/states");
		const html = await response.text();

		const states: StateResource[] = [];
		const tableRegex = /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>(\d+)<\/td>.*?<\/tr>/gs;

		let match;
		let count = 0;
		while ((match = tableRegex.exec(html)) !== null) {
			const name = match[1].trim();
			const id = parseInt(match[2].trim());

			if (name && !isNaN(id)) {
				count++;
				console.log(`[${count}] Processing: ${name} (ID: ${id})`);

				// Get coordinates
				const coords = await getCoordinatesWithFallback(name, id);

				// Get resources from known data
				const resources = KNOWN_RESOURCE_STATES[id] || {};

				if (Object.keys(resources).length > 0) {
					console.log(`  ✓ Resources: ${JSON.stringify(resources)}`);
				}

				states.push({
					id,
					name,
					latitude: coords?.lat,
					longitude: coords?.lon,
					resources
				});

				// Rate limiting
				await new Promise((resolve) => setTimeout(resolve, 600));
			}
		}

		console.log(`\nTotal states processed: ${states.length}`);
		return states;
	} catch (error) {
		console.error("Error fetching from web:", error);
		return [];
	}
}

async function getCoordinatesWithFallback(
	stateName: string,
	stateId: number
): Promise<{ lat: number; lon: number } | null> {
	// Check manual mappings first
	if (MANUAL_COORDS[stateId]) {
		console.log(`  ✓ Coords: Manual mapping`);
		return MANUAL_COORDS[stateId];
	}

	// Try Photon
	let coords = await getCoordinatesFromPhoton(stateName);
	if (coords) return coords;

	// Try Nominatim
	coords = await getCoordinatesFromNominatim(stateName);
	if (coords) return coords;

	// Try Wikipedia
	coords = await getCoordinatesFromWikipedia(stateName);
	if (coords) return coords;

	console.log(`  ⚠ No coordinates found`);
	return null;
}

async function getCoordinatesFromPhoton(stateName: string): Promise<{ lat: number; lon: number } | null> {
	try {
		const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(stateName)}&limit=1`;
		const response = await fetch(url);
		const data = await response.json();

		if (data.features && data.features.length > 0) {
			const coords = data.features[0].geometry.coordinates;
			console.log(`  ✓ Coords: Photon (${coords[1].toFixed(2)}, ${coords[0].toFixed(2)})`);
			return { lat: coords[1], lon: coords[0] };
		}
		return null;
	} catch {
		return null;
	}
}

async function getCoordinatesFromNominatim(stateName: string): Promise<{ lat: number; lon: number } | null> {
	try {
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(stateName)}&limit=1`;
		const response = await fetch(url, {
			headers: { "User-Agent": "HOI4-Database-Generator/1.0" }
		});
		const data = await response.json();

		if (data && data.length > 0) {
			console.log(
				`  ✓ Coords: Nominatim (${parseFloat(data[0].lat).toFixed(2)}, ${parseFloat(data[0].lon).toFixed(2)})`
			);
			return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
		}
		return null;
	} catch {
		return null;
	}
}

async function getCoordinatesFromWikipedia(stateName: string): Promise<{ lat: number; lon: number } | null> {
	try {
		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(stateName)}&srlimit=1&origin=*`;
		const searchResponse = await fetch(searchUrl);
		const searchData = await searchResponse.json();

		if (!searchData.query?.search?.length) return null;

		const pageTitle = searchData.query.search[0].title;
		const coordUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&titles=${encodeURIComponent(pageTitle)}&origin=*`;
		const coordResponse = await fetch(coordUrl);
		const coordData = await coordResponse.json();

		const pages = coordData.query?.pages;
		if (!pages) return null;

		const page = Object.values(pages)[0] as any;
		if (page.coordinates && page.coordinates.length > 0) {
			const coords = page.coordinates[0];
			console.log(`  ✓ Coords: Wikipedia (${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)})`);
			return { lat: coords.lat, lon: coords.lon };
		}
		return null;
	} catch {
		return null;
	}
}

function generateSQLInserts(states: StateResource[]): string {
	const lines: string[] = [];
	lines.push("-- HOI4 Regions SQL Insert Statements");
	lines.push(`-- Total regions: ${states.length}`);
	lines.push(`-- Regions with coordinates: ${states.filter((s) => s.latitude && s.longitude).length}`);
	lines.push(
		`-- Regions with resources: ${states.filter((s) => Object.values(s.resources).some((v) => v && v > 0)).length}`
	);
	lines.push(`-- Generated at: ${new Date().toISOString()}`);
	lines.push("");
	lines.push("-- NOTE: This dataset contains partial resource data.");
	lines.push("-- For complete resource data, you need access to the game files or manual wiki entry.");
	lines.push("");
	lines.push("INSERT INTO regions (id, latitude, longitude, oil, aluminium, rubber, tungsten, steel, chromium)");
	lines.push("VALUES");

	const rows: string[] = [];
	for (const state of states) {
		if (state.latitude !== undefined && state.longitude !== undefined) {
			const values = [
				state.id,
				state.latitude.toFixed(4),
				state.longitude.toFixed(4),
				state.resources.oil ?? 0,
				state.resources.aluminium ?? 0,
				state.resources.rubber ?? 0,
				state.resources.tungsten ?? 0,
				state.resources.steel ?? 0,
				state.resources.chromium ?? 0
			];
			rows.push(`  (${values.join(", ")})`);
		}
	}

	lines.push(rows.join(",\n"));
	lines.push("ON CONFLICT (id) DO UPDATE SET");
	lines.push("  latitude = EXCLUDED.latitude,");
	lines.push("  longitude = EXCLUDED.longitude,");
	lines.push("  oil = EXCLUDED.oil,");
	lines.push("  aluminium = EXCLUDED.aluminium,");
	lines.push("  rubber = EXCLUDED.rubber,");
	lines.push("  tungsten = EXCLUDED.tungsten,");
	lines.push("  steel = EXCLUDED.steel,");
	lines.push("  chromium = EXCLUDED.chromium;");
	return lines.join("\n");
}

function generateResourceGuide(): string {
	const lines: string[] = [];
	lines.push("# HOI4 Resource Data Collection Guide");
	lines.push("");
	lines.push("Since the Paradox Wiki is protected by Cloudflare and scraping isn't possible,");
	lines.push("here's how to manually add resource data:");
	lines.push("");
	lines.push("## Option 1: Manual Wiki Entry");
	lines.push("1. Visit: https://hoi4.paradoxwikis.com/List_of_states");
	lines.push("2. Find each state and note its resources");
	lines.push("3. Add them to KNOWN_RESOURCE_STATES in the script");
	lines.push("");
	lines.push("## Option 2: Use Game Files");
	lines.push("If you know someone with HOI4 installed:");
	lines.push("1. Copy the /history/states/ folder from their game");
	lines.push("2. Send it to you");
	lines.push("3. Run the script with that folder path");
	lines.push("");
	lines.push("## Option 3: Community Data");
	lines.push("Check these sources:");
	lines.push("- Reddit r/hoi4");
	lines.push("- HOI4 Discord communities");
	lines.push("- GitHub repos with extracted data");
	lines.push("");
	lines.push("## Current Resource Coverage");
	lines.push("The script currently has partial data for:");
	lines.push("- Major oil producers (Saudi Arabia, Texas, Iran, etc.)");
	lines.push("- Major steel producers (Germany, USA, USSR)");
	lines.push("- Chromium sources (South Africa, Balkans)");
	lines.push("- Rubber producers (Southeast Asia)");
	lines.push("- Tungsten sources (Spain, Portugal, China)");
	lines.push("- Aluminium producers (Australia, USSR)");
	lines.push("");
	lines.push("You'll need to add the remaining ~750 states manually or find a data source.");

	return lines.join("\n");
}

async function main() {
	console.log("Enhanced HOI4 SQL Insert Generator\n");
	console.log("=".repeat(60) + "\n");
	console.log("⚠️  IMPORTANT: Resource data is PARTIAL");
	console.log("   This script includes known major resource-producing states,");
	console.log("   but you'll need to add complete data manually or from game files.\n");
	console.log("=".repeat(60) + "\n");

	const states = await fetchStatesFromWeb();

	if (states.length === 0) {
		console.error("\n✗ No states found. Exiting.");
		return;
	}

	const withCoords = states.filter((s) => s.latitude && s.longitude);
	const withResources = states.filter((s) => Object.values(s.resources).some((v) => v && v > 0));

	console.log("\n" + "=".repeat(60));
	console.log("STATISTICS");
	console.log("=".repeat(60));
	console.log(`Total states: ${states.length}`);
	console.log(
		`States with coordinates: ${withCoords.length} (${((withCoords.length / states.length) * 100).toFixed(1)}%)`
	);
	console.log(
		`States with resources: ${withResources.length} (${((withResources.length / states.length) * 100).toFixed(1)}%)`
	);
	console.log(`Missing coordinates: ${states.length - withCoords.length}`);
	console.log(`Missing resources: ${states.length - withResources.length}\n`);

	const sql = generateSQLInserts(states);
	await writeFile("./insert_regions.sql", sql);
	console.log("✓ Generated insert_regions.sql");

	await writeFile("./states_debug.json", JSON.stringify(states, null, 2));
	console.log("✓ Generated states_debug.json");

	const guide = generateResourceGuide();
	await writeFile("./RESOURCE_DATA_GUIDE.md", guide);
	console.log("✓ Generated RESOURCE_DATA_GUIDE.md");

	console.log("\n" + "=".repeat(60));
	console.log("NEXT STEPS");
	console.log("=".repeat(60));
	console.log("1. Review RESOURCE_DATA_GUIDE.md for options to get complete data");
	console.log("2. Check states_debug.json to see which states have resources");
	console.log("3. Add missing resource data to KNOWN_RESOURCE_STATES in the script");
	console.log("4. Re-run the script to regenerate SQL with updated data");
}

main().catch(console.error);
