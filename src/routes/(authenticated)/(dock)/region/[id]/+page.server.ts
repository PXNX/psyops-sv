// src/routes/(authenticated)/(dock)/region/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { regions } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
	// Query region with all related data
	const region = await db.query.regions.findFirst({
		where: eq(regions.id, params.id),
		with: {
			state: true,
			governor: {
				with: {
					user: {
						with: {
							profile: true
						}
					}
				}
			}
		}
	});

	if (!region) {
		error(404, "Region not found");
	}

	return {
		region: {
			id: region.id,
			name: region.name,
			avatar: region.avatar,
			background: region.background,
			description: region.description,
			population: region.population,
			rating: region.rating,
			development: region.development,
			infrastructure: region.infrastructure,
			economy: region.economy,
			createdAt: region.createdAt
		},
		state: region.state
			? {
					id: region.state.id,
					name: region.state.name
				}
			: null,
		governor: region.governor
			? {
					userId: region.governor.userId,
					name: region.governor.user.profile?.name,
					avatar: region.governor.user.profile?.avatar,
					appointedAt: region.governor.appointedAt,
					term: region.governor.term
				}
			: null
	};
};
