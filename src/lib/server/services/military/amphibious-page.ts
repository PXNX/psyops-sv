// src/lib/server/services/military/amphibious-page.ts
// Form actions for beach landings and paradrops from the map's region panel.
import { fail } from "@sveltejs/kit";
import { db } from "#lib/server/db.js";
import { AmphibiousError, beachOdds, navalLanding, paradrop } from "./amphibious.js";

function message(err: unknown) {
	return err instanceof AmphibiousError || err instanceof Error ? err.message : "Something went wrong.";
}

export const amphibiousActions: import("@sveltejs/kit").Actions = {
	navalLanding: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const result = await navalLanding(db, locals.account!.id, Number(f.get("regionId")), f.getAll("shipIds").map(Number));
			return {
				success: true,
				message: result.success ? "Beachhead established." : `Landing repulsed (${Math.round(result.failure * 100)}% risk).`
			};
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	},
	paradrop: async ({ request, locals }) => {
		const f = await request.formData();
		try {
			const result = await paradrop(db, locals.account!.id, Number(f.get("regionId")), f.getAll("unitIds").map(Number));
			return {
				success: true,
				message: result.success ? "Paradrop succeeded." : `Paradrop shot down (${Math.round(result.failure * 100)}% risk).`
			};
		} catch (err) {
			return fail(400, { error: message(err) });
		}
	}
};

/** Risk readout for a selected coastal region. */
export async function beachInfo(regionId: number) {
	return beachOdds(db, regionId);
}
