import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { userProfiles, userWallets } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const STARTING_BALANCE = 1000;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const NAME_REGEX = /^[a-zA-Z0-9\s]+$/;

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.account) {
		throw error(401, "Unauthorized");
	}

	const body = await request.json();
	const name = body.name?.trim();

	if (!name || typeof name !== "string") {
		throw error(400, "Name is required");
	}

	if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
		throw error(400, `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`);
	}

	if (!NAME_REGEX.test(name)) {
		throw error(400, "Name must contain only letters, numbers, and spaces");
	}

	const account = locals.account;

	const existingProfile = await db.query.userProfiles.findFirst({
		where: eq(userProfiles.accountId, account.id)
	});

	await db.transaction(async (tx) => {
		if (existingProfile) {
			await tx
				.update(userProfiles)
				.set({ name, onboardingStep: 2, updatedAt: new Date() })
				.where(eq(userProfiles.accountId, account.id));
		} else {
			await tx.insert(userProfiles).values({
				accountId: account.id,
				name,
				onboardingStep: 2
			});
		}

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

	return json({ success: true });
};
