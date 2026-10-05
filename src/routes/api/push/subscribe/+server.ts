// src/routes/api/push/subscribe/+server.ts
import type { RequestHandler } from "./$types";
import { subscribeToPushNotifications } from "#lib/server/services/push-notification.service.js";

export const POST: RequestHandler = async ({ request, locals }) => {
	const account = locals.account;

	if (!account) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { subscription } = await request.json();

		if (!subscription || !subscription.endpoint || !subscription.keys) {
			return Response.json({ error: "Invalid subscription data" }, { status: 400 });
		}

		const userAgent = request.headers.get("user-agent") || undefined;

		await subscribeToPushNotifications({
			userId: account.id,
			subscription,
			userAgent
		});

		return Response.json({ success: true });
	} catch (error) {
		console.error("Error subscribing to push notifications:", error);
		return Response.json({ error: "Failed to subscribe" }, { status: 500 });
	}
};
