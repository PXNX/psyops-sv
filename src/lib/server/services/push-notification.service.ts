// src/lib/server/services/push-notification.service.ts
import webpush from "web-push";
import { db } from "$lib/server/db";
import { env } from "$env/dynamic/private";
import { pushSubscriptions, newspaperSubscriptions, accounts } from "$lib/server/schema";
import { eq, and } from "drizzle-orm";

// Set VAPID details (these should be in environment variables in production)
// You'll need to generate these keys using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY =
    env.VAPID_PUBLIC_KEY ||
    "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBrXhqhbdq5sM1ZG5Eyk";
const VAPID_PRIVATE_KEY =
    env.VAPID_PRIVATE_KEY || "UUxI4O8-FbRouAevSmBQ6O7eDr5PO4p3vxO6bFPzSKk";
const VAPID_SUBJECT = env.VAPID_SUBJECT || "mailto:admin@psyops.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: {
        url?: string;
        articleId?: number;
        newspaperId?: number;
        [key: string]: any;
    };
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotificationToUser(
    userId: string,
    payload: PushNotificationPayload
): Promise<void> {
    // Get all subscriptions for the user
    const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

    const notificationPayload = JSON.stringify(payload);

    // Send to all user's devices
    const sendPromises = subscriptions.map(async (sub) => {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dhKey,
                        auth: sub.authKey
                    }
                },
                notificationPayload
            );
        } catch (error: any) {
            // If the subscription is no longer valid (410 Gone), remove it
            if (error.statusCode === 410) {
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            } else {
                console.error(`Error sending push notification to user ${userId}:`, error);
            }
        }
    });

    await Promise.allSettled(sendPromises);
}

/**
 * Send push notifications to all subscribers of a newspaper about a new article
 */
export async function notifyNewspaperSubscribers(params: {
    newspaperId: number;
    newspaperName: string;
    articleId: number;
    articleTitle: string;
}): Promise<void> {
    const { newspaperId, newspaperName, articleId, articleTitle } = params;

    // Get all users subscribed to this newspaper who have notifications enabled
    const subscribers = await db
        .select({ userId: newspaperSubscriptions.userId })
        .from(newspaperSubscriptions)
        .innerJoin(accounts, eq(newspaperSubscriptions.userId, accounts.id))
        .where(
            and(
                eq(newspaperSubscriptions.newspaperId, newspaperId),
                eq(accounts.notifyNewspaperPosts, true)
            )
        );

    // Create notification payload
    const payload: PushNotificationPayload = {
        title: `📰 ${newspaperName}`,
        body: articleTitle,
        icon: "/favicon.png",
        badge: "/badge.png",
        data: {
            url: `/posts/${articleId}`,
            articleId,
            newspaperId
        }
    };

    // Send notifications to all subscribers
    const notificationPromises = subscribers.map((subscriber) =>
        sendPushNotificationToUser(subscriber.userId, payload)
    );

    await Promise.allSettled(notificationPromises);
}

/**
 * Subscribe a user to push notifications
 */
export async function subscribeToPushNotifications(params: {
    userId: string;
    subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    };
    userAgent?: string;
}): Promise<void> {
    const { userId, subscription, userAgent } = params;

    // Check if this endpoint already exists
    const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .limit(1);

    if (existing.length > 0) {
        // Update existing subscription
        await db
            .update(pushSubscriptions)
            .set({
                userId,
                p256dhKey: subscription.keys.p256dh,
                authKey: subscription.keys.auth,
                userAgent,
                subscribedAt: new Date()
            })
            .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
        // Create new subscription
        await db.insert(pushSubscriptions).values({
            userId,
            endpoint: subscription.endpoint,
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
            userAgent
        });
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

/**
 * Get the VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
}
