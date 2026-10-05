// src/routes/company/+page.server.ts
import { db } from "#lib/server/db.js";
import {
	accounts,
	companies,
	factories,
	factoryWorkers,
	regions,
	states,
	userProfiles,
	partyMembers,
	politicalParties
} from "#lib/server/schema.js";
import { eq, count, inArray } from "drizzle-orm";
import { getLogoUrl } from "#lib/server/backblaze.js";
import type { PageServerLoad } from "./$types";

async function countWorkers(factoryIds: number[]) {
	const counts = await Promise.all(
		factoryIds.map((id) => db.select({ count: count() }).from(factoryWorkers).where(eq(factoryWorkers.factoryId, id)))
	);
	return counts.reduce((sum, [workerCount]) => sum + (workerCount?.count || 0), 0);
}

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// User's company stats, the company list and the state filter are independent, so fetch them in parallel
	const userCompanyPromise = (async () => {
		// Get user's company if they have one
		const [userCompany] = await db
			.select({
				id: companies.id,
				name: companies.name,
				logo: companies.logo,
				foundedAt: companies.foundedAt
			})
			.from(companies)
			.where(eq(companies.ownerId, account.id));

		if (!userCompany) return null;

		const [companyFactories, logo] = await Promise.all([
			db.select({ id: factories.id }).from(factories).where(eq(factories.companyId, userCompany.id)),
			getLogoUrl(userCompany.logo)
		]);
		const totalWorkers = await countWorkers(companyFactories.map((f) => f.id));

		return {
			...userCompany,
			logo,
			factoryCount: companyFactories.length,
			workerCount: totalWorkers
		};
	})();

	const companiesPromise = (async () => {
		// Get all companies with their stats and owner profiles
		const allCompanies = await db
			.select({
				id: companies.id,
				name: companies.name,
				logo: companies.logo,
				foundedAt: companies.foundedAt,
				ownerId: companies.ownerId,
				ownerName: userProfiles.name
			})
			.from(companies)
			.leftJoin(accounts, eq(companies.ownerId, accounts.id))
			.leftJoin(userProfiles, eq(companies.ownerId, userProfiles.accountId));

		// Current party (abbreviation + color) for each owner, for the party tag next to their name.
		const ownerIds = Array.from(new Set(allCompanies.map((c) => c.ownerId)));
		const partyByOwnerIdPromise = (async () => {
			const partyByOwnerId = new Map<string, { abbreviation: string | null; color: string }>();
			if (ownerIds.length > 0) {
				const membershipRows = await db
					.select({
						userId: partyMembers.userId,
						abbreviation: politicalParties.abbreviation,
						color: politicalParties.color
					})
					.from(partyMembers)
					.innerJoin(politicalParties, eq(partyMembers.partyId, politicalParties.id))
					.where(inArray(partyMembers.userId, ownerIds));

				for (const row of membershipRows) {
					partyByOwnerId.set(row.userId, { abbreviation: row.abbreviation, color: row.color });
				}
			}
			return partyByOwnerId;
		})();

		// Get factory counts and states for each company
		const statsPromise = Promise.all(
			allCompanies.map(async (company) => {
				const [companyFactories, logoUrl] = await Promise.all([
					db
						.select({
							id: factories.id,
							regionId: factories.regionId,
							stateId: regions.stateId,
							stateName: states.name
						})
						.from(factories)
						.innerJoin(regions, eq(factories.regionId, regions.id))
						.innerJoin(states, eq(regions.stateId, states.id))
						.where(eq(factories.companyId, company.id)),
					getLogoUrl(company.logo)
				]);

				// Get worker count
				const totalWorkers = await countWorkers(companyFactories.map((f) => f.id));

				// Get unique states
				const uniqueStates = Array.from(
					new Map(
						companyFactories.filter((f) => f.stateId).map((f) => [f.stateId, { id: f.stateId!, name: f.stateName! }])
					).values()
				);

				return { company, logoUrl, factoryCount: companyFactories.length, totalWorkers, uniqueStates };
			})
		);

		const [partyByOwnerId, stats] = await Promise.all([partyByOwnerIdPromise, statsPromise]);

		return stats.map(({ company, logoUrl, factoryCount, totalWorkers, uniqueStates }) => ({
			id: company.id,
			name: company.name,
			logo: logoUrl,
			foundedAt: company.foundedAt.toISOString(),
			ownerId: company.ownerId,
			ownerName: company.ownerName || null,
			ownerPartyAbbreviation: partyByOwnerId.get(company.ownerId)?.abbreviation ?? null,
			ownerPartyColor: partyByOwnerId.get(company.ownerId)?.color ?? null,
			factoryCount,
			workerCount: totalWorkers,
			states: uniqueStates
		}));
	})();

	const [userCompanyStats, companiesWithStats, allStates] = await Promise.all([
		userCompanyPromise,
		companiesPromise,
		// Get all states for filter
		db
			.select({
				id: states.id,
				name: states.name
			})
			.from(states)
			.orderBy(states.name)
	]);

	return {
		userCompany: userCompanyStats,
		companies: companiesWithStats,
		states: allStates
	};
};
