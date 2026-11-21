// Shared moderation enforcement. Keeping warning/restriction logic in one
// place means the report queue and the admin user tools behave identically.
import { db } from "#lib/server/db.js";
import { chatRestrictions, userWarnings } from "#lib/server/schema.js";
import { sendModerationNotification } from "#lib/server/service/inbox.js";
import { eq, sql } from "drizzle-orm";

const AUTO_RESTRICT_AFTER = 3;
const AUTO_RESTRICT_DAYS = 7;

export const VIOLATION_REASONS = [
	"insult",
	"spam",
	"pornography",
	"hate_speech",
	"graphic_violence",
	"privacy_violation",
	"other"
] as const;

export type ViolationReason = (typeof VIOLATION_REASONS)[number];

export function isViolationReason(value: unknown): value is ViolationReason {
	return typeof value === "string" && (VIOLATION_REASONS as readonly string[]).includes(value);
}

/** Notify without ever failing the moderation action that triggered it. */
export async function notifyAction(params: {
	recipientId: string;
	moderatorId: string;
	action: string;
	reason: string;
	details?: string;
}) {
	try {
		await sendModerationNotification(params);
	} catch (err) {
		console.error("Failed to send moderation notification:", err);
	}
}

/** Record a warning and apply the automatic 7-day restriction at 3 warnings. */
export async function issueWarning(params: {
	userId: string;
	reason: ViolationReason;
	description: string;
	issuedBy: string;
}) {
	const { userId, reason, description, issuedBy } = params;

	await db.insert(userWarnings).values({
		userId,
		reason,
		description: description || "Violation of community guidelines",
		issuedBy
	});

	const [{ count: warningCount }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(userWarnings)
		.where(eq(userWarnings.userId, userId));

	let restricted = false;
	if (warningCount >= AUTO_RESTRICT_AFTER) {
		const existing = await db.query.chatRestrictions.findFirst({
			where: eq(chatRestrictions.userId, userId)
		});
		const stillActive =
			existing && (existing.isPermanent || !existing.expiresAt || existing.expiresAt > new Date());
		if (!stillActive) {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + AUTO_RESTRICT_DAYS);
			const values = {
				userId,
				reason: `Accumulated ${AUTO_RESTRICT_AFTER} warnings`,
				restrictedBy: issuedBy,
				expiresAt,
				isPermanent: false,
				restrictedAt: new Date()
			};
			if (existing) {
				await db.update(chatRestrictions).set(values).where(eq(chatRestrictions.userId, userId));
			} else {
				await db.insert(chatRestrictions).values(values);
			}
			restricted = true;
			await notifyAction({
				recipientId: userId,
				moderatorId: issuedBy,
				action: "restriction",
				reason: `Accumulated ${AUTO_RESTRICT_AFTER} warnings`,
				details: `This restriction expires in ${AUTO_RESTRICT_DAYS} days. You can view the full history in your moderation record.`
			});
		}
	}

	await notifyAction({
		recipientId: userId,
		moderatorId: issuedBy,
		action: "warning",
		reason,
		details: description || undefined
	});

	return { warningCount, restricted };
}

/** Create or replace a user's chat restriction. */
export async function setRestriction(params: {
	userId: string;
	reason: string;
	restrictedBy: string;
	days?: number | null;
	permanent?: boolean;
}) {
	const { userId, reason, restrictedBy, permanent } = params;
	const expiresAt = permanent || !params.days ? null : new Date(Date.now() + params.days * 24 * 60 * 60 * 1000);

	await db
		.insert(chatRestrictions)
		.values({
			userId,
			reason,
			restrictedBy,
			expiresAt,
			isPermanent: Boolean(permanent)
		})
		.onConflictDoUpdate({
			target: chatRestrictions.userId,
			set: { reason, restrictedBy, expiresAt, isPermanent: Boolean(permanent), restrictedAt: new Date() }
		});

	await notifyAction({
		recipientId: userId,
		moderatorId: restrictedBy,
		action: "restriction",
		reason,
		details: permanent
			? "This restriction is permanent."
			: expiresAt
				? `This restriction lasts until ${expiresAt.toISOString()}.`
				: undefined
	});
}

export async function clearRestriction(userId: string, moderatorId: string) {
	await db.delete(chatRestrictions).where(eq(chatRestrictions.userId, userId));
	await notifyAction({
		recipientId: userId,
		moderatorId,
		action: "restriction_lifted",
		reason: "Your chat access has been restored",
		details: "You can now send messages again."
	});
}
