import { db } from "#lib/server/db.js";
import { chatRestrictions, generalReports, userWarnings } from "#lib/server/schema.js";
import { listModerationActions } from "#lib/server/moderation/actions.js";
import { eq, sql } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;
	if (!account) redirect(303, "/auth/login");

	const [record, warningCount, restriction, reportsFiled] = await Promise.all([
		listModerationActions({ targetUserId: account.id }),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(userWarnings)
			.where(eq(userWarnings.userId, account.id)),
		db.query.chatRestrictions.findFirst({ where: eq(chatRestrictions.userId, account.id) }),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(generalReports)
			.where(eq(generalReports.reporterId, account.id))
	]);

	return {
		actions: record.actions,
		counts: record.counts,
		currentUserId: account.id,
		warningCount: warningCount[0]?.count ?? 0,
		restriction: restriction
			? {
					reason: restriction.reason,
					isPermanent: restriction.isPermanent,
					expiresAt: restriction.expiresAt,
					restrictedAt: restriction.restrictedAt,
					active: restriction.isPermanent || !restriction.expiresAt || restriction.expiresAt > new Date()
				}
			: null,
		reportsFiled: reportsFiled[0]?.count ?? 0
	};
};
