// src/routes/company/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, companies, factories, factoryWorkers, regions, states } from "$lib/server/schema";
import { eq, count, sql } from "drizzle-orm";
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
			factoryCount: companyFactories.length,
			workerCount: totalWorkers
		};
	}

	// Get all companies with their stats
	const allCompanies = await db
		.select({
			id: companies.id,
			name: companies.name,
			logo: companies.logo,
			foundedAt: companies.foundedAt,
			ownerId: companies.ownerId,
			ownerName: accounts.id // fixme: get username instead of id
		})
		.from(companies)
		.leftJoin(accounts, eq(companies.ownerId, accounts.id));

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

			return {
				id: company.id,
				name: company.name,
				logo: company.logo,
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
