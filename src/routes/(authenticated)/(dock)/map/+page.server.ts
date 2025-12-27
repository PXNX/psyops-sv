// src/routes/map/+page.server.ts
import { db } from "$lib/server/db";
import { regions, states } from "$lib/server/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	try {
		// Fetch all regions with their state associations
		const allRegions = await db
			.select({
				id: regions.id,
				stateId: regions.stateId,
				rating: regions.rating,
				education: regions.education,
				infrastructure: regions.infrastructure,
				economy: regions.economy,
				hospitals: regions.hospitals,
				fortifications: regions.fortifications,
				// Resource data from regions table
				oil: regions.oil,
				aluminium: regions.aluminium,
				rubber: regions.rubber,
				tungsten: regions.tungsten,
				steel: regions.steel,
				chromium: regions.chromium
			})
			.from(regions);

		// Fetch all states for color mapping
		const allStates = await db
			.select({
				id: states.id,
				name: states.name,
				description: states.description,
				population: states.population,
				rating: states.rating
			})
			.from(states);

		// Create a map of region data for efficient lookup
		const regionMap: Record<
			number,
			{
				stateId: number | null;
				rating: number;
				education: number;
				infrastructure: number;
				economy: number;
				hospitals: number;
				fortifications: number;
				resources: {
					oil: number;
					aluminium: number;
					rubber: number;
					tungsten: number;
					steel: number;
					chromium: number;
				};
			}
		> = {};

		for (const r of allRegions) {
			regionMap[r.id] = {
				stateId: r.stateId,
				rating: r.rating || 0,
				education: r.education || 0,
				infrastructure: r.infrastructure || 0,
				economy: r.economy || 0,
				hospitals: r.hospitals || 0,
				fortifications: r.fortifications || 0,
				resources: {
					oil: r.oil || 0,
					aluminium: r.aluminium || 0,
					rubber: r.rubber || 0,
					tungsten: r.tungsten || 0,
					steel: r.steel || 0,
					chromium: r.chromium || 0
				}
			};
		}

		// Create state color map (assign unique colors to states)
		const stateColorMap: Record<number, string> = {};
		const colors = [
			"#ef4444", // red
			"#f59e0b", // amber
			"#10b981", // emerald
			"#3b82f6", // blue
			"#8b5cf6", // violet
			"#ec4899", // pink
			"#14b8a6", // teal
			"#f97316", // orange
			"#06b6d4", // cyan
			"#6366f1", // indigo
			"#a855f7", // purple
			"#84cc16", // lime
			"#f43f5e", // rose
			"#0ea5e9", // sky
			"#d946ef", // fuchsia
			"#22c55e", // green
			"#eab308", // yellow
			"#dc2626", // red-600
			"#7c3aed", // violet-600
			"#2563eb" // blue-600
		];

		allStates.forEach((state, idx) => {
			stateColorMap[state.id] = colors[idx % colors.length];
		});

		return {
			regionMap,
			stateColorMap,
			states: allStates
		};
	} catch (error) {
		console.error("Error loading map data:", error);

		// Return empty data on error
		return {
			regionMap: {},
			stateColorMap: {},
			states: []
		};
	}
};
