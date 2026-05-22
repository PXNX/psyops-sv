// @psyops/rest-mock — Mock backend for testing and development
//
// Two layers:
//   1. drizzle.mock({ schema }) — type-safe Drizzle ORM stub (no real DB)
//   2. MockRecordStore          — in-memory row store for the REST server & tests

export { createMockDrizzle, MockRecordStore, createMockStore, getMockStore, resetMockStore } from "./mock-db.js";
export { MockFileStorage, createMockStorage, getMockStorage } from "./mock-storage.js";
export type { UploadResult } from "./mock-storage.js";
export { seedStore, MOCK_SESSION_TOKENS, MOCK_USERS } from "./seed-data.js";
