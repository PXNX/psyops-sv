// src/routes/(authenticated)/moderation/+page.server.ts
import { db } from "$lib/server/db";
import {
	generalReports,
	chatMessages,
	accounts,
	userProfiles,
	files,
	userWarnings,
	chatRestrictions
} from "$lib/server/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { sendModerationNotification } from "$lib/server/service/inbox";

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

			let logoUrl = null;
			if (sender?.profile?.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, sender.profile.logo)
				});
				if (logoFile) {
					try {
						logoUrl = await getSignedDownloadUrl(logoFile.key);
					} catch {}
				}
			}

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
		const reason = formData.get("reason") as string;
		const note = formData.get("note") as string;
		const issueWarning = formData.get("issueWarning") === "true";

		// Get message to find sender
		const message = await db.query.chatMessages.findFirst({
			where: eq(chatMessages.id, messageId)
		});

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

		// Issue warning if requested
		if (issueWarning) {
			await db.insert(userWarnings).values({
				userId: message.senderId,
				reason: reason as any,
				description: note || "Message violated community guidelines",
				issuedBy: account.id
			});

			// Check warning count
			const warningCount = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(userWarnings)
				.where(eq(userWarnings.userId, message.senderId));

			const totalWarnings = warningCount[0]?.count || 0;

			// Auto-restrict after 3 warnings
			if (totalWarnings >= 3) {
				// Check if already restricted
				const existingRestriction = await db.query.chatRestrictions.findFirst({
					where: eq(chatRestrictions.userId, message.senderId)
				});

				if (!existingRestriction) {
					const expiresAt = new Date();
					expiresAt.setDate(expiresAt.getDate() + 7); // 7 day restriction

					await db.insert(chatRestrictions).values({
						userId: message.senderId,
						reason: "Accumulated 3 warnings",
						restrictedBy: account.id,
						expiresAt,
						isPermanent: false
					});

					// Send restriction notification
					await sendModerationNotification({
						recipientId: message.senderId,
						moderatorId: account.id,
						action: "restriction",
						reason: "Accumulated 3 warnings",
						details: "This restriction will expire in 7 days. Further violations may result in a permanent ban."
					});
				}
			} else {
				// Send warning notification
				await sendModerationNotification({
					recipientId: message.senderId,
					moderatorId: account.id,
					action: "warning",
					reason,
					details: note || undefined
				});
			}
		}

		// Send message deletion notification
		await sendModerationNotification({
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
				actionTaken: "message_delete"
			})
			.where(eq(generalReports.id, reportId));

		return { success: true };
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

		await db
			.update(generalReports)
			.set({
				status: "dismissed",
				reviewedBy: account.id,
				reviewedAt: new Date(),
				reviewNote: reviewNote || null
			})
			.where(eq(generalReports.id, reportId));

		return { success: true };
	}
};
