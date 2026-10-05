// src/routes/api/push/vapid-public-key/+server.ts
import type { RequestHandler } from "./$types";
import { getVapidPublicKey } from "#lib/server/services/push-notification.service.js";

export const GET: RequestHandler = async () => {
	return Response.json({ publicKey: getVapidPublicKey() });
};
