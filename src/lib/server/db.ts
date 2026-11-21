// src/lib/server/db.ts
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DATABASE_URL, USE_MOCK } from "$app/env/private";
import * as schema from "./schema";
import * as investments from "./schema-investments";

const fullSchema = { ...schema, ...investments };

export type Database = PostgresJsDatabase<typeof fullSchema>;

/**
 * Mock mode (`bun run dev:mock`): the app runs against an in-memory Postgres
 * seeded with a demo world and signs every request in as the seeded admin, so
 * the whole UI can be exercised without a database, OAuth or object storage.
 *
 * It is tied to the dev server on purpose: `import.meta.env.DEV` is false in
 * production builds, so a stray USE_MOCK variable can never switch a deployed
 * app to the fake auth, and the mock code is dropped from the bundle.
 */
export const isMockMode = import.meta.env.DEV && USE_MOCK === "true";

async function createMockDb(): Promise<Database> {
	const { createMockDb } = await import("./mock-db");
	const { db } = await createMockDb();
	console.info("[mock] in-memory database seeded - signed in as alice@example.com (admin)");
	return db;
}

function createRealDb(): Database {
	if (!DATABASE_URL) {
		throw new Error("DATABASE_URL environment variable is required (or run `bun run dev:mock`)");
	}
	const queryClient = postgres(DATABASE_URL);
	return drizzle(queryClient, { schema: fullSchema });
}

// The condition is spelled out (not `isMockMode`) so the bundler can fold it
// to `false` in production builds and drop the mock branch entirely.
export const db: Database = import.meta.env.DEV && USE_MOCK === "true" ? await createMockDb() : createRealDb();

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
