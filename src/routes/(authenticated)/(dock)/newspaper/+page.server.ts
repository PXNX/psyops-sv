// src/routes/(authenticated)/(dock)/newspaper/+page.server.ts
import { db } from "$lib/server/db";
import { files, journalists, newspapers } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export type NewspaperEntry = {
	id: string;
	name: string;
	logo: string | null;
	rank: "author" | "editor" | "owner";
};

export const load: PageServerLoad = async ({ locals }) => {
	// Query newspapers the user is a journalist for
	const newspaper = await db
		.select({
			id: newspapers.id,
			name: newspapers.name,
			logo: newspapers.logo,
			rank: journalists.rank
		})
		.from(journalists)
		.innerJoin(newspapers, eq(journalists.newspaperId, newspapers.id))
		.where(eq(journalists.userId, locals.account!.id));

	// Get signed URLs for logos
	const newspapersWithUrls = await Promise.all(
		newspaper.map(async (n) => {
			let newspaperLogoUrl: string | null = null;
			if (n.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, n.logo)
				});
				if (logoFile) {
					newspaperLogoUrl = await getSignedDownloadUrl(logoFile.key);
				}
			}

			return {
				id: n.id,
				name: n.name,
				logo: newspaperLogoUrl,
				rank: n.rank
			};
		})
	);

	console.log(JSON.stringify(newspapersWithUrls));

	return {
		newspapers: newspapersWithUrls
	};
};
