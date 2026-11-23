// src/routes/(authenticated)/(dock)/bonds/+page.server.ts
// An oligarch's lending desk: buy state bonds, watch the coupons arrive and
// cash them in. The money itself is handled by the bonds service.
import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { userWallets } from "#lib/server/schema.js";
import { INVESTMENTS_CONFIG } from "#lib/config/game/investments.config.js";
import {
	BondError,
	bondPortfolio,
	buyStateBond,
	openBondOfferings,
	redeemBond
} from "#lib/server/services/economy/bonds.js";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	const [wallet, offerings, bonds] = await Promise.all([
		db.select({ balance: userWallets.balance }).from(userWallets).where(eq(userWallets.userId, account.id)).limit(1),
		openBondOfferings(db),
		bondPortfolio(db, account.id)
	]);
	const invested = bonds.filter((b) => !b.redeemedAt).reduce((sum, b) => sum + b.principal, 0);
	const interest = bonds.reduce((sum, b) => sum + b.earned, 0);
	return {
		walletBalance: Number(wallet[0]?.balance ?? 0),
		offerings,
		bonds,
		invested,
		interest,
		config: INVESTMENTS_CONFIG,
		now: Date.now()
	};
};

export const actions: Actions = {
	buy: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await request.formData();
		const offeringId = Number(form.get("offeringId"));
		const principal = Number(form.get("principal"));
		if (!Number.isSafeInteger(offeringId) || offeringId <= 0) return fail(400, { error: "Choose an offering." });
		try {
			const bond = await buyStateBond(db, { userId: account.id, offeringId, principal });
			return { success: true, message: `Bond ${bond.id} purchased — coupons every fortnight.` };
		} catch (err) {
			if (err instanceof BondError) return fail(400, { error: err.message });
			throw err;
		}
	},
	redeem: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await request.formData();
		const bondId = Number(form.get("bondId"));
		if (!Number.isSafeInteger(bondId) || bondId <= 0) return fail(400, { error: "Unknown bond." });
		try {
			await redeemBond(db, { bondId, userId: account.id });
			return { success: true, message: "Bond redeemed — principal returned to your wallet." };
		} catch (err) {
			if (err instanceof BondError) return fail(400, { error: err.message });
			throw err;
		}
	}
};
