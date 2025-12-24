// src/routes/(authenticated)/(dock)/state/[id]/foreign-affairs/+page.server.ts - WITH VISA MANAGEMENT
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, ne } from "drizzle-orm";
import {
	states,
	ministers,
	regions,
	stateSanctions,
	residenceApplications,
	residences,
	stateVisaSettings,
	visaApplications,
	userVisas,
	stateTreasury,
	userWallets
} from "$lib/server/schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;

	// Get state
	const state = await db.query.states.findFirst({
		where: eq(states.id, params.id)
	});

	if (!state) {
		throw error(404, "State not found");
	}

	// Check if user is foreign minister
	const ministry = await db.query.ministers.findFirst({
		where: and(
			eq(ministers.userId, account.id),
			eq(ministers.stateId, params.id),
			eq(ministers.ministry, "foreign_affairs")
		)
	});

	if (!ministry) {
		throw error(403, "You must be the Foreign Minister to access this page");
	}

	// Get all other states
	const otherStates = await db.query.states.findMany({
		where: ne(states.id, params.id)
	});

	// Get active sanctions
	const sanctions = await db.query.stateSanctions.findMany({
		where: and(eq(stateSanctions.sanctioningStateId, params.id), eq(stateSanctions.isActive, true)),
		with: {
			targetState: true,
			sanctioner: {
				with: {
					profile: true
				}
			}
		}
	});

	// Get regions
	const stateRegions = await db.query.regions.findMany({
		where: eq(regions.stateId, params.id)
	});

	// Get pending residence applications
	const pendingApplications = await db.query.residenceApplications.findMany({
		where: eq(residenceApplications.status, "pending"),
		with: {
			user: {
				with: {
					profile: true
				}
			},
			region: true
		}
	});

	const stateRegionIds = stateRegions.map((r) => r.id);
	const statePendingApplications = pendingApplications.filter((app) => stateRegionIds.includes(app.regionId));

	// Get visa settings
	let visaSettings = await db.query.stateVisaSettings.findFirst({
		where: eq(stateVisaSettings.stateId, params.id)
	});

	// Create default if doesn't exist
	if (!visaSettings) {
		[visaSettings] = await db
			.insert(stateVisaSettings)
			.values({
				stateId: params.id,
				visaRequired: false,
				visaCost: 5000,
				visaTaxRate: 20,
				autoApprove: true
			})
			.returning();
	}

	// Get pending visa applications
	const pendingVisaApplications = await db.query.visaApplications.findMany({
		where: and(eq(visaApplications.stateId, params.id), eq(visaApplications.status, "pending")),
		with: {
			user: {
				with: {
					profile: true
				}
			}
		},
		orderBy: (visaApplications, { desc }) => [desc(visaApplications.appliedAt)]
	});

	// Get active visas for this state
	const activeVisas = await db.query.userVisas.findMany({
		where: and(eq(userVisas.stateId, params.id), eq(userVisas.status, "active")),
		with: {
			user: {
				with: {
					profile: true
				}
			}
		},
		orderBy: (userVisas, { asc }) => [asc(userVisas.expiresAt)]
	});

	return {
		state,
		regions: stateRegions,
		otherStates,
		sanctionedStates: sanctions,
		pendingApplications: statePendingApplications,
		visaSettings,
		pendingVisaApplications,
		activeVisas
	};
};

export const actions: Actions = {
	// Existing actions...
	sanctionState: async ({ request, locals, params }) => {
		const account = locals.account!;

		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Foreign Minister can impose sanctions" });
		}

		const formData = await request.formData();
		const targetStateId = formData.get("targetStateId") as string;
		const reason = formData.get("reason") as string;

		if (!targetStateId || !reason) {
			return fail(400, { error: "Missing required fields" });
		}

		const existingSanction = await db.query.stateSanctions.findFirst({
			where: and(
				eq(stateSanctions.targetStateId, targetStateId),
				eq(stateSanctions.sanctioningStateId, params.id),
				eq(stateSanctions.isActive, true)
			)
		});

		if (existingSanction) {
			return fail(400, { error: "This state is already sanctioned" });
		}

		await db.insert(stateSanctions).values({
			targetStateId,
			sanctioningStateId: params.id,
			sanctionedBy: account.id,
			reason,
			isActive: true
		});

		return { success: true, message: "Sanction imposed successfully" };
	},

	liftSanction: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Foreign Minister can lift sanctions" });
		}

		const formData = await request.formData();
		const sanctionId = parseInt(formData.get("sanctionId") as string);

		const sanction = await db.query.stateSanctions.findFirst({
			where: eq(stateSanctions.id, sanctionId)
		});

		if (!sanction || sanction.sanctioningStateId !== params.id) {
			return fail(403, { error: "Invalid sanction" });
		}

		await db.update(stateSanctions).set({ isActive: false }).where(eq(stateSanctions.id, sanctionId));

		return { success: true, message: "Sanction lifted successfully" };
	},

	// NEW: Update visa settings
	updateVisaSettings: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Foreign Minister can update visa settings" });
		}

		const formData = await request.formData();
		const visaRequired = formData.get("visaRequired") === "true";
		const visaCost = parseInt(formData.get("visaCost") as string);
		const visaTaxRate = parseInt(formData.get("visaTaxRate") as string);
		const autoApprove = formData.get("autoApprove") === "true";

		// Validate
		if (visaCost < 0 || visaCost > 1000000) {
			return fail(400, { error: "Visa cost must be between $0 and $1,000,000" });
		}

		if (visaTaxRate < 0 || visaTaxRate > 100) {
			return fail(400, { error: "Tax rate must be between 0% and 100%" });
		}

		await db
			.update(stateVisaSettings)
			.set({
				visaRequired,
				visaCost,
				visaTaxRate,
				autoApprove,
				updatedAt: new Date()
			})
			.where(eq(stateVisaSettings.stateId, params.id));

		return { success: true, message: "Visa settings updated successfully" };
	},

	// NEW: Review visa application
	reviewVisaApplication: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Foreign Minister can review visa applications" });
		}

		const formData = await request.formData();
		const applicationId = parseInt(formData.get("applicationId") as string);
		const decision = formData.get("decision") as "approved" | "rejected";

		const application = await db.query.visaApplications.findFirst({
			where: eq(visaApplications.id, applicationId)
		});

		if (!application || application.stateId !== params.id) {
			return fail(404, { error: "Application not found" });
		}

		// Update application
		await db
			.update(visaApplications)
			.set({
				status: decision,
				reviewedAt: new Date(),
				reviewedBy: account.id
			})
			.where(eq(visaApplications.id, applicationId));

		// If approved, process payment and create visa
		if (decision === "approved") {
			const visaSettings = await db.query.stateVisaSettings.findFirst({
				where: eq(stateVisaSettings.stateId, params.id)
			});

			if (!visaSettings) {
				return fail(500, { error: "Visa settings not found" });
			}

			const visaCost = Number(visaSettings.visaCost);
			const taxAmount = Math.floor(visaCost * (visaSettings.visaTaxRate / 100));

			// Get user wallet
			const wallet = await db.query.userWallets.findFirst({
				where: eq(userWallets.userId, application.userId)
			});

			if (!wallet || wallet.balance < visaCost) {
				return fail(400, { error: "User has insufficient funds" });
			}

			// Deduct from user
			await db
				.update(userWallets)
				.set({
					balance: Number(wallet.balance) - visaCost,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, application.userId));

			// Add to treasury
			let treasury = await db.query.stateTreasury.findFirst({
				where: eq(stateTreasury.stateId, params.id)
			});

			if (!treasury) {
				[treasury] = await db
					.insert(stateTreasury)
					.values({
						stateId: params.id,
						balance: 0,
						totalCollected: 0,
						totalSpent: 0
					})
					.returning();
			}

			await db
				.update(stateTreasury)
				.set({
					balance: Number(treasury.balance) + taxAmount,
					totalCollected: Number(treasury.totalCollected) + taxAmount,
					updatedAt: new Date()
				})
				.where(eq(stateTreasury.stateId, params.id));

			// Create visa
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 14);

			await db.insert(userVisas).values({
				userId: application.userId,
				stateId: params.id,
				status: "active",
				expiresAt,
				cost: visaCost,
				taxPaid: taxAmount,
				approvedBy: account.id,
				approvedAt: new Date()
			});
		}

		return { success: true, message: `Visa application ${decision}` };
	},

	// NEW: Revoke visa
	revokeVisa: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Foreign Minister can revoke visas" });
		}

		const formData = await request.formData();
		const visaId = parseInt(formData.get("visaId") as string);
		const reason = formData.get("reason") as string;

		const visa = await db.query.userVisas.findFirst({
			where: eq(userVisas.id, visaId)
		});

		if (!visa || visa.stateId !== params.id) {
			return fail(404, { error: "Visa not found" });
		}

		await db
			.update(userVisas)
			.set({
				status: "revoked",
				revokedBy: account.id,
				revokedAt: new Date(),
				revocationReason: reason || "Revoked by foreign minister"
			})
			.where(eq(userVisas.id, visaId));

		return { success: true, message: "Visa revoked successfully" };
	}
};
