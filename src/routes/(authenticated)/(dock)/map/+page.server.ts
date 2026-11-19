// src/routes/(authenticated)/(dock)/map/+page.server.ts
// The situational-awareness map: the political/heatmap base layers plus, for
// the viewer's side, own forces, hostile forces known through fresh intel
// (fog of war elsewhere), battles with their axes of attack, and recon cover.
import type { IntelPicture } from "#lib/server/services/military/intel.js";
import { db } from "#lib/server/db.js";
import {
	regions,
	states,
	blocs,
	wars,
	residences,
	powerPlants,
	militaryUnits,
	battles,
	regionBorders,
	reconMissions
} from "#lib/server/schema.js";
import { sql, eq, and, inArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	ReconError,
	enemiesOf,
	launchRecon,
	picturesByRegion,
	resolveReconMissions,
	sensorCooldownEndsAt,
	viewerSide
} from "#lib/server/services/military/recon.js";
import { SENSORS, SENSOR_IDS, UNIT_CATEGORIES, regionCover, type SensorId } from "#lib/config/index.js";

type FriendlyForce = { total: number; mine: number; ally: boolean; byType: Record<string, number> };
type PictureSummary = {
	confidence: number;
	level: string;
	knownUnits: number;
	dominant: string | null;
	categories: Record<string, { coverage: number; count: number | null; estimated: boolean }>;
	observedAt: string | null;
	firing: number;
	sensors: string[];
	buildings: IntelPicture["buildings"];
};

/** What the viewer's side knows: forces, intel, battles and recon in flight. */
async function situation(userId: string) {
	await resolveReconMissions(db).catch((err) => console.error("Recon resolve failed:", err));
	const side = await viewerSide(db, userId);
	const now = new Date();

	const ongoing = await db
		.select({
			id: battles.id,
			regionId: battles.regionId,
			attackerStateId: battles.attackerStateId,
			defenderStateId: battles.defenderStateId,
			phase: battles.phase
		})
		.from(battles)
		.where(eq(battles.status, "ongoing"));

	// Axis of attack: the attacker's nearest region bordering the battle.
	const borderRows = await db
		.select({ a: regionBorders.regionId, b: regionBorders.neighborId, km: regionBorders.distanceKm })
		.from(regionBorders);
	const regionRows = await db
		.select({ id: regions.id, stateId: regions.stateId, lat: regions.latitude, lon: regions.longitude })
		.from(regions);
	const owner = new Map(regionRows.map((r) => [r.id, r.stateId]));
	const coords = new Map(regionRows.map((r) => [r.id, [Number(r.lat), Number(r.lon)] as const]));
	// Great-circle distance in km, for attacks that don't come from next door.
	const distanceKm = (a: number, b: number) => {
		const [la1, lo1] = coords.get(a) ?? [0, 0];
		const [la2, lo2] = coords.get(b) ?? [0, 0];
		const rad = Math.PI / 180;
		const h =
			Math.sin(((la2 - la1) * rad) / 2) ** 2 +
			Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(((lo2 - lo1) * rad) / 2) ** 2;
		return 12742 * Math.asin(Math.sqrt(h));
	};
	const battlesOut = ongoing.map((b) => {
		let origin: number | null = null;
		let best = Infinity;
		for (const r of borderRows) {
			const other = r.a === b.regionId ? r.b : r.b === b.regionId ? r.a : null;
			if (other == null || owner.get(other) !== b.attackerStateId) continue;
			const km = Number(r.km);
			if (km < best) {
				best = km;
				origin = other;
			}
		}
		// No bordering region of the attacker's: draw the axis from its nearest
		// region anywhere (an attack across the sea or from a far front).
		if (origin == null) {
			for (const r of regionRows) {
				if (r.stateId !== b.attackerStateId) continue;
				const km = distanceKm(r.id, b.regionId);
				if (km < best) {
					best = km;
					origin = r.id;
				}
			}
		}
		const mine = !side
			? null
			: side.stateIds.includes(b.attackerStateId)
				? ("attacker" as const)
				: side.stateIds.includes(b.defenderStateId)
					? ("defender" as const)
					: null;
		return { ...b, originRegionId: origin, mine };
	});

	if (!side) {
		return {
			side: null,
			enemyStateIds: [] as number[],
			friendly: {} as Record<number, FriendlyForce>,
			pictures: {} as Record<number, PictureSummary>,
			contested: [] as number[],
			battles: battlesOut,
			inFlight: [] as { regionId: number; sensor: string; completesAt: string }[],
			sensors: [] as {
				id: string;
				label: string;
				short: string;
				cost: number;
				durationMinutes: number;
				cooldownEndsAt: string | null;
			}[]
		};
	}

	const [enemies, friendlyRows, pictures, inFlight, sensors] = await Promise.all([
		enemiesOf(db, side),
		db
			.select({
				regionId: militaryUnits.regionId,
				unitType: militaryUnits.unitType,
				stateId: militaryUnits.stateId,
				ownerId: militaryUnits.ownerId
			})
			.from(militaryUnits)
			.where(and(inArray(militaryUnits.stateId, side.stateIds), sql`${militaryUnits.health} > 0`)),
		picturesByRegion(db, side.stateIds, { now }),
		db
			.select({
				regionId: reconMissions.targetRegionId,
				sensor: reconMissions.sensor,
				completesAt: reconMissions.completesAt
			})
			.from(reconMissions)
			.where(and(inArray(reconMissions.stateId, side.stateIds), eq(reconMissions.status, "in_progress"))),
		Promise.all(
			SENSOR_IDS.map(async (id) => ({
				id,
				label: SENSORS[id].label,
				short: SENSORS[id].short,
				cost: SENSORS[id].cost,
				durationMinutes: SENSORS[id].durationMinutes,
				cooldownEndsAt: (await sensorCooldownEndsAt(db, userId, side, id, now))?.toISOString() ?? null
			}))
		)
	]);

	const friendly: Record<number, FriendlyForce> = {};
	for (const u of friendlyRows) {
		const f = (friendly[u.regionId] ??= { total: 0, mine: 0, ally: false, byType: {} });
		f.total++;
		if (u.ownerId === userId) f.mine++;
		if (u.stateId !== side.stateId) f.ally = true;
		f.byType[u.unitType] = (f.byType[u.unitType] ?? 0) + 1;
	}

	const picturesOut: Record<number, PictureSummary> = {};
	for (const [regionId, p] of pictures) {
		const dominant =
			UNIT_CATEGORIES.map((c) => [c, p.categories[c].count ?? 0] as const)
				.filter(([, n]) => n > 0)
				.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
		picturesOut[regionId] = {
			confidence: p.confidence,
			level: p.level,
			knownUnits: p.knownUnits,
			dominant,
			categories: p.categories,
			observedAt: p.latestObservedAt,
			firing: p.firingPositions?.count ?? 0,
			sensors: [...new Set(p.sensors.map((s) => s.sensor))],
			buildings: p.buildings
		};
	}

	// Contested: enemy regions on your side's border, and battles you're in.
	const contested = new Set<number>();
	for (const r of borderRows) {
		const [sa, sb] = [owner.get(r.a), owner.get(r.b)];
		if (sa && sb && side.stateIds.includes(sa) && enemies.has(sb)) contested.add(r.b);
		if (sa && sb && side.stateIds.includes(sb) && enemies.has(sa)) contested.add(r.a);
	}
	for (const b of battlesOut) if (b.mine) contested.add(b.regionId);

	return {
		side: { stateId: side.stateId, stateIds: side.stateIds },
		enemyStateIds: [...enemies],
		friendly,
		pictures: picturesOut,
		contested: [...contested],
		battles: battlesOut,
		inFlight: inFlight.map((m) => ({ ...m, completesAt: m.completesAt.toISOString() })),
		sensors
	};
}

export const actions: Actions = {
	launchRecon: async ({ request, locals }) => {
		const form = await request.formData();
		const sensor = String(form.get("sensor") ?? "") as SensorId;
		const regionId = Number(form.get("regionId"));
		if (!SENSOR_IDS.includes(sensor) || !Number.isInteger(regionId)) return fail(400, { error: "Choose a sensor." });
		try {
			await launchRecon(db, { userId: locals.account!.id, regionId, sensor });
		} catch (err) {
			if (err instanceof ReconError) return fail(400, { error: err.message });
			throw err;
		}
		return { success: true };
	}
};

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// All map queries are independent, so run them in parallel
		const [currentUserRegionId, allRegions, allStates, allBlocs, activeWars, residentCounts, ppByState, sa] =
			await Promise.all([
				// ── Current user's region, so the map can open centred on it ────
				(async () => {
					if (!locals.account) return null;
					const [residence] = await db
						.select({ regionId: residences.regionId })
						.from(residences)
						.where(eq(residences.userId, locals.account.id))
						.limit(1);
					return residence?.regionId ?? null;
				})(),

				// ── Core: regions + states (unchanged) ──────────────────────────
				db
					.select({
						id: regions.id,
						stateId: regions.stateId,
						longitude: regions.longitude,
						terrain: regions.terrain,
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
					.from(regions),

				db
					.select({
						id: states.id,
						name: states.name,
						description: states.description,
						population: states.population,
						rating: states.rating,
						blocId: states.blocId,
						background: states.background
					})
					.from(states),

				// ── Blocs: fetch id + name + color for every bloc ───────────────
				db
					.select({
						id: blocs.id,
						name: blocs.name,
						color: blocs.color
					})
					.from(blocs),

				// ── Wars: collect attacker & defender state IDs for active wars ─
				db
					.select({
						attackerId: wars.attackerId,
						defenderId: wars.defenderId
					})
					.from(wars)
					.where(sql`${wars.status} = 'active'`),

				// ── Residents: count per region ─────────────────────────────────
				db
					.select({
						regionId: residences.regionId,
						count: sql<number>`count(*)`.as("count")
					})
					.from(residences)
					.groupBy(residences.regionId),

				// ── Power plants: count per region (powerPlants belong to a state,
				//    but we need them per-region. powerPlants has stateId, not regionId.
				//    The closest semantic fit: count powerplants per *state*, then
				//    spread that count evenly across the state's regions so the heatmap
				//    highlights states with more plants. If your powerPlants table ever
				//    adds a regionId column you can group directly on that instead.) ──
				db
					.select({
						stateId: powerPlants.stateId,
						count: sql<number>`count(*)`.as("count")
					})
					.from(powerPlants)
					.groupBy(powerPlants.stateId),

				// ── Situational awareness for the viewer's side ────────────────
				locals.account ? situation(locals.account.id) : Promise.resolve(null)
			]);

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

		const warAttackerStateIds = new Set<number>();
		const warDefenderStateIds = new Set<number>();
		for (const w of activeWars) {
			warAttackerStateIds.add(w.attackerId);
			warDefenderStateIds.add(w.defenderId);
		}

		const residentCountMap = new Map<number, number>();
		for (const rc of residentCounts) {
			residentCountMap.set(rc.regionId, rc.count);
		}

		const ppStateMap = new Map<number, number>();
		for (const pp of ppByState) {
			ppStateMap.set(pp.stateId, pp.count);
		}

		// ── Assemble regionMap ──────────────────────────────────────────
		const regionMap: Record<
			number,
			{
				stateId: number | null;
				longitude: number;
				terrain: string | null;
				rating: number;
				education: number | null;
				infrastructure: number | null;
				economy: number | null;
				hospitals: number | null;
				fortifications: number | null;
				cover: string;
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

		// Fog of war: installations in enemy regions are only known through a
		// fresh recon pass that saw them; otherwise they show as unknown.
		const enemyStates = new Set(sa?.enemyStateIds ?? []);
		const seen = (r: (typeof allRegions)[number]) => {
			if (!r.stateId || !enemyStates.has(r.stateId)) return { ...r, known: true as const };
			const b = sa?.pictures[r.id]?.buildings;
			return b ? { ...r, ...b, known: true as const } : { ...r, known: false as const };
		};

		for (const raw of allRegions) {
			const r = seen(raw);
			regionMap[r.id] = {
				stateId: r.stateId,
				longitude: Number(r.longitude),
				terrain: r.terrain,
				rating: r.rating || 0,
				education: r.known ? r.education || 0 : null,
				infrastructure: r.known ? r.infrastructure || 0 : null,
				economy: r.known ? r.economy || 0 : null,
				hospitals: r.known ? r.hospitals || 0 : null,
				fortifications: r.known ? r.fortifications || 0 : null,
				// Terrain is public; derived from the real data, not what intel saw.
				cover: regionCover(raw),
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
		// A state's own colour when it picked one (the edit form defaults to
		// #6366f1, so that one doesn't count), otherwise a stable palette pick.
		allStates.forEach((state) => {
			const own = state.background && /^#[0-9a-f]{6}$/i.test(state.background) ? state.background : null;
			stateColorMap[state.id] = own && own.toLowerCase() !== "#6366f1" ? own : colors[state.id % colors.length];
		});

		return {
			regionMap,
			stateColorMap,
			states: allStates,
			// New data for the four additional map layers
			blocColorMap,
			blocNameMap,
			warAttackerStateIds,
			warDefenderStateIds,
			currentUserRegionId,
			sa
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
			warDefenderStateIds: new Set<number>(),
			currentUserRegionId: null,
			sa: null
		};
	}
};
