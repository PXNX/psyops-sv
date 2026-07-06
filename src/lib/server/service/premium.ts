// src/lib/server/service/premium.ts
// Premium membership: granting, purchasing, gifting and the automation job that
// performs production, military training and factory work for premium members.
import { db } from "$lib/server/db";
import {
	userProfiles,
	userWallets,
	resourceInventory,
	productInventory,
	productionQueue,
	factoryWorkers,
	militaryUnits,
	residences,
	regions,
	userTravels,
	militaryUnitTypeEnum
} from "$lib/server/schema";
import {
	PREMIUM_PLANS,
	isPremiumActive,
	isPremiumPlanId,
	type PremiumPlanId,
	PRODUCTION_RECIPES,
	type ProductionType,
	MILITARY_UNIT_TEMPLATES,
	type MilitaryUnitTemplate
} from "$lib/config";
import { calculateShiftStatus, collectWages, startWorkShift } from "$lib/server/service/factoryWork";
import { sendSystemNotification } from "$lib/server/service/inbox";
import { and, eq, sql, gt, isNotNull } from "drizzle-orm";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PremiumStatus {
	active: boolean;
	premiumUntil: Date | null;
	automation: boolean;
}

/**
 * Extend a user's premium membership by the given number of days. If the user is
 * already premium the new time stacks on top of the remaining time.
 */
export async function grantPremium(accountId: string, days: number, tx: any = db): Promise<Date> {
	const [profile] = await tx
		.select({ premiumUntil: userProfiles.premiumUntil })
		.from(userProfiles)
		.where(eq(userProfiles.accountId, accountId));

	const base = isPremiumActive(profile?.premiumUntil) ? new Date(profile!.premiumUntil!).getTime() : Date.now();
	const newUntil = new Date(base + days * DAY_MS);

	await tx
		.update(userProfiles)
		.set({ premiumUntil: newUntil, updatedAt: new Date() })
		.where(eq(userProfiles.accountId, accountId));

	return newUntil;
}

export async function getPremiumStatus(accountId: string): Promise<PremiumStatus> {
	const [profile] = await db
		.select({ premiumUntil: userProfiles.premiumUntil, premiumAutomation: userProfiles.premiumAutomation })
		.from(userProfiles)
		.where(eq(userProfiles.accountId, accountId));

	return {
		active: isPremiumActive(profile?.premiumUntil),
		premiumUntil: profile?.premiumUntil ?? null,
		automation: profile?.premiumAutomation ?? true
	};
}

export async function setPremiumAutomation(accountId: string, enabled: boolean): Promise<void> {
	await db
		.update(userProfiles)
		.set({ premiumAutomation: enabled, updatedAt: new Date() })
		.where(eq(userProfiles.accountId, accountId));
}

interface PurchaseResult {
	success: boolean;
	error?: string;
	premiumUntil?: Date;
}

/**
 * Gift premium to another user. Premium cannot be bought with in-game currency,
 * so gifting is free (while real payments are disabled) and simply grants the
 * membership to the recipient.
 */
export async function giftPremium(gifterId: string, recipientId: string, planId: string): Promise<PurchaseResult> {
	if (!isPremiumPlanId(planId)) {
		return { success: false, error: "Invalid plan" };
	}
	if (gifterId === recipientId) {
		return { success: false, error: "You cannot gift premium to yourself" };
	}
	const plan = PREMIUM_PLANS[planId];

	try {
		const [recipient] = await db
			.select({ accountId: userProfiles.accountId })
			.from(userProfiles)
			.where(eq(userProfiles.accountId, recipientId));
		if (!recipient) {
			return { success: false, error: "Recipient not found" };
		}

		const premiumUntil = await grantPremium(recipientId, plan.days);

		await sendSystemNotification({
			recipientId,
			systemSenderId: gifterId,
			subject: "🎁 You received a Premium membership!",
			content: `You have been gifted a ${plan.label} premium membership (${plan.days} days). Automation for production, military training and factory work is now working for you. Manage it on the Premium page.`
		});

		return { success: true, premiumUntil };
	} catch (err) {
		console.error("giftPremium error:", err);
		return { success: false, error: "Failed to gift premium" };
	}
}

// --- AUTOMATION ---------------------------------------------------------------

type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";

export interface AutomationSummary {
	accountId: string;
	wageCollected: boolean;
	shiftStarted: boolean;
	productionCollected: boolean;
	productionStarted: ProductionType | null;
	trainingCompleted: number;
	unitTrained: string | null;
}

/** Manage the user's factory shift: collect finished wages and start a new shift. */
async function automateFactoryWork(accountId: string, summary: AutomationSummary): Promise<void> {
	const [job] = await db
		.select({ factoryId: factoryWorkers.factoryId, lastWorked: factoryWorkers.lastWorked })
		.from(factoryWorkers)
		.where(eq(factoryWorkers.userId, accountId));

	if (!job) return;

	if (job.lastWorked) {
		const status = calculateShiftStatus(job.lastWorked);
		if (status.isCurrentlyWorking) {
			return; // Still on shift, nothing to do.
		}
		const collect = await collectWages(accountId, job.factoryId);
		if (collect.success) summary.wageCollected = true;
	}

	const start = await startWorkShift(accountId, job.factoryId);
	if (start.success) summary.shiftStarted = true;
}

/** Collect finished production and, if the queue is empty, start a new affordable batch. */
async function automateProduction(accountId: string, summary: AutomationSummary): Promise<void> {
	const [active] = await db.select().from(productionQueue).where(eq(productionQueue.userId, accountId)).limit(1);

	if (active) {
		if (new Date(active.completesAt) > new Date()) {
			return; // Still producing.
		}
		await db.transaction(async (tx) => {
			await tx
				.insert(productInventory)
				.values({ userId: accountId, productType: active.productType, quantity: active.quantity })
				.onConflictDoUpdate({
					target: [productInventory.userId, productInventory.productType],
					set: { quantity: sql`${productInventory.quantity} + ${active.quantity}`, updatedAt: new Date() }
				});
			await tx.delete(productionQueue).where(eq(productionQueue.id, active.id));
		});
		summary.productionCollected = true;
	}

	// Queue is now empty: start the first recipe the user can fully afford.
	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, accountId));
	const resourceMap = new Map(resources.map((r) => [r.resourceType, r.quantity]));

	for (const [productType, recipe] of Object.entries(PRODUCTION_RECIPES) as [
		ProductionType,
		(typeof PRODUCTION_RECIPES)[ProductionType]
	][]) {
		const affordable = Object.entries(recipe.inputs).every(
			([resource, required]) => (resourceMap.get(resource as ResourceType) ?? 0) >= (required as number)
		);
		if (!affordable) continue;

		await db.transaction(async (tx) => {
			for (const [resource, required] of Object.entries(recipe.inputs)) {
				await tx
					.update(resourceInventory)
					.set({ quantity: sql`${resourceInventory.quantity} - ${required as number}`, updatedAt: new Date() })
					.where(
						and(eq(resourceInventory.userId, accountId), eq(resourceInventory.resourceType, resource as ResourceType))
					);
			}
			await tx.insert(productionQueue).values({
				userId: accountId,
				productType: productType,
				quantity: recipe.output,
				completesAt: new Date(Date.now() + recipe.duration * 1000)
			});
		});
		summary.productionStarted = productType;
		break;
	}
}

function canAffordUnit(
	template: MilitaryUnitTemplate,
	balance: number,
	resourceMap: Map<string, number>,
	productMap: Map<string, number>
): boolean {
	if (balance < template.currencyCost) return false;
	const resourceReqs: [ResourceType, number][] = [
		["iron", template.ironCost ?? 0],
		["steel", template.steelCost ?? 0],
		["gunpowder", template.gunpowderCost ?? 0]
	];
	for (const [type, required] of resourceReqs) {
		if (required > 0 && (resourceMap.get(type) ?? 0) < required) return false;
	}
	const productReqs: [ProductType, number][] = [
		["rifles", template.riflesCost ?? 0],
		["ammunition", template.ammunitionCost ?? 0],
		["artillery", template.artilleryCost ?? 0],
		["vehicles", template.vehiclesCost ?? 0],
		["explosives", template.explosivesCost ?? 0]
	];
	for (const [type, required] of productReqs) {
		if (required > 0 && (productMap.get(type) ?? 0) < required) return false;
	}
	return true;
}

/** Complete finished trainings and, if possible, start training a new affordable unit. */
async function automateTraining(accountId: string, summary: AutomationSummary): Promise<void> {
	// Complete any finished trainings.
	const finished = await db
		.update(militaryUnits)
		.set({ isTraining: false, trainingStartedAt: null, trainingCompletesAt: null, updatedAt: new Date() })
		.where(
			and(
				eq(militaryUnits.ownerId, accountId),
				eq(militaryUnits.isTraining, true),
				isNotNull(militaryUnits.trainingCompletesAt),
				sql`${militaryUnits.trainingCompletesAt} <= now()`
			)
		)
		.returning({ id: militaryUnits.id });
	summary.trainingCompleted = finished.length;

	// Do not start a new unit while one is already training.
	const [training] = await db
		.select({ id: militaryUnits.id })
		.from(militaryUnits)
		.where(and(eq(militaryUnits.ownerId, accountId), eq(militaryUnits.isTraining, true)))
		.limit(1);
	if (training) return;

	// Need a state residence and no active travel to train.
	const [residence] = await db
		.select({ regionId: residences.regionId, stateId: regions.stateId })
		.from(residences)
		.leftJoin(regions, eq(residences.regionId, regions.id))
		.where(eq(residences.userId, accountId))
		.limit(1);
	if (!residence?.stateId) return;

	const activeTravel = await db.query.userTravels.findFirst({
		where: and(eq(userTravels.userId, accountId), eq(userTravels.status, "in_progress"))
	});
	if (activeTravel) return;

	const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, accountId));
	const balance = wallet?.balance ?? 0;
	const resources = await db.select().from(resourceInventory).where(eq(resourceInventory.userId, accountId));
	const products = await db.select().from(productInventory).where(eq(productInventory.userId, accountId));
	const resourceMap = new Map(resources.map((r) => [r.resourceType, r.quantity]));
	const productMap = new Map(products.map((p) => [p.productType, p.quantity]));

	const affordable = Object.values(MILITARY_UNIT_TEMPLATES)
		.filter((t) => canAffordUnit(t, balance, resourceMap, productMap))
		.sort((a, b) => a.currencyCost - b.currencyCost)[0];
	if (!affordable) return;

	const existingUnits = await db
		.select({ name: militaryUnits.name, unitType: militaryUnits.unitType })
		.from(militaryUnits)
		.where(eq(militaryUnits.ownerId, accountId));
	const unitName = generateUnitName(affordable.unitType, existingUnits);

	await db.transaction(async (tx) => {
		await tx
			.update(userWallets)
			.set({ balance: sql`${userWallets.balance} - ${affordable.currencyCost}`, updatedAt: new Date() })
			.where(eq(userWallets.userId, accountId));

		const resourceDeductions: [ResourceType, number][] = [
			["iron", affordable.ironCost ?? 0],
			["steel", affordable.steelCost ?? 0],
			["gunpowder", affordable.gunpowderCost ?? 0]
		];
		for (const [type, amount] of resourceDeductions) {
			if (amount <= 0) continue;
			await tx
				.update(resourceInventory)
				.set({ quantity: sql`${resourceInventory.quantity} - ${amount}`, updatedAt: new Date() })
				.where(and(eq(resourceInventory.userId, accountId), eq(resourceInventory.resourceType, type)));
		}

		const productDeductions: [ProductType, number][] = [
			["rifles", affordable.riflesCost ?? 0],
			["ammunition", affordable.ammunitionCost ?? 0],
			["artillery", affordable.artilleryCost ?? 0],
			["vehicles", affordable.vehiclesCost ?? 0],
			["explosives", affordable.explosivesCost ?? 0]
		];
		for (const [type, amount] of productDeductions) {
			if (amount <= 0) continue;
			await tx
				.update(productInventory)
				.set({ quantity: sql`${productInventory.quantity} - ${amount}`, updatedAt: new Date() })
				.where(and(eq(productInventory.userId, accountId), eq(productInventory.productType, type)));
		}

		const startedAt = new Date();
		await tx.insert(militaryUnits).values({
			name: unitName,
			ownerId: accountId,
			stateId: residence.stateId!,
			regionId: residence.regionId,
			unitType: affordable.unitType as (typeof militaryUnitTypeEnum.enumValues)[number],
			organization: 100,
			health: 100,
			supplyLevel: 100,
			isTraining: true,
			trainingStartedAt: startedAt,
			trainingCompletesAt: new Date(startedAt.getTime() + affordable.trainingDuration * 3600000)
		});
	});

	summary.unitTrained = unitName;
}

const UNIT_TYPE_NAMES: Record<string, string> = {
	air_defence: "Air Defence Battalion",
	armor: "Armored Battalion",
	mechanized: "Mechanized Battalion",
	artillery: "Artillery Battalion",
	infantry: "Infantry Battalion",
	bomber_squadron: "Bomber Squadron",
	fighter_squadron: "Fighter Squadron"
};

function generateUnitName(unitType: string, existingUnits: { name: string; unitType: string }[]): string {
	const baseName = UNIT_TYPE_NAMES[unitType] || "Battalion";
	const usedNumbers = existingUnits
		.filter((u) => u.unitType === unitType)
		.map((u) => {
			const match = u.name.match(/^(\d+)(st|nd|rd|th)/);
			return match ? parseInt(match[1]) : 0;
		});

	let number = 1;
	while (usedNumbers.includes(number)) number++;

	const suffix = number === 1 ? "st" : number === 2 ? "nd" : number === 3 ? "rd" : "th";
	return `${number}${suffix} ${baseName}`;
}

/** Run the full automation for a single premium user. */
export async function runPremiumAutomationForUser(accountId: string): Promise<AutomationSummary> {
	const summary: AutomationSummary = {
		accountId,
		wageCollected: false,
		shiftStarted: false,
		productionCollected: false,
		productionStarted: null,
		trainingCompleted: 0,
		unitTrained: null
	};

	try {
		await automateFactoryWork(accountId, summary);
	} catch (err) {
		console.error(`Premium factory automation failed for ${accountId}:`, err);
	}
	try {
		await automateProduction(accountId, summary);
	} catch (err) {
		console.error(`Premium production automation failed for ${accountId}:`, err);
	}
	try {
		await automateTraining(accountId, summary);
	} catch (err) {
		console.error(`Premium training automation failed for ${accountId}:`, err);
	}

	return summary;
}

/** Run automation for every active premium member that has automation enabled. */
export async function runPremiumAutomation(): Promise<AutomationSummary[]> {
	const members = await db
		.select({ accountId: userProfiles.accountId })
		.from(userProfiles)
		.where(and(gt(userProfiles.premiumUntil, new Date()), eq(userProfiles.premiumAutomation, true)));

	const summaries: AutomationSummary[] = [];
	for (const member of members) {
		summaries.push(await runPremiumAutomationForUser(member.accountId));
	}
	return summaries;
}

export { PREMIUM_PLANS, type PremiumPlanId };
