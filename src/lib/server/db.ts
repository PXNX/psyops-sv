// src/lib/server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const USE_MOCK = process.env.USE_MOCK === "true";

function createDb() {
	if (USE_MOCK) {
		console.log("🎭 Mock mode: using drizzle.mock({ schema })");
		return drizzle.mock({ schema });
	}

	const DATABASE_URL = process.env.DATABASE_URL;
	if (!DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is required (set USE_MOCK=true for mock mode)");
	}
	const queryClient = postgres(DATABASE_URL);
	return drizzle(queryClient, { schema });
}

export const db = createDb();
export type Database = typeof db;
export const isMockMode = USE_MOCK;

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
