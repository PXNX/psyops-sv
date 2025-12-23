import { writeFile } from "fs/promises";

interface State {
	id: number;
	name: string;
}

async function fetchHOI4States(): Promise<State[]> {
	console.log("Fetching HOI4 states from hoi4cheats.com...\n");

	try {
		const response = await fetch("https://hoi4cheats.com/states");
		const html = await response.text();

		// Parse the HTML table
		const states: State[] = [];
		const tableRowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>(.*?)<\/td>[\s\S]*?<td[^>]*>(\d+)<\/td>[\s\S]*?<\/tr>/g;

		let match;
		while ((match = tableRowRegex.exec(html)) !== null) {
			const name = match[1].trim();
			const id = parseInt(match[2].trim());

			if (name && !isNaN(id)) {
				states.push({ id, name });
			}
		}

		console.log(`Found ${states.length} states\n`);
		return states;
	} catch (error) {
		console.error("Failed to fetch states:", error);
		return [];
	}
}

async function main() {
	console.log("HOI4 Region JSON Generator\n");
	console.log("=".repeat(50) + "\n");

	// Fetch state data
	const states = await fetchHOI4States();

	if (states.length === 0) {
		console.error("No states found. Exiting.");
		return;
	}

	// Create region mapping
	const regionMapping: Record<string, string> = {};

	states.forEach((state) => {
		regionMapping[`region-${state.id}`] = state.name;
	});

	// Write to JSON file
	await writeFile("./regions.json", JSON.stringify(regionMapping, null, 2));

	console.log("✓ Created regions.json");
	console.log(`  Total regions: ${states.length}`);
	console.log(`\nSample entries:`);

	// Show first 5 entries as sample
	const entries = Object.entries(regionMapping).slice(0, 5);
	entries.forEach(([key, value]) => {
		console.log(`  "${key}": "${value}"`);
	});
	console.log(`  ...`);
}

main().catch(console.error);
