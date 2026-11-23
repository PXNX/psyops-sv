// src/routes/(authenticated)/(dock)/state/[id]/debt/+page.server.ts
// The state's outstanding debt, how it compares to GDP, and who holds the bonds.
import { error, fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { states } from "#lib/server/schema.js";
import { stateDebt } from "#lib/server/services/economy/bailout.js";
import { stateDebtCreditors, stateGdp } from "#lib/server/services/economy/state-metrics.js";
import { BondError, canIssueStateBonds, issueBondOffering, stateBondOfferingsFor } from "#lib/server/services/economy/bonds.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const stateId = Number(params.id);
	if (!Number.isInteger(stateId)) error(404, "State not found");

	const [state] = await db
		.select({ id: states.id, name: states.name })
		.from(states)
		.where(eq(states.id, stateId))
		.limit(1);
	if (!state) error(404, "State not found");

	const debt = await stateDebt(db, stateId);
	const [gdp, creditors, canIssueBonds, bondOfferings] = await Promise.all([
		stateGdp(db, stateId, debt),
		stateDebtCreditors(db, stateId),
		locals.account ? canIssueStateBonds(db, locals.account.id, stateId) : false,
		stateBondOfferingsFor(db, stateId)
	]);

	return {
		state: { id: state.id, name: state.name },
		debt,
		gdp,
		creditors,
		canIssueBonds,
		bondOfferings: bondOfferings.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))
	};
};

export const actions: Actions = {
	// Only the state's president or economy minister can hand out bonds.
	issueBonds: async ({ request, params, locals }) => {
		const account = locals.account!;
		const stateId = Number(params.id);
		if (!(await canIssueStateBonds(db, account.id, stateId))) {
			return fail(403, { error: "Only this state's president or economy minister can issue bonds." });
		}
		const principal = Number((await request.formData()).get("principal"));
		try {
			const offering = await issueBondOffering(db, { userId: account.id, stateId, principal });
			return { success: true, message: `Bond offering of ${offering.principal.toLocaleString()} is now open to investors.` };
		} catch (err) {
			if (err instanceof BondError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
