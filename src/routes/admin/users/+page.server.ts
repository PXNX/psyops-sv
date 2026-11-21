import { db } from "#lib/server/db.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	accounts,
	chatRestrictions,
	generalReports,
	contentFlags,
	userProfiles,
	userWarnings
} from "#lib/server/schema.js";
import {
	clearRestriction,
	isViolationReason,
	issueWarning,
	notifyAction,
	setRestriction
} from "#lib/server/moderation/enforcement.js";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

const VALID_ROLES = ["user", "moderator", "admin"] as const;

async function loadUserDetail(userId: string) {
	const [account] = await db
		.select({
			id: accounts.id,
			email: accounts.email,
			role: accounts.role,
			createdAt: accounts.createdAt,
			name: userProfiles.name,
			logo: userProfiles.logo
		})
		.from(accounts)
		.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
		.where(eq(accounts.id, userId))
		.limit(1);

	if (!account) return null;

	const [warnings, restriction, reportsFiled, flags] = await Promise.all([
		db
			.select({
				id: userWarnings.id,
				reason: userWarnings.reason,
				description: userWarnings.description,
				issuedAt: userWarnings.issuedAt,
				issuerId: userWarnings.issuedBy
			})
			.from(userWarnings)
			.where(eq(userWarnings.userId, userId))
			.orderBy(desc(userWarnings.issuedAt))
			.limit(20),
		db.query.chatRestrictions.findFirst({ where: eq(chatRestrictions.userId, userId) }),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(generalReports)
			.where(eq(generalReports.reporterId, userId)),
		db
			.select({
				id: contentFlags.id,
				flagType: contentFlags.flagType,
				reason: contentFlags.reason,
				isResolved: contentFlags.isResolved
			})
			.from(contentFlags)
			.where(and(eq(contentFlags.targetType, "account"), eq(contentFlags.targetId, userId)))
			.orderBy(desc(contentFlags.flaggedAt))
			.limit(10)
	]);

	const issuerIds = [...new Set(warnings.map((w) => w.issuerId))];
	const issuers = issuerIds.length
		? await db
				.select({ id: accounts.id, name: userProfiles.name })
				.from(accounts)
				.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
				.where(inArray(accounts.id, issuerIds))
		: [];
	const issuerNames = new Map(issuers.map((i) => [i.id, i.name ?? "Unknown"]));

	return {
		...account,
		logoUrl: await getLogoUrl(account.logo).catch(() => null),
		warnings: warnings.map((w) => ({ ...w, issuerName: issuerNames.get(w.issuerId) ?? "Unknown" })),
		restriction: restriction
			? {
					...restriction,
					active: restriction.isPermanent || !restriction.expiresAt || restriction.expiresAt > new Date()
				}
			: null,
		reportsFiled: reportsFiled[0]?.count ?? 0,
		flags
	};
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const query = url.searchParams.get("q")?.trim() ?? "";
	const selectedId = url.searchParams.get("id");
	const pattern = `%${query}%`;

	const rows = await db
		.select({
			id: accounts.id,
			email: accounts.email,
			role: accounts.role,
			createdAt: accounts.createdAt,
			name: userProfiles.name,
			logo: userProfiles.logo
		})
		.from(accounts)
		.leftJoin(userProfiles, eq(userProfiles.accountId, accounts.id))
		.where(query ? or(ilike(accounts.email, pattern), ilike(userProfiles.name, pattern)) : undefined)
		.orderBy(asc(userProfiles.name))
		.limit(50);

	const ids = rows.map((r) => r.id);
	const [warningCounts, restrictions] = ids.length
		? await Promise.all([
				db
					.select({ userId: userWarnings.userId, count: sql<number>`count(*)::int` })
					.from(userWarnings)
					.where(inArray(userWarnings.userId, ids))
					.groupBy(userWarnings.userId),
				db.select().from(chatRestrictions).where(inArray(chatRestrictions.userId, ids))
			])
		: [[], []];

	const countMap = new Map(warningCounts.map((w) => [w.userId, w.count]));
	const restrictionMap = new Map(
		restrictions.map((r) => [
			r.userId,
			r.isPermanent || !r.expiresAt || r.expiresAt > new Date()
		])
	);

	const users = await Promise.all(
		rows.map(async (row) => ({
			...row,
			logoUrl: await getLogoUrl(row.logo).catch(() => null),
			warnings: countMap.get(row.id) ?? 0,
			restricted: restrictionMap.get(row.id) ?? false
		}))
	);

	return {
		users,
		query,
		currentUserId: locals.account?.id ?? null,
		selected: selectedId ? await loadUserDetail(selectedId) : null
	};
};

export const actions: Actions = {
	setRole: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const form = await request.formData();
		const userId = String(form.get("userId") ?? "");
		const role = String(form.get("role") ?? "");
		if (!VALID_ROLES.includes(role as any)) return fail(400, { error: "Invalid role" });
		if (userId === locals.account.id) return fail(400, { error: "You cannot change your own role" });

		const [target] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.id, userId)).limit(1);
		if (!target) return fail(404, { error: "User not found" });

		await db.update(accounts).set({ role: role as any, updatedAt: new Date() }).where(eq(accounts.id, userId));
		await notifyAction({
			recipientId: userId,
			moderatorId: locals.account.id,
			action: "role_change",
			reason: role,
			details: "Your account permissions have been updated."
		});
		return { success: true, message: `Role updated to ${role}.` };
	},

	warn: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const form = await request.formData();
		const userId = String(form.get("userId") ?? "");
		const reason = String(form.get("reason") ?? "");
		const note = String(form.get("note") ?? "").trim();
		if (!isViolationReason(reason)) return fail(400, { error: "Choose a valid reason" });

		const result = await issueWarning({
			userId,
			reason,
			description: note || "Violation of community guidelines",
			issuedBy: locals.account.id
		});
		return {
			success: true,
			message: result.restricted
				? `Warning recorded (${result.warningCount} total). An automatic 7-day restriction was applied.`
				: `Warning recorded (${result.warningCount} total).`
		};
	},

	restrict: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const form = await request.formData();
		const userId = String(form.get("userId") ?? "");
		const reason = String(form.get("reason") ?? "").trim() || "Chat restriction applied by an administrator";
		const permanent = form.get("permanent") === "true";
		const days = permanent ? null : Number(form.get("days") ?? 7);
		if (!permanent && (!Number.isFinite(days) || days! <= 0)) return fail(400, { error: "Invalid duration" });

		await setRestriction({ userId, reason, restrictedBy: locals.account.id, days, permanent });
		return { success: true, message: permanent ? "Permanent restriction applied." : `Restriction applied for ${days} day(s).` };
	},

	liftRestriction: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const userId = String((await request.formData()).get("userId") ?? "");
		await clearRestriction(userId, locals.account.id);
		return { success: true, message: "Chat restriction lifted and the user notified." };
	},

	resetName: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const userId = String((await request.formData()).get("userId") ?? "");
		const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
		await db
			.update(userProfiles)
			.set({ name: `New user ${suffix}` })
			.where(eq(userProfiles.accountId, userId));
		await notifyAction({
			recipientId: userId,
			moderatorId: locals.account.id,
			action: "name_reset",
			reason: "Your name was flagged by the moderation team",
			details: "Choose a new, appropriate name in your profile settings."
		});
		return { success: true, message: "Name reset and the user notified." };
	},

	resetLogo: async ({ request, locals }) => {
		if (!locals.account || locals.account.role !== "admin") return fail(403, { error: "Admins only" });
		const userId = String((await request.formData()).get("userId") ?? "");
		await db.update(userProfiles).set({ logo: null }).where(eq(userProfiles.accountId, userId));
		await notifyAction({
			recipientId: userId,
			moderatorId: locals.account.id,
			action: "logo_reset",
			reason: "Your logo was flagged by the moderation team",
			details: "Upload a new, appropriate logo in your profile settings."
		});
		return { success: true, message: "Logo reset and the user notified." };
	}
};
