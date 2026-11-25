// src/routes/(authenticated)/(dock)/armaments/+page.server.ts
// The arms market. Foreign sales need an export licence from the seller's
// defence minister (or president); bought hardware ships and lands later.
// Every rule is checked in services/economy/armaments.ts.
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { ARMAMENT_CATEGORIES, ARMAMENT_PROFILE, ARMAMENTS } from "#lib/config/index.js";
import {
	ArmsError,
	approveArms,
	armsBoard,
	buyArms,
	cancelArms,
	listArms,
	rejectArms
} from "#lib/server/services/economy/armaments.js";

const failArms = (err: unknown) => {
	if (!(err instanceof ArmsError)) console.error("[armaments]", err);
	return fail(400, { error: err instanceof ArmsError ? err.message : "Arms deal failed." });
};
const id = (form: FormData, key: string) => Number(form.get(key));

export const load: PageServerLoad = async ({ locals }) => {
	const board = await armsBoard(db, locals.account!.id);
	return {
		...board,
		profiles: ARMAMENT_PROFILE,
		categories: ARMAMENT_CATEGORIES,
		rules: {
			minQuantity: ARMAMENTS.MIN_QUANTITY,
			maxQuantity: ARMAMENTS.MAX_QUANTITY,
			exportTax: ARMAMENTS.EXPORT_TAX_PERCENT,
			wear: ARMAMENTS.RESALE_WEAR,
			deliveryHours: ARMAMENTS.DELIVERY_HOURS
		}
	};
};

export const actions: Actions = {
	list: async ({ request, locals }) => {
		const form = await request.formData();
		const targetRaw = String(form.get("targetStateId") ?? "");
		try {
			const listing = await listArms(db, {
				userId: locals.account!.id,
				good: String(form.get("good") ?? ""),
				quantity: id(form, "quantity"),
				pricePerUnit: id(form, "pricePerUnit"),
				targetStateId: targetRaw ? Number(targetRaw) : null,
				grade: form.get("grade") === "used" ? "used" : "new"
			});
			return {
				success: true,
				message: listing.approvedBy
					? "Offer published."
					: "Offer filed — it goes live once your defence minister or president grants the export licence."
			};
		} catch (err) {
			return failArms(err);
		}
	},
	approve: async ({ request, locals }) => {
		try {
			await approveArms(db, locals.account!.id, id(await request.formData(), "listingId"));
			return { success: true, message: "Export licence granted." };
		} catch (err) {
			return failArms(err);
		}
	},
	reject: async ({ request, locals }) => {
		try {
			await rejectArms(db, locals.account!.id, id(await request.formData(), "listingId"));
			return { success: true, message: "Export licence refused — units returned to the seller." };
		} catch (err) {
			return failArms(err);
		}
	},
	withdraw: async ({ request, locals }) => {
		try {
			await cancelArms(db, locals.account!.id, id(await request.formData(), "listingId"));
			return { success: true, message: "Offer withdrawn — units back in stock." };
		} catch (err) {
			return failArms(err);
		}
	},
	buy: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			const result = await buyArms(db, {
				userId: locals.account!.id,
				listingId: id(form, "listingId"),
				quantity: id(form, "quantity")
			});
			return {
				success: true,
				message: `Paid $${result.total.toLocaleString("en-US")} — shipment arrives in about ${result.hours} h.`
			};
		} catch (err) {
			return failArms(err);
		}
	}
};
