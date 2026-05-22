// Mock REST API server
// Serves seeded mock data for the SvelteKit UI to consume in development/testing

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMockStore } from "./mock-db.js";
import { createMockStorage } from "./mock-storage.js";
import { seedStore, MOCK_USERS } from "./seed-data.js";

const store = createMockStore();
const storage = createMockStorage();

// Seed with test data
seedStore(store, storage);

const app = new Hono();

// Enable CORS for SvelteKit dev server
app.use("*", cors({ origin: ["http://localhost:5173", "http://localhost:4173"], credentials: true }));

// ============ Health ============
app.get("/", (c) => c.json({ status: "ok", mock: true, tables: store.tableNames() }));

// ============ Auth ============
app.get("/api/auth/session", (c) => {
    const sessionCookie = c.req.header("cookie")?.match(/session=([^;]+)/)?.[1];
    if (!sessionCookie) return c.json({ account: null, session: null });
    const session = store.findOneWhere("sessions", (s) => s.id === sessionCookie);
    if (!session || (session.expiresAt as Date) < new Date()) return c.json({ account: null, session: null });
    const account = store.findById("accounts", session.accountId as string);
    return c.json({ account, session });
});

app.post("/api/auth/mock-login", async (c) => {
    const body = await c.req.json<{ userId?: string }>();
    const userId = body.userId ?? MOCK_USERS.alice.id;
    const account = store.findById("accounts", userId);
    if (!account) return c.json({ error: "User not found" }, 404);

    const sessionId = `mock-session-${Date.now()}`;
    const session = store.insert("sessions", { id: sessionId, accountId: userId, expiresAt: new Date(Date.now() + 86_400_000 * 30), createdAt: new Date() });
    return c.json({ account, session, token: sessionId });
});

// ============ Accounts ============
app.get("/api/accounts", (c) => {
    const accounts = store.getAll("accounts");
    const profiles = store.getAll("userProfiles");
    return c.json(accounts.map((a) => ({ ...a, profile: profiles.find((p) => p.accountId === a.id) ?? null })));
});

app.get("/api/accounts/:id", (c) => {
    const account = store.findById("accounts", c.req.param("id"));
    if (!account) return c.json({ error: "Not found" }, 404);
    const profile = store.getProfileByAccountId(account.id as string);
    const wallet = store.getWalletByUserId(account.id as string);
    const residence = store.getResidenceByUserId(account.id as string);
    let region = null;
    let state = null;
    if (residence) {
        region = store.findById("regions", residence.regionId as number);
        if (region?.stateId) state = store.findById("states", region.stateId as number);
    }
    return c.json({ ...account, profile, wallet, residence, region, state });
});

// ============ States ============
app.get("/api/states", (c) => c.json(store.getAll("states").map((s) => ({
    ...s, regions: store.getRegionsByState(s.id as number), treasury: store.findOneWhere("stateTreasury", (t) => t.stateId === s.id),
}))));

app.get("/api/states/:id", (c) => {
    const id = Number.parseInt(c.req.param("id"));
    const state = store.findById("states", id);
    if (!state) return c.json({ error: "Not found" }, 404);
    return c.json({ ...state, regions: store.getRegionsByState(id), treasury: store.findOneWhere("stateTreasury", (t) => t.stateId === id), parties: store.findWhere("politicalParties", (p) => p.stateId === id) });
});

// ============ Regions ============
app.get("/api/regions", (c) => c.json(store.getAll("regions")));
app.get("/api/regions/:id", (c) => {
    const id = Number.parseInt(c.req.param("id"));
    const region = store.findById("regions", id);
    if (!region) return c.json({ error: "Not found" }, 404);
    return c.json({ ...region, state: region.stateId ? store.findById("states", region.stateId as number) : null, factories: store.findWhere("factories", (f) => f.regionId === id), residents: store.findWhere("residences", (r) => r.regionId === id) });
});

// ============ Companies & Factories ============
app.get("/api/companies", (c) => c.json(store.getAll("companies").map((co) => ({
    ...co, factories: store.getFactoriesByCompany(co.id as number), budget: store.findOneWhere("companyBudgets", (b) => b.companyId === co.id),
}))));
app.get("/api/factories", (c) => c.json(store.getAll("factories").map((f) => ({
    ...f, workers: store.findWhere("factoryWorkers", (w) => w.factoryId === f.id), region: store.findById("regions", f.regionId as number),
}))));

// ============ Market ============
app.get("/api/market/listings", (c) => {
    const itemType = c.req.query("itemType");
    const itemName = c.req.query("itemName");
    return c.json(store.getActiveListings(itemType, itemName));
});

// ============ Wallets ============
app.get("/api/wallets/:userId", (c) => {
    const wallet = store.getWalletByUserId(c.req.param("userId"));
    if (!wallet) return c.json({ error: "Not found" }, 404);
    return c.json(wallet);
});

// ============ Parties ============
app.get("/api/parties", (c) => c.json(store.getAll("politicalParties").map((p) => ({
    ...p, members: store.findWhere("partyMembers", (m) => m.partyId === p.id), state: store.findById("states", p.stateId as number),
}))));

// ============ Chat ============
app.get("/api/chat/:type", (c) => {
    const type = c.req.param("type");
    const limit = Number.parseInt(c.req.query("limit") ?? "50");
    return c.json(store.getChatMessages(type, limit).map((m) => {
        const sender = store.findById("accounts", m.senderId as string);
        return { ...m, sender: { ...sender, profile: sender ? store.getProfileByAccountId(sender.id as string) : null } };
    }));
});

// ============ Military ============
app.get("/api/military/units", (c) => {
    const stateId = c.req.query("stateId");
    const ownerId = c.req.query("ownerId");
    let units = store.getAll("militaryUnits");
    if (stateId) units = units.filter((u) => u.stateId === Number.parseInt(stateId));
    if (ownerId) units = units.filter((u) => u.ownerId === ownerId);
    return c.json(units.map((u) => ({ ...u, region: store.findById("regions", u.regionId as number), state: store.findById("states", u.stateId as number) })));
});

// ============ Newspapers & Articles ============
app.get("/api/newspapers", (c) => c.json(store.getAll("newspapers")));
app.get("/api/articles", (c) => c.json(store.getAll("articles").map((a) => ({ ...a, author: store.findById("accounts", a.authorId as string), newspaper: store.findById("newspapers", a.newspaperId as number) }))));

// ============ Blocs ============
app.get("/api/blocs", (c) => c.json(store.getAll("blocs").map((b) => ({ ...b, states: store.findWhere("states", (s) => s.blocId === b.id) }))));

// ============ Inventory ============
app.get("/api/inventory/:userId/resources", (c) => c.json(store.findWhere("resourceInventory", (r) => r.userId === c.req.param("userId"))));
app.get("/api/inventory/:userId/products", (c) => c.json(store.findWhere("productInventory", (p) => p.userId === c.req.param("userId"))));

// ============ Transaction History ============
app.get("/api/transactions/:userId", (c) => c.json(store.findWhere("transactionHistory", (t) => t.userId === c.req.param("userId"))));

// ============ Mock File Serving ============
app.get("/mock-files/:key", (c) => {
    const key = c.req.param("key");
    const buffer = storage.getFileBuffer(key);
    if (!buffer) {
        const placeholder = MockFileStorage.createPlaceholderImage();
        c.header("Content-Type", "image/png");
        c.header("Cache-Control", "public, max-age=31536000");
        return c.body(placeholder);
    }
    c.header("Content-Type", "image/webp");
    c.header("Cache-Control", "public, max-age=31536000");
    return c.body(buffer);
});

import { MockFileStorage } from "./mock-storage.js";

// ============ Database Admin (for tests) ============
app.post("/api/_admin/reset", (c) => { store.reset(); storage.reset(); seedStore(store, storage); return c.json({ status: "reset complete" }); });
app.get("/api/_admin/tables", (c) => {
    const counts: Record<string, number> = {};
    for (const name of store.tableNames()) counts[name] = store.count(name);
    return c.json(counts);
});

// ============ Start Server ============
const port = Number.parseInt(process.env.MOCK_PORT ?? "3456");

console.log(`🎭 Mock REST API server starting on http://localhost:${port}`);
console.log(`   Store seeded: ${store.count("accounts")} accounts, ${store.count("states")} states, ${store.count("regions")} regions`);
console.log(`   Endpoints: /api/accounts, /api/states, /api/regions, /api/companies, /api/market/listings, /api/parties, /api/chat/:type, /api/military/units, /api/newspapers, /api/articles, /api/blocs`);
console.log(`   Admin: POST /api/_admin/reset, GET /api/_admin/tables`);

serve({ fetch: app.fetch, port });
