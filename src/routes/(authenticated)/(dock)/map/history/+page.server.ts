import { db } from "#lib/server/db.js";
import { listSnapshots } from "#lib/server/services/world-snapshots.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	const snapshots = await listSnapshots(db, 365);
	const requested = url.searchParams.get("at");
	const selected =
		snapshots.find((s) => s.capturedAt.toISOString().startsWith(requested ?? "")) ?? snapshots[0] ?? null;
	return { snapshots, selected };
};
