// src/routes/factory/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import {
	companies,
	companyBudgets,
	factories,
	factoryCreationCooldown,
	factoryWorkers,
	files,
	regions,
	stateEnergy,
	states,
	userWallets
} from "#lib/server/schema.js";
import { getSignedDownloadUrl } from "#lib/server/backblaze.js";
import { calculateShiftStatus, collectWages, startWorkShift } from "#lib/server/service/factoryWork.js";
import { getEmbargoReason } from "#lib/server/embargo.js";
import { error, fail } from "@sveltejs/kit";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { editFactorySchema } from "./schema";

// Config for the "Edit Factory" bottom sheet.
const FACTORY_EDIT_COST = 5000;
const FACTORY_EDIT_COOLDOWN_HOURS = 24;

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

	const isOwner = factory.ownerId === account.id;

	// Data for the "Edit Factory" bottom sheet — only needed for the company owner.
	const factoryEditPromise = (async () => {
		if (!isOwner) {
			return {
				editForm: null as Awaited<ReturnType<typeof superValidate<typeof editFactorySchema>>> | null,
				wageStats: {
					highestInRegion: null as number | null,
					averageInRegion: null as number | null,
					factoriesPayingMore: 0,
					totalFactoriesInRegion: 0
				},
				isOnCooldown: false,
				cooldownEndsAt: null as string | null
			};
		}

		const [cooldown, regionalWages, form] = await Promise.all([
			db.query.factoryCreationCooldown.findFirst({
				where: eq(factoryCreationCooldown.userId, account.id)
			}),
			db
				.select({ wage: factories.workerWage })
				.from(factories)
				.where(and(eq(factories.regionId, factory.regionId), sql`${factories.id} != ${factoryId}`))
				.orderBy(desc(factories.workerWage))
				.limit(10),
			superValidate(
				{
					name: factory.name,
					workerWage: Number(factory.workerWage)
				},
				valibot(editFactorySchema)
			)
		]);

		let isOnCooldown = false;
		let cooldownEndsAt: string | null = null;
		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastCreationAt);
			cooldownEnd.setHours(cooldownEnd.getHours() + FACTORY_EDIT_COOLDOWN_HOURS);
			if (cooldownEnd > new Date()) {
				isOnCooldown = true;
				cooldownEndsAt = cooldownEnd.toISOString();
			}
		}

		const highestInRegion = regionalWages.length > 0 ? Number(regionalWages[0].wage) : null;
		const averageInRegion =
			regionalWages.length > 0
				? Math.round(regionalWages.reduce((sum, f) => sum + Number(f.wage), 0) / regionalWages.length)
				: null;
		const factoriesPayingMore = regionalWages.filter((f) => Number(f.wage) > Number(factory.workerWage)).length;

		return {
			editForm: form,
			wageStats: {
				highestInRegion,
				averageInRegion,
				factoriesPayingMore,
				totalFactoriesInRegion: regionalWages.length + 1
			},
			isOnCooldown,
			cooldownEndsAt
		};
	})();

	// Everything below only depends on the factory, so fetch it in parallel
	const [
		embargoReason,
		[companyBudget],
		companyLogoUrl,
		[workerCount],
		[currentUserJob],
		stateEnergyData,
		[wallet],
		factoryEditData
	] = await Promise.all([
			// Check whether an embargo between the company's headquarters state and the
			// viewer's state blocks starting a new shift here.
			(async () => {
				const [companyHq] = await db
					.select({ stateId: regions.stateId })
					.from(companies)
					.leftJoin(regions, eq(companies.regionId, regions.id))
					.where(eq(companies.id, factory.companyId));
				return getEmbargoReason(companyHq?.stateId ?? null, account.id);
			})(),
			// Get company budget
			db
				.select({
					balance: companyBudgets.balance
				})
				.from(companyBudgets)
				.where(eq(companyBudgets.companyId, factory.companyId)),
			// Get company logo URL if available
			(async (): Promise<string | null> => {
				if (!factory.companyLogo) return null;
				const logoFile = await db.query.files.findFirst({
					where: eq(files.id, factory.companyLogo)
				});
				return logoFile ? getSignedDownloadUrl(logoFile.key) : null;
			})(),
			// Get current workers count
			db
				.select({
					count: sql<number>`count(*)::int`
				})
				.from(factoryWorkers)
				.where(eq(factoryWorkers.factoryId, factoryId)),
			// Check if current user is working here
			db
				.select({
					id: factoryWorkers.id,
					factoryId: factoryWorkers.factoryId,
					lastWorked: factoryWorkers.lastWorked,
					wageAtShiftStart: factoryWorkers.wageAtShiftStart
				})
				.from(factoryWorkers)
				.where(eq(factoryWorkers.userId, account.id)),
			// Get state energy
			(async () => {
				if (!factory.stateId) return null;
				const [energy] = await db.select().from(stateEnergy).where(eq(stateEnergy.stateId, factory.stateId));
				return energy;
			})(),
			db.select().from(userWallets).where(eq(userWallets.userId, account.id)),
			factoryEditPromise
		]);

	const canAffordWage = companyBudget ? companyBudget.balance >= factory.workerWage : false;

	// Calculate shift status
	const shiftStatus = currentUserJob?.lastWorked
		? calculateShiftStatus(currentUserJob.lastWorked)
		: { canWork: true, isCurrentlyWorking: false, shiftProgress: 0, shiftEndsAt: null, hoursRemaining: 0 };

	const isWorkingHere = currentUserJob?.factoryId === factoryId;

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
		isOwner,
		companyLogoUrl,
		companyBudget: companyBudget?.balance || 0,
		canAffordWage,
		lockedWage: isWorkingHere && currentUserJob?.wageAtShiftStart ? currentUserJob.wageAtShiftStart : null,
		embargoReason,
		// Edit Factory bottom sheet data (only populated for the company owner)
		editForm: factoryEditData.editForm,
		wageStats: factoryEditData.wageStats,
		isFactoryEditOnCooldown: factoryEditData.isOnCooldown,
		factoryEditCooldownEndsAt: factoryEditData.cooldownEndsAt,
		factoryEditCost: FACTORY_EDIT_COST,
		factoryEditCooldownHours: FACTORY_EDIT_COOLDOWN_HOURS,
		userBalance: Number(wallet?.balance ?? 0),
		canAffordFactoryEdit: Number(wallet?.balance ?? 0) >= FACTORY_EDIT_COST
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
	},

	updateFactory: async ({ request, params, locals }) => {
		const account = locals.account!;
		const factoryId = parseInt(params.id);
		const form = await superValidate(request, valibot(editFactorySchema));

		if (isNaN(factoryId)) {
			return message(form, "Invalid factory ID", { status: 400 });
		}

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, workerWage } = form.data;

		// Get factory and verify ownership
		const factory = await db.query.factories.findFirst({
			where: eq(factories.id, factoryId),
			with: {
				company: true
			}
		});

		if (!factory) {
			return message(form, "Factory not found", { status: 404 });
		}

		if (factory.company.ownerId !== account.id) {
			return message(form, "Only the company owner can edit the factory", { status: 403 });
		}

		// Check cooldown
		const cooldown = await db.query.factoryCreationCooldown.findFirst({
			where: eq(factoryCreationCooldown.userId, account.id)
		});

		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastCreationAt);
			cooldownEnd.setHours(cooldownEnd.getHours() + FACTORY_EDIT_COOLDOWN_HOURS);

			if (cooldownEnd > new Date()) {
				const minutesLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60));
				return message(form, `Please wait ${minutesLeft} minutes before editing again`, { status: 400 });
			}
		}

		// Check user wallet has sufficient funds
		const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

		if (!wallet || Number(wallet.balance) < FACTORY_EDIT_COST) {
			return message(form, "Insufficient funds to edit factory", { status: 400 });
		}

		// Check if new name conflicts with another factory in the same company
		if (name !== factory.name) {
			const existingFactory = await db.query.factories.findFirst({
				where: and(
					eq(factories.companyId, factory.companyId),
					eq(factories.name, name),
					sql`${factories.id} != ${factoryId}`
				)
			});

			if (existingFactory) {
				return message(form, "A factory with this name already exists in your company", { status: 400 });
			}
		}

		try {
			// Use a transaction for atomicity
			await db.transaction(async (tx) => {
				// Deduct cost from user wallet
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} - ${FACTORY_EDIT_COST}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));

				// Update factory
				await tx
					.update(factories)
					.set({
						name,
						workerWage
					})
					.where(eq(factories.id, factoryId));

				// Update or create cooldown
				if (cooldown) {
					await tx
						.update(factoryCreationCooldown)
						.set({
							lastCreationAt: new Date()
						})
						.where(eq(factoryCreationCooldown.userId, account.id));
				} else {
					await tx.insert(factoryCreationCooldown).values({
						userId: account.id,
						lastCreationAt: new Date()
					});
				}
			});

			return message(form, "Factory updated successfully!");
		} catch (err) {
			console.error("Update factory error:", err);
			return message(form, "Failed to update factory", { status: 500 });
		}
	}
};
