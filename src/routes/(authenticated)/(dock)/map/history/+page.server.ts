import { db } from "#lib/server/db.js";
import { listSnapshots } from "#lib/server/services/world-snapshots.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	const snapshots = await listSnapshots(db, 365);
	const available = snapshots.map((s) => s.capturedAt.toISOString().slice(0, 10));
	const requested = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("at") ?? "")
		? url.searchParams.get("at")!.slice(0, 10)
		: "";

	let selected = snapshots[0] ?? null;
	let nearest = false;
	if (requested) {
		const exact = snapshots.find((s) => s.capturedAt.toISOString().startsWith(requested));
		if (exact) {
			selected = exact;
		} else if (snapshots.length) {
			// A day without a captured snapshot still gets a useful answer:
			// show the closest saved day and say so in the UI.
			const wanted = Date.parse(`${requested}T00:00:00Z`);
			if (Number.isFinite(wanted)) {
				selected = snapshots.reduce((best, s) =>
					Math.abs(s.capturedAt.getTime() - wanted) < Math.abs(best.capturedAt.getTime() - wanted) ? s : best
				);
				nearest = true;
			}
		}
	}

	return {
		snapshots,
		selected,
		requested,
		nearest,
		available,
		minDate: available.at(-1) ?? "",
		maxDate: available[0] ?? ""
	};
};
