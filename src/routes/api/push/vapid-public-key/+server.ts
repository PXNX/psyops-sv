// src/routes/api/push/vapid-public-key/+server.ts
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVapidPublicKey } from "$lib/server/services/push-notification.service";

export const GET: RequestHandler = async () => {
    return json({ publicKey: getVapidPublicKey() });
};
