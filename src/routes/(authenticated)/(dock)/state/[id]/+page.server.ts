// src/routes/(authenticated)/(dock)/state/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { states } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

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
					avatar: state.president.user.profile?.avatar,
					electedAt: state.president.electedAt,
					term: state.president.term
				}
			: null,
		ministers: state.ministers.map((minister) => ({
			userId: minister.userId,
			name: minister.user.profile?.name,
			avatar: minister.user.profile?.avatar,
			ministry: minister.ministry,
			appointedAt: minister.appointedAt
		})),
		parliamentMembers: state.parliamentMembers.map((member) => ({
			userId: member.userId,
			name: member.user.profile?.name,
			avatar: member.user.profile?.avatar,
			partyAffiliation: member.partyAffiliation,
			electedAt: member.electedAt,
			term: member.term
		})),
		regions: state.regions.map((region) => ({
			id: region.id,
			name: region.name,
			population: region.population
		}))
	};
};
