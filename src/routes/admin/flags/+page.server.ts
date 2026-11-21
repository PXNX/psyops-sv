import { db } from "#lib/server/db.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { accounts, contentFlags, politicalParties, userProfiles } from "#lib/server/schema.js";
import { notifyAction } from "#lib/server/moderation/enforcement.js";
import { desc, eq, inArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get("status") === "resolved" ? "resolved" : url.searchParams.get("status") === "all" ? "all" : "pending";

	const flags = await db.query.contentFlags.findMany({
		...(status === "all" ? {} : { where: eq(contentFlags.isResolved, status === "resolved") }),
		orderBy: [desc(contentFlags.flaggedAt)],
		limit: 100
	});

	const accountIds = [...new Set(flags.filter((f) => f.targetType === "account").map((f) => f.targetId))];
	const partyIds = [...new Set(flags.filter((f) => f.targetType === "party").map((f) => Number(f.targetId)).filter((n) => !Number.isNaN(n)))];

	const [accountRows, parties] = await Promise.all([
		accountIds.length
			? db
					.select({ id: accounts.id, name: userProfiles.name, logo: userProfiles.logo })
					.from(accounts)
					.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
					.where(inArray(accounts.id, accountIds))
			: [],
		partyIds.length
			? db.query.politicalParties.findMany({
					where: (p, { inArray }) => inArray(p.id, partyIds)
				})
			: []
	]);

	const accountMap = new Map<string, { id: string; name: string | null; logoUrl: string | null }>();
	await Promise.all(
		accountRows.map(async (row) => {
			accountMap.set(row.id, {
				id: row.id,
				name: row.name ?? "Unknown user",
				logoUrl: await getLogoUrl(row.logo).catch(() => null)
			});
		})
	);

	const partyMap = new Map(
		await Promise.all(
			parties.map(async (party) => [
				String(party.id),
				{
					id: String(party.id),
					name: party.name,
					logoUrl: await getLogoUrl(party.logo).catch(() => null)
				}
			] as const)
		)
	);

	const flaggerIds = [...new Set(flags.map((f) => f.flaggedBy))];
	const flaggers = flaggerIds.length
		? await db
				.select({ id: accounts.id, name: userProfiles.name })
				.from(accounts)
				.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
				.where(inArray(accounts.id, flaggerIds))
		: [];
	const flaggerNames = new Map(flaggers.map((f) => [f.id, f.name ?? "Unknown"]));

	const flagsWithTargets = flags.map((flag) => ({
		...flag,
		flaggerName: flaggerNames.get(flag.flaggedBy) ?? "Unknown",
		target: flag.targetType === "account" ? accountMap.get(flag.targetId) ?? null : partyMap.get(flag.targetId) ?? null
	}));

	const [pending, resolved] = await Promise.all([
		db.query.contentFlags.findMany({ where: eq(contentFlags.isResolved, false), columns: { id: true } }),
		db.query.contentFlags.findMany({ where: eq(contentFlags.isResolved, true), columns: { id: true } })
	]);

	return { flags: flagsWithTargets, status, pendingCount: pending.length, resolvedCount: resolved.length };
};

export const actions: Actions = {
	resolve: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const form = await request.formData();
		const flagId = Number(form.get("flagId"));
		if (!flagId) return fail(400, { error: "Flag ID is required" });

		const [flag] = await db.select().from(contentFlags).where(eq(contentFlags.id, flagId)).limit(1);
		if (!flag) return fail(404, { error: "Flag not found" });

		await db
			.update(contentFlags)
			.set({ isResolved: true, resolvedAt: new Date() })
			.where(eq(contentFlags.id, flagId));

		if (flag.targetType === "account") {
			await notifyAction({
				recipientId: flag.targetId,
				moderatorId: locals.account.id,
				action: "report_resolved",
				reason: `A moderation flag about your ${flag.flagType} was reviewed`,
				details: flag.reason
			});
		}

		return { success: true, message: "Flag resolved and the reporter's case closed." };
	},

	reopen: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const flagId = Number((await request.formData()).get("flagId"));
		if (!flagId) return fail(400, { error: "Flag ID is required" });
		await db
			.update(contentFlags)
			.set({ isResolved: false, resolvedAt: null })
			.where(eq(contentFlags.id, flagId));
		return { success: true, message: "Flag reopened." };
	}
};
