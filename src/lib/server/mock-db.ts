// src/lib/server/mock-db.ts
// In-memory Postgres for mock mode and integration tests.
//
// PGlite is a real Postgres compiled to WASM, so the exact same Drizzle schema
// and queries run against it — no hand-written fakes that drift from the real
// database. The schema is pushed straight from schema.ts (no migration files
// involved) and then filled with the seed data from mock-seed.ts.
//
// Nothing in here may import SvelteKit virtual modules ($app/*, $env/*): the
// test runner loads this file directly.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import * as investments from "./schema-investments";
import { seedMockDatabase } from "./mock-seed";

const fullSchema = { ...schema, ...investments };

export type MockDatabase = PostgresJsDatabase<typeof fullSchema>;

export interface MockDbOptions {
	/** Fill the database with the demo world from mock-seed.ts. Default true. */
	seed?: boolean;
}

export interface MockDbHandle {
	db: MockDatabase;
	/** Shut the in-memory instance down (tests call this in afterAll). */
	close: () => Promise<void>;
}

/** Boot a fresh in-memory Postgres, create every table and optionally seed it. */
export async function createMockDb({ seed = true }: MockDbOptions = {}): Promise<MockDbHandle> {
	const client = new PGlite();
	const pglite = drizzle(client, { schema: fullSchema });

	// drizzle-kit is a dev-only dependency and fairly heavy, so only load it
	// when a mock database is actually being created.
	const { pushSchema } = await import("drizzle-kit/api");
	const { apply } = await pushSchema(fullSchema, pglite as never);
	await apply();

	// The PGlite and postgres-js drivers expose the same query builder API; the
	// app is typed against postgres-js, so present the mock as that.
	const db = pglite as unknown as MockDatabase;

	if (seed) {
		await seedMockDatabase(db as unknown as Parameters<typeof seedMockDatabase>[0]);
	}

	return { db, close: () => client.close() };
}
