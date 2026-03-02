// src/routes/api/push/unsubscribe/+server.ts
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { unsubscribeFromPushNotifications } from "$lib/server/services/push-notification.service";

export const POST: RequestHandler = async ({ request, locals }) => {
    const account = locals.account;

    if (!account) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { endpoint } = await request.json();

        if (!endpoint) {
            return json({ error: "Endpoint is required" }, { status: 400 });
        }

        await unsubscribeFromPushNotifications(endpoint);

        return json({ success: true });
    } catch (error) {
        console.error("Error unsubscribing from push notifications:", error);
        return json({ error: "Failed to unsubscribe" }, { status: 500 });
    }
};
