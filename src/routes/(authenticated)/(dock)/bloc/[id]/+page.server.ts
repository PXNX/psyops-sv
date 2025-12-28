// src/routes/bloc/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { blocs, states, presidents, blocRecommendedTemplates, militaryUnitTemplates } from "$lib/server/schema";
import { error } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const blocId = parseInt(params.id);

	// Get bloc details
	const [bloc] = await db
		.select({
			id: blocs.id,
			name: blocs.name,
			color: blocs.color,
			description: blocs.description,
			createdAt: blocs.createdAt
		})
		.from(blocs)
		.where(eq(blocs.id, blocId))
		.limit(1);

	if (!bloc) {
		error(404, "Bloc not found");
	}

	// Get member states with their presidents
	const memberStates = await db
		.select({
			id: states.id,
			name: states.name,
			logo: states.logo,
			population: states.population,
			rating: states.rating,
			presidentId: presidents.id,
			presidentUserId: presidents.userId,
			presidentName: sql<string>`up.name`,
			presidentTerm: presidents.term,
			presidentElectedAt: presidents.electedAt
		})
		.from(states)
		.leftJoin(presidents, eq(states.id, presidents.stateId))
		.leftJoin(sql`user_profiles up`, sql`up.account_id = ${presidents.userId}`)
		.where(eq(states.blocId, blocId))
		.orderBy(states.name);

	// Get bloc leader (first president of member states, or you can implement specific leader logic)
	const blocLeader = memberStates.find((s) => s.presidentUserId)?.presidentUserId || null;

	// Check if current user is the bloc leader
	const isLeader = locals.account?.id === blocLeader;

	// Get recommended unit templates
	const recommendedTemplates = await db
		.select({
			templateId: blocRecommendedTemplates.templateId,
			unitType: militaryUnitTemplates.unitType,
			displayName: militaryUnitTemplates.displayName,
			description: militaryUnitTemplates.description
		})
		.from(blocRecommendedTemplates)
		.leftJoin(militaryUnitTemplates, eq(blocRecommendedTemplates.templateId, militaryUnitTemplates.id))
		.where(eq(blocRecommendedTemplates.blocId, blocId));

	// Calculate total population and states
	const totalPopulation = memberStates.reduce((sum, state) => sum + (state.population || 0), 0);
	const totalStates = memberStates.length;

	return {
		bloc: {
			id: bloc.id,
			name: bloc.name,
			color: bloc.color,
			description: bloc.description,
			createdAt: bloc.createdAt
		},
		memberStates: memberStates.map((state) => ({
			id: state.id,
			name: state.name,
			logo: state.logo,
			population: state.population || 0,
			rating: state.rating || 0,
			president: state.presidentUserId
				? {
						userId: state.presidentUserId,
						name: state.presidentName,
						term: state.presidentTerm,
						electedAt: state.presidentElectedAt
					}
				: null
		})),
		recommendedTemplates: recommendedTemplates.map((t) => ({
			id: t.templateId,
			unitType: t.unitType,
			displayName: t.displayName,
			description: t.description
		})),
		totalPopulation,
		totalStates,
		isLeader,
		blocLeaderId: blocLeader
	};
};
