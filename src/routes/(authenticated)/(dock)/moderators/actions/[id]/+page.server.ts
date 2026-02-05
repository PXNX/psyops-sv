// src/routes/moderators/actions/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	accounts,
	userProfiles,
	files,
	chatMessages,
	userWarnings,
	chatRestrictions,
	generalReports,
	contentFlags
} from "$lib/server/schema";
import { eq, and, or } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params }) => {
	const actionId = parseInt(params.id);

	if (isNaN(actionId)) {
		throw error(400, "Invalid action ID");
	}

	// Try to find the action in different tables
	// First, check if it's a deleted message
	let action: any = null;
	let actionType: string | null = null;

	const deletedMessage = await db.query.chatMessages.findFirst({
		where: and(eq(chatMessages.id, actionId), eq(chatMessages.isDeleted, true)),
		with: {
			sender: {
				with: {
					profile: true
				}
			},
			deletedByUser: {
				with: {
					profile: true
				}
			}
		}
	});

	if (deletedMessage && deletedMessage.deletedBy) {
		action = deletedMessage;
		actionType = "message_delete";
	}

	// Check warnings
	if (!action) {
		const warning = await db.query.userWarnings.findFirst({
			where: eq(userWarnings.id, actionId),
			with: {
				user: {
					with: {
						profile: true
					}
				},
				issuer: {
					with: {
						profile: true
					}
				}
			}
		});

		if (warning) {
			action = warning;
			actionType = "warning";
		}
	}

	// Check restrictions
	if (!action) {
		const restriction = await db.query.chatRestrictions.findFirst({
			where: eq(chatRestrictions.id, actionId),
			with: {
				user: {
					with: {
						profile: true
					}
				},
				restrictor: {
					with: {
						profile: true
					}
				}
			}
		});

		if (restriction) {
			action = restriction;
			actionType = "restriction";
		}
	}

	// Check reports
	if (!action) {
		const report = await db.query.generalReports.findFirst({
			where: eq(generalReports.id, actionId),
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

		if (report && report.reviewedBy) {
			action = report;
			actionType = "report_action";
		}
	}

	// Check content flags
	if (!action) {
		const flag = await db.query.contentFlags.findFirst({
			where: eq(contentFlags.id, actionId),
			with: {
				flagger: {
					with: {
						profile: true
					}
				}
			}
		});

		if (flag) {
			action = flag;
			actionType = "content_flag";
		}
	}

	if (!action || !actionType) {
		throw error(404, "Action not found");
	}

	// Helper function to get user with logo
	async function getUserWithLogo(user: any) {
		let logoUrl = null;
		if (user?.profile?.logo) {
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

	// Format the action based on type
	let formattedAction: any = {
		id: actionId,
		type: actionType
	};

	switch (actionType) {
		case "message_delete":
			formattedAction = {
				...formattedAction,
				target: await getUserWithLogo(deletedMessage.sender),
				moderator: await getUserWithLogo(deletedMessage.deletedByUser),
				messageContent: deletedMessage.content,
				messageType: deletedMessage.messageType,
				deletionReason: deletedMessage.deletionReason,
				deletionNote: deletedMessage.deletionNote,
				sentAt: deletedMessage.sentAt,
				deletedAt: deletedMessage.deletedAt
			};
			break;

		case "warning":
			formattedAction = {
				...formattedAction,
				target: await getUserWithLogo(action.user),
				moderator: await getUserWithLogo(action.issuer),
				reason: action.reason,
				description: action.description,
				issuedAt: action.issuedAt
			};
			break;

		case "restriction":
			formattedAction = {
				...formattedAction,
				target: await getUserWithLogo(action.user),
				moderator: await getUserWithLogo(action.restrictor),
				reason: action.reason,
				isPermanent: action.isPermanent,
				expiresAt: action.expiresAt,
				restrictedAt: action.restrictedAt
			};
			break;

		case "report_action":
			// Get the target user/entity
			let targetUser = null;
			if (action.targetType === "account" || action.targetType === "message") {
				const target = await db.query.accounts.findFirst({
					where: eq(accounts.id, action.targetId),
					with: {
						profile: true
					}
				});
				if (target) {
					targetUser = await getUserWithLogo(target);
				}
			}

			formattedAction = {
				...formattedAction,
				reporter: await getUserWithLogo(action.reporter),
				moderator: action.reviewer ? await getUserWithLogo(action.reviewer) : null,
				target: targetUser,
				targetType: action.targetType,
				targetId: action.targetId,
				reportReason: action.reason,
				violationType: action.violationType,
				status: action.status,
				actionTaken: action.actionTaken,
				reviewNote: action.reviewNote,
				reportedAt: action.reportedAt,
				reviewedAt: action.reviewedAt
			};
			break;

		case "content_flag":
			// Get the target
			let flagTarget = null;
			if (action.targetType === "account") {
				const target = await db.query.accounts.findFirst({
					where: eq(accounts.id, action.targetId),
					with: {
						profile: true
					}
				});
				if (target) {
					flagTarget = await getUserWithLogo(target);
				}
			}

			formattedAction = {
				...formattedAction,
				moderator: await getUserWithLogo(action.flagger),
				target: flagTarget,
				targetType: action.targetType,
				targetId: action.targetId,
				flagType: action.flagType,
				reason: action.reason,
				isResolved: action.isResolved,
				flaggedAt: action.flaggedAt,
				resolvedAt: action.resolvedAt
			};
			break;
	}

	return {
		action: formattedAction
	};
};
