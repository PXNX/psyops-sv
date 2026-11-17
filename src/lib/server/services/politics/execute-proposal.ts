// Shared by every place a passed proposal gets carried out: auto-execution by a
// minister/president (state/[id]/proposal/create), the voting-cron once a
// proposal's window closes (api/cron/proposals), and the manual "accept now"
// action on the parliament page. Keeping this in one place means all three
// paths apply taxes/borders/construction the same way instead of drifting.
import { db } from "#lib/server/db.js";
import { eq, and } from "drizzle-orm";
import {
	stateTaxes,
	stateBorders,
	stateVisaSettings,
	proposalTaxDetails,
	proposalBorderDetails,
	proposalBuildingDetails,
	proposalExploitationDetails,
	proposalWarDetails,
	states
} from "#lib/server/schema.js";
import { isBuildingType } from "#lib/config/index.js";
import { ConstructionError, startConstruction } from "./construction.service.js";
import { declareWar, WarDeclarationError } from "../military/declare-war.js";

export async function executeProposal(stateId: number, proposalType: string, accountId: string, proposalId: number) {
	if (proposalType === "declare_war") {
		const details = await db.query.proposalWarDetails.findFirst({
			where: eq(proposalWarDetails.proposalId, proposalId)
		});
		if (!details) throw new ConstructionError("This proposal doesn't say whom to declare war on.");
		try {
			await declareWar(db, { attackerStateId: stateId, targetStateId: details.targetStateId, declaredBy: accountId });
		} catch (err) {
			// A game outcome (e.g. already at war), reported like a failed build.
			if (err instanceof WarDeclarationError) throw new ConstructionError(err.message);
			throw err;
		}
	} else if (proposalType === "exploitation") {
		const details = await db.query.proposalExploitationDetails.findFirst({
			where: eq(proposalExploitationDetails.proposalId, proposalId)
		});
		if (!details) throw new Error("Exploitation proposal details not found");
		await db.update(states).set({ exploitationPolicy: details.policy }).where(eq(states.id, stateId));
	} else if (proposalType === "tax") {
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
		// Building construction: paid for and queued by the construction
		// service, which throws a ConstructionError if it can't go ahead.
		if (!isBuildingType(proposalType)) throw new Error(`Unknown proposal type: ${proposalType}`);
		const buildingDetails = await db.query.proposalBuildingDetails.findFirst({
			where: eq(proposalBuildingDetails.proposalId, proposalId)
		});
		if (!buildingDetails) throw new ConstructionError("This proposal doesn't say where to build.");

		await startConstruction(db, {
			stateId,
			regionId: buildingDetails.regionId,
			type: proposalType,
			quantity: 1, // levels are built one at a time
			builtBy: accountId,
			proposalId
		});
	}
}
