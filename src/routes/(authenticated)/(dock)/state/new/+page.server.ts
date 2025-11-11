// src/routes/(authenticated)/(dock)/state/new/+page.server.ts
import { db } from "$lib/server/db";
import { presidents, regions, states } from "$lib/server/schema";
import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { superValidate } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import type { Actions, PageServerLoad } from "./$types";
import { foundStateSchema } from "./schema";

export const load: PageServerLoad = async ({ locals }) => {
	// Get all available regions
	const availableRegions = await db.query.regions.findMany({
		with: {
			state: true
		}
	});

	// Filter regions that don't have a state yet
	const unclaimedRegions = availableRegions.filter((region) => !region.state);

	const form = await superValidate(valibot(foundStateSchema));

	return {
		form,
		regions: unclaimedRegions.map((region) => ({
			id: region.id,
			name: region.name,
			avatar: region.avatar
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, valibot(foundStateSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const session = await locals.auth();
		if (!session?.user?.id) {
			return fail(401, { form });
		}

		try {
			// Check if region exists and is unclaimed
			const region = await db.query.regions.findFirst({
				where: eq(regions.id, form.data.regionId),
				with: {
					state: true
				}
			});

			if (!region) {
				return fail(404, {
					form,
					message: "Region not found"
				});
			}

			if (region.state) {
				return fail(400, {
					form,
					message: "This region already belongs to a state"
				});
			}

			// Create the new state
			const [newState] = await db
				.insert(states)
				.values({
					name: form.data.name,
					avatar: form.data.logo || null,
					background: null,
					description: form.data.description || null,
					mapColor: form.data.mapColor,
					population: region.population || 0,
					rating: 0
				})
				.returning();

			// Update the region to belong to this state
			await db.update(regions).set({ stateId: newState.id }).where(eq(regions.id, form.data.regionId));

			// Make the founding user the president
			await db.insert(presidents).values({
				userId: session.user.id,
				stateId: newState.id,
				term: 1
			});

			return {
				form,
				success: true,
				stateId: newState.id
			};
		} catch (error) {
			console.error("Error founding state:", error);
			return fail(500, {
				form,
				message: "Failed to found state. Please try again."
			});
		}
	}
};
