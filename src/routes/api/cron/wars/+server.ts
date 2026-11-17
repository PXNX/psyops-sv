// src/routes/api/cron/wars/+server.ts

import type { RequestHandler } from "./$types";
import { resolveWars } from "#lib/server/services/military/war-resolution.service.js";

export const GET: RequestHandler = async () => {
	const now = new Date();
	try {
		const result = await resolveWars(now);

		return Response.json({
			success: true,
			timestamp: now.toISOString(),
			...result
		});
	} catch (error) {
		console.error("War resolution cron job error:", error);
		return Response.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
};
