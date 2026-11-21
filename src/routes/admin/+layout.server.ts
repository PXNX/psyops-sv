import { error, redirect } from "@sveltejs/kit";
import { db } from "#lib/server/db.js";
import { contentFlags, generalReports } from "#lib/server/schema.js";
import { eq, sql } from "drizzle-orm";
import type { RequestEvent } from "./$types";

export const load = async (event: RequestEvent) => {
	if (event.locals.session === null || event.locals.account === null) {
		return redirect(302, "/auth/login?next=" + event.url.pathname);
	}

	if (event.locals.account.role !== "admin") {
		return error(403, "Only admins can access this page");
	}

	const [[pendingReports], [pendingFlags]] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(generalReports)
			.where(eq(generalReports.status, "pending")),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(contentFlags)
			.where(eq(contentFlags.isResolved, false))
	]);

	return {
		account: event.locals.account,
		pendingReports: pendingReports?.count ?? 0,
		pendingFlags: pendingFlags?.count ?? 0
	};
};
