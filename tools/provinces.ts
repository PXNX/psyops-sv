import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";

interface State {
	id: number;
	name: string;
	logoDownloaded: boolean;
}

async function downloadSVG(url: string, filepath: string): Promise<boolean> {
	try {
		const response = await fetch(url);
		if (!response.ok) return false;

		const buffer = await response.arrayBuffer();
		await writeFile(filepath, Buffer.from(buffer));
		return true;
	} catch (error) {
		console.error(`Failed to download ${url}:`, error);
		return false;
	}
}

async function searchWikipediaLogo(regionName: string): Promise<string | null> {
	// List of Wikipedia language editions to try
	// Prioritize: English, German, then regional languages based on geography
	const languages = [
		"en",
		"de",
		"fr",
		"es",
		"it",
		"pl",
		"ru",
		"nl",
		"pt",
		"cs",
		"ro",
		"hu",
		"tr",
		"el",
		"sv",
		"da",
		"no",
		"fi"
	];

	// Try each language Wikipedia
	for (const lang of languages) {
		try {
			const wikiDomain = `${lang}.wikipedia.org`;

			// Try multiple search variations
			const searchVariations = [
				regionName,
				`${regionName} province`,
				`${regionName} state`,
				`${regionName} region`,
				`${regionName} voivodeship`
			];

			for (const searchTerm of searchVariations) {
				const searchUrl = `https://${wikiDomain}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
				const searchRes = await fetch(searchUrl);
				const searchData = await searchRes.json();

				if (!searchData.query?.search?.[0]) continue;

				// Try first 3 search results
				for (let i = 0; i < Math.min(3, searchData.query.search.length); i++) {
					const pageTitle = searchData.query.search[i].title;

					// Get page images
					const imageUrl = `https://${wikiDomain}/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=images&format=json&origin=*&imlimit=50`;
					const imageRes = await fetch(imageUrl);
					const imageData = await imageRes.json();

					const pages = imageData.query?.pages;
					const pageId = Object.keys(pages)[0];
					const images = pages[pageId]?.images;

					if (!images) continue;

					// Look for coat of arms SVG files - prioritize coat of arms over flags
					const coatOfArmsImages: any[] = [];
					const otherEmblemImages: any[] = [];

					for (const img of images) {
						const title = img.title.toLowerCase();

						// Check if it's an SVG
						if (title.includes(".svg")) {
							// Skip flags entirely
							if (
								title.includes("flag") ||
								title.includes("flagge") ||
								title.includes("bandera") ||
								title.includes("drapeau")
							)
								continue;

							// Prioritize coat of arms (multi-language keywords)
							const isCoatOfArms =
								title.includes("coat") ||
								title.includes("arms") ||
								title.includes("coa") ||
								title.includes("blazon") ||
								title.includes("wappen") ||
								title.includes("herb") ||
								title.includes("crest") ||
								title.includes("armoiries") ||
								title.includes("stemma") ||
								title.includes("escudo") ||
								title.includes("brasão") ||
								title.includes("grb");

							const isOtherEmblem =
								title.includes("emblem") ||
								title.includes("seal") ||
								title.includes("siegel") ||
								title.includes("sceau");

							if (isCoatOfArms) {
								coatOfArmsImages.push(img);
							} else if (isOtherEmblem) {
								otherEmblemImages.push(img);
							}
						}
					}

					// Try coat of arms first, then other emblems
					const imagesToTry = [...coatOfArmsImages, ...otherEmblemImages];

					for (const img of imagesToTry) {
						// Get the actual file URL - FIXED: now uses wikiDomain variable
						const fileUrl = `https://${wikiDomain}/w/api.php?action=query&titles=${encodeURIComponent(img.title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
						const fileRes = await fetch(fileUrl);
						const fileData = await fileRes.json();

						const filePages = fileData.query?.pages;
						const filePageId = Object.keys(filePages)[0];
						const imageUrl = filePages[filePageId]?.imageinfo?.[0]?.url;

						if (imageUrl) return imageUrl;
					}
				}
			}
		} catch (error) {
			// Continue to next language on error
			continue;
		}
	}

	return null;
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
				states.push({ id, name, logoDownloaded: false });
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
	console.log("HOI4 State Logo Scraper\n");
	console.log("=".repeat(50) + "\n");

	// Create output directory
	if (!existsSync("./states")) {
		await mkdir("./states");
	}

	// Fetch state data from the website
	const states = await fetchHOI4States();

	if (states.length === 0) {
		console.error("No states found. Exiting.");
		return;
	}

	// Ask user if they want to download all or specific range
	console.log("Processing states...");
	console.log("Note: This will take time due to rate limiting.\n");

	// Download logos
	let processed = 0;
	for (const state of states) {
		processed++;
		console.log(`[${processed}/${states.length}] Processing: ${state.name} (ID: ${state.id})`);

		const logoUrl = await searchWikipediaLogo(state.name);

		if (logoUrl) {
			const filename = `./states/${state.id}.svg`;
			const success = await downloadSVG(logoUrl, filename);

			if (success) {
				console.log(`  ✓ Downloaded logo to ${filename}`);
				state.logoDownloaded = true;
			} else {
				console.log(`  ✗ Failed to download logo`);
			}
		} else {
			console.log(`  ✗ No logo found`);
		}

		// Rate limiting - be respectful to Wikipedia
		// Increased delay due to multiple API calls per state
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	// Create JSON output with state ID to name mapping
	const output: Record<number, string> = {};
	states.forEach((s) => {
		output[s.id] = s.name;
	});

	await writeFile("./states/states.json", JSON.stringify(output, null, 2));
	console.log("\n" + "=".repeat(50));
	console.log("✓ Saved states.json");

	// Summary
	const downloaded = states.filter((s) => s.logoDownloaded).length;
	console.log(`\nSummary:`);
	console.log(`  Total states: ${states.length}`);
	console.log(`  Logos downloaded: ${downloaded}`);
	console.log(`  Success rate: ${((downloaded / states.length) * 100).toFixed(1)}%`);
	console.log(`\nOutput directory: ./states/`);
}

main().catch(console.error);
