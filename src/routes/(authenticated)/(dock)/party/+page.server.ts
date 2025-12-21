// src/routes/party/+page.server.ts
import { db } from "$lib/server/db";
import { politicalParties, residences, files } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account;

	if (!account) {
		throw error(401, "You must be logged in to view parties");
	}

	// Get user's primary residence to determine their state
	const residence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id),
		with: {
			region: {
				with: {
					state: true
				}
			}
		}
	});

	if (!residence) {
		throw error(400, "You must have a residence to view parties");
	}

	const stateId = residence.region.stateId;
	const stateName = residence.region.state!.name;

	// Get all parties in the user's state
	const parties = await db.query.politicalParties.findMany({
		where: eq(politicalParties.stateId, stateId!),
		with: {
			state: true
		},
		orderBy: (politicalParties, { desc }) => [desc(politicalParties.memberCount)]
	});

	// Get logo URLs for parties
	const partiesWithLogos = await Promise.all(
		parties.map(async (party) => {
			let logoUrl = null;
			if (party.logo) {
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, party.logo)
				});
				if (logoFile) {
					logoUrl = `https://your-cdn.com/${logoFile.key}`;
				}
			}

			return {
				id: party.id,
				name: party.name,
				abbreviation: party.abbreviation,
				color: party.color,
				logoUrl,
				ideology: party.ideology,
				description: party.description,
				memberCount: party.memberCount
			};
		})
	);

	return {
		parties: partiesWithLogos,
		stateName
	};
};
