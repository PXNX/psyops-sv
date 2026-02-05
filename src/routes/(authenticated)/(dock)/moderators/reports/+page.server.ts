// src/routes/moderators/reports/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, userProfiles, files, generalReports, chatMessages, politicalParties } from "$lib/server/schema";
import { eq, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;

	if (!account) {
		throw redirect(303, "/login");
	}

	// Get all reports filed by the current user
	const reports = await db.query.generalReports.findMany({
		where: eq(generalReports.reporterId, account.id),
		orderBy: [desc(generalReports.reportedAt)]
	});

	// Get unique user IDs and party IDs to fetch details
	const userIds = new Set<string>();
	const partyIds = new Set<number>();

	reports.forEach((report) => {
		if (report.targetType === "account" || report.targetType === "message") {
			userIds.add(report.targetId);
		} else if (report.targetType === "party") {
			const partyId = parseInt(report.targetId);
			if (!isNaN(partyId)) {
				partyIds.add(partyId);
			}
		}

		if (report.reviewedBy) {
			userIds.add(report.reviewedBy);
		}
	});

	// Fetch user profiles
	const users = await db.query.accounts.findMany({
		where: (accounts, { inArray }) => inArray(accounts.id, Array.from(userIds)),
		with: {
			profile: true
		}
	});

	// Fetch party details
	const parties =
		partyIds.size > 0
			? await db.query.politicalParties.findMany({
					where: (politicalParties, { inArray }) => inArray(politicalParties.id, Array.from(partyIds))
				})
			: [];

	// Process user logos
	const usersWithLogos = await Promise.all(
		users.map(async (user) => {
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
		})
	);

	// Process party logos
	const partiesWithLogos = await Promise.all(
		parties.map(async (party) => {
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

			return {
				id: party.id,
				name: party.name,
				color: party.color,
				logoUrl
			};
		})
	);

	// Create maps
	const userMap = new Map(usersWithLogos.map((u) => [u.id, u]));
	const partyMap = new Map(partiesWithLogos.map((p) => [p.id, p]));

	// For message reports, fetch the message content (if not deleted)
	const messageReports = reports.filter((r) => r.targetType === "message");
	const messageIds = messageReports.map((r) => parseInt(r.targetId)).filter((id) => !isNaN(id));

	const messages =
		messageIds.length > 0
			? await db.query.chatMessages.findMany({
					where: (chatMessages, { inArray }) => inArray(chatMessages.id, messageIds),
					with: {
						sender: {
							with: {
								profile: true
							}
						}
					}
				})
			: [];

	const messageMap = new Map(messages.map((m) => [m.id, m]));

	// Format reports
	const formattedReports = reports.map((report) => {
		let target: any = null;

		if (report.targetType === "account") {
			target = {
				type: "account",
				...userMap.get(report.targetId),
				id: report.targetId
			};
		} else if (report.targetType === "party") {
			const partyId = parseInt(report.targetId);
			target = {
				type: "party",
				...(partyMap.get(partyId) || { id: partyId, name: "Unknown Party", color: "#6366f1", logoUrl: null })
			};
		} else if (report.targetType === "message") {
			const messageId = parseInt(report.targetId);
			const message = messageMap.get(messageId);
			target = {
				type: "message",
				id: messageId,
				content: message?.content || "[Message deleted or unavailable]",
				isDeleted: message?.isDeleted || true,
				sender: message?.sender
					? {
							id: message.sender.id,
							name: message.sender.profile?.name || "Unknown"
						}
					: null
			};
		}

		const reviewer = report.reviewedBy ? userMap.get(report.reviewedBy) : null;

		return {
			id: report.id,
			targetType: report.targetType,
			target,
			reason: report.reason,
			violationType: report.violationType,
			status: report.status,
			actionTaken: report.actionTaken,
			reviewNote: report.reviewNote,
			reviewer,
			reportedAt: report.reportedAt,
			reviewedAt: report.reviewedAt
		};
	});

	// Calculate stats
	const stats = {
		total: reports.length,
		pending: reports.filter((r) => r.status === "pending").length,
		resolved: reports.filter((r) => r.status === "resolved").length,
		dismissed: reports.filter((r) => r.status === "dismissed").length
	};

	return {
		reports: formattedReports,
		stats
	};
};
