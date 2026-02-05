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

	try {
		// Fetch each action type separately
		const [deletedMessages, warnings, restrictions, reports, flags] = await Promise.all([
			// 1. Deleted messages
			db.query.chatMessages
				.findMany({
					where: and(
						eq(chatMessages.isDeleted, true),
						sql`${chatMessages.deletedBy} IS NOT NULL`,
						filterUserId ? eq(chatMessages.senderId, filterUserId) : undefined
					),
					columns: {
						id: true,
						senderId: true,
						deletedBy: true,
						deletionReason: true,
						deletionNote: true,
						deletedAt: true
					},
					limit: 100,
					orderBy: [desc(chatMessages.deletedAt)]
				})
				.catch(() => []),

			// 2. User warnings
			db.query.userWarnings
				.findMany({
					where: filterUserId ? eq(userWarnings.userId, filterUserId) : undefined,
					columns: {
						id: true,
						userId: true,
						issuedBy: true,
						reason: true,
						description: true,
						issuedAt: true
					},
					limit: 100,
					orderBy: [desc(userWarnings.issuedAt)]
				})
				.catch(() => []),

			// 3. Chat restrictions
			db.query.chatRestrictions
				.findMany({
					where: filterUserId ? eq(chatRestrictions.userId, filterUserId) : undefined,
					columns: {
						id: true,
						userId: true,
						restrictedBy: true,
						reason: true,
						isPermanent: true,
						expiresAt: true,
						restrictedAt: true
					},
					limit: 100,
					orderBy: [desc(chatRestrictions.restrictedAt)]
				})
				.catch(() => []),

			// 4. Resolved reports
			db.query.generalReports
				.findMany({
					where: and(
						sql`${generalReports.reviewedBy} IS NOT NULL`,
						filterUserId ? eq(generalReports.targetId, filterUserId) : undefined
					),
					columns: {
						id: true,
						targetId: true,
						reviewedBy: true,
						actionTaken: true,
						reviewNote: true,
						reviewedAt: true
					},
					limit: 100,
					orderBy: [desc(generalReports.reviewedAt)]
				})
				.catch(() => []),

			// 5. Content flags
			db.query.contentFlags
				.findMany({
					where: filterUserId ? eq(contentFlags.targetId, filterUserId) : undefined,
					columns: {
						id: true,
						targetId: true,
						flaggedBy: true,
						flagType: true,
						reason: true,
						flaggedAt: true
					},
					limit: 100,
					orderBy: [desc(contentFlags.flaggedAt)]
				})
				.catch(() => [])
		]);

		// Transform and combine all actions
		const allActions = [
			...(deletedMessages || []).map((m) => ({
				id: m.id,
				type: "message_delete" as const,
				targetId: m.senderId,
				moderatorId: m.deletedBy!,
				reason: m.deletionReason || null,
				note: m.deletionNote || null,
				timestamp: m.deletedAt!
			})),
			...(warnings || []).map((w) => ({
				id: w.id,
				type: "warning" as const,
				targetId: w.userId,
				moderatorId: w.issuedBy,
				reason: w.reason || null,
				note: w.description || null,
				timestamp: w.issuedAt
			})),
			...(restrictions || []).map((r) => ({
				id: r.id,
				type: "restriction" as const,
				targetId: r.userId,
				moderatorId: r.restrictedBy,
				reason: r.reason || null,
				note: r.isPermanent ? "Permanent" : r.expiresAt ? `Expires: ${r.expiresAt}` : null,
				timestamp: r.restrictedAt
			})),
			...(reports || []).map((r) => ({
				id: r.id,
				type: "report_action" as const,
				targetId: r.targetId,
				moderatorId: r.reviewedBy!,
				reason: r.actionTaken || null,
				note: r.reviewNote || null,
				timestamp: r.reviewedAt!
			})),
			...(flags || []).map((f) => ({
				id: f.id,
				type: "content_flag" as const,
				targetId: f.targetId,
				moderatorId: f.flaggedBy,
				reason: f.flagType || null,
				note: f.reason || null,
				timestamp: f.flaggedAt
			}))
		];

		// Sort by timestamp (most recent first) and limit to 100
		allActions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		const limitedActions = allActions.slice(0, 100);

		// Get unique user IDs to fetch profiles
		const userIds = new Set<string>();
		limitedActions.forEach((action) => {
			if (action.targetId) userIds.add(action.targetId);
			if (action.moderatorId) userIds.add(action.moderatorId);
		});

		// Fetch user profiles
		const userProfilesData = await db.query.accounts.findMany({
			where: (accounts, { inArray }) => inArray(accounts.id, Array.from(userIds)),
			with: {
				profile: true
			}
		});

		// Process logos
		const usersWithLogos = await Promise.all(
			userProfilesData.map(async (user) => {
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
		const formattedActions = limitedActions.map((action) => ({
			id: action.id,
			type: action.type,
			target: userMap.get(action.targetId) || {
				id: action.targetId,
				name: "Unknown",
				logoUrl: null,
				role: "user" as const
			},
			moderator: userMap.get(action.moderatorId) || {
				id: action.moderatorId,
				name: "Unknown",
				logoUrl: null,
				role: "user" as const
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
	} catch (error) {
		console.error("Error loading moderator actions:", error);
		return {
			actions: [],
			currentUserId: account?.id || null,
			filterUserId
		};
	}
};
