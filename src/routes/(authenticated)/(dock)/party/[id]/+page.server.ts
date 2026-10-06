// src/routes/party/[id]/+page.server.ts
import { db } from "#lib/server/db.js";
import {
	politicalParties,
	partyMembers,
	partyMembershipApplications,
	partyEditHistory,
	userWallets,
	files,
	userProfiles
} from "#lib/server/schema.js";
import { and, eq, ne, sql, count } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getLogoUrl, getSignedDownloadUrl } from "#lib/server/backblaze.js";
import { getContext } from "#lib/server/context.js";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createPartySchema } from "../create/schema";

// Configuration constants for the party edit flow (ported from the old /edit route).
const EDIT_COST = 5000;
const EDIT_COOLDOWN_HOURS = 24;

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account;
	const partyId = parseInt(params.id);

	// Get party details
	const party = await db.query.politicalParties.findFirst({
		where: eq(politicalParties.id, partyId),
		with: {
			state: true,
			founder: {
				with: {
					profile: true
				}
			}
		}
	});

	if (!party) {
		throw error(404, "Party not found");
	}

	// Logo, members and party ranking only depend on the party, so fetch them in parallel
	const [logoUrl, members, allPartiesWithCounts] = await Promise.all([
		// Get party logo URL if exists
		(async () => {
			if (!party.logo) return null;
			const logoFile = await db.query.files.findFirst({
				where: eq(files.id, party.logo)
			});
			if (!logoFile) return null;
			try {
				return await getSignedDownloadUrl(logoFile.key);
			} catch {
				return null;
			}
		})(),

		// Get all party members with their profiles
		db
			.select({
				id: partyMembers.id,
				userId: partyMembers.userId,
				role: partyMembers.role,
				joinedAt: partyMembers.joinedAt
			})
			.from(partyMembers)
			.where(eq(partyMembers.partyId, partyId))
			.orderBy(sql`${partyMembers.joinedAt} DESC`),

		// Calculate party rank - get all parties with their member counts
		db
			.select({
				id: politicalParties.id,
				memberCount: count(partyMembers.id)
			})
			.from(politicalParties)
			.leftJoin(partyMembers, eq(politicalParties.id, partyMembers.partyId))
			.where(eq(politicalParties.stateId, party.stateId))
			.groupBy(politicalParties.id)
			.orderBy(sql`count(${partyMembers.id}) DESC`)
	]);

	// Calculate member count
	const memberCount = members.length;

	const membership = account ? members.find((m) => m.userId === account.id) : undefined;

	const [membersWithProfiles, otherPartyStatus] = await Promise.all([
		// Get user profiles for all members
		Promise.all(
			members.map(async (member) => {
				const userProfile = await db.query.userProfiles.findFirst({
					where: eq(userProfiles.accountId, member.userId)
				});

				// Get logo URL if exists
				let logoUrl = null;
				if (userProfile?.logo) {
					const logoFile = await db.query.files.findFirst({
						where: eq(files.id, userProfile.logo)
					});
					if (logoFile) {
						try {
							logoUrl = await getSignedDownloadUrl(logoFile.key);
						} catch {
							logoUrl = null;
						}
					}
				}

				return {
					id: member.id,
					userId: member.userId,
					role: member.role,
					joinedAt: member.joinedAt.toISOString(),
					user: {
						profile: userProfile
							? {
									name: userProfile.name,
									logo: logoUrl
								}
							: null
					}
				};
			})
		),

		// Non-members: check existing membership elsewhere and pending application to this party
		account && !membership
			? Promise.all([
					db.query.partyMembers.findFirst({
						where: eq(partyMembers.userId, account.id)
					}),
					db.query.partyMembershipApplications.findFirst({
						where: and(
							eq(partyMembershipApplications.userId, account.id),
							eq(partyMembershipApplications.partyId, partyId),
							eq(partyMembershipApplications.status, "pending")
						)
					})
				])
			: null
	]);

	// Check if current user is a member
	let isMember = false;
	let isLeader = false;
	let memberSince = null;
	let canJoin = false;
	let hasApplied = false;

	if (account) {
		if (membership) {
			isMember = true;
			isLeader = membership.role === "leader";
			memberSince = membership.joinedAt.toISOString();
		} else if (otherPartyStatus) {
			const [existingMembership, existingApplication] = otherPartyStatus;
			hasApplied = !!existingApplication;
			canJoin = !existingMembership && !hasApplied;
		}
	}

	const partyRank = allPartiesWithCounts.findIndex((p) => p.id === partyId) + 1;

	// Data for the "Edit Party" bottom sheet — only needed for the party leader.
	let editForm: Awaited<ReturnType<typeof superValidate<typeof createPartySchema>>> | null = null;
	let partyEditCost = EDIT_COST;
	let partyEditUserBalance = 0;
	let canAffordPartyEdit = false;
	let isPartyEditOnCooldown = false;
	let partyEditCooldownEndsAt: string | null = null;

	if (isLeader && account) {
		const [userWallet, editHistory, form] = await Promise.all([
			// Get user's wallet balance, creating it if it doesn't exist
			(async () => {
				const wallet = await db.query.userWallets.findFirst({
					where: eq(userWallets.userId, account.id)
				});
				if (wallet) return wallet;
				const [newWallet] = await db
					.insert(userWallets)
					.values({
						userId: account.id,
						balance: 10000
					})
					.returning();
				return newWallet;
			})(),
			// Check if party is on cooldown
			db.query.partyEditHistory.findFirst({
				where: eq(partyEditHistory.partyId, partyId)
			}),
			// Populate form with existing data - handle null values properly
			superValidate(
				{
					name: party.name,
					abbreviation: party.abbreviation ?? "",
					color: party.color,
					ideology: party.ideology ?? "",
					description: party.description ?? ""
				},
				valibot(createPartySchema)
			)
		]);

		editForm = form;
		partyEditUserBalance = userWallet.balance;
		canAffordPartyEdit = partyEditUserBalance >= EDIT_COST;

		if (editHistory) {
			const cooldownEnd = new Date(editHistory.lastEditAt);
			cooldownEnd.setHours(cooldownEnd.getHours() + EDIT_COOLDOWN_HOURS);
			if (cooldownEnd > new Date()) {
				isPartyEditOnCooldown = true;
				partyEditCooldownEndsAt = cooldownEnd.toISOString();
			}
		}
	}

	return {
		editForm,
		partyEditCost,
		partyEditUserBalance,
		canAffordPartyEdit,
		isPartyEditOnCooldown,
		partyEditCooldownEndsAt,
		partyEditCooldownHours: EDIT_COOLDOWN_HOURS,
		party: {
			id: party.id,
			name: party.name,
			abbreviation: party.abbreviation,
			color: party.color,
			logoUrl,
			ideology: party.ideology,
			description: party.description,
			foundedAt: party.foundedAt.toISOString(),
			memberCount,
			autoAcceptMembers: party.autoAcceptMembers,
			state: {
				id: party.state.id,
				name: party.state.name,
				logo: await getLogoUrl(party.state.logo)
			}
		},
		members: membersWithProfiles,
		isMember,
		isLeader,
		memberSince,
		canJoin,
		hasApplied,
		partyRank,
		parliamentSeats: 0
	};
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "You must be logged in to join a party" });
		}

		const partyId = parseInt(params.id);

		// Check if user already in a party
		const existingMembership = await db.query.partyMembers.findFirst({
			where: eq(partyMembers.userId, account.id)
		});

		if (existingMembership) {
			return fail(400, { error: "You are already a member of another party" });
		}

		// Check if user has already applied
		const existingApplication = await db.query.partyMembershipApplications.findFirst({
			where: and(
				eq(partyMembershipApplications.userId, account.id),
				eq(partyMembershipApplications.partyId, partyId),
				eq(partyMembershipApplications.status, "pending")
			)
		});

		if (existingApplication) {
			return fail(400, { error: "You already have a pending application to this party" });
		}

		// Check if party exists
		const party = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.id, partyId)
		});

		if (!party) {
			return fail(404, { error: "Party not found" });
		}

		try {
			if (party.autoAcceptMembers) {
				// Auto-accept: Add user directly as member
				await db.insert(partyMembers).values({
					userId: account.id,
					partyId,
					role: "member",
					acceptedBy: party.founderId // Founder is credited with auto-accepts
				});

				return { success: "Successfully joined the party!" };
			} else {
				// Manual approval: Create application
				await db.insert(partyMembershipApplications).values({
					userId: account.id,
					partyId,
					status: "pending"
				});

				return { success: "Application submitted! Waiting for approval from party leadership." };
			}
		} catch (error) {
			console.error("Join party error:", error);
			return fail(500, { error: "Failed to join party" });
		}
	},

	leave: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "You must be logged in" });
		}

		const partyId = parseInt(params.id);

		try {
			// Check if user is a member
			const membership = await db.query.partyMembers.findFirst({
				where: and(eq(partyMembers.userId, account.id), eq(partyMembers.partyId, partyId))
			});

			if (!membership) {
				return fail(400, { error: "You are not a member of this party" });
			}

			// Prevent leader from leaving (they must delete party if alone or transfer leadership)
			if (membership.role === "leader") {
				return fail(400, {
					error: "Party leaders cannot leave. Delete the party or transfer leadership first."
				});
			}

			// Remove membership
			await db.delete(partyMembers).where(eq(partyMembers.id, membership.id));
		} catch (err) {
			// Re-throw redirect errors
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Leave party error:", err);
			return fail(500, { error: "Failed to leave party" });
		}

		redirect(303, "/party");
	},

	delete: async ({ params, locals }) => {
		const account = locals.account;
		if (!account) {
			return fail(401, { error: "You must be logged in" });
		}

		const partyId = parseInt(params.id);

		try {
			// Get party details
			const party = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.id, partyId),
				with: {
					members: true
				}
			});

			if (!party) {
				return fail(404, { error: "Party not found" });
			}

			// Check if user is the leader
			const membership = party.members.find((m) => m.userId === account.id);
			if (!membership || membership.role !== "leader") {
				return fail(403, { error: "Only the party leader can delete the party" });
			}

			// Check if leader is the only member
			if (party.members.length > 1) {
				return fail(400, { error: "Cannot delete party with other members. All members must leave first." });
			}

			// Delete party (cascade will handle party members)
			await db.delete(politicalParties).where(eq(politicalParties.id, partyId));
		} catch (err) {
			// Re-throw redirect errors
			if (err instanceof Response && err.status === 303) {
				throw err;
			}
			console.error("Delete party error:", err);
			return fail(500, { error: "Failed to delete party" });
		}

		redirect(303, "/party");
	},

	update: async ({ request, params, locals }) => {
		const account = locals.account!;
		const partyId = parseInt(params.id);
		const form = await superValidate(request, valibot(createPartySchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		const { name, abbreviation, color, ideology, description, logo } = form.data;

		// Get party and verify leadership
		const party = await db.query.politicalParties.findFirst({
			where: eq(politicalParties.id, partyId),
			with: {
				members: true
			}
		});

		if (!party) {
			return message(form, "Party not found", { status: 404 });
		}

		const membership = party.members.find((m) => m.userId === account.id);
		if (!membership || membership.role !== "leader") {
			return message(form, "Only the party leader can edit the party", { status: 403 });
		}

		// Check cooldown
		const editHistory = await db.query.partyEditHistory.findFirst({
			where: eq(partyEditHistory.partyId, partyId)
		});

		if (editHistory) {
			const cooldownEnd = new Date(editHistory.lastEditAt);
			cooldownEnd.setHours(cooldownEnd.getHours() + EDIT_COOLDOWN_HOURS);

			if (cooldownEnd > new Date()) {
				const minutesLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60));
				return message(form, `Please wait ${minutesLeft} minutes before editing again`, { status: 400 });
			}
		}

		// Check user has sufficient funds
		const userWallet = await db.query.userWallets.findFirst({
			where: eq(userWallets.userId, account.id)
		});

		if (!userWallet || userWallet.balance < EDIT_COST) {
			return message(form, "Insufficient funds to edit party", { status: 400 });
		}

		// Check if new name conflicts with another party
		if (name !== party.name) {
			const existingParty = await db.query.politicalParties.findFirst({
				where: eq(politicalParties.name, name)
			});

			if (existingParty) {
				return message(form, "A party with this name already exists", { status: 400 });
			}
		}

		// Abbreviations only need to be unique within the party's own state.
		if (abbreviation && party.stateId) {
			const existingAbbreviation = await db.query.politicalParties.findFirst({
				where: and(
					eq(politicalParties.stateId, party.stateId),
					ne(politicalParties.id, partyId),
					sql`lower(${politicalParties.abbreviation}) = lower(${abbreviation})`
				)
			});

			if (existingAbbreviation) {
				return message(form, `The abbreviation "${abbreviation}" is already used by another party in this state`, {
					status: 400
				});
			}
		}

		try {
			await db.transaction(async (tx) => {
				// Upload new logo and delete old one if it exists
				const fileService = getContext().services.file;
				const logoFileId = await fileService.replaceLogoInTransaction(tx, logo, account.id, party.logo);

				// Deduct cost from user's wallet
				await tx
					.update(userWallets)
					.set({
						balance: sql`${userWallets.balance} - ${EDIT_COST}`,
						updatedAt: new Date()
					})
					.where(eq(userWallets.userId, account.id));

				// Update party
				await tx
					.update(politicalParties)
					.set({
						name,
						abbreviation: abbreviation || null,
						color,
						...(logoFileId ? { logo: logoFileId } : {}),
						ideology: ideology || null,
						description: description || null
					})
					.where(eq(politicalParties.id, partyId));

				// Update or create edit history
				if (editHistory) {
					await tx
						.update(partyEditHistory)
						.set({
							lastEditAt: new Date(),
							lastEditBy: account.id
						})
						.where(eq(partyEditHistory.partyId, partyId));
				} else {
					await tx.insert(partyEditHistory).values({
						partyId,
						lastEditAt: new Date(),
						lastEditBy: account.id
					});
				}
			});

			return message(form, "Party updated successfully!");
		} catch (err) {
			console.error("Update party error:", err);
			return message(form, "Failed to update party", { status: 500 });
		}
	}
};
