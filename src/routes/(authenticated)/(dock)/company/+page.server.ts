// src/routes/company/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, companies, factories, factoryWorkers, regions } from "$lib/server/schema";
import { eq, count } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Get user's company
	const [company] = await db
		.select({
			id: companies.id,
			name: companies.name,
			logo: companies.logo,
			description: companies.description,
			foundedAt: companies.foundedAt,
			ownerEmail: accounts.email
		})
		.from(companies)
		.innerJoin(accounts, eq(companies.ownerId, accounts.id))
		.where(eq(companies.ownerId, account.id));

	if (!company) {
		return {
			company: null,
			factories: [],
			totalWorkers: 0
		};
	}

	// Get company's factories with region info and worker counts
	const companyFactories = await db
		.select({
			id: factories.id,
			name: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			productOutput: factories.productOutput,
			maxWorkers: factories.maxWorkers,
			workerWage: factories.workerWage,
			regionName: regions.name,
			regionId: factories.regionId
		})
		.from(factories)
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.where(eq(factories.companyId, company.id));

	// Get worker counts for each factory
	const factoriesWithCounts = await Promise.all(
		companyFactories.map(async (factory) => {
			const [workerCount] = await db
				.select({ count: count() })
				.from(factoryWorkers)
				.where(eq(factoryWorkers.factoryId, factory.id));

			return {
				...factory,
				workerCount: workerCount?.count || 0
			};
		})
	);

	// Calculate total workers across all factories
	const totalWorkers = factoriesWithCounts.reduce((sum, f) => sum + f.workerCount, 0);

	return {
		company,
		factories: factoriesWithCounts,
		totalWorkers
	};
};
