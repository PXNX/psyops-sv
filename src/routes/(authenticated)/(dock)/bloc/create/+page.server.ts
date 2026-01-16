// src/routes/(authenticated)/(dock)/bloc/create/+page.server.ts
import { db } from "$lib/server/db";
import { blocs, states, presidents, blocActionCooldowns } from "$lib/server/schema";
import { error, redirect } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import type { PageServerLoad, Actions } from "./$types";
import { superValidate, message } from "sveltekit-superforms";
import { valibot } from "sveltekit-superforms/adapters";
import { createBlocSchema } from "./schema";

export const load: PageServerLoad = async ({ locals }) => {
	const account = locals.account!;

	// Check if user is a president
	const [presidency] = await db
		.select({
			stateId: presidents.stateId,
			stateName: states.name,
			currentBlocId: states.blocId
		})
		.from(presidents)
		.innerJoin(states, eq(presidents.stateId, states.id))
		.where(eq(presidents.userId, account.id))
		.limit(1);

	if (!presidency) {
		error(403, "Only state presidents can create blocs");
	}

	if (presidency.currentBlocId) {
		error(400, "Your state is already in a bloc. Leave it first to create a new one.");
	}

	// Check cooldown (24 hours)
	const [cooldown] = await db
		.select()
		.from(blocActionCooldowns)
		.where(eq(blocActionCooldowns.userId, account.id))
		.limit(1);

	const now = new Date();
	const cooldownEndTime = cooldown ? new Date(cooldown.lastActionAt.getTime() + 24 * 60 * 60 * 1000) : null;

	const onCooldown = cooldownEndTime && now < cooldownEndTime;
	const timeRemaining = onCooldown ? Math.ceil((cooldownEndTime!.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;

	const form = await superValidate(valibot(createBlocSchema));

	return {
		form,
		state: {
			id: presidency.stateId,
			name: presidency.stateName
		},
		onCooldown,
		timeRemaining
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const account = locals.account!;
		const form = await superValidate(request, valibot(createBlocSchema));

		if (!form.valid) {
			return message(form, "Please fix the validation errors", { status: 400 });
		}

		// Verify user is president
		const [presidency] = await db
			.select({ stateId: presidents.stateId })
			.from(presidents)
			.innerJoin(states, eq(presidents.stateId, states.id))
			.where(eq(presidents.userId, account.id))
			.limit(1);

		if (!presidency) {
			return message(form, "Only state presidents can create blocs", { status: 403 });
		}

		// Check cooldown
		const [cooldown] = await db
			.select()
			.from(blocActionCooldowns)
			.where(eq(blocActionCooldowns.userId, account.id))
			.limit(1);

		const now = new Date();
		if (cooldown) {
			const cooldownEnd = new Date(cooldown.lastActionAt.getTime() + 24 * 60 * 60 * 1000);
			if (now < cooldownEnd) {
				const hoursLeft = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60));
				return message(form, `Please wait ${hoursLeft} hours before creating/joining/leaving a bloc`, {
					status: 429
				});
			}
		}

		const { name, color, description } = form.data;

		// Check if name already exists
		const [existing] = await db.select().from(blocs).where(eq(blocs.name, name)).limit(1);

		if (existing) {
			return message(form, "A bloc with this name already exists", { status: 400 });
		}

		try {
			const result = await db.transaction(async (tx) => {
				// Create the bloc
				const [newBloc] = await tx
					.insert(blocs)
					.values({
						name,
						color,
						description: description || null
					})
					.returning();

				// Add state to bloc
				await tx.update(states).set({ blocId: newBloc.id }).where(eq(states.id, presidency.stateId));

				// Update cooldown
				await tx
					.insert(blocActionCooldowns)
					.values({
						userId: account.id,
						lastActionAt: now
					})
					.onConflictDoUpdate({
						target: blocActionCooldowns.userId,
						set: { lastActionAt: now }
					});

				return newBloc;
			});

			redirect(303, `/bloc/${result.id}`);
		} catch (e) {
			console.error("Error creating bloc:", e);
			return message(form, "Failed to create bloc", { status: 500 });
		}
	}
};
