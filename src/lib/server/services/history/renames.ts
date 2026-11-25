// src/lib/server/services/history/renames.ts
// A rename is worth keeping: entity timelines show who changed the name and
// when, long after the old name has disappeared from the main record.
import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { renameHistory } from "../../schema";

export type RenameEntity = "party" | "user" | "state" | "bloc";

export type RenameEntry = {
	id: string;
	oldName: string;
	newName: string;
	changedBy: string;
	changedAt: Date;
};

type Db = Pick<Database, "insert" | "select">;

/** Record a name change, skipping no-op edits. */
export async function recordRename(
	db: Db,
	input: {
		entityType: RenameEntity;
		entityId: string | number;
		oldName: string | null | undefined;
		newName: string | null | undefined;
		changedBy: string;
		now?: Date;
	}
): Promise<boolean> {
	const oldName = (input.oldName ?? "").trim();
	const newName = (input.newName ?? "").trim();
	if (!oldName || !newName || oldName === newName) return false;
	await db.insert(renameHistory).values({
		entityType: input.entityType,
		entityId: String(input.entityId),
		oldName,
		newName,
		changedBy: input.changedBy,
		changedAt: input.now ?? new Date()
	});
	return true;
}

/** All renames of one entity, oldest first. */
export async function renamesFor(db: Db, entityType: RenameEntity, entityId: string | number) {
	const rows = await db
		.select()
		.from(renameHistory)
		.where(and(eq(renameHistory.entityType, entityType), eq(renameHistory.entityId, String(entityId))))
		.orderBy(asc(renameHistory.changedAt));
	return rows.map((row): RenameEntry => ({
		id: `rename-${row.id}`,
		oldName: row.oldName,
		newName: row.newName,
		changedBy: row.changedBy,
		changedAt: row.changedAt
	}));
}
