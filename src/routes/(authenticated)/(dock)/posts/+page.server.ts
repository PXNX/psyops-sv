// src/routes/(authenticated)/(dock)/posts/+page.server.ts
// The first page of the feed; later pages come from /posts/feed.
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "#lib/server/db.js";
import { upvotes } from "#lib/server/schema.js";
import { fetchFeed } from "#lib/server/services/content/feed.js";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;
	const [result, upvoted] = await Promise.all([
		fetchFeed(account.id, { subscribed: false }),
		db.select({ articleId: upvotes.articleId }).from(upvotes).where(eq(upvotes.userId, account.id))
	]);
	return { ...result, userUpvotes: upvoted.map((u) => u.articleId) };
};
