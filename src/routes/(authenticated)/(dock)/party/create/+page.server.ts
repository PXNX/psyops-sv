// src/routes/party/create/+page.server.ts
import { db } from "$lib/server/db";
import {
	politicalParties,
	partyMembers,
	files,
	residences,
	regions,
	states,
	parliamentaryElections,
	userWallets,
	partyCreationAttempts
} from "$lib/server/schema";
import { redirect, error } from "@sveltejs/kit";
import { eq, and, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { uploadFileFromForm } from "$lib/server/backblaze";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createPartySchema } from "./schema";
import { PARTY_CREATION_CONFIG } from "$lib/config/party";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Check if user already has a party membership
	const existingMembership = await db.query.partyMembers.findFirst({
		where: eq(partyMembers.userId, account.id)
	});

	if (existingMembership) {
		throw redirect(302, `/party/${existingMembership.partyId}`);
	}

	// Get user's residence to determine their region (isPrimary removed)
	const userResidence = await db
		.select({
			regionId: residences.regionId,
			region: regions,
			state: states
		})
		.from(residences)
		.innerJoin(regions, eq(residences.regionId, regions.id))
		.leftJoin(states, eq(regions.stateId, states.id))
		.where(eq(residences.userId, account.id))
		.limit(1)
		.then((rows) => rows[0]);

	if (!userResidence) {
		throw error(400, "You must have a residence before creating a party");
	}

	// Get user's wallet
	const wallet = await db.query.userWallets.findFirst({
		where: eq(userWallets.userId, account.id)
	});

	const userBalance = wallet?.balance ?? 0;
	const canAfford = userBalance >= PARTY_CREATION_CONFIG.COST;

	// Check cooldown
	const lastAttempt = await db.query.partyCreationAttempts.findFirst({
		where: eq(partyCreationAttempts.userId, account.id)
	});

	let cooldownEndsAt: Date | null = null;
	let isOnCooldown = false;

	if (lastAttempt) {
		const cooldownEnd = new Date(lastAttempt.lastAttemptAt);
		cooldownEnd.setDate(cooldownEnd.getDate() + PARTY_CREATION_CONFIG.COOLDOWN_DAYS);

		if (new Date() < cooldownEnd) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd;
		}
	}

	const isIndependentRegion = !userResidence.region.stateId;

	const form = await superValidate(valibot(createPartySchema));

	return {
		form,
		userState: userResidence.state
			? {
					id: userResidence.state.id,
					name: userResidence.state.name,
					logo: userResidence.state.logo
				}
			: null,
		userRegion: {
			id: userResidence.region.id,
			name: getRegionName(userResidence.region.id)
		},
		isIndependentRegion,
		userBalance,
		creationCost: PARTY_CREATION_CONFIG.COST,
		canAfford,
		isOnCooldown,
		cooldownEndsAt: cooldownEndsAt?.toISOString() ?? null,
		cooldownDays: PARTY_CREATION_CONFIG.COOLDOWN_DAYS
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(createPartySchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, abbreviation, color, ideology, description, logo } = form.data;

		// Get user's wallet
		const wallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		const userBalance = wallet?.balance ?? 0;

		// Check if user can afford
		if (userBalance < PARTY_CREATION_CONFIG.COST) {
			return message(
				form,
				`Insufficient funds. You need ${PARTY_CREATION_CONFIG.COST.toLocaleString()} currency to create a party.`,
				{ status: 400 }
			);
		}

		// Check cooldown
		const lastAttempt = await db.query.partyCreationAttempts.findFirst({
			where: eq(partyCreationAttempts.userId, account.id)
		});

		if (lastAttempt) {
			const cooldownEnd = new Date(lastAttempt.lastAttemptAt);
			cooldownEnd.setDate(cooldownEnd.getDate() + PARTY_CREATION_CONFIG.COOLDOWN_DAYS);

			if (new Date() < cooldownEnd) {
				const daysRemaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
				return message(form, `You must wait ${daysRemaining} more day(s) before creating another party.`, {
					status: 400
				});
			}
		}

		// Get user's residence (isPrimary removed)
		const userResidence = await db
			.select({
				regionId: residences.regionId,
				region: regions,
				state: states
			})
			.from(residences)
			.innerJoin(regions, eq(residences.regionId, regions.id))
			.leftJoin(states, eq(regions.stateId, states.id))
			.where(eq(residences.userId, account.id))
			.limit(1)
			.then((rows) => rows[0]);

		if (!userResidence) {
			return message(form, "You must have a residence before creating a party", {
				status: 400
			});
		}

		const isIndependentRegion = !userResidence.region.stateId;
		const regionId = userResidence.regionId;
		const stateId = userResidence.region.stateId;

		// Check if party name already exists
		const existingParty = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.name, name)
		});

		if (existingParty) {
			return message(form, "A party with this name already exists", { status: 400 });
		}

		// Check if user already in a party
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (existingMembership) {
			return message(form, "You are already a member of a political party", { status: 400 });
		}

		// Use transaction for everything
		const newParty = await db.transaction(async (tx) => {
			// Deduct cost from wallet
			await tx
				.update(userWallets)
				.set({
					balance: userBalance - PARTY_CREATION_CONFIG.COST,
					updatedAt: new Date()
				})
				.where(eq(userWallets.userId, account.id));

			// Update or create cooldown record
			if (lastAttempt) {
				await tx
					.update(partyCreationAttempts)
					.set({ lastAttemptAt: new Date() })
					.where(eq(partyCreationAttempts.userId, account.id));
			} else {
				await tx.insert(partyCreationAttempts).values({
					userId: account.id,
					lastAttemptAt: new Date()
				});
			}

			let logoFileId: number | null = null;

			// Upload logo if provided
			if (logo) {
				const logoUploadResult = await uploadFileFromForm(logo);

				if (!logoUploadResult.success) {
					tx.rollback();
					return null;
				}

				// Create file record in database
				const [fileRecord] = await tx
					.insert(files)
					.values({
						key: logoUploadResult.key,
						fileName: logo.name,
						contentType: "image/webp",
						sizeBytes: logo.size,
						uploadedBy: account.id
					})
					.returning();
				logoFileId = fileRecord.id;
			}

			// If independent region, create state first
			let finalStateId: number | null = stateId;
			let isNewState = false;

			if (isIndependentRegion) {
				const region = await tx.query.regions.findFirst({
					where: eq(regions.id, regionId)
				});

				if (!region) {
					tx.rollback();
					return null;
				}

				// Create new state
				const [newState] = await tx
					.insert(states)
					.values({
						name: `State of ${regionId}`
					})
					.returning();

				// Link region to state
				await tx.update(regions).set({ stateId: newState.id }).where(eq(regions.id, regionId));

				finalStateId = newState.id;
				isNewState = true;
			}

			// Ensure finalStateId is not null
			if (!finalStateId) {
				tx.rollback();
				return null;
			}

			// Create the party
			const [party] = await tx
				.insert(politicalParties)
				.values({
					name,
					abbreviation: abbreviation || null,
					color,
					logo: logoFileId,
					ideology,
					description: description || null,
					founderId: account.id,
					stateId: finalStateId,
					memberCount: 1
				})
				.returning();

			// Add founder as party leader
			await tx.insert(partyMembers).values({
				userId: account.id,
				partyId: party.id,
				role: "leader"
			});

			// If this is a new state, automatically schedule inaugural election
			if (isNewState && finalStateId) {
				const now = new Date();
				// Election starts in 3 days (72 hours)
				const startDate = new Date(now);
				startDate.setDate(startDate.getDate() + 3);
				startDate.setHours(0, 0, 0, 0);

				// Election runs for 2 days
				const endDate = new Date(startDate);
				endDate.setDate(endDate.getDate() + 2);
				endDate.setHours(23, 59, 59, 999);

				// Create inaugural election with default 50 seats
				await tx.insert(parliamentaryElections).values({
					stateId: finalStateId,
					startDate,
					endDate,
					status: "scheduled",
					totalSeats: 50,
					isInaugural: true
				});
			}

			return party;
		});

		if (!newParty) {
			return message(form, "Failed to create party", { status: 500 });
		}

		// Redirect to the new party page
		throw redirect(303, `/party/${newParty.id}`);
	}
};
