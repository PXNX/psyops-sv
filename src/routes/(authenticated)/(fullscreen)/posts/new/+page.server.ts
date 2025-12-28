// src/routes/(authenticated)/(fullscreen)/posts/new/+page.server.ts
import { db } from "$lib/server/db";
import { journalists, newspapers, files, articles } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Query newspapers where the user is a journalist
	const userNewspapers = await db
		.select({
			id: newspapers.id,
			name: newspapers.name,
			logoFileId: newspapers.logo,
			logoKey: files.key,
			rank: journalists.rank
		})
		.from(journalists)
		.innerJoin(newspapers, eq(journalists.newspaperId, newspapers.id))
		.leftJoin(files, eq(newspapers.logo, files.id))
		.where(eq(journalists.userId, account.id));

	// Get signed URLs for logos
	const newspapersWithUrls = await Promise.all(
		userNewspapers.map(async (n) => ({
			id: n.id,
			name: n.name,
			logo: n.logoKey ? await getSignedDownloadUrl(n.logoKey) : null,
			rank: n.rank
		}))
	);

	return {
		newspapers: newspapersWithUrls
	};
};

export const actions: Actions = {
	publish: async ({ locals, request }) => {
		const account = locals.account!;

		const formData = await request.formData();
		const title = formData.get("title")?.toString();
		const content = formData.get("content")?.toString();
		const newspaperId = formData.get("newspaperId")?.toString();

		if (!title || !content) {
			return fail(400, { error: "Title and content are required" });
		}

		if (title.length > 200) {
			return fail(400, { error: "Title must be 200 characters or less" });
		}

		// If newspaperId provided, verify user is a journalist
		if (newspaperId) {
			const journalist = await db
				.select()
				.from(journalists)
				.where(eq(journalists.userId, account.id))
				.where(eq(journalists.newspaperId, parseInt(newspaperId)))
				.limit(1);

			if (journalist.length === 0) {
				return fail(403, { error: "You are not authorized to publish for this newspaper" });
			}
		}

		try {
			const [article] = await db
				.insert(articles)
				.values({
					title,
					content,
					authorId: account.id,
					newspaperId: newspaperId ? parseInt(newspaperId) : null
				})
				.returning();

			throw redirect(303, `/posts/${article.id}`);
		} catch (error) {
			console.error("Failed to create article:", error);
			return fail(500, { error: "Failed to create article" });
		}
	}
};
