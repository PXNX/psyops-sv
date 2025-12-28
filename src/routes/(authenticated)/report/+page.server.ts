// src/routes/(authenticated)/report/+page.server.ts
import { db } from "$lib/server/db";
import { generalReports, contentFlags, accounts, politicalParties } from "$lib/server/schema";
import { eq, and } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
	reportAccount: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		const formData = await request.formData();
		const targetId = formData.get("targetId") as string;
		const reason = formData.get("reason") as string;
		const violationType = formData.get("violationType") as string;

		if (!reason || reason.trim().length === 0) {
			return fail(400, { error: "Reason is required" });
		}

		// Check if target exists
		const targetAccount = await db.query.accounts.findFirst({
			where: eq(accounts.id, targetId)
		});

		if (!targetAccount) {
			return fail(404, { error: "Account not found" });
		}

		// Cannot report yourself
		if (account.id === targetId) {
			return fail(400, { error: "Cannot report yourself" });
		}

		await db.insert(generalReports).values({
			targetType: "account",
			targetId,
			reporterId: account.id,
			reason: reason.trim(),
			violationType: violationType as any,
			status: "pending"
		});

		return { success: true, message: "Account reported successfully" };
	},

	reportParty: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		const formData = await request.formData();
		const targetId = formData.get("targetId") as string;
		const reason = formData.get("reason") as string;
		const violationType = formData.get("violationType") as string;

		if (!reason || reason.trim().length === 0) {
			return fail(400, { error: "Reason is required" });
		}

		// Check if party exists
		const party = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.id, parseInt(targetId))
		});

		if (!party) {
			return fail(404, { error: "Party not found" });
		}

		await db.insert(generalReports).values({
			targetType: "party",
			targetId,
			reporterId: account.id,
			reason: reason.trim(),
			violationType: violationType as any,
			status: "pending"
		});

		return { success: true, message: "Party reported successfully" };
	},

	flagContent: async ({ request, locals }) => {
		const account = locals.account;
		if (!account || (account.role !== "moderator" && account.role !== "admin")) {
			return fail(403, { error: "Only moderators can flag content" });
		}

		const formData = await request.formData();
		const targetType = formData.get("targetType") as string; // "account" or "party"
		const targetId = formData.get("targetId") as string;
		const flagType = formData.get("flagType") as string; // "name" or "logo"
		const reason = formData.get("reason") as string;

		if (!reason || reason.trim().length === 0) {
			return fail(400, { error: "Reason is required" });
		}

		await db.insert(contentFlags).values({
			targetType,
			targetId,
			flagType,
			reason: reason.trim(),
			flaggedBy: account.id
		});

		return { success: true, message: "Content flagged successfully" };
	}
};
