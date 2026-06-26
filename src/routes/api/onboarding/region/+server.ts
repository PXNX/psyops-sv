import { json, error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { regions, residences, userProfiles } from "$lib/server/schema";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.account) {
		throw error(401, "Unauthorized");
	}

	const body = await request.json();
	const regionId = body.regionId;

	if (!regionId || typeof regionId !== "number") {
		throw error(400, "Invalid region selected");
	}

	const account = locals.account;

	const region = await db.query.regions.findFirst({
		where: eq(regions.id, regionId)
	});

	if (!region) {
		throw error(404, "Region not found");
	}

	const existingResidence = await db.query.residences.findFirst({
		where: eq(residences.userId, account.id)
	});

	if (existingResidence) {
		throw error(400, "You already have a residence");
	}

	await db.transaction(async (tx) => {
		await tx.insert(residences).values({
			userId: account.id,
			regionId: regionId,
			movedInAt: new Date()
		});

		await tx
			.update(userProfiles)
			.set({ onboardingStep: 3, updatedAt: new Date() })
			.where(eq(userProfiles.accountId, account.id));
	});

	return json({ success: true });
};
