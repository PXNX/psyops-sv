// src/routes/moderators/reports/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import { accounts, userProfiles, files, generalReports, chatMessages, politicalParties } from "#lib/server/schema.js";
import { eq } from "drizzle-orm";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;

	if (!account) {
		throw redirect(303, "/login");
	}

	const reportId = parseInt(params.id);

	if (isNaN(reportId)) {
		throw error(400, "Invalid report ID");
	}

	// Get the report
	const report = await db.query.generalReports.findFirst({
		where: eq(generalReports.id, reportId),
		with: {
			reporter: {
				with: {
					profile: true
				}
			},
			reviewer: {
				with: {
					profile: true
				}
			}
		}
	});

	if (!report) {
		throw error(404, "Report not found");
	}

	// Check if user owns this report
	if (report.reporterId !== account.id) {
		throw error(403, "You can only view your own reports");
	}

	// Helper function to get user with logo
	async function getUserWithLogo(user: any) {
		if (!user) return null;

		const logoUrl = await getLogoUrl(user.profile?.logo).catch((err) => {
			console.error("Failed to get user logo:", err);
			return null;
		});

		return {
			id: user.id,
			name: user.profile?.name || "Unknown",
			role: user.role,
			logoUrl
		};
	}

	// Target, reporter and reviewer only depend on the report, so resolve them in parallel
	const [target, reporter, reviewer] = await Promise.all([
		// Get target details based on type
		(async (): Promise<any> => {
			if (report.targetType === "account") {
				const targetUser = await db.query.accounts.findFirst({
					where: eq(accounts.id, report.targetId),
					with: {
						profile: true
					}
				});

				if (!targetUser) return null;
				return {
					type: "account",
					...(await getUserWithLogo(targetUser))
				};
			} else if (report.targetType === "party") {
				const partyId = parseInt(report.targetId);
				if (isNaN(partyId)) return null;

				const party = await db.query.politicalParties.findFirst({
					where: eq(politicalParties.id, partyId)
				});
				if (!party) return null;

				const logoUrl = await getLogoUrl(party.logo).catch((err) => {
					console.error("Failed to get party logo:", err);
					return null;
				});

				return {
					type: "party",
					id: party.id,
					name: party.name,
					color: party.color,
					logoUrl
				};
			} else if (report.targetType === "message") {
				const messageId = parseInt(report.targetId);
				if (isNaN(messageId)) return null;

				const message = await db.query.chatMessages.findFirst({
					where: eq(chatMessages.id, messageId),
					with: {
						sender: {
							with: {
								profile: true
							}
						}
					}
				});

				return {
					type: "message",
					id: messageId,
					content: message?.content || "[Message deleted or unavailable]",
					isDeleted: message?.isDeleted || true,
					messageType: message?.messageType || null,
					sentAt: message?.sentAt || null,
					sender: message?.sender ? await getUserWithLogo(message.sender) : null
				};
			}

			return null;
		})(),
		getUserWithLogo(report.reporter),
		report.reviewer ? getUserWithLogo(report.reviewer) : null
	]);

	const formattedReport = {
		id: report.id,
		targetType: report.targetType,
		target,
		reason: report.reason,
		violationType: report.violationType,
		status: report.status,
		actionTaken: report.actionTaken,
		reviewNote: report.reviewNote,
		reporter,
		reviewer,
		reportedAt: report.reportedAt,
		reviewedAt: report.reviewedAt
	};

	return {
		report: formattedReport
	};
};
