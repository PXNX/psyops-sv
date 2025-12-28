// src/lib/server/service/inbox.ts
// Helper functions for sending inbox messages

import { db } from "$lib/server/db";
import { inboxMessages } from "$lib/server/schema";

/**
 * Send a medal award notification to a user
 */
export async function sendMedalNotification(params: {
	recipientId: string;
	awarderId: string;
	medalType: string;
	reason: string;
	stateId: number;
}) {
	const { recipientId, awarderId, medalType, reason, stateId } = params;

	await db.insert(inboxMessages).values({
		recipientId,
		senderId: awarderId,
		messageType: "medal_award",
		stateId,
		subject: `🏆 You've Been Awarded a Medal!`,
		content: `Congratulations! You have been awarded the ${medalType.replace("_", " ").toUpperCase()} medal.\n\nReason: ${reason}`,
		isRead: false
	});
}

/**
 * Send a moderation notification to a user
 */
export async function sendModerationNotification(params: {
	recipientId: string;
	moderatorId: string;
	action: string;
	reason: string;
	details?: string;
}) {
	const { recipientId, moderatorId, action, reason, details } = params;

	let subject = "";
	let content = "";

	switch (action) {
		case "warning":
			subject = "⚠️ Moderation Warning";
			content = `You have received a warning from the moderation team.\n\nReason: ${reason}\n\nPlease review our community guidelines to avoid further action.`;
			break;
		case "message_delete":
			subject = "🗑️ Message Removed";
			content = `One of your messages has been removed by a moderator.\n\nReason: ${reason}\n\nPlease ensure your messages comply with community guidelines.`;
			break;
		case "restriction":
			subject = "🚫 Chat Restriction";
			content = `Your chat access has been restricted.\n\nReason: ${reason}${details ? `\n\n${details}` : ""}`;
			break;
		case "name_reset":
			subject = "✏️ Name Reset Required";
			content = `Your username has been flagged and must be changed.\n\nReason: ${reason}\n\nPlease choose a new appropriate username.`;
			break;
		case "logo_reset":
			subject = "🖼️ Logo Reset Required";
			content = `Your profile logo has been flagged and must be changed.\n\nReason: ${reason}\n\nPlease upload a new appropriate logo.`;
			break;
		default:
			subject = "⚖️ Moderation Action";
			content = `A moderation action has been taken on your account.\n\nAction: ${action}\nReason: ${reason}${details ? `\n\n${details}` : ""}`;
	}

	await db.insert(inboxMessages).values({
		recipientId,
		senderId: moderatorId,
		messageType: "moderation",
		subject,
		content,
		isRead: false
	});
}

/**
 * Send a system notification to a user
 */
export async function sendSystemNotification(params: {
	recipientId: string;
	subject: string;
	content: string;
	systemSenderId?: string; // Optional, for tracking which admin/system sent it
}) {
	const { recipientId, subject, content, systemSenderId } = params;

	await db.insert(inboxMessages).values({
		recipientId,
		senderId: systemSenderId || "system", // Use "system" as default sender
		messageType: "system",
		subject,
		content,
		isRead: false
	});
}
