// src/routes/factory/[id]/edit/+page.server.ts
import { db } from "$lib/server/db";
import {
	factories,
	companies,
	regions,
	states,
	factoryWorkers,
	userWallets,
	factoryCreationCooldown
} from "$lib/server/schema";
import { redirect, error, fail } from "@sveltejs/kit";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { editFactorySchema } from "./schema";

// Configuration constants
const EDIT_COST = 5000;
const COOLDOWN_HOURS = 24;

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const factoryId = parseInt(params.id);

	// Get factory with all related data in one efficient query
	const factory = await db.query.factories.findFirst({
		where: eq(factories.id, factoryId),
		with: {
			company: {
				with: {
					owner: {
						with: {
							profile: true
						}
					}
				}
			},
			region: {
				with: {
					state: true
				}
			}
		}
	});

	if (!factory) {
		throw error(404, "Factory not found");
	}

	// Check if user is the company owner
	if (factory.company.ownerId !== account.id) {
		throw error(403, "Only the company owner can edit the factory");
	}

	// Get user wallet
	let [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

	// Create wallet if it doesn't exist
	if (!wallet) {
		[wallet] = await db
			.insert(userWallets)
			.values({
				userId: account.id,
				balance: 10000
			})
			.returning();
	}

	// Check if factory is on cooldown (per user)
	const cooldown = await db.query.factoryCreationCooldown.findFirst({
		where: eq(factoryCreationCooldown.userId, account.id)
	});

	let isOnCooldown = false;
	let cooldownEndsAt: string | null = null;

	if (cooldown) {
		const cooldownEnd = new Date(cooldown.lastCreationAt);
		cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

		if (cooldownEnd > new Date()) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd.toISOString();
		}
	}

	// Check if user wallet can afford the edit
	const canAfford = Number(wallet.balance) >= EDIT_COST;

	// OPTIMIZATION: Get worker count for this factory
	const [workerCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(factoryWorkers)
		.where(eq(factoryWorkers.factoryId, factoryId));

	// OPTIMIZATION: Get wage statistics for region - single query
	// Get highest wage in the region and some additional stats
	const regionalWages = await db
		.select({
			factoryId: factories.id,
			factoryName: factories.name,
			wage: factories.workerWage,
			factoryType: factories.factoryType
		})
		.from(factories)
		.where(
			and(
				eq(factories.regionId, factory.regionId),
				sql`${factories.id} != ${factoryId}` // Exclude current factory
			)
		)
		.orderBy(desc(factories.workerWage))
		.limit(10);

	const highestWage = regionalWages.length > 0 ? Number(regionalWages[0].wage) : null;
	const averageWage =
		regionalWages.length > 0
			? Math.round(regionalWages.reduce((sum, f) => sum + Number(f.wage), 0) / regionalWages.length)
			: null;

	// Get competitive position (how many factories pay more)
	const factoriesPayingMore = regionalWages.filter((f) => Number(f.wage) > Number(factory.workerWage)).length;
	const totalFactoriesInRegion = regionalWages.length + 1; // +1 for current factory

	// Populate form with existing data
	const form = await superValidate(
		{
			name: factory.name,
			workerWage: Number(factory.workerWage)
		},
		valibot(editFactorySchema)
	);

	return {
		form,
		factory: {
			id: factory.id,
			name: factory.name,
			factoryType: factory.factoryType,
			resourceOutput: factory.resourceOutput,
			productOutput: factory.productOutput,
			maxWorkers: factory.maxWorkers,
			workerWage: Number(factory.workerWage),
			productionRate: factory.productionRate,
			currentWorkers: Number(workerCount.count),
			region: {
				id: factory.region.id,
				stateId: factory.region.stateId,
				stateName: factory.region.state?.name
			},
			company: {
				id: factory.company.id,
				name: factory.company.name
			}
		},
		wageStats: {
			highestInRegion: highestWage,
			averageInRegion: averageWage,
			factoriesPayingMore,
			totalFactoriesInRegion,
			topFactories: regionalWages.slice(0, 5).map((f) => ({
				name: f.factoryName,
				wage: Number(f.wage),
				type: f.factoryType
			}))
		},
		isOnCooldown,
		cooldownEndsAt,
		canAfford,
		userBalance: Number(wallet.balance),
		editCost: EDIT_COST,
		cooldownHours: COOLDOWN_HOURS
	};
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const account = locals.account!;
		const factoryId = parseInt(params.id);
		const form = await superValidate(request, valibot(editFactorySchema));

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
			cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

			if (cooldownEnd > new Date()) {
				const minutesLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60));
				return message(form, `Please wait ${minutesLeft} minutes before editing again`, { status: 400 });
			}
		}

		// Check user wallet has sufficient funds
		const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, account.id));

		if (!wallet || Number(wallet.balance) < EDIT_COST) {
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
						balance: sql`${userWallets.balance} - ${EDIT_COST}`,
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
