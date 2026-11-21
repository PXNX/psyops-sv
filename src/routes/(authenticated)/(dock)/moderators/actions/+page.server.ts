// src/routes/moderators/actions/+page.server.ts
import { listModerationActions, MODERATION_ACTION_TYPES, type ModerationActionType } from "#lib/server/moderation/actions.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account;
	const filterUserId = url.searchParams.get("userId");
	const requestedType = url.searchParams.get("type");
	const type = MODERATION_ACTION_TYPES.includes(requestedType as ModerationActionType)
		? (requestedType as ModerationActionType)
		: null;

	const { actions, total, counts } = await listModerationActions({ targetUserId: filterUserId, type });

	return {
		actions,
		total,
		counts,
		currentUserId: account?.id || null,
		filterUserId,
		filterType: type
	};
};
