// GET /posts/feed?cursor=<iso>&subscribed=1 — the next page of a feed.
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { fetchFeed } from "#lib/server/services/content/feed.js";

export const GET: RequestHandler = async ({ url, locals }) => {
	const result = await fetchFeed(locals.account!.id, {
		cursor: url.searchParams.get("cursor"),
		subscribed: url.searchParams.get("subscribed") === "1"
	});
	return json(result);
};
