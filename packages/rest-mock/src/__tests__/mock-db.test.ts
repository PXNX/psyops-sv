import { describe, it, expect, beforeEach } from "@rstest/core";
import { createMockStore, type MockRecordStore } from "../mock-db.js";
import { seedStore } from "../seed-data.js";

describe("MockRecordStore", () => {
    let store: MockRecordStore;

    beforeEach(() => {
        store = createMockStore();
    });

    describe("Basic CRUD", () => {
        it("should insert and retrieve by id", () => {
            const account = store.insert("accounts", {
                id: "test-1",
                email: "test@example.com",
                role: "user",
                notifyNewspaperPosts: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            expect(account.id).toBe("test-1");
            const found = store.findById("accounts", "test-1");
            expect(found).toBeDefined();
            expect(found!.email).toBe("test@example.com");
        });

        it("should auto-increment numeric ids", () => {
            const s1 = store.insert("states", { name: "A", createdAt: new Date() });
            const s2 = store.insert("states", { name: "B", createdAt: new Date() });
            expect(s1.id).toBe(1);
            expect(s2.id).toBe(2);
        });

        it("should update a record", () => {
            store.insert("accounts", { id: "u1", email: "old@test.com", createdAt: new Date(), updatedAt: new Date() });
            const updated = store.update("accounts", "u1", { email: "new@test.com" });
            expect(updated).toBeDefined();
            expect(updated!.email).toBe("new@test.com");
        });

        it("should delete a record", () => {
            store.insert("accounts", { id: "u1", email: "a@b.com", createdAt: new Date(), updatedAt: new Date() });
            expect(store.delete("accounts", "u1")).toBe(true);
            expect(store.findById("accounts", "u1")).toBeUndefined();
        });

        it("should return false when deleting non-existent record", () => {
            expect(store.delete("accounts", "nope")).toBe(false);
        });
    });

    describe("Query helpers", () => {
        beforeEach(() => {
            store.insert("accounts", { id: "u1", email: "alice@x.com", role: "admin", createdAt: new Date(), updatedAt: new Date() });
            store.insert("accounts", { id: "u2", email: "bob@x.com", role: "user", createdAt: new Date(), updatedAt: new Date() });
            store.insert("accounts", { id: "u3", email: "charlie@x.com", role: "user", createdAt: new Date(), updatedAt: new Date() });
        });

        it("should findWhere", () => {
            const users = store.findWhere("accounts", (a) => a.role === "user");
            expect(users.length).toBe(2);
        });

        it("should findOneWhere", () => {
            const admin = store.findOneWhere("accounts", (a) => a.role === "admin");
            expect(admin).toBeDefined();
            expect(admin!.email).toBe("alice@x.com");
        });

        it("should return undefined when no match", () => {
            expect(store.findOneWhere("accounts", (a) => a.email === "nope")).toBeUndefined();
        });

        it("should getAll", () => {
            expect(store.getAll("accounts").length).toBe(3);
        });

        it("should count", () => {
            expect(store.count("accounts")).toBe(3);
        });
    });

    describe("Convenience methods", () => {
        beforeEach(() => {
            store.insert("accounts", { id: "u1", email: "alice@x.com", createdAt: new Date(), updatedAt: new Date() });
            store.insert("userWallets", { userId: "u1", balance: 50000, updatedAt: new Date() });
            store.insert("userProfiles", { accountId: "u1", name: "Alice", theme: "dark", loadImages: true, createdAt: new Date(), updatedAt: new Date() });
        });

        it("getAccountByEmail", () => {
            expect(store.getAccountByEmail("alice@x.com")).toBeDefined();
            expect(store.getAccountByEmail("nope")).toBeUndefined();
        });

        it("getWalletByUserId", () => {
            const w = store.getWalletByUserId("u1");
            expect(w).toBeDefined();
            expect(w!.balance).toBe(50000);
        });

        it("getProfileByAccountId", () => {
            const p = store.getProfileByAccountId("u1");
            expect(p).toBeDefined();
            expect(p!.name).toBe("Alice");
        });
    });

    describe("Bulk operations", () => {
        it("updateWhere should update matching rows", () => {
            store.insert("accounts", { id: "u1", role: "user", notifyNewspaperPosts: true, createdAt: new Date(), updatedAt: new Date() });
            store.insert("accounts", { id: "u2", role: "user", notifyNewspaperPosts: true, createdAt: new Date(), updatedAt: new Date() });
            const updated = store.updateWhere("accounts", (a) => a.role === "user", { notifyNewspaperPosts: false });
            expect(updated.length).toBe(2);
            expect(updated.every((a) => !a.notifyNewspaperPosts)).toBe(true);
        });

        it("deleteWhere should remove matching rows", () => {
            store.insert("accounts", { id: "u1", role: "user", createdAt: new Date(), updatedAt: new Date() });
            store.insert("accounts", { id: "u2", role: "admin", createdAt: new Date(), updatedAt: new Date() });
            store.insert("accounts", { id: "u3", role: "user", createdAt: new Date(), updatedAt: new Date() });
            expect(store.deleteWhere("accounts", (a) => a.role === "user")).toBe(2);
            expect(store.count("accounts")).toBe(1);
        });
    });

    describe("Reset", () => {
        it("should clear all tables", () => {
            store.insert("accounts", { id: "u1", createdAt: new Date(), updatedAt: new Date() });
            store.reset();
            expect(store.count("accounts")).toBe(0);
        });
    });
});

describe("seedStore", () => {
    it("should populate all major tables", () => {
        const store = createMockStore();
        seedStore(store);

        expect(store.count("accounts")).toBeGreaterThanOrEqual(5);
        expect(store.count("states")).toBeGreaterThanOrEqual(3);
        expect(store.count("regions")).toBeGreaterThanOrEqual(6);
        expect(store.count("userProfiles")).toBeGreaterThanOrEqual(5);
        expect(store.count("userWallets")).toBeGreaterThanOrEqual(5);
        expect(store.count("companies")).toBeGreaterThanOrEqual(2);
        expect(store.count("factories")).toBeGreaterThanOrEqual(3);
        expect(store.count("politicalParties")).toBeGreaterThanOrEqual(2);
        expect(store.count("marketListings")).toBeGreaterThanOrEqual(3);
        expect(store.count("chatMessages")).toBeGreaterThanOrEqual(3);
        expect(store.count("militaryUnits")).toBeGreaterThanOrEqual(3);
        expect(store.count("articles")).toBeGreaterThanOrEqual(3);
        expect(store.count("blocs")).toBeGreaterThanOrEqual(2);
        expect(store.count("wars")).toBeGreaterThanOrEqual(2);
        expect(store.count("battles")).toBeGreaterThanOrEqual(3);
        expect(store.count("battleParticipants")).toBeGreaterThanOrEqual(4);
        expect(store.count("battleRounds")).toBeGreaterThanOrEqual(2);
        expect(store.count("parliamentaryElections")).toBeGreaterThanOrEqual(2);
        expect(store.count("electionVotes")).toBeGreaterThanOrEqual(4);
    });

    it("should create valid account→profile→wallet relationships", () => {
        const store = createMockStore();
        seedStore(store);

        const alice = store.getAccountByEmail("alice@example.com");
        expect(alice).toBeDefined();
        expect(store.getProfileByAccountId(alice!.id as string)?.name).toBe("Alice Admin");
        expect(store.getWalletByUserId(alice!.id as string)?.balance).toBe(50000);
    });

    it("should create valid region→state relationships", () => {
        const store = createMockStore();
        seedStore(store);

        for (const region of store.getAll("regions")) {
            if (region.stateId === null) continue; // skip independent regions
            expect(region.stateId).toBeDefined();
            expect(store.findById("states", region.stateId as number)).toBeDefined();
        }
    });

    it("should create region borders with regionId < neighborId", () => {
        const store = createMockStore();
        seedStore(store);

        for (const border of store.getAll("regionBorders")) {
            expect(Number(border.regionId)).toBeLessThan(Number(border.neighborId));
        }
    });

    it("should have an independent region with no state", () => {
        const store = createMockStore();
        seedStore(store);

        const independent = store.findWhere("regions", (r) => r.stateId === null);
        expect(independent.length).toBeGreaterThanOrEqual(1);
    });

    it("should have active wars", () => {
        const store = createMockStore();
        seedStore(store);

        const activeWars = store.findWhere("wars", (w) => w.status === "active");
        expect(activeWars.length).toBeGreaterThanOrEqual(2);
        for (const war of activeWars) {
            expect(war.endedAt).toBeNull();
            expect(war.attackerId).toBeDefined();
            expect(war.defenderId).toBeDefined();
        }
    });

    it("should have ongoing battles linked to active wars", () => {
        const store = createMockStore();
        seedStore(store);

        const ongoingBattles = store.findWhere("battles", (b) => b.status === "ongoing");
        expect(ongoingBattles.length).toBeGreaterThanOrEqual(3);

        for (const battle of ongoingBattles) {
            const war = store.findById("wars", battle.warId as number);
            expect(war).toBeDefined();
            expect(war!.status).toBe("active");
        }
    });

    it("should have ongoing elections with votes", () => {
        const store = createMockStore();
        seedStore(store);

        const activeElections = store.findWhere("parliamentaryElections", (e) => e.status === "active");
        expect(activeElections.length).toBeGreaterThanOrEqual(2);

        for (const election of activeElections) {
            const votes = store.findWhere("electionVotes", (v) => v.electionId === election.id);
            expect(votes.length).toBeGreaterThanOrEqual(1);
        }
    });
});
