// src/routes/moderators/actions/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import {
	accounts,
	userProfiles,
	files,
	chatMessages,
	userWarnings,
	chatRestrictions,
	generalReports,
	contentFlags
} from "#lib/server/schema.js";
import { eq, and, or } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";

export const load: PageServerLoad = async ({ params }) => {
	const actionId = parseInt(params.id);

	if (isNaN(actionId)) {
		throw error(400, "Invalid action ID");
	}

	// Try to find the action in different tables
	let action: any = null;
	let actionType: string | null = null;

	// Look the id up in every action table in parallel, then pick the first match in priority order
	const [deletedMessage, warning, restriction, report, flag] = await Promise.all([
		db.query.chatMessages.findFirst({
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
		}),
		db.query.userWarnings.findFirst({
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
		}),
		db.query.chatRestrictions.findFirst({
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
		}),
		db.query.generalReports.findFirst({
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
		}),
		db.query.contentFlags.findFirst({
			where: eq(contentFlags.id, actionId),
			with: {
				flagger: {
					with: {
						profile: true
					}
				}
			}
		})
	]);

	if (deletedMessage && deletedMessage.deletedBy) {
		action = deletedMessage;
		actionType = "message_delete";
	} else if (warning) {
		action = warning;
		actionType = "warning";
	} else if (restriction) {
		action = restriction;
		actionType = "restriction";
	} else if (report && report.reviewedBy) {
		action = report;
		actionType = "report_action";
	} else if (flag) {
		action = flag;
		actionType = "content_flag";
	}

	if (!action || !actionType) {
		throw error(404, "Action not found");
	}

	// Helper function to get user with logo
	async function getUserWithLogo(user: any) {
		const logoUrl = await getLogoUrl(user?.profile?.logo).catch((err) => {
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

	// Format the action based on type
	let formattedAction: any = {
		id: actionId,
		type: actionType
	};

	switch (actionType) {
		case "message_delete": {
			const [target, moderator] = await Promise.all([
				getUserWithLogo(deletedMessage!.sender),
				getUserWithLogo(deletedMessage!.deletedByUser)
			]);
			formattedAction = {
				...formattedAction,
				target,
				moderator,
				messageContent: deletedMessage!.content,
				messageType: deletedMessage!.messageType,
				deletionReason: deletedMessage!.deletionReason,
				deletionNote: deletedMessage!.deletionNote,
				sentAt: deletedMessage!.sentAt,
				deletedAt: deletedMessage!.deletedAt
			};
			break;
		}

		case "warning": {
			const [target, moderator] = await Promise.all([getUserWithLogo(action.user), getUserWithLogo(action.issuer)]);
			formattedAction = {
				...formattedAction,
				target,
				moderator,
				reason: action.reason,
				description: action.description,
				issuedAt: action.issuedAt
			};
			break;
		}

		case "restriction": {
			const [target, moderator] = await Promise.all([getUserWithLogo(action.user), getUserWithLogo(action.restrictor)]);
			formattedAction = {
				...formattedAction,
				target,
				moderator,
				reason: action.reason,
				isPermanent: action.isPermanent,
				expiresAt: action.expiresAt,
				restrictedAt: action.restrictedAt
			};
			break;
		}

		case "report_action": {
			const [targetUser, reporter, moderator] = await Promise.all([
				// Get the target user/entity
				(async () => {
					if (action.targetType !== "account" && action.targetType !== "message") return null;
					const target = await db.query.accounts.findFirst({
						where: eq(accounts.id, action.targetId),
						with: {
							profile: true
						}
					});
					return target ? await getUserWithLogo(target) : null;
				})(),
				getUserWithLogo(action.reporter),
				action.reviewer ? getUserWithLogo(action.reviewer) : null
			]);

			formattedAction = {
				...formattedAction,
				reporter,
				moderator,
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
		}

		case "content_flag": {
			const [flagTarget, moderator] = await Promise.all([
				// Get the target
				(async () => {
					if (action.targetType !== "account") return null;
					const target = await db.query.accounts.findFirst({
						where: eq(accounts.id, action.targetId),
						with: {
							profile: true
						}
					});
					return target ? await getUserWithLogo(target) : null;
				})(),
				getUserWithLogo(action.flagger)
			]);

			formattedAction = {
				...formattedAction,
				moderator,
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
	}

	return {
		action: formattedAction
	};
};
