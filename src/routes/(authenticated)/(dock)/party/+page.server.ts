// src/routes/party/+page.server.ts
import { db } from "#lib/server/db.js";
import { politicalParties, residences, userProfiles } from "#lib/server/schema.js";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { PARTY_IDEOLOGIES } from "#lib/config/index.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	const account = locals.account!;

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
		throw redirect(303, "/welcome/region");
	}

	const stateId = residence.region.stateId;
	const stateName = residence.region.state!.name;

	const scope = url.searchParams.get("scope") === "global" ? "global" : "state";
	const sort = url.searchParams.get("sort") === "age" ? "age" : "size";
	const ideology = url.searchParams.get("ideology") || null;

	const parties = await db.query.politicalParties.findMany({
		where: (politicalParties, { eq, and }) => {
			const conditions = [];
			if (scope === "state") conditions.push(eq(politicalParties.stateId, stateId!));
			if (ideology) conditions.push(eq(politicalParties.ideology, ideology));
			return conditions.length ? and(...conditions) : undefined;
		},
		with: {
			state: true,
			// Only party membership counts are needed here, not full member rows.
			members: { columns: { id: true, userId: true, role: true } }
		}
	});

	// Each party's leader, shown on its card.
	const leaderIds = parties.flatMap((p) => p.members.filter((m) => m.role === "leader").map((m) => m.userId));
	const leaderProfiles = leaderIds.length
		? await db
				.select({ accountId: userProfiles.accountId, name: userProfiles.name, logo: userProfiles.logo })
				.from(userProfiles)
				.where(inArray(userProfiles.accountId, leaderIds))
		: [];
	const leaderOf = async (party: (typeof parties)[number]) => {
		const id = party.members.find((m) => m.role === "leader")?.userId;
		const profile = leaderProfiles.find((p) => p.accountId === id);
		return id && profile ? { id, name: profile.name, avatar: await getLogoUrl(profile.logo) } : null;
	};

	const partiesWithLogos = await Promise.all(
		parties.map(async (party) => ({
			id: party.id,
			name: party.name,
			abbreviation: party.abbreviation,
			color: party.color,
			logoUrl: await getLogoUrl(party.logo),
			ideology: party.ideology,
			description: party.description,
			memberCount: party.members.length,
			foundedAt: party.foundedAt,
			stateName: party.state?.name ?? null,
			leader: await leaderOf(party)
		}))
	);

	partiesWithLogos.sort((a, b) =>
		sort === "age" ? new Date(a.foundedAt).getTime() - new Date(b.foundedAt).getTime() : b.memberCount - a.memberCount
	);

	return {
		parties: partiesWithLogos,
		stateName,
		scope,
		sort,
		ideology,
		ideologies: PARTY_IDEOLOGIES
	};
};
