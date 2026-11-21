// src/routes/(authenticated)/moderation/+page.server.ts
import { db } from "#lib/server/db.js";
import { generalReports, chatMessages, accounts, userProfiles } from "#lib/server/schema.js";
import { eq, desc } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { isViolationReason, issueWarning as recordWarning, notifyAction } from "#lib/server/moderation/enforcement.js";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get all message reports
	const reports = await db
		.select({
			reportId: generalReports.id,
			messageId: generalReports.targetId,
			reporterId: generalReports.reporterId,
			reporterName: userProfiles.name,
			reason: generalReports.reason,
			violationType: generalReports.violationType,
			status: generalReports.status,
			reportedAt: generalReports.reportedAt,
			reviewedBy: generalReports.reviewedBy,
			reviewNote: generalReports.reviewNote,
			actionTaken: generalReports.actionTaken
		})
		.from(generalReports)
		.leftJoin(accounts, eq(generalReports.reporterId, accounts.id))
		.leftJoin(userProfiles, eq(accounts.id, userProfiles.accountId))
		.where(eq(generalReports.targetType, "message"))
		.orderBy(desc(generalReports.reportedAt))
		.limit(100);

	// Get message details for each report
	const reportsWithMessages = await Promise.all(
		reports.map(async (report) => {
			const message = await db.query.chatMessages.findFirst({
				where: eq(chatMessages.id, parseInt(report.messageId))
			});

			if (!message) {
				return {
					...report,
					messageContent: "[Message deleted or not found]",
					messageSenderId: null,
					messageSenderName: "Unknown User",
					messageSenderLogo: null,
					messageType: "global",
					reportedAt: report.reportedAt.toISOString()
				};
			}

			// Get sender info
			const sender = await db.query.accounts.findFirst({
				where: eq(accounts.id, message.senderId),
				with: {
					profile: true
				}
			});

			const logoUrl = await getLogoUrl(sender?.profile?.logo);

			return {
				...report,
				messageContent: message.content,
				messageSenderId: message.senderId,
				messageSenderName: sender?.profile?.name || "Unknown User",
				messageSenderLogo: logoUrl,
				messageType: message.messageType,
				messageIsDeleted: message.isDeleted,
				reportedAt: report.reportedAt.toISOString()
			};
		})
	);

	// Calculate stats
	const stats = {
		pending: reportsWithMessages.filter((r) => r.status === "pending").length,
		resolved: reportsWithMessages.filter((r) => r.status === "resolved").length,
		dismissed: reportsWithMessages.filter((r) => r.status === "dismissed").length
	};

	return {
		reports: reportsWithMessages,
		stats
	};
};

export const actions: Actions = {
	deleteMessage: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		if (account.role !== "moderator" && account.role !== "admin") {
			return fail(403, { error: "Only moderators can delete messages" });
		}

		const formData = await request.formData();
		const reportId = parseInt(formData.get("reportId") as string);
		const messageId = parseInt(formData.get("messageId") as string);
		const reason = isViolationReason(formData.get("reason")) ? (formData.get("reason") as any) : "other";
		const note = formData.get("note") as string;
		const issueWarning = formData.get("issueWarning") === "true";

		// Get message and report so everyone affected can be notified
		const [message, report] = await Promise.all([
			db.query.chatMessages.findFirst({ where: eq(chatMessages.id, messageId) }),
			db.query.generalReports.findFirst({ where: eq(generalReports.id, reportId) })
		]);

		if (!message) {
			return fail(404, { error: "Message not found" });
		}

		// Delete the message (mark as deleted)
		await db
			.update(chatMessages)
			.set({
				isDeleted: true,
				deletedBy: account.id,
				deletedAt: new Date(),
				deletionReason: reason as any,
				deletionNote: note || null
			})
			.where(eq(chatMessages.id, messageId));

		// Issue warning if requested (includes the automatic 7-day restriction at 3 warnings)
		if (issueWarning) {
			await recordWarning({
				userId: message.senderId,
				reason: isViolationReason(reason) ? reason : "other",
				description: note || "Message violated community guidelines",
				issuedBy: account.id
			});
		}

		// Send message deletion notification
		await notifyAction({
			recipientId: message.senderId,
			moderatorId: account.id,
			action: "message_delete",
			reason,
			details: note || undefined
		});

		// Update report
		await db
			.update(generalReports)
			.set({
				status: "resolved",
				reviewedBy: account.id,
				reviewedAt: new Date(),
				actionTaken: "message_delete",
				reviewNote: note || null
			})
			.where(eq(generalReports.id, reportId));

		// Tell the reporter what happened to their report
		if (report && report.reporterId !== message.senderId) {
			await notifyAction({
				recipientId: report.reporterId,
				moderatorId: account.id,
				action: "report_resolved",
				reason: "The reported message was removed",
				details: note || undefined
			});
		}

		return { success: true, message: "Message removed and report resolved." };
	},

	dismissReport: async ({ request, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Not authenticated" });
		}

		if (account.role !== "moderator" && account.role !== "admin") {
			return fail(403, { error: "Only moderators can dismiss reports" });
		}

		const formData = await request.formData();
		const reportId = parseInt(formData.get("reportId") as string);
		const reviewNote = formData.get("reviewNote") as string;

		const report = await db.query.generalReports.findFirst({ where: eq(generalReports.id, reportId) });

		await db
			.update(generalReports)
			.set({
				status: "dismissed",
				reviewedBy: account.id,
				reviewedAt: new Date(),
				reviewNote: reviewNote || null
			})
			.where(eq(generalReports.id, reportId));

		if (report) {
			await notifyAction({
				recipientId: report.reporterId,
				moderatorId: account.id,
				action: "report_dismissed",
				reason: "No action was necessary",
				details: reviewNote || undefined
			});
		}

		return { success: true, message: "Report dismissed and the reporter notified." };
	}
};
