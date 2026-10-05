// src/routes/party/[id]/edit/+page.server.ts - UPDATED VERSION
import { db } from "#lib/server/db.js";
import { politicalParties, partyMembers, userWallets, partyEditHistory } from "#lib/server/schema.js";
import { redirect, error, fail } from "@sveltejs/kit";
import { eq, and, ne, sql } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { getLogoUrl } from "#lib/server/backblaze.js";
import { getContext } from "#lib/server/context.js";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createPartySchema } from "./schema";

// Configuration constants
const EDIT_COST = 5000;
const COOLDOWN_HOURS = 24;

export const load: PageServerLoad = async ({ params, locals }) => {
	const account = locals.account!;
	const partyId = parseInt(params.id);

	// Party and leadership lookups run in parallel; each check fails as soon as its inputs resolve
	const partyPromise = db.query.politicalParties
		.findFirst({
			where: eq(politicalParties.id, partyId),
			with: {
				state: true,
				founder: {
					with: {
						profile: true
					}
				}
			}
		})
		.then((p) => p ?? error(404, "Party not found"));

	const [party] = await Promise.all([
		partyPromise,
		// Check if user is the leader (404 takes precedence)
		Promise.all([
			partyPromise,
			db.query.partyMembers.findFirst({
				where: and(eq(partyMembers.userId, account.id), eq(partyMembers.partyId, partyId))
			})
		]).then(([, membership]) => {
			if (!membership || membership.role !== "leader") {
				error(403, "Only the party leader can edit the party");
			}
		})
	]);

	const [userWallet, editHistory, logoUrl, form] = await Promise.all([
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
		getLogoUrl(party.logo),
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

	let isOnCooldown = false;
	let cooldownEndsAt: string | null = null;

	if (editHistory) {
		const cooldownEnd = new Date(editHistory.lastEditAt);
		cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

		if (cooldownEnd > new Date()) {
			isOnCooldown = true;
			cooldownEndsAt = cooldownEnd.toISOString();
		}
	}

	// Check if user can afford the edit
	const canAfford = userWallet.balance >= EDIT_COST;

	return {
		form,
		party: {
			id: party.id,
			name: party.name,
			abbreviation: party.abbreviation,
			color: party.color,
			logoUrl,
			ideology: party.ideology,
			description: party.description,
			memberCount: party.memberCount,
			state: {
				id: party.state.id,
				name: party.state.name
			}
		},
		isOnCooldown,
		cooldownEndsAt,
		canAfford,
		userBalance: userWallet.balance,
		editCost: EDIT_COST,
		cooldownHours: COOLDOWN_HOURS
	};
};

export const actions: Actions = {
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
			cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

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
