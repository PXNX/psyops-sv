// src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { states, parliamentaryElections } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { eq, and, gte } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { getSignedDownloadUrl } from "$lib/server/backblaze";

export const load: PageServerLoad = async ({ params }) => {
	// Query state with all related data
	const state = await db.query.states.findFirst({
		where: eq(states.id, params.id),
		with: {
			president: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				}
			},
			ministers: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				}
			},
			parliamentMembers: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				},
				limit: 20 // Limit parliament members in initial load
			},
			regions: true
		}
	});

	if (!state) {
		error(404, "State not found");
	}

	// Get next or active election
	const now = new Date();
	const nextElection = await db.query.parliamentaryElections.findFirst({
		where: and(eq(parliamentaryElections.stateId, params.id), gte(parliamentaryElections.endDate, now)),
		orderBy: parliamentaryElections.startDate
	});

	// Process avatars
	const processAvatar = async (avatar: string | null) => {
		if (avatar && !avatar.startsWith("http")) {
			try {
				return await getSignedDownloadUrl(avatar);
			} catch {
				return null;
			}
		}
		return avatar;
	};

	return {
		state: {
			id: state.id,
			name: state.name,
			avatar: state.avatar,
			background: state.background,
			description: state.description,
			population: state.population,
			rating: state.rating,
			createdAt: state.createdAt
		},
		president: state.president
			? {
					userId: state.president.userId,
					name: state.president.user.profile?.name,
					avatar: await processAvatar(state.president.user.profile?.avatar || null),
					electedAt: state.president.electedAt,
					term: state.president.term
				}
			: null,
		ministers: await Promise.all(
			state.ministers.map(async (minister) => ({
				userId: minister.userId,
				name: minister.user.profile?.name,
				avatar: await processAvatar(minister.user.profile?.avatar || null),
				ministry: minister.ministry,
				appointedAt: minister.appointedAt
			}))
		),
		parliamentMembers: await Promise.all(
			state.parliamentMembers.map(async (member) => ({
				userId: member.userId,
				name: member.user.profile?.name,
				avatar: await processAvatar(member.user.profile?.avatar || null),
				partyAffiliation: member.partyAffiliation,
				electedAt: member.electedAt,
				term: member.term
			}))
		),
		regions: state.regions.map((region) => ({
			id: region.id,
			name: region.name,
			population: region.population
		})),
		nextElection: nextElection
			? {
					id: nextElection.id,
					startDate: nextElection.startDate,
					endDate: nextElection.endDate,
					status: nextElection.status,
					totalSeats: nextElection.totalSeats,
					isInaugural: nextElection.isInaugural
				}
			: null
	};
};
