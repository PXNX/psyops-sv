// src/routes/company/[id]/+page.server.ts
import { db } from "$lib/server/db";
import { accounts, companies, factories, factoryWorkers, regions, states } from "$lib/server/schema";
import { eq, count } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const companyId = parseInt(params.id);

	// Get company details
	const [company] = await db
		.select({
			id: companies.id,
			name: companies.name,
			logo: companies.logo,
			description: companies.description,
			foundedAt: companies.foundedAt,
			ownerId: companies.ownerId,
			ownerEmail: accounts.email
		})
		.from(companies)
		.innerJoin(accounts, eq(companies.ownerId, accounts.id))
		.where(eq(companies.id, companyId));

	if (!company) {
		throw error(404, "Company not found");
	}

	// Get owner profile name
	const [ownerProfile] = await db.query.userProfiles.findMany({
		where: (profiles, { eq }) => eq(profiles.accountId, company.ownerId)
	});

	// Check if current user is the owner
	const isOwner = company.ownerId === account.id;

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
			regionId: factories.regionId,

			stateId: regions.stateId,
			stateName: states.name
		})
		.from(factories)
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.innerJoin(states, eq(regions.stateId, states.id))
		.where(eq(factories.companyId, companyId));

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

	// Calculate total workers
	const totalWorkers = factoriesWithCounts.reduce((sum, f) => sum + f.workerCount, 0);

	// Get unique states and regions
	const uniqueStates = Array.from(
		new Map(
			companyFactories.filter((f) => f.stateId).map((f) => [f.stateId, { id: f.stateId!, name: f.stateName! }])
		).values()
	);

	const uniqueRegions = Array.from(new Map(companyFactories.map((f) => [f.regionId, { id: f.regionId }])).values());

	return {
		company: {
			...company,
			ownerName: ownerProfile?.name || null,
			foundedAt: company.foundedAt.toISOString()
		},
		isOwner,
		factories: factoriesWithCounts,
		totalWorkers,
		uniqueStates,
		uniqueRegions
	};
};
