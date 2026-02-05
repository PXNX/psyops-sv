// src/routes/moderators/reports/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, userProfiles, files, generalReports, chatMessages, politicalParties } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

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

		let logoUrl = null;
		if (user.profile?.logo) {
			try {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, user.profile.logo)
				});
				if (logoFile) {
					logoUrl = await getSignedDownloadUrl(logoFile.key);
				}
			} catch (err) {
				console.error("Failed to get user logo:", err);
			}
		}

		return {
			id: user.id,
			name: user.profile?.name || "Unknown",
			role: user.role,
			logoUrl
		};
	}

	// Get target details based on type
	let target: any = null;

	if (report.targetType === "account") {
		const targetUser = await db.query.accounts.findFirst({
			where: eq(accounts.id, report.targetId),
			with: {
				profile: true
			}
		});

		if (targetUser) {
			target = {
				type: "account",
				...(await getUserWithLogo(targetUser))
			};
		}
	} else if (report.targetType === "party") {
		const partyId = parseInt(report.targetId);
		if (!isNaN(partyId)) {
			const party = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, partyId)
			});

			if (party) {
				let logoUrl = null;
				if (party.logo) {
					try {
						const logoFile = await db.query.files.findFirst({
							where: eq(files.id, party.logo)
						});
						if (logoFile) {
							logoUrl = await getSignedDownloadUrl(logoFile.key);
						}
					} catch (err) {
						console.error("Failed to get party logo:", err);
					}
				}

				target = {
					type: "party",
					id: party.id,
					name: party.name,
					color: party.color,
					logoUrl
				};
			}
		}
	} else if (report.targetType === "message") {
		const messageId = parseInt(report.targetId);
		if (!isNaN(messageId)) {
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

			target = {
				type: "message",
				id: messageId,
				content: message?.content || "[Message deleted or unavailable]",
				isDeleted: message?.isDeleted || true,
				messageType: message?.messageType || null,
				sentAt: message?.sentAt || null,
				sender: message?.sender ? await getUserWithLogo(message.sender) : null
			};
		}
	}

	const formattedReport = {
		id: report.id,
		targetType: report.targetType,
		target,
		reason: report.reason,
		violationType: report.violationType,
		status: report.status,
		actionTaken: report.actionTaken,
		reviewNote: report.reviewNote,
		reporter: await getUserWithLogo(report.reporter),
		reviewer: report.reviewer ? await getUserWithLogo(report.reviewer) : null,
		reportedAt: report.reportedAt,
		reviewedAt: report.reviewedAt
	};

	return {
		report: formattedReport
	};
};
