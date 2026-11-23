// Resolves OG-like cards for links that point inside the game only.
// External URLs are never fetched here, so this cannot be abused as an
// open proxy or used to pull arbitrary remote content into the app.
import { json, error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { db } from "#lib/server/db.js";
import { articles, blocs, politicalParties, regions, states, userProfiles } from "#lib/server/schema.js";
import { plainText, excerpt, coverImage } from "#lib/server/services/content/article-text.js";
import { getRegionName } from "#lib/utils/formatting.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.account) error(401, "Sign in required");
	const raw = url.searchParams.get("url") ?? "";
	let path: string;
	try {
		const parsed = new URL(raw, url.origin);
		if (parsed.origin !== url.origin) return json({ title: null });
		path = parsed.pathname;
	} catch {
		return json({ title: null });
	}

	const match = (re: RegExp) => path.match(re)?.[1];
	const postId = match(/^\/posts\/(\d+)/);
	const userId = match(/^\/user\/([^/]+)/);
	const regionId = match(/^\/region\/(\d+)/);
	const stateId = match(/^\/state\/(\d+)/);
	const blocId = match(/^\/bloc\/(\d+)/);
	const partyId = match(/^\/party\/(\d+)/);

	let title: string | null = null;
	let description: string | null = null;
	let image: string | null = null;

	if (postId) {
		const [article] = await db.select().from(articles).where(eq(articles.id, Number(postId)));
		if (article) {
			title = article.title;
			description = excerpt(article.content, 160);
			image = coverImage(article.content);
		}
	} else if (userId) {
		const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.accountId, userId));
		if (profile) {
			title = profile.name;
			description = profile.bio ? plainText(profile.bio).slice(0, 160) : null;
		}
	} else if (regionId) {
		const [region] = await db.select({ id: regions.id }).from(regions).where(eq(regions.id, Number(regionId)));
		title = region ? getRegionName(region.id) : null;
	} else if (stateId) {
		const [state] = await db.select({ name: states.name }).from(states).where(eq(states.id, Number(stateId)));
		title = state?.name ?? null;
	} else if (blocId) {
		const [bloc] = await db.select({ name: blocs.name }).from(blocs).where(eq(blocs.id, Number(blocId)));
		title = bloc?.name ?? null;
	} else if (partyId) {
		const [party] = await db.select({ name: politicalParties.name }).from(politicalParties).where(eq(politicalParties.id, Number(partyId)));
		title = party?.name ?? null;
	}

	return json({ title, description, image, href: path, kind: "internal" });
};
