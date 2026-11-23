// One report per reporter per piece of content. Repeating a report (double
// clicks, tapping Report again after it was filed) must not add another entry
// to the moderation queue.
import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { generalReports } from "../../schema";

export type ReportTargetType = "message" | "account" | "party" | "comment" | "article";

export async function alreadyReported(
	db: Database,
	reporterId: string,
	targetType: ReportTargetType,
	targetId: string
): Promise<boolean> {
	const rows = await db
		.select({ id: generalReports.id })
		.from(generalReports)
		.where(
			and(
				eq(generalReports.reporterId, reporterId),
				eq(generalReports.targetType, targetType),
				eq(generalReports.targetId, targetId)
			)
		)
		.limit(1);
	return rows.length > 0;
}
