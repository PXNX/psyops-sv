// src/routes/api/push/unsubscribe/+server.ts
import type { RequestHandler } from "./$types";
import { unsubscribeFromPushNotifications } from "#lib/server/services/push-notification.service.js";

export const POST: RequestHandler = async ({ request, locals }) => {
	const account = locals.account;

	if (!account) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { endpoint } = await request.json();

		if (!endpoint) {
			return Response.json({ error: "Endpoint is required" }, { status: 400 });
		}

		await unsubscribeFromPushNotifications(endpoint);

		return Response.json({ success: true });
	} catch (error) {
		console.error("Error unsubscribing from push notifications:", error);
		return Response.json({ error: "Failed to unsubscribe" }, { status: 500 });
	}
};
