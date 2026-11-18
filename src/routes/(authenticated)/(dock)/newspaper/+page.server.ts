// src/routes/(authenticated)/(dock)/newspaper/+page.server.ts
// The newsstand: the papers you write for, then every paper by readership.
import { db } from "#lib/server/db.js";
import { journalists, newspaperSubscriptions, newspapers } from "#lib/server/schema.js";
import { desc, eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ locals }) => {
	const accountId = locals.account!.id;

	// Correlated subqueries; drizzle leaves columns unqualified inside sql``, so name them in full.
	const count = (table: string) =>
		sql.raw(`(select cast(count(*) as int) from ${table} t where t.newspaper_id = "newspapers"."id")`).mapWith(Number);
	const subscriberCount = count("newspaper_subscriptions");
	const latest = (column: string) =>
		sql.raw(`(select a.${column} from articles a where a.newspaper_id = "newspapers"."id" order by a.created_at desc limit 1)`);

	const [rows, memberships, subscriptions] = await Promise.all([
		db
			.select({
				id: newspapers.id,
				name: newspapers.name,
				logo: newspapers.logo,
				background: newspapers.background,
				subscriberCount,
				articleCount: count("articles"),
				latestTitle: latest("title").mapWith(String),
				latestAt: latest("created_at").mapWith((v) => new Date(v))
			})
			.from(newspapers)
			.orderBy(desc(subscriberCount), desc(newspapers.createdAt)),
		db
			.select({ newspaperId: journalists.newspaperId, rank: journalists.rank })
			.from(journalists)
			.where(eq(journalists.userId, accountId)),
		db
			.select({ newspaperId: newspaperSubscriptions.newspaperId })
			.from(newspaperSubscriptions)
			.where(eq(newspaperSubscriptions.userId, accountId))
	]);

	const rankOf = new Map(memberships.map((m) => [m.newspaperId, m.rank]));
	const subscribed = new Set(subscriptions.map((s) => s.newspaperId));

	const all = await Promise.all(
		rows.map(async (n) => ({
			id: n.id,
			name: n.name,
			background: n.background,
			logo: await getLogoUrl(n.logo),
			subscriberCount: n.subscriberCount,
			articleCount: n.articleCount,
			latestTitle: n.latestTitle,
			latestAt: n.latestAt as Date | null,
			rank: rankOf.get(n.id) ?? null,
			subscribed: subscribed.has(n.id)
		}))
	);

	return {
		newspapers: all,
		ownsNewspaper: memberships.some((m) => m.rank === "owner")
	};
};
