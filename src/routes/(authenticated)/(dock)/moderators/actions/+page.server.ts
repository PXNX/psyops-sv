// src/routes/moderators/actions/+page.server.ts
import { db } from "$lib/server/db";
import {
	accounts,
	userProfiles,
	files,
	chatMessages,
	userWarnings,
	chatRestrictions,
	generalReports,
	contentFlags
} from "$lib/server/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account;
	const filterUserId = url.searchParams.get("userId");

	// Get all moderation actions
	// 1. Deleted messages
	const deletedMessagesQuery = db
		.select({
			id: chatMessages.id,
			type: sql<string>`'message_delete'`,
			targetId: chatMessages.senderId,
			moderatorId: chatMessages.deletedBy,
			reason: chatMessages.deletionReason,
			note: chatMessages.deletionNote,
			timestamp: chatMessages.deletedAt
		})
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.isDeleted, true),
				sql`${chatMessages.deletedBy} IS NOT NULL`,
				filterUserId ? eq(chatMessages.senderId, filterUserId) : undefined
			)
		);

	// 2. User warnings
	const warningsQuery = db
		.select({
			id: userWarnings.id,
			type: sql<string>`'warning'`,
			targetId: userWarnings.userId,
			moderatorId: userWarnings.issuedBy,
			reason: userWarnings.reason,
			note: userWarnings.description,
			timestamp: userWarnings.issuedAt
		})
		.from(userWarnings)
		.where(filterUserId ? eq(userWarnings.userId, filterUserId) : undefined);

	// 3. Chat restrictions
	const restrictionsQuery = db
		.select({
			id: chatRestrictions.id,
			type: sql<string>`'restriction'`,
			targetId: chatRestrictions.userId,
			moderatorId: chatRestrictions.restrictedBy,
			reason: sql<string>`${chatRestrictions.reason}`,
			note: sql<string>`CASE WHEN ${chatRestrictions.isPermanent} THEN 'Permanent' ELSE 'Expires: ' || ${chatRestrictions.expiresAt}::text END`,
			timestamp: chatRestrictions.restrictedAt
		})
		.from(chatRestrictions)
		.where(filterUserId ? eq(chatRestrictions.userId, filterUserId) : undefined);

	// 4. Resolved reports
	const reportsQuery = db
		.select({
			id: generalReports.id,
			type: sql<string>`'report_action'`,
			targetId: generalReports.targetId,
			moderatorId: generalReports.reviewedBy,
			reason: generalReports.actionTaken,
			note: generalReports.reviewNote,
			timestamp: generalReports.reviewedAt
		})
		.from(generalReports)
		.where(
			and(
				sql`${generalReports.reviewedBy} IS NOT NULL`,
				filterUserId ? eq(generalReports.targetId, filterUserId) : undefined
			)
		);

	// 5. Content flags
	const flagsQuery = db
		.select({
			id: contentFlags.id,
			type: sql<string>`'content_flag'`,
			targetId: contentFlags.targetId,
			moderatorId: contentFlags.flaggedBy,
			reason: sql<string>`${contentFlags.flagType}`,
			note: contentFlags.reason,
			timestamp: contentFlags.flaggedAt
		})
		.from(contentFlags)
		.where(filterUserId ? eq(contentFlags.targetId, filterUserId) : undefined);

	// Combine all actions
	const allActions = await db
		.select()
		.from(
			sql`(
				${deletedMessagesQuery}
				UNION ALL
				${warningsQuery}
				UNION ALL
				${restrictionsQuery}
				UNION ALL
				${reportsQuery}
				UNION ALL
				${flagsQuery}
			) as combined_actions`
		)
		.orderBy(desc(sql`timestamp`))
		.limit(100);

	// Get unique user IDs to fetch profiles
	const userIds = new Set<string>();
	allActions.forEach((action: any) => {
		if (action.targetId) userIds.add(action.targetId);
		if (action.moderatorId) userIds.add(action.moderatorId);
	});

	// Fetch user profiles
	const userProfiles = await db.query.accounts.findMany({
		where: (accounts, { inArray }) => inArray(accounts.id, Array.from(userIds)),
		with: {
			profile: true
		}
	});

	// Process logos
	const usersWithLogos = await Promise.all(
		userProfiles.map(async (user) => {
			let logoUrl = null;
			if (user.profile?.logo) {
				try {
					const logoFile = await db.query.files.findFirst({
						where: eq(files.id, user.profile.logo)
					});
					if (logoFile) {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					}
				} catch (err) {
					console.error("Failed to get user logo:", err);
				}
			}

			return {
				id: user.id,
				name: user.profile?.name || "Unknown",
				role: user.role,
				logoUrl
			};
		})
	);

	// Create user map
	const userMap = new Map(usersWithLogos.map((u) => [u.id, u]));

	// Format actions
	const formattedActions = allActions.map((action: any) => ({
		id: action.id,
		type: action.type,
		target: userMap.get(action.targetId) || { id: action.targetId, name: "Unknown", logoUrl: null, role: "user" },
		moderator: userMap.get(action.moderatorId) || {
			id: action.moderatorId,
			name: "Unknown",
			logoUrl: null,
			role: "user"
		},
		reason: action.reason,
		note: action.note,
		timestamp: action.timestamp
	}));

	return {
		actions: formattedActions,
		currentUserId: account?.id || null,
		filterUserId
	};
};
