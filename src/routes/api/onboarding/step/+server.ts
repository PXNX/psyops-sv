import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { userProfiles, userWallets } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const STARTING_BALANCE = 1000;

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.account) {
		throw error(401, "Unauthorized");
	}

	const body = await request.json();
	const step: number | null = body.step;

	if (step !== null && (typeof step !== "number" || step < 0 || step > 6)) {
		throw error(400, "Invalid step");
	}

	const account = locals.account;

	const existingProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	if (existingProfile) {
		await db
			.update(userProfiles)
			.set({ onboardingStep: step, updatedAt: new Date() })
			.where(eq(userProfiles.accountId, account.id));
	} else {
		await db.transaction(async (tx) => {
			await tx.insert(userProfiles).values({
				accountId: account.id,
				name: "New user",
				onboardingStep: step
			});

			const existingWallet = await tx.query.userWallets.findFirst({
				where: eq(userWallets.userId, account.id)
			});

			if (!existingWallet) {
				await tx.insert(userWallets).values({
					userId: account.id,
					balance: STARTING_BALANCE,
					updatedAt: new Date()
				});
			}
		});
	}

	return json({ success: true });
};
