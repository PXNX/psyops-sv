import { writeFile } from "fs/promises";

interface StateResource {
	id: number;
	name: string;
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

		// Updated regex to capture the state data and resources
		// The table has columns: State Name, State ID, Victory Points, Resources (in icon format)
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

			// Extract resources - they appear as image tooltips or data attributes
			const resources: StateResource["resources"] = {};

			// Look for resource patterns in the row
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

			states.push({ id, name, resources });
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
	lines.push("-- Updated schema - only region_id and resources");
	lines.push("");

	// Begin transaction for better performance
	lines.push("BEGIN;");
	lines.push("");

	for (const state of states) {
		const columns = ["region_id", "rating", "development", "infrastructure", "economy", "auto_approve_residency"];

		const values: (string | number)[] = [
			state.id, // region_id (the HOI4 state ID)
			0, // rating default
			0, // development default
			0, // infrastructure default
			0, // economy default
			0 // auto_approve_residency default
		];

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

		const insert = `INSERT INTO regions (${columns.join(", ")}) VALUES (${values.join(", ")});`;
		lines.push(insert);
	}

	lines.push("");
	lines.push("COMMIT;");

	return lines.join("\n");
}

function generateUpdatedSchema(): string {
	return `-- Updated regions table schema
-- Removed: name, avatar, background, description, population, stateId
-- Changed: id is now auto-generated, region_id stores the HOI4 state ID

export const regions = pgTable("regions", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  region_id: integer("region_id").notNull().unique(), // HOI4 state ID
  rating: integer("rating").default(0),
  development: integer("development").default(0),
  infrastructure: integer("infrastructure").default(0),
  economy: integer("economy").default(0),
  oil: integer("oil").default(0),
  aluminium: integer("aluminium").default(0),
  rubber: integer("rubber").default(0),
  tungsten: integer("tungsten").default(0),
  steel: integer("steel").default(0),
  chromium: integer("chromium").default(0),
  autoApproveResidency: integer("auto_approve_residency").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});`;
}

async function main() {
	console.log("HOI4 SQL Insert Generator (Resources Only)\n");
	console.log("=".repeat(50) + "\n");

	// Fetch state resource data
	const states = await fetchStateResources();

	if (states.length === 0) {
		console.error("No states found. Exiting.");
		return;
	}

	// Show some statistics
	const statesWithResources = states.filter((s) => Object.keys(s.resources).length > 0);
	console.log(`States with resources: ${statesWithResources.length}/${states.length}`);

	if (statesWithResources.length > 0) {
		console.log("\nSample states with resources:");
		statesWithResources.slice(0, 5).forEach((state) => {
			console.log(`  ${state.name} (region_id: ${state.id})`);
			Object.entries(state.resources).forEach(([resource, amount]) => {
				console.log(`    - ${resource}: ${amount}`);
			});
		});
		console.log("  ...\n");
	}

	// Generate SQL
	const sql = generateSQLInserts(states);

	// Write to file
	await writeFile("./insert_regions.sql", sql);

	// Generate updated schema
	const schema = generateUpdatedSchema();
	await writeFile("./regions_schema.ts", schema);

	console.log("✓ Created insert_regions.sql");
	console.log(`  Total INSERT statements: ${states.length}`);
	console.log("\n✓ Created regions_schema.ts");
	console.log("  Updated schema definition");
	console.log("\nSchema changes:");
	console.log("  REMOVED columns: name, avatar, background, description, population, stateId");
	console.log("  ADDED columns: region_id (HOI4 state ID), oil, aluminium, rubber, tungsten, steel, chromium");
	console.log("\nMigration SQL:");
	console.log("  -- Drop removed columns");
	console.log("  ALTER TABLE regions DROP COLUMN IF EXISTS name;");
	console.log("  ALTER TABLE regions DROP COLUMN IF EXISTS avatar;");
	console.log("  ALTER TABLE regions DROP COLUMN IF EXISTS background;");
	console.log("  ALTER TABLE regions DROP COLUMN IF EXISTS description;");
	console.log("  ALTER TABLE regions DROP COLUMN IF EXISTS population;");
	console.log("  ALTER TABLE regions DROP COLUMN IF EXISTS state_id;");
	console.log("");
	console.log("  -- Add new columns");
	console.log("  ALTER TABLE regions ADD COLUMN region_id integer NOT NULL UNIQUE;");
	console.log("  ALTER TABLE regions ADD COLUMN oil integer DEFAULT 0;");
	console.log("  ALTER TABLE regions ADD COLUMN aluminium integer DEFAULT 0;");
	console.log("  ALTER TABLE regions ADD COLUMN rubber integer DEFAULT 0;");
	console.log("  ALTER TABLE regions ADD COLUMN tungsten integer DEFAULT 0;");
	console.log("  ALTER TABLE regions ADD COLUMN steel integer DEFAULT 0;");
	console.log("  ALTER TABLE regions ADD COLUMN chromium integer DEFAULT 0;");
}

main().catch(console.error);
