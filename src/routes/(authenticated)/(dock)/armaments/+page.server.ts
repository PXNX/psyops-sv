// src/routes/(authenticated)/(dock)/armaments/+page.server.ts
// The separate arms market. Offers to states outside the seller's bloc stay
// pending until the seller's defence minister (or president) approves them.
import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { productInventory, states } from "#lib/server/schema.js";
import { ARMAMENT_GOODS, ARMAMENTS, armamentValue } from "#lib/config/index.js";
import {
	ArmsError,
	approveArms,
	armsBoard,
	buyArms,
	cancelArms,
	listArms,
	rejectArms,
	residenceState
} from "#lib/server/services/economy/armaments.js";

const failArms = (err: unknown) => fail(400, { error: err instanceof ArmsError ? err.message : "Arms deal failed." });

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	const [stateId, statesRows, held] = await Promise.all([
		residenceState(db, account.id),
		db.select({ id: states.id, name: states.name, blocId: states.blocId }).from(states).orderBy(states.name),
		db.select().from(productInventory).where(eq(productInventory.userId, account.id))
	]);
	const ownState = stateId ? statesRows.find((s) => s.id === stateId) : undefined;
	const board = await armsBoard(db, account.id, stateId);
	return {
		board,
		state: ownState ? { id: ownState.id, name: ownState.name, blocId: ownState.blocId } : null,
		states: statesRows.map((s) => ({ id: s.id, name: s.name, sameBloc: !!ownState?.blocId && s.blocId === ownState.blocId })),
		goods: ARMAMENT_GOODS.map((good) => ({ id: good, label: good.replace(/_/g, " "), value: armamentValue(good) })),
		held: held.map((h) => ({ good: h.productType, quantity: h.quantity })),
		minQuantity: ARMAMENTS.MIN_QUANTITY,
		maxQuantity: ARMAMENTS.MAX_QUANTITY,
		exportTax: ARMAMENTS.EXPORT_TAX_PERCENT
	};
};

export const actions: Actions = {
	list: async ({ request, locals }) => {
		const form = await request.formData();
		const targetRaw = String(form.get("targetStateId") ?? "");
		try {
			await listArms(db, {
				userId: locals.account!.id,
				good: String(form.get("good") ?? ""),
				quantity: Number(form.get("quantity")),
				pricePerUnit: Number(form.get("pricePerUnit")),
				targetStateId: targetRaw ? Number(targetRaw) : null
			});
			return { success: true, message: "Arms offer published." };
		} catch (err) {
			return failArms(err);
		}
	},
	approve: async ({ request, locals }) => {
		try {
			await approveArms(db, locals.account!.id, Number((await request.formData()).get("listingId")));
			return { success: true, message: "Arms sale approved." };
		} catch (err) {
			return failArms(err);
		}
	},
	reject: async ({ request, locals }) => {
		try {
			await rejectArms(db, locals.account!.id, Number((await request.formData()).get("listingId")));
			return { success: true, message: "Arms sale refused — units returned to the seller." };
		} catch (err) {
			return failArms(err);
		}
	},
	withdraw: async ({ request, locals }) => {
		try {
			await cancelArms(db, locals.account!.id, Number((await request.formData()).get("listingId")));
			return { success: true, message: "Arms offer withdrawn." };
		} catch (err) {
			return failArms(err);
		}
	},
	buy: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const result = await buyArms(db, {
				userId: locals.account!.id,
				listingId: Number(form.get("listingId")),
				quantity: Number(form.get("quantity"))
			});
			return {
				success: true,
				message: `Bought the armaments for ${result.total.toLocaleString()}${result.tax ? ` (export levy ${result.tax.toLocaleString()})` : ""}.`
			};
		} catch (err) {
			return failArms(err);
		}
	}
};
