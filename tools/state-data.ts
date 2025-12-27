import { writeFile } from "fs/promises";

interface StateResource {
	id: number;
	name: string;
	country?: string;
	resources: {
		oil?: number;
		aluminium?: number;
		rubber?: number;
		tungsten?: number;
		steel?: number;
		chromium?: number;
	};
}

// Mapping of HOI4 state IDs to countries (you'll need to expand this)
const STATE_TO_COUNTRY: Record<number, string> = {
	// Germany
	51: "Germany",
	52: "Germany",
	53: "Germany",
	54: "Germany",
	55: "Germany",
	56: "Germany",
	57: "Germany",
	58: "Germany",
	59: "Germany",
	60: "Germany",
	61: "Germany",
	62: "Germany",
	63: "Germany",
	64: "Germany",
	65: "Germany",

	// United States
	357: "USA",
	358: "USA",
	359: "USA",
	360: "USA",
	361: "USA",
	362: "USA",
	363: "USA",
	364: "USA",
	365: "USA",
	366: "USA",
	367: "USA",
	368: "USA",
	369: "USA",
	370: "USA",
	371: "USA",
	372: "USA",
	373: "USA",
	374: "USA",
	375: "USA",
	376: "USA",
	377: "USA",
	378: "USA",
	379: "USA",
	380: "USA",
	381: "USA",
	382: "USA",
	383: "USA",
	384: "USA",
	385: "USA",
	386: "USA",
	387: "USA",
	388: "USA",
	389: "USA",
	390: "USA",
	391: "USA",
	392: "USA",
	393: "USA",
	394: "USA",
	395: "USA",
	396: "USA",
	397: "USA",
	398: "USA",
	399: "USA",
	400: "USA",

	// United Kingdom
	120: "UK",
	121: "UK",
	122: "UK",
	123: "UK",
	124: "UK",
	125: "UK",
	126: "UK",
	127: "UK",
	128: "UK",
	129: "UK",
	130: "UK",
	131: "UK",
	132: "UK",
	133: "UK",

	// France
	14: "France",
	15: "France",
	16: "France",
	17: "France",
	18: "France",
	19: "France",
	20: "France",
	21: "France",
	22: "France",
	23: "France",
	24: "France",
	25: "France",
	26: "France",
	27: "France",
	28: "France",
	29: "France",
	30: "France",
	31: "France",
	32: "France",
	33: "France",

	// Soviet Union
	195: "USSR",
	196: "USSR",
	197: "USSR",
	198: "USSR",
	199: "USSR",
	200: "USSR",
	201: "USSR",
	202: "USSR",
	203: "USSR",
	204: "USSR",
	205: "USSR",
	206: "USSR",
	207: "USSR",
	208: "USSR",
	209: "USSR",
	210: "USSR",
	211: "USSR",
	212: "USSR",
	213: "USSR",
	214: "USSR",
	215: "USSR",
	216: "USSR",
	217: "USSR",
	218: "USSR",
	219: "USSR",
	220: "USSR",
	221: "USSR",
	222: "USSR",
	223: "USSR",
	224: "USSR",
	225: "USSR",
	226: "USSR",
	227: "USSR",
	228: "USSR",
	229: "USSR",
	230: "USSR",
	231: "USSR",
	232: "USSR",
	233: "USSR",
	234: "USSR",
	235: "USSR",
	236: "USSR",
	237: "USSR",
	238: "USSR",
	239: "USSR",
	240: "USSR",
	241: "USSR",
	242: "USSR",
	243: "USSR",
	244: "USSR",
	245: "USSR",
	246: "USSR",
	247: "USSR",
	248: "USSR",
	249: "USSR",

	// Italy
	2: "Italy",
	114: "Italy",
	115: "Italy",
	116: "Italy",
	117: "Italy",
	156: "Italy",
	157: "Italy",
	158: "Italy",
	159: "Italy",
	160: "Italy",
	161: "Italy",
	162: "Italy",

	// Japan
	281: "Japan",
	282: "Japan",
	283: "Japan",
	284: "Japan",
	285: "Japan",
	524: "Japan",
	525: "Japan",
	526: "Japan",
	527: "Japan",
	528: "Japan",
	529: "Japan",
	530: "Japan",
	531: "Japan",
	532: "Japan",
	533: "Japan",

	// Spain
	41: "Spain",
	166: "Spain",
	167: "Spain",
	168: "Spain",
	169: "Spain",
	170: "Spain",
	171: "Spain",
	172: "Spain",
	173: "Spain",
	174: "Spain",
	175: "Spain",
	176: "Spain",

	// Poland
	10: "Poland",
	86: "Poland",
	87: "Poland",
	88: "Poland",
	89: "Poland",
	90: "Poland",
	91: "Poland",
	92: "Poland",
	93: "Poland",
	94: "Poland",
	95: "Poland"

	// Add more countries as needed...
};

async function fetchStateResources(): Promise<StateResource[]> {
	console.log("Fetching HOI4 state resources from hoi4cheats.com...\n");

	try {
		const response = await fetch("https://hoi4cheats.com/states");
		const html = await response.text();

		const states: StateResource[] = [];

		// Updated regex to capture the state data and resources
		const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;

		let match;
		while ((match = tableRowRegex.exec(html)) !== null) {
			const row = match[1];

			// Extract state name and ID
			const nameMatch = /<td[^>]*>(.*?)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>/.exec(row);
			if (!nameMatch) continue;

			const name = nameMatch[1].trim();
			const id = parseInt(nameMatch[2].trim());

			if (!name || isNaN(id)) continue;

			// Get country from mapping
			const country = STATE_TO_COUNTRY[id];

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

			states.push({ id, name, country, resources });
		}

		console.log(`Found ${states.length} states\n`);
		return states;
	} catch (error) {
		console.error("Failed to fetch state resources:", error);
		return [];
	}
}

function generateSQLInserts(states: StateResource[]): string {
	const lines: string[] = [];

	// Add header comment
	lines.push("-- HOI4 Regions SQL Insert Statements");
	lines.push("-- Generated from hoi4cheats.com");
	lines.push(`-- Total regions: ${states.length}`);
	lines.push(`-- Generated at: ${new Date().toISOString()}`);
	lines.push("");

	// Begin transaction for better performance
	lines.push("BEGIN;");
	lines.push("");

	for (const state of states) {
		const columns = ["rating", "infrastructure", "economy"];
		const values: (string | number)[] = [
			0, // rating default
			0, // infrastructure default
			0 // economy default
		];

		// Add education, hospitals, fortifications
		columns.push("education", "hospitals", "fortifications");
		values.push(0, 0, 0);

		// Add resource columns if they exist
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

		// Add country if available
		if (state.country) {
			columns.push("country");
			values.push(`'${state.country}'`);
		}

		const insert = `INSERT INTO regions (${columns.join(", ")}) VALUES (${values.join(", ")});`;
		lines.push(insert);
	}

	lines.push("");
	lines.push("COMMIT;");

	return lines.join("\n");
}

function generateUpdatedSchema(): string {
	return `-- Updated regions table schema matching your current schema

export const regions = pgTable("regions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	rating: integer("rating").default(0),
	infrastructure: integer("infrastructure").default(0),
	economy: integer("powerplants").default(0),

	// New infrastructure fields
	education: integer("education").default(0),
	hospitals: integer("hospitals").default(0),
	fortifications: integer("fortifications").default(0),

	// Resources
	oil: integer("oil").default(0),
	aluminium: integer("aluminium").default(0),
	rubber: integer("rubber").default(0),
	tungsten: integer("tungsten").default(0),
	steel: integer("steel").default(0),
	chromium: integer("chromium").default(0),
	
	// Country this region belongs to
	country: varchar("country", { length: 100 }),
	
	// Optional: state_id if regions belong to states
	stateId: uuid("state_id").references(() => states.id, { onDelete: "cascade" }),

	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Don't forget to add Paraglide messages for region names:
// m.region_1 = "Region Name"
// And coat of arms SVGs at:
// /static/coats/1.svg`;
}

function generateCountryMapping(states: StateResource[]): string {
	const lines: string[] = [];

	lines.push("// Country to Region ID mapping for welcome page");
	lines.push("// This maps countries to HOI4 region IDs");
	lines.push("export const COUNTRY_TO_REGION_MAP: Record<string, number[]> = {");

	// Group states by country
	const countryGroups = new Map<string, number[]>();

	for (const state of states) {
		if (state.country) {
			if (!countryGroups.has(state.country)) {
				countryGroups.set(state.country, []);
			}
			countryGroups.get(state.country)!.push(state.id);
		}
	}

	// Generate the mapping
	for (const [country, regionIds] of countryGroups.entries()) {
		lines.push(`  "${country}": [${regionIds.join(", ")}],`);
	}

	lines.push("};");

	return lines.join("\n");
}

async function main() {
	console.log("HOI4 SQL Insert Generator\n");
	console.log("=".repeat(50) + "\n");

	// Fetch state resource data
	const states = await fetchStateResources();

	if (states.length === 0) {
		console.error("No states found. Exiting.");
		return;
	}

	// Show statistics
	const statesWithResources = states.filter((s) => Object.keys(s.resources).length > 0);
	const statesWithCountry = states.filter((s) => s.country);

	console.log(`States with resources: ${statesWithResources.length}/${states.length}`);
	console.log(`States with country mapping: ${statesWithCountry.length}/${states.length}\n`);

	// Show countries
	const countries = new Set(states.filter((s) => s.country).map((s) => s.country));
	console.log(`Countries mapped: ${countries.size}`);
	console.log(`Countries: ${Array.from(countries).join(", ")}\n`);

	if (statesWithResources.length > 0) {
		console.log("Sample states:");
		statesWithResources.slice(0, 5).forEach((state) => {
			console.log(`  ${state.name} (ID: ${state.id}, Country: ${state.country || "Unknown"})`);
			Object.entries(state.resources).forEach(([resource, amount]) => {
				console.log(`    - ${resource}: ${amount}`);
			});
		});
		console.log("  ...\n");
	}

	// Generate SQL
	const sql = generateSQLInserts(states);
	await writeFile("./insert_regions.sql", sql);
	console.log("✓ Generated insert_regions.sql");

	// Generate updated schema
	const schema = generateUpdatedSchema();
	await writeFile("./regions_schema.ts", schema);
	console.log("✓ Generated regions_schema.ts");

	// Generate country mapping
	const countryMapping = generateCountryMapping(states);
	await writeFile("./country_region_mapping.ts", countryMapping);
	console.log("✓ Generated country_region_mapping.ts");

	console.log("\n✓ All files generated successfully!");
}

main().catch(console.error);
