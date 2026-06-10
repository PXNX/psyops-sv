// src/lib/server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "$env/dynamic/private";
import * as schema from "./schema";

const USE_MOCK = env.USE_MOCK === "true";

async function createMockDb() {
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
	const { pushSchema } = await import("drizzle-kit/api");

	const client = new PGlite();
	const mockDb = drizzlePglite({ client, schema });

	// Push the Drizzle schema to the in-memory database
	const result = await pushSchema(schema, mockDb as any);
	if (result.statementsToExecute.length > 0) {
		await result.apply();
	}

	// Seed with mock data
	const { seedMockDatabase } = await import("./mock-seed");
	await seedMockDatabase(mockDb as any);

	return mockDb;
}

function createRealDb() {
	const DATABASE_URL = env.DATABASE_URL;
	if (!DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is required (set USE_MOCK=true for mock mode)");
	}
	const queryClient = postgres(DATABASE_URL);
	return drizzle(queryClient, { schema });
}

let db: ReturnType<typeof createRealDb>;

if (USE_MOCK) {
	console.log("🎭 Mock mode: using PGlite in-memory database");
	// Use top-level await for async PGlite initialization
	db = (await createMockDb()) as any;
} else {
	db = createRealDb();
}

export { db };
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
