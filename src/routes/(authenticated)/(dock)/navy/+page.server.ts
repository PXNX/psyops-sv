// src/routes/(authenticated)/(dock)/navy/+page.server.ts
// The fleet console: the hex sea, your ships and facilities, and every order
// a commander can give. Mutations all go through the fleet service so the
// planner and the cron resolver share the same rules.
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { viewerSide } from "#lib/server/services/military/recon.js";
import { airSupportOf } from "#lib/server/services/military/fleet.js";
import { airMissionLedger, launchAirMission } from "#lib/server/services/military/air-missions.js";
import { eq } from "drizzle-orm";
import { regions } from "#lib/server/schema.js";
import { launchSeaIntel, seaIntelOptions, seaPicture } from "#lib/server/services/military/sea-intel.js";
import {
	FleetError,
	buildDock,
	buildPort,
	cancelDockJob,
	fleetAuthority,
	layMines,
	loadFleetWorld,
	moveShip,
	orderShip,
	portCandidates,
	refuelShip,
	repairShip,
	stopShip,
	transportCargo,
	transferFuel,
	upgradePort
} from "#lib/server/services/military/fleet.js";

function message(err: unknown) {
	return err instanceof FleetError ? err.message : err instanceof Error ? err.message : "Something went wrong.";
}

/** Timestamps cross the wire as ISO strings; devalue/SvelteKit handles the rest. */
const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.account!.id;
	const side = await viewerSide(db, userId);
	const world = await loadFleetWorld(db, side?.stateId);
	let canCommand = false;
	if (side) canCommand = (await fleetAuthority(db, userId).catch(() => null)) !== null;
	const regionRows = await db.select({ id: regions.id, stateId: regions.stateId, latitude: regions.latitude, longitude: regions.longitude }).from(regions);
	const [sensorOptions, picture, air] = await Promise.all([
		seaIntelOptions(db, userId, { q: 0, r: 0 }),
		side ? seaPicture(db, world.side?.stateIds ?? []) : Promise.resolve({}),
		side ? airSupportOf(db, side.stateId) : Promise.resolve({ units: [], byType: {}, roles: {} })
	]);

	return {
		seaSensors: sensorOptions.sensors,
		seaIntel: picture,
		airSupport: air,
		regionList: regionRows.map((r) => ({ id: r.id, stateId: r.stateId, label: `Region #${r.id} (${r.latitude}, ${r.longitude})` })),
		airMissions: side ? (await airMissionLedger(db, side.stateId)).map((m) => ({
			...m,
			launchedAt: iso(m.launchedAt),
			completesAt: iso(m.completesAt)
		})) : [],
		myStateId: side?.stateId ?? null,
		canCommand,
		ports: world.ports.map((p) => ({ ...p, createdAt: iso(p.createdAt) })),
		docks: world.docks.map((d) => ({ ...d, createdAt: iso(d.createdAt) })),
		ships: world.ships.map((s) => ({
			...s,
			legStartsAt: iso(s.legStartsAt),
			legArrivesAt: iso(s.legArrivesAt),
			createdAt: iso(s.createdAt),
			updatedAt: iso(s.updatedAt)
		})),
		mines: world.mines.map((m) => ({ ...m, laidAt: iso(m.laidAt), expiresAt: iso(m.expiresAt) })),
		queue: world.queue.map((q) => ({
			...q,
			queuedAt: iso(q.queuedAt),
			startsAt: iso(q.startsAt),
			completesAt: iso(q.completesAt)
		})),
		events: world.events.map((e) => ({ ...e, createdAt: iso(e.createdAt) })),
		blockedPorts: world.blockedPorts,
		jamming: world.jamming,
		enemyStateIds: world.enemyStateIds,
		alliedStateIds: world.side?.stateIds ?? [],
		portCandidates: side ? await portCandidates(db, side.stateId) : []
	};
};

export const actions: Actions = {
	buildPort: async ({ request, locals }) => {
		const f = await request.formData();
		const name = String(f.get("name") ?? "");
		const regionId = Number(f.get("regionId"));
		try {
			await buildPort(db, locals.account!.id, { name, regionId });
			return { success: true, message: `Port ${name} established.`, tutorial: "port-built" };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	upgradePort: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const port = await upgradePort(db, locals.account!.id, Number(f.get("portId")));
			return { success: true, message: `Port expanded to level ${port.level}.` };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	buildDock: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const dock = await buildDock(db, locals.account!.id, Number(f.get("portId")));
			return { success: true, message: `Dock is now level ${dock.level}.`, tutorial: "dock-built" };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	orderShip: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await orderShip(db, locals.account!.id, Number(f.get("dockId")), String(f.get("shipClass")) as never);
			return { success: true, message: "Ship added to the construction queue.", tutorial: "ship-ordered" };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	cancelJob: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await cancelDockJob(db, locals.account!.id, Number(f.get("itemId")));
			return { success: true, message: "Order cancelled and refunded." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	moveShip: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const result = await moveShip(db, locals.account!.id, Number(f.get("shipId")), {
				q: Number(f.get("q")),
				r: Number(f.get("r"))
			});
			return { success: true, message: `Under way: ${result.path.length - 1} hexes, ~${result.hours}h.` };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	stopShip: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await stopShip(db, locals.account!.id, Number(f.get("shipId")));
			return { success: true, message: "Ship ordered to hold position." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	refuelShip: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const result = await refuelShip(db, locals.account!.id, Number(f.get("shipId")));
			return { success: true, message: `Took on ${result.amount} fuel.` };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	repairShip: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await repairShip(db, locals.account!.id, Number(f.get("shipId")));
			return { success: true, message: "Repairs added to the dock queue." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	transferFuel: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const result = await transferFuel(db, locals.account!.id, Number(f.get("sourceId")), Number(f.get("targetId")));
			return { success: true, message: `Transferred ${result.amount} fuel.` };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	cargo: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await transportCargo(db, locals.account!.id, {
				shipId: Number(f.get("shipId")),
				portId: Number(f.get("portId")),
				resource: String(f.get("resource") ?? ""),
				amount: Number(f.get("amount")),
				direction: String(f.get("direction")) === "unload" ? "unload" : "load"
			});
			return { success: true, message: "Cargo handled." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	launchAirMission: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await launchAirMission(db, {
				userId: locals.account!.id,
				unitId: Number(f.get("unitId")),
				kind: String(f.get("kind")) as never,
				targetRegionId: f.get("targetRegionId") ? Number(f.get("targetRegionId")) : null,
				q: f.get("q") ? Number(f.get("q")) : undefined,
				r: f.get("r") ? Number(f.get("r")) : undefined
			});
			return { success: true, message: "Air mission launched.", tutorial: "air-mission" };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	launchSeaIntel: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await launchSeaIntel(db, {
				userId: locals.account!.id,
				q: Number(f.get("q")),
				r: Number(f.get("r")),
				sensor: String(f.get("sensor")) as never
			});
			return { success: true, message: "Sea reconnaissance pass launched.", tutorial: "sea-intel" };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	layMines: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await layMines(db, locals.account!.id, Number(f.get("shipId")));
			return { success: true, message: "Minefield laid; the area is now blockaded." };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	}
};
