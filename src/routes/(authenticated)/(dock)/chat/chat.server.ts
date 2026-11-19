// Shared server logic for the chat routes (global, party, direct): message
// validation, mutes, cooldowns, delete / report / block. Each +page.server.ts
// scopes these to its own conversation.
import { db } from "#lib/server/db.js";
import { chatMessages, chatRestrictions, generalReports, userBlocks, violationReasonEnum } from "#lib/server/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { fail } from "@sveltejs/kit";

export const MAX_MESSAGE_LENGTH = 500;
const COOLDOWN_MS = 2000;

type Account = { id: string; role: "user" | "moderator" | "admin" };
type ChatScope =
	{ type: "global" } | { type: "party"; partyId: number } | { type: "direct"; userIds: [string, string] };

export const canModerate = (account: Account) => account.role === "moderator" || account.role === "admin";

/**
 * Validates a message body. Svelte escapes text on render, so nothing is
 * stripped (the old `<`/`>` removal mangled messages like "<3"); runs of blank
 * lines are folded so a message can't be mostly empty space.
 */
export function readContent(formData: FormData) {
	const raw = formData.get("content");
	const content =
		typeof raw === "string"
			? raw
					.replace(/\r\n?/g, "\n")
					.replace(/\n{3,}/g, "\n\n")
					.trim()
			: "";
	if (!content) return { error: fail(400, { error: "Message cannot be empty" }) };
	if (content.length > MAX_MESSAGE_LENGTH) {
		return { error: fail(400, { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }) };
	}
	return { content };
}

/** Mutes from the moderation tools, plus the per-channel send cooldown. */
export async function checkCanSend(account: Account, messageType: "global" | "party" | "direct") {
	const [restriction, recent] = await Promise.all([
		db.query.chatRestrictions.findFirst({ where: eq(chatRestrictions.userId, account.id) }),
		db.query.chatMessages.findFirst({
			where: and(eq(chatMessages.senderId, account.id), eq(chatMessages.messageType, messageType)),
			orderBy: desc(chatMessages.sentAt)
		})
	]);

	if (restriction && (restriction.isPermanent || !restriction.expiresAt || restriction.expiresAt > new Date())) {
		return fail(403, { error: "You are muted and can't send messages right now" });
	}
	if (recent && Date.now() - recent.sentAt.getTime() < COOLDOWN_MS) {
		return fail(429, { error: "Slow down a little" });
	}
	return null;
}

function messageId(formData: FormData) {
	const id = Number(formData.get("messageId"));
	return Number.isInteger(id) && id > 0 ? id : null;
}

function inScope(message: typeof chatMessages.$inferSelect, scope: ChatScope) {
	if (message.messageType !== scope.type) return false;
	if (scope.type === "party") return message.partyId === scope.partyId;
	if (scope.type === "direct") {
		const pair = [message.senderId, message.recipientId];
		return scope.userIds.every((id) => pair.includes(id));
	}
	return true;
}

/** Soft-deletes a message: its author can always, moderators and admins too. */
export async function deleteMessage(account: Account, formData: FormData, scope: ChatScope) {
	const id = messageId(formData);
	if (!id) return { error: fail(400, { error: "Missing message" }) };

	const message = await db.query.chatMessages.findFirst({ where: eq(chatMessages.id, id) });
	if (!message || message.isDeleted || !inScope(message, scope)) {
		return { error: fail(404, { error: "Message not found" }) };
	}
	if (message.senderId !== account.id && !canModerate(account)) {
		return { error: fail(403, { error: "You can only delete your own messages" }) };
	}

	await db
		.update(chatMessages)
		.set({ isDeleted: true, deletedBy: account.id, deletedAt: new Date() })
		.where(eq(chatMessages.id, id));
	return { message };
}

const violationTypes = new Set<string>(violationReasonEnum.enumValues);

/** Files a report against a single message (shows up in the moderation queue). */
export async function reportMessage(account: Account, formData: FormData, scope: ChatScope) {
	const id = messageId(formData);
	const violationType = String(formData.get("violationType") ?? "");
	const description = String(formData.get("description") ?? "")
		.trim()
		.slice(0, 500);

	if (!id || !violationTypes.has(violationType)) return fail(400, { error: "Pick a reason for the report" });

	const message = await db.query.chatMessages.findFirst({ where: eq(chatMessages.id, id) });
	if (!message || message.isDeleted || !inScope(message, scope)) return fail(404, { error: "Message not found" });
	if (message.senderId === account.id) return fail(400, { error: "You can't report your own message" });

	await db.insert(generalReports).values({
		targetType: "message",
		targetId: String(id),
		reporterId: account.id,
		reason: description || `Reported for ${violationType}`,
		violationType: violationType as (typeof violationReasonEnum.enumValues)[number],
		status: "pending"
	});
	return { success: true, message: "Report sent" };
}

/** Accounts this user blocked; their messages are hidden from the group channels. */
export async function blockedIdsOf(accountId: string) {
	const rows = await db.query.userBlocks.findMany({ where: eq(userBlocks.userId, accountId) });
	return rows.map((b) => b.blockedUserId);
}

export async function blockUser(account: Account, blockedUserId: string | null) {
	if (!blockedUserId) return fail(400, { error: "Missing user" });
	if (blockedUserId === account.id) return fail(400, { error: "You cannot block yourself" });

	const existing = await db.query.userBlocks.findFirst({
		where: and(eq(userBlocks.userId, account.id), eq(userBlocks.blockedUserId, blockedUserId))
	});
	if (existing) return fail(400, { error: "User is already blocked" });

	await db.insert(userBlocks).values({ userId: account.id, blockedUserId });
	return { success: true, message: "User blocked" };
}

export async function unblockUser(account: Account, blockedUserId: string | null) {
	if (!blockedUserId) return fail(400, { error: "Missing user" });

	const existing = await db.query.userBlocks.findFirst({
		where: and(eq(userBlocks.userId, account.id), eq(userBlocks.blockedUserId, blockedUserId))
	});
	if (!existing) return fail(400, { error: "User is not blocked" });

	await db.delete(userBlocks).where(eq(userBlocks.id, existing.id));
	return { success: true, message: "User unblocked" };
}
