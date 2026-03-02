// src/routes/api/push/subscribe/+server.ts
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { subscribeToPushNotifications } from "$lib/server/services/push-notification.service";

export const POST: RequestHandler = async ({ request, locals }) => {
    const account = locals.account;

    if (!account) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { subscription } = await request.json();

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return json({ error: "Invalid subscription data" }, { status: 400 });
        }

        const userAgent = request.headers.get("user-agent") || undefined;

        await subscribeToPushNotifications({
            userId: account.id,
            subscription,
            userAgent
        });

        return json({ success: true });
    } catch (error) {
        console.error("Error subscribing to push notifications:", error);
        return json({ error: "Failed to subscribe" }, { status: 500 });
    }
};
