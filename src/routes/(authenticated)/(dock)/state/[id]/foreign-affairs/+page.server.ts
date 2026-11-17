// src/routes/(authenticated)/(dock)/state/[id]/foreign-affairs/+page.server.ts - WITH PRESIDENT ACCESS
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { creditTreasury, debitWallet, InsufficientFundsError } from "#lib/server/money.js";
import { db } from "#lib/server/db.js";
import { eq, and, ne, or } from "drizzle-orm";
import {
	states,
	ministers,
	presidents,
	regions,
	stateSanctions,
	residenceApplications,
	residences,
	stateVisaSettings,
	visaApplications,
	userVisas,
	stateTreasury,
	userWallets,
	blocs
} from "#lib/server/schema.js";

class AlreadyReviewedError extends Error {}

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const stateId = parseInt(params.id);

	// Get state; fail fast if it doesn't exist
	const statePromise = db.query.states
		.findFirst({
			where: eq(states.id, stateId)
		})
		.then((state) => state ?? error(404, "State not found"));

	// Get state and the user's foreign-minister / president roles in parallel
	const [state, presidency] = await Promise.all([
		statePromise,
		Promise.all([
			db.query.ministers.findFirst({
				where: and(
					eq(ministers.userId, account.id),
					eq(ministers.stateId, stateId),
					eq(ministers.ministry, "foreign_affairs")
				)
			}),
			db.query.presidents.findFirst({
				where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
			}),
			statePromise
		]).then(([ministry, presidency]) => {
			// Check if user is foreign minister OR president (404 wins over 403)
			if (!ministry && !presidency) {
				error(403, "You must be the Foreign Minister or President to access this page");
			}
			return presidency;
		})
	]);

	const [
		otherStates,
		sanctions,
		stateRegions,
		pendingApplications,
		existingVisaSettings,
		pendingVisaApplications,
		activeVisas,
		bloc
	] = await Promise.all([
		// Get all other states
		db.query.states.findMany({
			where: ne(states.id, stateId)
		}),
		// Get active sanctions
		db.query.stateSanctions.findMany({
			where: and(eq(stateSanctions.sanctioningStateId, stateId), eq(stateSanctions.isActive, true)),
			with: {
				targetState: true,
				sanctioner: {
					with: {
						profile: true
					}
				}
			}
		}),
		// Get regions
		db.query.regions.findMany({
			where: eq(regions.stateId, stateId)
		}),
		// Get pending residence applications
		db.query.residenceApplications.findMany({
			where: eq(residenceApplications.status, "pending"),
			with: {
				user: {
					with: {
						profile: true
					}
				},
				region: true
			}
		}),
		// Get visa settings
		db.query.stateVisaSettings.findFirst({
			where: eq(stateVisaSettings.stateId, stateId)
		}),
		// Get pending visa applications
		db.query.visaApplications.findMany({
			where: and(eq(visaApplications.stateId, stateId), eq(visaApplications.status, "pending")),
			with: {
				user: {
					with: {
						profile: true
					}
				}
			},
			orderBy: (visaApplications, { desc }) => [desc(visaApplications.appliedAt)]
		}),
		// Get active visas for this state
		db.query.userVisas.findMany({
			where: and(eq(userVisas.stateId, stateId), eq(userVisas.status, "active")),
			with: {
				user: {
					with: {
						profile: true
					}
				}
			},
			orderBy: (userVisas, { asc }) => [asc(userVisas.expiresAt)]
		}),
		// Get the state's bloc (for the visaFreeForMembers override)
		state.blocId
			? db.query.blocs.findFirst({
					where: eq(blocs.id, state.blocId)
				})
			: undefined
	]);

	const stateRegionIds = stateRegions.map((r) => r.id);
	const statePendingApplications = pendingApplications.filter((app) => stateRegionIds.includes(app.regionId));

	let visaSettings = existingVisaSettings;

	// Create default if doesn't exist
	if (!visaSettings) {
		[visaSettings] = await db
			.insert(stateVisaSettings)
			.values({
				stateId,
				visaRequired: false,
				visaCost: 5000,
				visaTaxRate: 20,
				autoApprove: true
			})
			.returning();
	}

	// Check if state is in a bloc with visaFreeForMembers
	let blocVisaOverride = false;
	let blocInfo = null;
	if (bloc) {
		blocInfo = { id: bloc.id, name: bloc.name, visaFreeForMembers: bloc.visaFreeForMembers };
		blocVisaOverride = bloc.visaFreeForMembers;
	}

	return {
		state,
		regions: stateRegions,
		otherStates,
		sanctionedStates: sanctions,
		pendingApplications: statePendingApplications,
		visaSettings,
		pendingVisaApplications,
		activeVisas,
		isPresident: !!presidency,
		blocVisaOverride,
		blocInfo
	};
};

export const actions: Actions = {
	sanctionState: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		// Check authorization
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Foreign Minister or President can impose sanctions" });
		}

		const formData = await request.formData();
		const targetStateId = parseInt(formData.get("targetStateId") as string);
		const reason = formData.get("reason") as string;

		if (!targetStateId || !reason) {
			return fail(400, { error: "Missing required fields" });
		}

		const existingSanction = await db.query.stateSanctions.findFirst({
			where: and(
				eq(stateSanctions.targetStateId, targetStateId),
				eq(stateSanctions.sanctioningStateId, stateId),
				eq(stateSanctions.isActive, true)
			)
		});

		if (existingSanction) {
			return fail(400, { error: "This state is already sanctioned" });
		}

		await db.insert(stateSanctions).values({
			targetStateId,
			sanctioningStateId: stateId,
			sanctionedBy: account.id,
			reason,
			isActive: true
		});

		return { success: true, message: "Sanction imposed successfully" };
	},

	liftSanction: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		// Check authorization
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Foreign Minister or President can lift sanctions" });
		}

		const formData = await request.formData();
		const sanctionId = parseInt(formData.get("sanctionId") as string);

		const sanction = await db.query.stateSanctions.findFirst({
			where: eq(stateSanctions.id, sanctionId)
		});

		if (!sanction || sanction.sanctioningStateId !== stateId) {
			return fail(403, { error: "Invalid sanction" });
		}

		await db.update(stateSanctions).set({ isActive: false }).where(eq(stateSanctions.id, sanctionId));

		return { success: true, message: "Sanction lifted successfully" };
	},

	updateVisaSettings: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		// Check authorization
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Foreign Minister or President can update visa settings" });
		}

		const formData = await request.formData();
		const visaRequired = formData.get("visaRequired") === "true";
		const visaCost = parseInt(formData.get("visaCost") as string);
		const autoApprove = formData.get("autoApprove") === "true";

		// Validate
		if (!Number.isInteger(visaCost) || visaCost < 0 || visaCost > 1000000) {
			return fail(400, { error: "Visa cost must be between $0 and $1,000,000" });
		}

		await db
			.update(stateVisaSettings)
			.set({
				visaRequired,
				visaCost,

				autoApprove,
				updatedAt: new Date()
			})
			.where(eq(stateVisaSettings.stateId, stateId));

		return { success: true, message: "Visa settings updated successfully" };
	},

	reviewVisaApplication: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		// Check authorization
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Foreign Minister or President can review visa applications" });
		}

		const formData = await request.formData();
		const applicationId = parseInt(formData.get("applicationId") as string);
		const decision = formData.get("decision") as "approved" | "rejected";
		if (decision !== "approved" && decision !== "rejected") return fail(400, { error: "Approve or reject." });

		const application = await db.query.visaApplications.findFirst({
			where: eq(visaApplications.id, applicationId)
		});

		if (!application || application.stateId !== stateId) {
			return fail(404, { error: "Application not found" });
		}

		// Review, payment and visa commit together: an approval whose payment
		// fails must not leave the application marked approved.
		try {
			await db.transaction(async (tx) => {
				// Only a pending application can be decided, and only once.
				const [reviewed] = await tx
					.update(visaApplications)
					.set({ status: decision, reviewedAt: new Date(), reviewedBy: account.id })
					.where(and(eq(visaApplications.id, applicationId), eq(visaApplications.status, "pending")))
					.returning({ id: visaApplications.id });
				if (!reviewed) throw new AlreadyReviewedError();

				if (decision !== "approved") return;

				const visaSettings = await tx.query.stateVisaSettings.findFirst({
					where: eq(stateVisaSettings.stateId, stateId)
				});
				if (!visaSettings) throw new Error("Visa settings not found");

				const visaCost = Number(visaSettings.visaCost);
				const taxAmount = Math.floor(visaCost * (visaSettings.visaTaxRate / 100));

				await debitWallet(tx, application.userId, visaCost);
				await creditTreasury(tx, stateId, taxAmount);

				const expiresAt = new Date();
				expiresAt.setDate(expiresAt.getDate() + 14);

				await tx.insert(userVisas).values({
					userId: application.userId,
					stateId,
					status: "active",
					expiresAt,
					cost: visaCost,
					taxPaid: taxAmount,
					approvedBy: account.id,
					approvedAt: new Date()
				});
			});
		} catch (err) {
			if (err instanceof InsufficientFundsError) {
				return fail(400, { error: "User has insufficient funds" });
			}
			if (err instanceof AlreadyReviewedError) {
				return fail(409, { error: "This application has already been decided." });
			}
			throw err;
		}

		return { success: true, message: `Visa application ${decision}` };
	},

	revokeVisa: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		// Check authorization
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Foreign Minister or President can revoke visas" });
		}

		const formData = await request.formData();
		const visaId = parseInt(formData.get("visaId") as string);
		const reason = formData.get("reason") as string;

		const visa = await db.query.userVisas.findFirst({
			where: eq(userVisas.id, visaId)
		});

		if (!visa || visa.stateId !== stateId) {
			return fail(404, { error: "Visa not found" });
		}

		await db
			.update(userVisas)
			.set({
				status: "revoked",
				revokedBy: account.id,
				revokedAt: new Date(),
				revocationReason: reason || "Revoked by government"
			})
			.where(eq(userVisas.id, visaId));

		return { success: true, message: "Visa revoked successfully" };
	},

	approveResidence: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Foreign Minister or President can review residence applications" });
		}

		const formData = await request.formData();
		const applicationId = parseInt(formData.get("applicationId") as string);

		const application = await db.query.residenceApplications.findFirst({
			where: eq(residenceApplications.id, applicationId),
			with: { region: true }
		});

		if (!application || application.status !== "pending") {
			return fail(404, { error: "Application not found or already reviewed" });
		}

		// Verify region belongs to this state
		if (application.region.stateId !== stateId) {
			return fail(400, { error: "This application is not for a region in this state" });
		}

		// Update application status
		await db
			.update(residenceApplications)
			.set({
				status: "approved",
				reviewedAt: new Date(),
				reviewedBy: account.id
			})
			.where(eq(residenceApplications.id, applicationId));

		// Update user's home region to grant citizenship
		await db
			.update(residences)
			.set({
				homeRegionId: application.regionId,
				homeRegionChangedAt: new Date()
			})
			.where(eq(residences.userId, application.userId));

		return { success: true, message: "Residence application approved — citizenship granted" };
	},

	rejectResidence: async ({ request, locals, params }) => {
		const account = locals.account!;
		const stateId = parseInt(params.id);

		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, stateId),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		const presidency = await db.query.presidents.findFirst({
			where: and(eq(presidents.userId, account.id), eq(presidents.stateId, stateId))
		});

		if (!ministry && !presidency) {
			return fail(403, { error: "Only the Foreign Minister or President can review residence applications" });
		}

		const formData = await request.formData();
		const applicationId = parseInt(formData.get("applicationId") as string);

		const application = await db.query.residenceApplications.findFirst({
			where: eq(residenceApplications.id, applicationId),
			with: { region: true }
		});

		if (!application || application.status !== "pending") {
			return fail(404, { error: "Application not found or already reviewed" });
		}

		if (application.region.stateId !== stateId) {
			return fail(400, { error: "This application is not for a region in this state" });
		}

		await db
			.update(residenceApplications)
			.set({
				status: "rejected",
				reviewedAt: new Date(),
				reviewedBy: account.id
			})
			.where(eq(residenceApplications.id, applicationId));

		return { success: true, message: "Residence application rejected" };
	}
};
