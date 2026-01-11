// src/lib/server/db.ts (update your existing file)
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL } from "$env/static/private";
import * as schema from "./schema";

// For query purposes
const queryClient = postgres(DATABASE_URL);
export const db = drizzle(queryClient, { schema });

// In-memory event emitter for real-time notifications
class MessageNotifier {
	private listeners = new Map<string, Set<(data: any) => void>>();

	subscribe(userId: string, callback: (data: any) => void) {
		if (!this.listeners.has(userId)) {
			this.listeners.set(userId, new Set());
		}
		this.listeners.get(userId)!.add(callback);

		return () => {
			const userListeners = this.listeners.get(userId);
			if (userListeners) {
				userListeners.delete(callback);
				if (userListeners.size === 0) {
					this.listeners.delete(userId);
				}
			}
		};
	}

	notify(userIds: string[], data: any) {
		for (const userId of userIds) {
			const userListeners = this.listeners.get(userId);
			if (userListeners) {
				userListeners.forEach((callback) => {
					try {
						callback(data);
					} catch (error) {
						console.error("Notification error:", error);
					}
				});
			}
		}
	}

	notifyAll(data: any) {
		this.listeners.forEach((callbacks) => {
			callbacks.forEach((callback) => {
				try {
					callback(data);
				} catch (error) {
					console.error("Notification error:", error);
				}
			});
		});
	}
}

export const messageNotifier = new MessageNotifier();
