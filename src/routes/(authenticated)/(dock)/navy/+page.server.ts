// src/routes/(authenticated)/(dock)/navy/+page.server.ts
// The fleet console: the hex sea, your ships and facilities, and every order
// a commander can give. Mutations all go through the fleet service so the
// planner and the cron resolver share the same rules.
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { regions } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";
import { viewerSide } from "#lib/server/services/military/recon.js";
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
	refuelShip,
	repairShip,
	stopShip,
	transportCargo,
	transferFuel
} from "#lib/server/services/military/fleet.js";
import { inBounds } from "#lib/config/index.js";

function message(err: unknown) {
	return err instanceof FleetError ? err.message : err instanceof Error ? err.message : "Something went wrong.";
}

/** Timestamps cross the wire as ISO strings; devalue/SvelteKit handles the rest. */
const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.account!.id;
	const side = await viewerSide(db, userId);
	const world = await loadFleetWorld(db, side?.stateId);
	const myRegions = side
		? await db
				.select({ id: regions.id, latitude: regions.latitude, longitude: regions.longitude })
				.from(regions)
				.where(eq(regions.stateId, side.stateId))
		: [];
	let canCommand = false;
	if (side) canCommand = (await fleetAuthority(db, userId).catch(() => null)) !== null;

	return {
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
		myRegions: myRegions.map((r) => ({ id: r.id, label: `Region #${r.id} (${r.latitude}, ${r.longitude})` }))
	};
};

export const actions: Actions = {
	buildPort: async ({ request, locals }) => {
		const f = await request.formData();
		const q = Number(f.get("q"));
		const r = Number(f.get("r"));
		const name = String(f.get("name") ?? "");
		const regionId = f.get("regionId") ? Number(f.get("regionId")) : null;
		try {
			if (!inBounds({ q, r })) throw new FleetError("That hex is outside the naval theatre.");
			await buildPort(db, locals.account!.id, { name, q, r, regionId });
			return { success: true, message: `Port ${name} established.` };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	buildDock: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const dock = await buildDock(db, locals.account!.id, Number(f.get("portId")));
			return { success: true, message: `Dock is now level ${dock.level}.` };
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	orderShip: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			await orderShip(db, locals.account!.id, Number(f.get("dockId")), String(f.get("shipClass")) as never);
			return { success: true, message: "Ship added to the construction queue." };
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
