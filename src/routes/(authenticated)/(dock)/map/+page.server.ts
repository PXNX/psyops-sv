// src/routes/map/+page.server.ts
import { db } from "$lib/server/db";
import { regions, states, regionalResources } from "$lib/server/schema";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	try {
		// Fetch all regions with their state associations
		const allRegions = await db
			.select({
				id: regions.id,
				stateId: regions.stateId,
				rating: regions.rating,
				development: regions.development,
				infrastructure: regions.infrastructure,
				economy: regions.economy,
				// Resource data
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

		// Fetch regional resources (iron, copper, coal, wood)
		const allRegionalResources = await db
			.select({
				regionId: regionalResources.regionId,
				resourceType: regionalResources.resourceType,
				remainingReserves: regionalResources.remainingReserves,
				totalReserves: regionalResources.totalReserves
			})
			.from(regionalResources);

		// Create a map of region data for efficient lookup
		const regionMap: Record<
			number,
			{
				stateId: string | null;
				rating: number;
				development: number;
				infrastructure: number;
				economy: number;
				resources: {
					oil: number;
					aluminium: number;
					rubber: number;
					tungsten: number;
					steel: number;
					chromium: number;
				};
				regionalResources: Record<
					string,
					{
						remaining: number;
						total: number;
					}
				>;
			}
		> = {};

		for (const r of allRegions) {
			regionMap[r.id] = {
				stateId: r.stateId,
				rating: r.rating || 0,
				development: r.development || 0,
				infrastructure: r.infrastructure || 0,
				economy: r.economy || 0,
				resources: {
					oil: r.oil || 0,
					aluminium: r.aluminium || 0,
					rubber: r.rubber || 0,
					tungsten: r.tungsten || 0,
					steel: r.steel || 0,
					chromium: r.chromium || 0
				},
				regionalResources: {}
			};
		}

		// Add regional resources to the map
		for (const rr of allRegionalResources) {
			if (regionMap[rr.regionId]) {
				regionMap[rr.regionId].regionalResources[rr.resourceType] = {
					remaining: rr.remainingReserves || 0,
					total: rr.totalReserves || 0
				};
			}
		}

		// Create state color map (assign unique colors to states)
		const stateColorMap: Record<string, string> = {};
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
