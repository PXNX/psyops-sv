import { db } from "#lib/server/db.js";
import { accounts, broadcasts, contentFlags, generalReports, giftCodes } from "#lib/server/schema.js";
import { listModerationActions } from "#lib/server/moderation/actions.js";
import { and, eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	const [roleCounts, [pendingReports], [pendingFlags], [activeBroadcast], [giftCodeCount], recentActions] = await Promise.all([
		db
			.select({ role: accounts.role, count: sql<number>`count(*)::int` })
			.from(accounts)
			.groupBy(accounts.role),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(generalReports)
			.where(eq(generalReports.status, "pending")),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(contentFlags)
			.where(eq(contentFlags.isResolved, false)),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(broadcasts)
			.where(and(eq(broadcasts.broadcastType, "system"), eq(broadcasts.isActive, true))),
		db.select({ count: sql<number>`count(*)::int` }).from(giftCodes),
		listModerationActions({ limit: 6 })
	]);

	const roles = Object.fromEntries(roleCounts.map((r) => [r.role, r.count])) as Record<string, number>;

	return {
		stats: {
			users: (roles.user ?? 0) + (roles.moderator ?? 0) + (roles.admin ?? 0),
			moderators: roles.moderator ?? 0,
			admins: roles.admin ?? 0,
			pendingReports: pendingReports?.count ?? 0,
			pendingFlags: pendingFlags?.count ?? 0,
			activeBroadcasts: activeBroadcast?.count ?? 0,
			giftCodes: giftCodeCount?.count ?? 0,
			moderationActions: recentActions.total
		},
		recentActions: recentActions.actions
	};
};
