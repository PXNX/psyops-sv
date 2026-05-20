// src/routes/company/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, companies, factories, factoryWorkers, regions, states, userProfiles } from "$lib/server/schema";
import { eq, count } from "drizzle-orm";
import { getLogoUrl } from "$lib/server/backblaze";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

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

	// Get user's company stats if they have one
	let userCompanyStats = null;
	if (userCompany) {
		const companyFactories = await db
			.select({ id: factories.id })
			.from(factories)
			.where(eq(factories.companyId, userCompany.id));

		let totalWorkers = 0;
		for (const factory of companyFactories) {
			const [workerCount] = await db
				.select({ count: count() })
				.from(factoryWorkers)
				.where(eq(factoryWorkers.factoryId, factory.id));
			totalWorkers += workerCount?.count || 0;
		}

		userCompanyStats = {
			...userCompany,
			logo: await getLogoUrl(userCompany.logo),
			factoryCount: companyFactories.length,
			workerCount: totalWorkers
		};
	}

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

	// Get factory counts and states for each company
	const companiesWithStats = await Promise.all(
		allCompanies.map(async (company) => {
			const companyFactories = await db
				.select({
					id: factories.id,
					regionId: factories.regionId,
					stateId: regions.stateId,
					stateName: states.name
				})
				.from(factories)
				.innerJoin(regions, eq(factories.regionId, regions.id))
				.innerJoin(states, eq(regions.stateId, states.id))
				.where(eq(factories.companyId, company.id));

			// Get worker count
			let totalWorkers = 0;
			for (const factory of companyFactories) {
				const [workerCount] = await db
					.select({ count: count() })
					.from(factoryWorkers)
					.where(eq(factoryWorkers.factoryId, factory.id));
				totalWorkers += workerCount?.count || 0;
			}

			// Get unique states
			const uniqueStates = Array.from(
				new Map(
					companyFactories.filter((f) => f.stateId).map((f) => [f.stateId, { id: f.stateId!, name: f.stateName! }])
				).values()
			);

			const logoUrl = await getLogoUrl(company.logo);

			return {
				id: company.id,
				name: company.name,
				logo: logoUrl,
				foundedAt: company.foundedAt.toISOString(),
				ownerId: company.ownerId,
				ownerName: company.ownerName || null,
				factoryCount: companyFactories.length,
				workerCount: totalWorkers,
				states: uniqueStates
			};
		})
	);

	// Get all states for filter
	const allStates = await db
		.select({
			id: states.id,
			name: states.name
		})
		.from(states)
		.orderBy(states.name);

	return {
		userCompany: userCompanyStats,
		companies: companiesWithStats,
		states: allStates
	};
};
