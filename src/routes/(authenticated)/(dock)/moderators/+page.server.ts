// src/routes/moderators/+page.server.ts
import { db } from "#lib/server/db.js";
import { accounts, userProfiles, contentFlags, generalReports } from "#lib/server/schema.js";
import { listModerationActions } from "#lib/server/moderation/actions.js";
import { eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async () => {
	// Get all moderators and admins
	const moderators = await db.query.accounts.findMany({
		where: (accounts, { or, eq }) => or(eq(accounts.role, "moderator"), eq(accounts.role, "admin")),
		with: {
			profile: true
		},
		orderBy: (accounts, { asc }) => [asc(accounts.createdAt)]
	});

	// Process moderator logos
	const moderatorsWithLogos = await Promise.all(
		moderators.map(async (mod) => {
			const logoUrl = await getLogoUrl(mod.profile?.logo).catch((err) => {
				console.error("Failed to get moderator logo:", err);
				return null;
			});

			return {
				id: mod.id,
				name: mod.profile?.name || "Unknown",
				role: mod.role,
				logoUrl,
				memberSince: mod.createdAt
			};
		})
	);

	const [[pendingReports], [pendingFlags], actions] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(generalReports)
			.where(eq(generalReports.status, "pending")),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(contentFlags)
			.where(eq(contentFlags.isResolved, false)),
		listModerationActions({ limit: 1 })
	]);

	return {
		moderators: moderatorsWithLogos,
		stats: {
			pendingReports: pendingReports?.count ?? 0,
			pendingFlags: pendingFlags?.count ?? 0,
			actions: actions.total
		}
	};
};
