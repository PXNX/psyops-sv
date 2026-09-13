// Shared by every place a passed proposal gets carried out: auto-execution by a
// minister/president (state/[id]/proposal/create), the voting-cron once a
// proposal's window closes (api/cron/proposals), and the manual "accept now"
// action on the parliament page. Keeping this in one place means all three
// paths apply taxes/borders/construction the same way instead of drifting.
import { db } from "$lib/server/db";
import { eq, and, sql } from "drizzle-orm";
import {
	stateTaxes,
	stateBorders,
	stateVisaSettings,
	stateBuildings,
	stateTreasury,
	stateResourceInventory,
	regions,
	proposalTaxDetails,
	proposalBorderDetails,
	proposalBuildingDetails
} from "$lib/server/schema";
import { BUILDING_TEMPLATES, type BuildingType } from "$lib/config";

export async function executeProposal(stateId: number, proposalType: string, accountId: string, proposalId: number) {
	if (proposalType === "tax") {
		const taxDetails = await db.query.proposalTaxDetails.findFirst({
			where: eq(proposalTaxDetails.proposalId, proposalId)
		});

		if (!taxDetails) {
			throw new Error("Tax proposal details not found");
		}

		await db
			.update(stateTaxes)
			.set({ isActive: false })
			.where(
				and(eq(stateTaxes.stateId, stateId), eq(stateTaxes.taxType, taxDetails.taxType), eq(stateTaxes.isActive, true))
			);

		await db.insert(stateTaxes).values({
			stateId,
			taxType: taxDetails.taxType,
			taxRate: taxDetails.taxRate,
			proposalId,
			isActive: true
		});
	} else if (proposalType === "border_control") {
		const borderDetails = await db.query.proposalBorderDetails.findFirst({
			where: eq(proposalBorderDetails.proposalId, proposalId)
		});

		if (!borderDetails) {
			throw new Error("Border control proposal details not found");
		}

		let border = await db.query.stateBorders.findFirst({
			where: eq(stateBorders.stateId, stateId)
		});

		if (!border) {
			await db.insert(stateBorders).values({
				stateId,
				status: borderDetails.borderStatus,
				changedBy: borderDetails.borderStatus === "closed" ? accountId : null,
				changedAt: borderDetails.borderStatus === "closed" ? new Date() : null
			});
		} else {
			await db
				.update(stateBorders)
				.set({
					status: borderDetails.borderStatus,
					changedBy: borderDetails.borderStatus === "closed" ? accountId : null,
					changedAt: borderDetails.borderStatus === "closed" ? new Date() : null,
					updatedAt: new Date()
				})
				.where(eq(stateBorders.id, border.id));
		}

		const visaSettings = await db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		});

		const autoApprove = borderDetails.borderStatus === "open";

		if (visaSettings) {
			await db
				.update(stateVisaSettings)
				.set({
					autoApprove,
					updatedAt: new Date()
				})
				.where(eq(stateVisaSettings.id, visaSettings.id));
		} else {
			await db.insert(stateVisaSettings).values({
				stateId,
				autoApprove,
				visaRequired: true
			});
		}
	} else {
		// Building construction
		const buildingDetails = await db.query.proposalBuildingDetails.findFirst({
			where: eq(proposalBuildingDetails.proposalId, proposalId)
		});

		if (!buildingDetails) {
			throw new Error("Building proposal details not found");
		}

		const region = await db.query.regions.findFirst({
			where: and(eq(regions.id, buildingDetails.regionId), eq(regions.stateId, stateId))
		});

		if (!region) {
			throw new Error("Invalid region");
		}

		const template = BUILDING_TEMPLATES[proposalType as BuildingType];
		const buildQuantity = buildingDetails.quantity;

		if ((region.infrastructure ?? 0) < template.infrastructureRequired) {
			throw new Error(
				`This region needs at least ${template.infrastructureRequired} infrastructure to build ${template.type.replace("_", " ")}`
			);
		}

		// Total cost for the requested quantity: currency comes out of the
		// state treasury, and any listed resources (steel, wood, ...) come
		// out of the state's resource stockpile.
		const currencyCost = template.costs.currency * buildQuantity;
		const resourceCosts = Object.entries(template.costs).filter(([key]) => key !== "currency") as Array<
			[string, number]
		>;

		const treasury = await db.query.stateTreasury.findFirst({
			where: eq(stateTreasury.stateId, stateId)
		});

		if (!treasury || treasury.balance < currencyCost) {
			throw new Error("Insufficient state treasury funds for this construction");
		}

		const stateResourceRows = await db.query.stateResourceInventory.findMany({
			where: eq(stateResourceInventory.stateId, stateId)
		});
		const stateResourceQuantities = new Map<string, number>(stateResourceRows.map((r) => [r.resourceType, r.quantity]));

		for (const [resourceType, perUnit] of resourceCosts) {
			const needed = perUnit * buildQuantity;
			if ((stateResourceQuantities.get(resourceType) ?? 0) < needed) {
				throw new Error(`Insufficient ${resourceType} in the state stockpile for this construction`);
			}
		}

		// Deduct currency from the state treasury.
		await db
			.update(stateTreasury)
			.set({
				balance: sql`${stateTreasury.balance} - ${currencyCost}`,
				totalSpent: sql`${stateTreasury.totalSpent} + ${currencyCost}`,
				updatedAt: new Date()
			})
			.where(eq(stateTreasury.stateId, stateId));

		// Deduct resources from the state stockpile.
		for (const [resourceType, perUnit] of resourceCosts) {
			const needed = perUnit * buildQuantity;
			await db
				.update(stateResourceInventory)
				.set({
					quantity: sql`${stateResourceInventory.quantity} - ${needed}`,
					updatedAt: new Date()
				})
				.where(
					and(eq(stateResourceInventory.stateId, stateId), eq(stateResourceInventory.resourceType, resourceType as any))
				);
		}

		// Create buildings. Construction is purely about raising the region's
		// building-type level, so the name is just a display label derived
		// from the type — nothing the user needs to choose. Each row starts
		// under construction and only bumps the region's stats once
		// completePendingConstructions() sees constructionCompletesAt has passed.
		const displayName = template.type
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
		const constructionStartedAt = new Date();
		const constructionCompletesAt = new Date(
			constructionStartedAt.getTime() + template.constructionTime * 24 * 60 * 60 * 1000
		);
		for (let i = 0; i < buildQuantity; i++) {
			await db.insert(stateBuildings).values({
				name: buildQuantity > 1 ? `${displayName} ${i + 1}` : displayName,
				buildingType: proposalType as any,
				regionId: buildingDetails.regionId,
				stateId,
				proposalId,
				builtBy: accountId,
				isUnderConstruction: true,
				constructionStartedAt,
				constructionCompletesAt
			});
		}
	}
}
