// src/routes/(authenticated)/chat/stream/+server.ts
import { messageNotifier } from "$lib/server/db";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
	const account = locals.account!;

	let heartbeatInterval: NodeJS.Timeout | null = null;
	let unsubscribe: (() => void) | null = null;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			// Safe enqueue wrapper
			const safeEnqueue = (data: string) => {
				try {
					controller.enqueue(encoder.encode(data));
					return true;
				} catch (error) {
					// Controller is closed, ignore
					return false;
				}
			};

			// Send initial connection message
			safeEnqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
			console.log(`SSE connected for user ${account.id}`);

			// Subscribe to notifications for this user
			unsubscribe = messageNotifier.subscribe(account.id, (data) => {
				const success = safeEnqueue(
					`data: ${JSON.stringify({
						type: "new_messages",
						messageType: data.messageType
					})}\n\n`
				);

				// If enqueue failed, controller is closed
				if (!success && unsubscribe) {
					unsubscribe();
					unsubscribe = null;
				}
			});

			// Heartbeat every 30 seconds to keep connection alive
			heartbeatInterval = setInterval(() => {
				const success = safeEnqueue(`: heartbeat\n\n`);

				// If heartbeat failed, clean up
				if (!success) {
					if (heartbeatInterval) {
						clearInterval(heartbeatInterval);
						heartbeatInterval = null;
					}
					if (unsubscribe) {
						unsubscribe();
						unsubscribe = null;
					}
				}
			}, 30000);
		},

		cancel() {
			// Clean up when client disconnects
			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
				heartbeatInterval = null;
			}
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
			console.log(`SSE disconnected for user ${account.id}`);
		}
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive"
		}
	});
};
