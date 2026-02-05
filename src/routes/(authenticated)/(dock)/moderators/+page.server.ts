// src/routes/moderators/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, userProfiles, files } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

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
			let logoUrl = null;
			if (mod.profile?.logo) {
				try {
					const logoFile = await db.query.files.findFirst({
						where: eq(files.id, mod.profile.logo)
					});
					if (logoFile) {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					}
				} catch (err) {
					console.error("Failed to get moderator logo:", err);
				}
			}

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
