// src/routes/(authenticated)/api/cron/travels/+server.ts

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { userTravels, residences } from "$lib/server/schema";
import { eq, and, lte } from "drizzle-orm";

export const GET: RequestHandler = async ({ request }) => {
	try {
		const now = new Date();
		let completed = 0;
		let failed = 0;

		// Find all in-progress travels that have arrived
		const arrivedTravels = await db
			.select()
			.from(userTravels)
			.where(and(eq(userTravels.status, "in_progress"), lte(userTravels.arrivalTime, now)));

		console.log(`Found ${arrivedTravels.length} completed travel(s) to process`);

		for (const travel of arrivedTravels) {
			try {
				await processTravel(travel);
				completed++;
				console.log(`✅ Completed travel ${travel.id} for user ${travel.userId} to region ${travel.toRegionId}`);
			} catch (error) {
				failed++;
				console.error(`❌ Failed to process travel ${travel.id}:`, error);
			}
		}

		return json({
			success: true,
			timestamp: now.toISOString(),
			travelsCompleted: completed,
			travelsFailed: failed,
			totalProcessed: arrivedTravels.length
		});
	} catch (error) {
		console.error("Travel completion cron job error:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
};

async function processTravel(travel: any) {
	console.log(`Processing travel ${travel.id}: User ${travel.userId} arriving at region ${travel.toRegionId}`);

	// Check if user still exists (safety check)
	const existingResidence = await db.select().from(residences).where(eq(residences.userId, travel.userId)).limit(1);

	if (existingResidence.length > 0) {
		// Update existing residence
		await db
			.update(residences)
			.set({
				regionId: travel.toRegionId,
				movedInAt: new Date()
			})
			.where(eq(residences.userId, travel.userId));

		console.log(`  ✓ Updated residence for user ${travel.userId}`);
	} else {
		// Create new residence (shouldn't happen normally, but handle it)
		await db.insert(residences).values({
			userId: travel.userId,
			regionId: travel.toRegionId,
			movedInAt: new Date()
		});

		console.log(`  ✓ Created new residence for user ${travel.userId}`);
	}

	// Mark travel as completed
	await db.update(userTravels).set({ status: "completed" }).where(eq(userTravels.id, travel.id));

	console.log(`  ✓ Marked travel ${travel.id} as completed`);
}
