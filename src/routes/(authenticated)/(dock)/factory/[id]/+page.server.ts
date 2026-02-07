// src/routes/factory/[id]/+page.server.ts
import { db } from "$lib/server/db";
import {
	companies,
	companyBudgets,
	factories,
	factoryWorkers,
	files,
	regions,
	stateEnergy,
	states,
	userWallets
} from "$lib/server/schema";
import { getSignedDownloadUrl } from "$lib/server/backblaze";
import { calculateShiftStatus, collectWages, startWorkShift } from "$lib/server/service/factoryWork";
import { error, fail } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const factoryId = parseInt(params.id);

	if (isNaN(factoryId)) {
		throw error(404, "Factory not found");
	}

	// Get factory details with relations
	const [factory] = await db
		.select({
			id: factories.id,
			name: factories.name,
			factoryType: factories.factoryType,
			resourceOutput: factories.resourceOutput,
			productOutput: factories.productOutput,
			maxWorkers: factories.maxWorkers,
			workerWage: factories.workerWage,
			productionRate: factories.productionRate,
			createdAt: factories.createdAt,
			companyId: factories.companyId,
			companyName: companies.name,
			companyLogo: companies.logo,
			ownerId: companies.ownerId,
			regionId: factories.regionId,
			stateName: states.name,
			stateId: regions.stateId
		})
		.from(factories)
		.innerJoin(companies, eq(factories.companyId, companies.id))
		.innerJoin(regions, eq(factories.regionId, regions.id))
		.innerJoin(states, eq(regions.stateId, states.id))
		.where(eq(factories.id, factoryId));

	if (!factory) {
		throw error(404, "Factory not found");
	}

	// Get company budget
	const [companyBudget] = await db
		.select({
			balance: companyBudgets.balance
		})
		.from(companyBudgets)
		.where(eq(companyBudgets.companyId, factory.companyId));

	const canAffordWage = companyBudget ? companyBudget.balance >= factory.workerWage : false;

	// Get company logo URL if available
	let companyLogoUrl: string | null = null;
	if (factory.companyLogo) {
		const logoFile = await db.query.files.findFirst({
			where: eq(files.id, factory.companyLogo)
		});
		if (logoFile) {
			companyLogoUrl = await getSignedDownloadUrl(logoFile.key);
		}
	}

	// Get current workers count
	const [workerCount] = await db
		.select({
			count: sql<number>`count(*)::int`
		})
		.from(factoryWorkers)
		.where(eq(factoryWorkers.factoryId, factoryId));

	// Check if current user is working here
	const [currentUserJob] = await db
		.select({
			id: factoryWorkers.id,
			factoryId: factoryWorkers.factoryId,
			lastWorked: factoryWorkers.lastWorked,
			wageAtShiftStart: factoryWorkers.wageAtShiftStart
		})
		.from(factoryWorkers)
		.where(eq(factoryWorkers.userId, account.id));

	// Get state energy
	let stateEnergyData = null;
	if (factory.stateId) {
		[stateEnergyData] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, factory.stateId));
	}

	// Calculate shift status
	const shiftStatus = currentUserJob?.lastWorked
		? calculateShiftStatus(currentUserJob.lastWorked)
		: { canWork: true, isCurrentlyWorking: false, shiftProgress: 0, shiftEndsAt: null, hoursRemaining: 0 };

	const isWorkingHere = currentUserJob?.factoryId === factoryId;

	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	// Format output display
	const output = factory.resourceOutput
		? {
				type: "resource" as const,
				name: factory.resourceOutput,
				amount: factory.productionRate
			}
		: factory.productOutput
			? {
					type: "product" as const,
					name: factory.productOutput,
					amount: factory.productionRate
				}
			: null;

	return {
		factory,
		output,
		workers: workerCount.count,
		maxWorkers: factory.maxWorkers,
		currentUserJob,
		isWorkingHere,
		canWork: shiftStatus.canWork,
		isCurrentlyWorking: shiftStatus.isCurrentlyWorking && isWorkingHere,
		shiftProgress: isWorkingHere ? shiftStatus.shiftProgress : 0,
		shiftEndsAt: isWorkingHere ? shiftStatus.shiftEndsAt?.toISOString() || null : null,
		stateEnergy: stateEnergyData,
		wallet: wallet || { balance: 10000 },
		isOwner: factory.ownerId === account.id,
		companyLogoUrl,
		companyBudget: companyBudget?.balance || 0,
		canAffordWage,
		lockedWage: isWorkingHere && currentUserJob?.wageAtShiftStart ? currentUserJob.wageAtShiftStart : null
	};
};

export const actions: Actions = {
	startShift: async ({ params, locals }) => {
		const account = locals.account!;
		const factoryId = parseInt(params.id);

		if (isNaN(factoryId)) {
			return fail(400, { error: "Invalid factory ID" });
		}

		const result = await startWorkShift(account.id, factoryId);

		if (!result.success) {
			return fail(400, { error: result.error });
		}

		return { success: true, message: result.message };
	},

	collectPayment: async ({ params, locals }) => {
		const account = locals.account!;
		const factoryId = parseInt(params.id);

		if (isNaN(factoryId)) {
			return fail(400, { error: "Invalid factory ID" });
		}

		const result = await collectWages(account.id, factoryId);

		if (!result.success) {
			return fail(400, {
				error: result.error,
				companyBankrupt: result.companyBankrupt,
				owedAmount: result.owedAmount,
				companyBalance: result.companyBalance
			});
		}

		return {
			success: true,
			message: result.message,
			earned: result.earned,
			grossWage: result.grossWage,
			taxPaid: result.taxPaid,
			resourcesProduced: result.resourcesProduced
		};
	}
};
