// src/routes/map/+page.server.ts
import { db } from "$lib/server/db";
import { regions, states, blocs, wars, residences, powerPlants } from "$lib/server/schema";
import { sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	try {
		// ── Core: regions + states (unchanged) ──────────────────────────
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
				oil: regions.oil,
				aluminium: regions.aluminium,
				rubber: regions.rubber,
				tungsten: regions.tungsten,
				steel: regions.steel,
				chromium: regions.chromium
			})
			.from(regions);

		const allStates = await db
			.select({
				id: states.id,
				name: states.name,
				description: states.description,
				population: states.population,
				rating: states.rating,
				blocId: states.blocId
			})
			.from(states);

		// ── Blocs: fetch id + name + color for every bloc ───────────────
		const allBlocs = await db
			.select({
				id: blocs.id,
				name: blocs.name,
				color: blocs.color
			})
			.from(blocs);

		// blocColorMap: stateId → bloc colour string.
		// blocNameMap: stateId → bloc name string.
		// States that have no bloc simply won't appear in these maps.
		const blocById = new Map<number, { name: string; color: string }>();
		for (const b of allBlocs) {
			blocById.set(b.id, { name: b.name, color: b.color });
		}
		const blocColorMap: Record<number, string> = {};
		const blocNameMap: Record<number, string> = {};
		for (const s of allStates) {
			if (s.blocId && blocById.has(s.blocId)) {
				blocColorMap[s.id] = blocById.get(s.blocId)!.color;
				blocNameMap[s.id] = blocById.get(s.blocId)!.name;
			}
		}

		// ── Wars: collect attacker & defender state IDs for active wars ─
		const activeWars = await db
			.select({
				attackerId: wars.attackerId,
				defenderId: wars.defenderId
			})
			.from(wars)
			.where(sql`${wars.status} = 'active'`);

		const warAttackerStateIds = new Set<number>();
		const warDefenderStateIds = new Set<number>();
		for (const w of activeWars) {
			warAttackerStateIds.add(w.attackerId);
			warDefenderStateIds.add(w.defenderId);
		}

		// ── Residents: count per region ─────────────────────────────────
		const residentCounts = await db
			.select({
				regionId: residences.regionId,
				count: sql<number>`count(*)`.as("count")
			})
			.from(residences)
			.groupBy(residences.regionId);

		const residentCountMap = new Map<number, number>();
		for (const rc of residentCounts) {
			residentCountMap.set(rc.regionId, rc.count);
		}

		// ── Power plants: count per region (powerPlants belong to a state,
		//    but we need them per-region. powerPlants has stateId, not regionId.
		//    The closest semantic fit: count powerplants per *state*, then
		//    spread that count evenly across the state's regions so the heatmap
		//    highlights states with more plants. If your powerPlants table ever
		//    adds a regionId column you can group directly on that instead.) ──
		const ppByState = await db
			.select({
				stateId: powerPlants.stateId,
				count: sql<number>`count(*)`.as("count")
			})
			.from(powerPlants)
			.groupBy(powerPlants.stateId);

		const ppStateMap = new Map<number, number>();
		for (const pp of ppByState) {
			ppStateMap.set(pp.stateId, pp.count);
		}

		// ── Assemble regionMap ──────────────────────────────────────────
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
				residentCount: number;
				powerplantCount: number;
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
				},
				residentCount: residentCountMap.get(r.id) ?? 0,
				// powerplants are per-state; attribute the state's total to every
				// region belonging to that state so the heatmap lights up the state.
				powerplantCount: r.stateId ? (ppStateMap.get(r.stateId) ?? 0) : 0
			};
		}

		// ── State colour map (unchanged logic) ─────────────────────────
		const stateColorMap: Record<number, string> = {};
		const colors = [
			"#ef4444",
			"#f59e0b",
			"#10b981",
			"#3b82f6",
			"#8b5cf6",
			"#ec4899",
			"#14b8a6",
			"#f97316",
			"#06b6d4",
			"#6366f1",
			"#a855f7",
			"#84cc16",
			"#f43f5e",
			"#0ea5e9",
			"#d946ef",
			"#22c55e",
			"#eab308",
			"#dc2626",
			"#7c3aed",
			"#2563eb"
		];
		allStates.forEach((state, idx) => {
			stateColorMap[state.id] = colors[idx % colors.length];
		});

		return {
			regionMap,
			stateColorMap,
			states: allStates,
			// New data for the four additional map layers
			blocColorMap,
			blocNameMap,
			warAttackerStateIds,
			warDefenderStateIds
			};
	} catch (error) {
		console.error("Error loading map data:", error);
		return {
			regionMap: {},
			stateColorMap: {},
			states: [],
			blocColorMap: {},
			blocNameMap: {},
			warAttackerStateIds: new Set<number>(),
			warDefenderStateIds: new Set<number>()
		};
	}
};
