// src/routes/moderators/+page.server.ts
import { db } from "#lib/server/db.js";
import { accounts, userProfiles, files } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";
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

	return {
		moderators: moderatorsWithLogos
	};
};
