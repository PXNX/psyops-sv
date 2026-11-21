// Shared server-side queries for moderation activity.
// Used by the public action log, the personal moderation record and the admin
// dashboard so every screen shows the same set of actions and the same data.
import { db } from "#lib/server/db.js";
import { getLogoUrl } from "#lib/server/backblaze.js";
import {
	accounts,
	chatMessages,
	chatRestrictions,
	contentFlags,
	generalReports,
	politicalParties,
	userWarnings
} from "#lib/server/schema.js";
import { and, desc, eq, sql } from "drizzle-orm";

export type ModerationActionType =
	| "message_delete"
	| "warning"
	| "restriction"
	| "report_action"
	| "content_flag";

export type ModerationActor = {
	id: string;
	name: string;
	logoUrl: string | null;
	role: "user" | "moderator" | "admin";
};

export type ModerationAction = {
	id: number;
	type: ModerationActionType;
	targetId: string;
	targetType: "account" | "party" | "message";
	target: ModerationActor | null;
	moderatorId: string;
	moderator: ModerationActor | null;
	reason: string | null;
	note: string | null;
	timestamp: Date;
};

export const MODERATION_ACTION_TYPES: ModerationActionType[] = [
	"message_delete",
	"warning",
	"restriction",
	"report_action",
	"content_flag"
];

type RawAction = Omit<ModerationAction, "target" | "moderator"> & { targetIsParty?: boolean };

/**
 * Collect every recorded moderation action from the underlying tables,
 * newest first. Pass `targetUserId` to get a single user's record.
 */
export async function listModerationActions(options: {
	targetUserId?: string | null;
	type?: ModerationActionType | null;
	limit?: number;
} = {}): Promise<{ actions: ModerationAction[]; total: number; counts: Record<ModerationActionType, number> }> {
	const { targetUserId, type, limit = 100 } = options;

	try {
		const [deletedMessages, warnings, restrictions, reports, flags] = await Promise.all([
			db.query.chatMessages
				.findMany({
					where: and(
						eq(chatMessages.isDeleted, true),
						sql`${chatMessages.deletedBy} IS NOT NULL`,
						targetUserId ? eq(chatMessages.senderId, targetUserId) : undefined
					),
					columns: {
						id: true,
						senderId: true,
						deletedBy: true,
						deletionReason: true,
						deletionNote: true,
						deletedAt: true
					},
					orderBy: [desc(chatMessages.deletedAt)]
				})
				.catch(() => []),
			db.query.userWarnings
				.findMany({
					where: targetUserId ? eq(userWarnings.userId, targetUserId) : undefined,
					orderBy: [desc(userWarnings.issuedAt)]
				})
				.catch(() => []),
			db.query.chatRestrictions
				.findMany({
					where: targetUserId ? eq(chatRestrictions.userId, targetUserId) : undefined,
					orderBy: [desc(chatRestrictions.restrictedAt)]
				})
				.catch(() => []),
			db.query.generalReports
				.findMany({
					where: and(
						sql`${generalReports.reviewedBy} IS NOT NULL`,
						targetUserId ? eq(generalReports.targetId, targetUserId) : undefined
					),
					orderBy: [desc(generalReports.reviewedAt)]
				})
				.catch(() => []),
			db.query.contentFlags
				.findMany({
					where: targetUserId ? eq(contentFlags.targetId, targetUserId) : undefined,
					orderBy: [desc(contentFlags.flaggedAt)]
				})
				.catch(() => [])
		]);

		const all: RawAction[] = [
			...(deletedMessages || []).map((m) => ({
				id: m.id,
				type: "message_delete" as const,
				targetId: m.senderId,
				targetType: "message" as const,
				moderatorId: m.deletedBy!,
				reason: m.deletionReason || null,
				note: m.deletionNote || null,
				timestamp: m.deletedAt!
			})),
			...(warnings || []).map((w) => ({
				id: w.id,
				type: "warning" as const,
				targetId: w.userId,
				targetType: "account" as const,
				moderatorId: w.issuedBy,
				reason: w.reason || null,
				note: w.description || null,
				timestamp: w.issuedAt
			})),
			...(restrictions || []).map((r) => ({
				id: r.id,
				type: "restriction" as const,
				targetId: r.userId,
				targetType: "account" as const,
				moderatorId: r.restrictedBy,
				reason: r.reason || null,
				note: r.isPermanent ? "Permanent restriction" : r.expiresAt ? `Expires ${r.expiresAt.toISOString()}` : null,
				timestamp: r.restrictedAt
			})),
			...(reports || []).map((r) => ({
				id: r.id,
				type: "report_action" as const,
				targetId: r.targetId,
				targetType: (r.targetType === "party" ? "party" : r.targetType === "message" ? "message" : "account") as
					| "account"
					| "party"
					| "message",
				moderatorId: r.reviewedBy!,
				reason: r.actionTaken || r.violationType || null,
				note: r.reviewNote || null,
				timestamp: r.reviewedAt!
			})),
			...(flags || []).map((f) => ({
				id: f.id,
				type: "content_flag" as const,
				targetId: f.targetId,
				targetType: (f.targetType === "party" ? "party" : "account") as "account" | "party",
				targetIsParty: f.targetType === "party",
				moderatorId: f.flaggedBy,
				reason: f.flagType || null,
				note: f.reason || null,
				timestamp: f.flaggedAt
			}))
		];

		all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

		const counts = Object.fromEntries(MODERATION_ACTION_TYPES.map((t) => [t, all.filter((a) => a.type === t).length])) as Record<
			ModerationActionType,
			number
		>;
		const matching = type ? all.filter((a) => a.type === type) : all;

		const userIds = new Set<string>();
		const partyIds = new Set<number>();
		const messageIds = new Set<number>();
		for (const action of matching) {
			userIds.add(action.moderatorId);
			if (action.targetType === "party" || action.targetIsParty) {
				const id = Number(action.targetId);
				if (!Number.isNaN(id)) partyIds.add(id);
			} else if (action.targetType === "message") {
				const id = Number(action.targetId);
				if (!Number.isNaN(id)) messageIds.add(id);
			} else {
				userIds.add(action.targetId);
			}
		}

		const [users, parties, messages] = await Promise.all([
			userIds.size
				? db.query.accounts.findMany({
						where: (a, { inArray }) => inArray(a.id, [...userIds]),
						with: { profile: true }
					})
				: [],
			partyIds.size
				? db.query.politicalParties.findMany({
						where: (p, { inArray }) => inArray(p.id, [...partyIds])
					})
				: [],
			messageIds.size
				? db.query.chatMessages.findMany({
						where: (m, { inArray }) => inArray(m.id, [...messageIds])
					})
				: []
		]);

		const userMap = new Map<string, ModerationActor>();
		await Promise.all(
			users.map(async (user) => {
				const logoUrl = await getLogoUrl(user.profile?.logo).catch(() => null);
				userMap.set(user.id, {
					id: user.id,
					name: user.profile?.name || "Unknown user",
					logoUrl,
					role: user.role
				});
			})
		);

		const partyMap = new Map<string, ModerationActor>();
		await Promise.all(
			parties.map(async (party) => {
				const logoUrl = await getLogoUrl(party.logo).catch(() => null);
				partyMap.set(String(party.id), {
					id: String(party.id),
					name: party.name,
					logoUrl,
					role: "user"
				});
			})
		);

		const messageMap = new Map(messages.map((m) => [String(m.id), m.senderId]));

		const resolveTarget = (action: RawAction): ModerationActor | null => {
			if (action.targetType === "party" || action.targetIsParty) return partyMap.get(action.targetId) ?? null;
			if (action.targetType === "message") {
				const senderId = messageMap.get(action.targetId);
				return senderId ? userMap.get(senderId) ?? null : null;
			}
			return userMap.get(action.targetId) ?? null;
		};

		const actions: ModerationAction[] = matching.slice(0, limit).map((action) => ({
			id: action.id,
			type: action.type,
			targetId: action.targetId,
			targetType: action.targetType,
			target: resolveTarget(action),
			moderatorId: action.moderatorId,
			moderator: userMap.get(action.moderatorId) ?? null,
			reason: action.reason,
			note: action.note,
			timestamp: action.timestamp
		}));

		return { actions, total: all.length, counts };
	} catch (err) {
		console.error("Failed to list moderation actions:", err);
		return {
			actions: [],
			total: 0,
			counts: Object.fromEntries(MODERATION_ACTION_TYPES.map((t) => [t, 0])) as Record<ModerationActionType, number>
		};
	}
}
