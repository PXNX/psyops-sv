// src/routes/(authenticated)/(dock)/state/[id]/foreign-affairs/+page.server.ts - FIXED
import { error, redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { db } from "$lib/server/db";
import { eq, and, ne } from "drizzle-orm";
import { states, ministers, regions, stateSanctions, residenceApplications, residences } from "$lib/server/schema";

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;
	if (!account) {
		throw redirect(302, "/login");
	}

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

	// Get active sanctions imposed by this state
	const sanctions = await db.query.stateSanctions.findMany({
		where: and(eq(stateSanctions.sanctioningStateId, params.id), eq(stateSanctions.isActive, 1)),
		with: {
			targetState: true,
			sanctioner: {
				with: {
					profile: true
				}
			}
		}
	});

	// Get regions in this state
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

	// Filter applications for this state's regions
	const stateRegionIds = stateRegions.map((r) => r.id);
	const statePendingApplications = pendingApplications.filter((app) => stateRegionIds.includes(app.regionId));

	return {
		state,
		regions: stateRegions,
		otherStates,
		sanctionedStates: sanctions,
		pendingApplications: statePendingApplications
	};
};

export const actions: Actions = {
	sanctionState: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		// Verify foreign minister status
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

		// Check if target state exists
		const targetState = await db.query.states.findFirst({
			where: eq(states.id, targetStateId)
		});

		if (!targetState) {
			return fail(404, { error: "Target state not found" });
		}

		// Check if already sanctioned
		const existingSanction = await db.query.stateSanctions.findFirst({
			where: and(
				eq(stateSanctions.targetStateId, targetStateId),
				eq(stateSanctions.sanctioningStateId, params.id),
				eq(stateSanctions.isActive, 1)
			)
		});

		if (existingSanction) {
			return fail(400, { error: "This state is already sanctioned" });
		}

		// Create sanction record
		await db.insert(stateSanctions).values({
			targetStateId,
			sanctioningStateId: params.id,
			sanctionedBy: account.id,
			reason,
			isActive: 1
		});

		return { success: true, message: "Sanction imposed successfully" };
	},

	liftSanction: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		// Verify foreign minister status
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
		const sanctionId = formData.get("sanctionId") as string;

		// Get sanction
		const sanction = await db.query.stateSanctions.findFirst({
			where: eq(stateSanctions.id, sanctionId)
		});

		if (!sanction) {
			return fail(404, { error: "Sanction not found" });
		}

		// Verify this sanction belongs to this state
		if (sanction.sanctioningStateId !== params.id) {
			return fail(403, { error: "You can only lift sanctions imposed by your state" });
		}

		// Mark sanction as inactive
		await db.update(stateSanctions).set({ isActive: 0 }).where(eq(stateSanctions.id, sanctionId));

		return { success: true, message: "Sanction lifted successfully" };
	},

	updateResidencyPolicy: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		// Verify foreign minister status
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Foreign Minister can update residency policies" });
		}

		const formData = await request.formData();
		const regionId = parseInt(formData.get("regionId") as string);
		const autoApprove = formData.get("autoApprove") === "on" ? 1 : 0;

		// Verify region belongs to this state
		const region = await db.query.regions.findFirst({
			where: eq(regions.id, regionId)
		});

		if (!region || region.stateId !== params.id) {
			return fail(403, { error: "This region does not belong to your state" });
		}

		// Update region policy
		await db.update(regions).set({ autoApproveResidency: autoApprove }).where(eq(regions.id, regionId));

		return { success: true, message: "Residency policy updated successfully" };
	},

	reviewApplication: async ({ request, locals, params }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "Unauthorized" });
		}

		// Verify foreign minister status
		const ministry = await db.query.ministers.findFirst({
			where: and(
				eq(ministers.userId, account.id),
				eq(ministers.stateId, params.id),
				eq(ministers.ministry, "foreign_affairs")
			)
		});

		if (!ministry) {
			return fail(403, { error: "Only the Foreign Minister can review applications" });
		}

		const formData = await request.formData();
		const applicationId = formData.get("applicationId") as string;
		const decision = formData.get("decision") as "approved" | "rejected";

		// Get application
		const application = await db.query.residenceApplications.findFirst({
			where: eq(residenceApplications.id, applicationId),
			with: {
				region: true
			}
		});

		if (!application) {
			return fail(404, { error: "Application not found" });
		}

		// Verify region belongs to this state
		if (application.region?.stateId !== params.id) {
			return fail(403, { error: "This application is not for your state" });
		}

		// Update application
		await db
			.update(residenceApplications)
			.set({
				status: decision,
				reviewedAt: new Date(),
				reviewedBy: account.id
			})
			.where(eq(residenceApplications.id, applicationId));

		// If approved, create residence
		if (decision === "approved") {
			// Check if user already has residence
			const existingResidence = await db.query.residences.findFirst({
				where: and(eq(residences.userId, application.userId), eq(residences.regionId, application.regionId))
			});

			if (!existingResidence) {
				// Check if user has any residences
				const userResidences = await db.query.residences.findMany({
					where: eq(residences.userId, application.userId)
				});

				const isPrimary = userResidences.length === 0 ? 1 : 0;

				await db.insert(residences).values({
					userId: application.userId,
					regionId: application.regionId,
					isPrimary,
					movedInAt: new Date()
				});

				// Update region population
				await db
					.update(regions)
					.set({
						population: (application.region?.population || 0) + 1
					})
					.where(eq(regions.id, application.regionId));
			}
		}

		return { success: true, message: `Application ${decision} successfully` };
	}
};
