// src/routes/(authenticated)/api/travel/arrive/+server.ts

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { userTravels, residences, regions, states } from "$lib/server/schema";
import { eq, and } from "drizzle-orm";
import { sendNotificationIfEnabled } from "$lib/server/services/push-notification.service";

export const POST: RequestHandler = async ({ locals }) => {
	try {
		const account = locals.account;
		if (!account) {
			return json({ success: false, error: "Not authenticated" }, { status: 401 });
		}

		// Find active travel for this user
		const activeTravel = await db.query.userTravels.findFirst({
			where: and(eq(userTravels.userId, account.id), eq(userTravels.status, "in_progress"))
		});

		if (!activeTravel) {
			return json({ success: false, error: "No active travel found" }, { status: 400 });
		}

		// Verify that the arrival time has actually passed (server-side validation)
		const now = new Date();
		if (now < new Date(activeTravel.arrivalTime)) {
			return json(
				{
					success: false,
					error: "Travel has not completed yet",
					timeRemaining: Math.ceil((new Date(activeTravel.arrivalTime).getTime() - now.getTime()) / 1000)
				},
				{ status: 400 }
			);
		}

		// Check if user has a residence record
		const existingResidence = await db.query.residences.findFirst({
			where: eq(residences.userId, account.id)
		});

		if (existingResidence) {
			// Update existing residence
			await db
				.update(residences)
				.set({
					regionId: activeTravel.toRegionId,
					movedInAt: new Date()
				})
				.where(eq(residences.userId, account.id));
		} else {
			// Create new residence (shouldn't happen normally, but handle it)
			await db.insert(residences).values({
				userId: account.id,
				regionId: activeTravel.toRegionId,
				movedInAt: new Date()
			});
		}

		// Mark travel as completed
		await db.update(userTravels).set({ status: "completed" }).where(eq(userTravels.id, activeTravel.id));

		// Resolve destination name for the push notification
		const [destinationRegion] = await db
			.select({ stateName: states.name })
			.from(regions)
			.innerJoin(states, eq(regions.stateId, states.id))
			.where(eq(regions.id, activeTravel.toRegionId));
		const destinationName = destinationRegion?.stateName ?? "your destination";

		await sendNotificationIfEnabled(account.id, "notifyTravelComplete", {
			title: "✈️ Arrived!",
			body: `You have arrived in ${destinationName}.`,
			icon: "/favicon.png",
			badge: "/badge.png",
			data: {
				url: "/travel",
				tag: "travel-arrival"
			}
		});

		return json({
			success: true,
			message: "Successfully arrived at destination",
			regionId: activeTravel.toRegionId,
			travelId: activeTravel.id
		});
	} catch (error) {
		console.error("Travel arrival error:", error);
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
};
