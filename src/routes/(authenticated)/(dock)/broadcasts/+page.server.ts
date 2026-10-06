// src/routes/(authenticated)/(dock)/broadcasts/+page.server.ts
import { db } from "#lib/server/db.js";
import { broadcasts, residences, regions, partyMembers } from "#lib/server/schema.js";
import { eq, and, or, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	const [residence, membership] = await Promise.all([
		db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
		}),
		db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		})
	]);

	let stateId: number | null = null;
	let blocId: number | null = null;
	if (residence) {
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, residence.regionId),
			with: { state: true }
		});
		stateId = region?.stateId ?? null;
		blocId = region?.state?.blocId ?? null;
	}

	const conditions = [eq(broadcasts.broadcastType, "system")];
	if (stateId) conditions.push(and(eq(broadcasts.broadcastType, "state"), eq(broadcasts.stateId, stateId))!);
	if (membership) conditions.push(and(eq(broadcasts.broadcastType, "party"), eq(broadcasts.partyId, membership.partyId))!);
	if (blocId) conditions.push(and(eq(broadcasts.broadcastType, "bloc"), eq(broadcasts.blocId, blocId))!);

	const history = await db.query.broadcasts.findMany({
		where: or(...conditions),
		orderBy: [desc(broadcasts.createdAt)],
		limit: 50,
		with: {
			issuer: { with: { profile: true } },
			state: true,
			party: true,
			bloc: true
		}
	});

	return {
		broadcasts: history.map((b) => ({
			id: b.id,
			broadcastType: b.broadcastType,
			title: b.title,
			content: b.content,
			isActive: b.isActive,
			createdAt: b.createdAt,
			issuerName: b.issuer?.profile?.name ?? null,
			scopeName: b.state?.name ?? b.party?.name ?? b.bloc?.name ?? null
		}))
	};
};
