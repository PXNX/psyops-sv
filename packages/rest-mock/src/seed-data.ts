// Seed data for the mock record store
// Provides realistic test data for all major tables

import type { MockRecordStore } from "./mock-db.js";
import { MockFileStorage } from "./mock-storage.js";

export function seedStore(store: MockRecordStore, storage?: MockFileStorage): void {
    // ============ Files (placeholder images) ============
    const placeholderImg = MockFileStorage.createPlaceholderImage();

    const file1 = store.insert("files", {
        key: "mock-logo-1.webp",
        fileName: "republic-logo.webp",
        contentType: "image/webp",
        sizeBytes: placeholderImg.length,
        uploadedBy: "user-1",
        uploadedAt: new Date(),
    });
    const file2 = store.insert("files", {
        key: "mock-logo-2.webp",
        fileName: "empire-logo.webp",
        contentType: "image/webp",
        sizeBytes: placeholderImg.length,
        uploadedBy: "user-2",
        uploadedAt: new Date(),
    });
    const file3 = store.insert("files", {
        key: "mock-avatar-1.webp",
        fileName: "alice-avatar.webp",
        contentType: "image/webp",
        sizeBytes: placeholderImg.length,
        uploadedBy: "user-1",
        uploadedAt: new Date(),
    });

    if (storage) {
        for (const f of [file1, file2, file3]) {
            storage.uploadFile(placeholderImg, f.fileName as string);
        }
    }

    // ============ Blocs ============
    const bloc1 = store.insert("blocs", {
        name: "Western Alliance",
        logo: file1.id,
        color: "#3b82f6",
        description: "A coalition of western democracies",
        capitulated: false,
        capitulated_at: null,
        createdAt: new Date(),
    });

    const bloc2 = store.insert("blocs", {
        name: "Eastern Pact",
        logo: file2.id,
        color: "#ef4444",
        description: "The eastern military pact",
        capitulated: false,
        capitulated_at: null,
        createdAt: new Date(),
    });

    // ============ States ============
    const state1 = store.insert("states", {
        name: "Republic of Freedonia",
        logo: file1.id,
        background: null,
        description: "A peaceful democratic republic",
        population: 150,
        rating: 5,
        capitulated: false,
        capitulated_at: null,
        blocId: bloc1.id,
        createdAt: new Date(),
    });

    const state2 = store.insert("states", {
        name: "Empire of Sylvania",
        logo: file2.id,
        background: null,
        description: "A powerful industrial empire",
        population: 200,
        rating: 8,
        capitulated: false,
        capitulated_at: null,
        blocId: bloc2.id,
        createdAt: new Date(),
    });

    const state3 = store.insert("states", {
        name: "Kingdom of Borduria",
        logo: null,
        background: null,
        description: "A neutral kingdom",
        population: 80,
        rating: 3,
        capitulated: false,
        capitulated_at: null,
        blocId: null,
        createdAt: new Date(),
    });

    // ============ Regions ============
    const region1 = store.insert("regions", {
        latitude: "48.8566", longitude: "2.3522", stateId: state1.id,
        rating: 5, infrastructure: 3, economy: 2, education: 2, hospitals: 1,
        fortifications: 0, oil: 0, aluminium: 2, rubber: 0, tungsten: 1, steel: 3, chromium: 0,
        createdAt: new Date(),
    });
    const region2 = store.insert("regions", {
        latitude: "52.5200", longitude: "13.4050", stateId: state1.id,
        rating: 3, infrastructure: 2, economy: 1, education: 1, hospitals: 0,
        fortifications: 1, oil: 1, aluminium: 0, rubber: 1, tungsten: 0, steel: 0, chromium: 1,
        createdAt: new Date(),
    });
    const region3 = store.insert("regions", {
        latitude: "55.7558", longitude: "37.6173", stateId: state2.id,
        rating: 7, infrastructure: 4, economy: 3, education: 3, hospitals: 2,
        fortifications: 2, oil: 3, aluminium: 1, rubber: 0, tungsten: 2, steel: 4, chromium: 1,
        createdAt: new Date(),
    });
    const region4 = store.insert("regions", {
        latitude: "50.0755", longitude: "14.4378", stateId: state2.id,
        rating: 4, infrastructure: 2, economy: 2, education: 1, hospitals: 1,
        fortifications: 3, oil: 0, aluminium: 1, rubber: 2, tungsten: 0, steel: 2, chromium: 0,
        createdAt: new Date(),
    });
    const region5 = store.insert("regions", {
        latitude: "47.4979", longitude: "19.0402", stateId: state3.id,
        rating: 2, infrastructure: 1, economy: 1, education: 1, hospitals: 0,
        fortifications: 0, oil: 0, aluminium: 0, rubber: 0, tungsten: 0, steel: 1, chromium: 0,
        createdAt: new Date(),
    });

    // ============ Region Borders ============
    for (const [a, b, km] of [
        [region1.id, region2.id, "450.00"],
        [region2.id, region4.id, "280.00"],
        [region4.id, region5.id, "350.00"],
        [region3.id, region4.id, "1200.00"],
    ] as [number, number, string][]) {
        store.insert("regionBorders", {
            regionId: Math.min(a, b),
            neighborId: Math.max(a, b),
            distanceKm: km,
            createdAt: new Date(),
        });
    }

    // ============ Accounts ============
    const account1 = store.insert("accounts", { id: "user-1", email: "alice@example.com", role: "admin", notifyNewspaperPosts: true, createdAt: new Date(), updatedAt: new Date() });
    const account2 = store.insert("accounts", { id: "user-2", email: "bob@example.com", role: "moderator", notifyNewspaperPosts: true, createdAt: new Date(), updatedAt: new Date() });
    const account3 = store.insert("accounts", { id: "user-3", email: "charlie@example.com", role: "user", notifyNewspaperPosts: true, createdAt: new Date(), updatedAt: new Date() });
    const account4 = store.insert("accounts", { id: "user-4", email: "diana@example.com", role: "user", notifyNewspaperPosts: false, createdAt: new Date(), updatedAt: new Date() });
    const account5 = store.insert("accounts", { id: "user-5", email: "eve@example.com", role: "user", notifyNewspaperPosts: true, createdAt: new Date(), updatedAt: new Date() });

    // ============ User Profiles ============
    for (const [accId, name, bio, logo, theme] of [
        [account1.id, "Alice Admin", "Server administrator and Freedonia patriot", file3.id, "dark"],
        [account2.id, "Bob Moderator", "Keeping things civil since day one", null, "cyberpunk"],
        [account3.id, "Charlie Citizen", "Just a regular citizen trying to make it", null, "nord"],
        [account4.id, "Diana Diplomat", "Foreign affairs specialist", null, "dark"],
        [account5.id, "Eve Entrepreneur", "Building the economy one factory at a time", null, "business"],
    ] as [string, string, string, number | null, string][]) {
        store.insert("userProfiles", { accountId: accId, name, logo, bio, telegramId: null, telegramUsername: null, theme, loadImages: true, createdAt: new Date(), updatedAt: new Date() });
    }

    // ============ Sessions ============
    store.insert("sessions", { id: "mock-session-alice", accountId: account1.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), createdAt: new Date() });
    store.insert("sessions", { id: "mock-session-bob", accountId: account2.id, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), createdAt: new Date() });

    // ============ Residences ============
    for (const [userId, regionId] of [
        [account1.id, region1.id], [account2.id, region1.id], [account3.id, region3.id],
        [account4.id, region5.id], [account5.id, region3.id],
    ] as [string, number][]) {
        store.insert("residences", { userId, regionId, movedInAt: new Date() });
    }

    // ============ Wallets ============
    for (const [userId, balance] of [
        [account1.id, 50000], [account2.id, 25000], [account3.id, 10000],
        [account4.id, 35000], [account5.id, 100000],
    ] as [string, number][]) {
        store.insert("userWallets", { userId, balance, updatedAt: new Date() });
    }

    // ============ State Treasury ============
    for (const [stateId, balance, collected, spent] of [
        [state1.id, 500000, 750000, 250000],
        [state2.id, 1200000, 2000000, 800000],
        [state3.id, 100000, 150000, 50000],
    ] as [number, number, number, number][]) {
        store.insert("stateTreasury", { stateId, balance, totalCollected: collected, totalSpent: spent, updatedAt: new Date() });
    }

    // ============ Companies + Budgets ============
    const company1 = store.insert("companies", { name: "Freedonia Mining Corp", logo: null, ownerId: account1.id, description: "The largest mining operation in Freedonia", foundedAt: new Date() });
    const company2 = store.insert("companies", { name: "Eve's Industries", logo: null, ownerId: account5.id, description: "Multi-sector industrial conglomerate", foundedAt: new Date() });
    store.insert("companyBudgets", { companyId: company1.id, balance: 200000, totalDeposited: 300000, totalSpent: 100000, updatedAt: new Date() });
    store.insert("companyBudgets", { companyId: company2.id, balance: 500000, totalDeposited: 500000, totalSpent: 0, updatedAt: new Date() });

    // ============ Factories ============
    const factory1 = store.insert("factories", { name: "Iron Mine Alpha", companyId: company1.id, regionId: region1.id, factoryType: "mine", resourceOutput: "iron", productOutput: null, maxWorkers: 10, workerWage: 1500, productionRate: 10, createdAt: new Date() });
    const factory2 = store.insert("factories", { name: "Steel Refinery Beta", companyId: company2.id, regionId: region3.id, factoryType: "refinery", resourceOutput: "steel", productOutput: null, maxWorkers: 8, workerWage: 2000, productionRate: 5, createdAt: new Date() });
    store.insert("factories", { name: "Arms Factory Gamma", companyId: company2.id, regionId: region3.id, factoryType: "armaments", resourceOutput: null, productOutput: "rifles", maxWorkers: 12, workerWage: 2500, productionRate: 3, createdAt: new Date() });

    // ============ Factory Workers ============
    store.insert("factoryWorkers", { userId: account3.id, factoryId: factory1.id, jobType: "miner", hiredAt: new Date(), wageAtShiftStart: 1500, lastWorked: null });
    store.insert("factoryWorkers", { userId: account5.id, factoryId: factory2.id, jobType: "refiner", hiredAt: new Date(), wageAtShiftStart: 2000, lastWorked: null });

    // ============ Resource & Product Inventory ============
    for (const res of ["iron", "copper", "steel", "gunpowder", "wood", "coal"]) {
        store.insert("resourceInventory", { userId: account1.id, resourceType: res, quantity: Math.floor(Math.random() * 100) + 10, updatedAt: new Date() });
        store.insert("resourceInventory", { userId: account5.id, resourceType: res, quantity: Math.floor(Math.random() * 200) + 50, updatedAt: new Date() });
    }
    for (const prod of ["rifles", "ammunition", "artillery", "vehicles", "explosives"]) {
        store.insert("productInventory", { userId: account1.id, productType: prod, quantity: Math.floor(Math.random() * 20), updatedAt: new Date() });
    }

    // ============ Market Listings ============
    store.insert("marketListings", { sellerId: account1.id, itemType: "resource", itemName: "iron", quantity: 50, pricePerUnit: 12, createdAt: new Date() });
    store.insert("marketListings", { sellerId: account5.id, itemType: "resource", itemName: "steel", quantity: 30, pricePerUnit: 55, createdAt: new Date() });
    store.insert("marketListings", { sellerId: account5.id, itemType: "product", itemName: "rifles", quantity: 10, pricePerUnit: 120, createdAt: new Date() });

    // ============ Political Parties ============
    const party1 = store.insert("politicalParties", { name: "Freedom Party", abbreviation: "FP", color: "#3b82f6", logo: null, ideology: "Liberal Democracy", description: "For freedom and prosperity", founderId: account1.id, stateId: state1.id, foundedAt: new Date(), autoAcceptMembers: true });
    const party2 = store.insert("politicalParties", { name: "Workers United", abbreviation: "WU", color: "#ef4444", logo: null, ideology: "Social Democracy", description: "Workers of the world, unite", founderId: account3.id, stateId: state2.id, foundedAt: new Date(), autoAcceptMembers: false });

    store.insert("partyMembers", { userId: account1.id, partyId: party1.id, role: "leader", joinedAt: new Date(), acceptedBy: null });
    store.insert("partyMembers", { userId: account2.id, partyId: party1.id, role: "member", joinedAt: new Date(), acceptedBy: account1.id });
    store.insert("partyMembers", { userId: account3.id, partyId: party2.id, role: "leader", joinedAt: new Date(), acceptedBy: null });
    store.insert("partyMembers", { userId: account5.id, partyId: party2.id, role: "member", joinedAt: new Date(), acceptedBy: account3.id });

    // ============ Newspapers & Articles ============
    const newspaper1 = store.insert("newspapers", { logo: null, name: "The Freedonia Times", background: null, createdAt: new Date() });
    const newspaper2 = store.insert("newspapers", { logo: null, name: "Sylvania Daily", background: null, createdAt: new Date() });

    store.insert("articles", { title: "Welcome to the New Era", content: "<p>A new chapter begins for our great nation.</p>", authorId: account1.id, newspaperId: newspaper1.id, createdAt: new Date() });
    store.insert("articles", { title: "Economic Report Q1", content: "<p>Steel production is up 15% this quarter.</p>", authorId: account5.id, newspaperId: newspaper2.id, createdAt: new Date() });
    store.insert("articles", { title: "Border Tensions Rise", content: "<p>Reports indicate increased military activity.</p>", authorId: account2.id, newspaperId: newspaper1.id, createdAt: new Date(Date.now() - 86400000) });

    // ============ Military Units ============
    store.insert("militaryUnits", { name: "1st Infantry Division", ownerId: account1.id, stateId: state1.id, regionId: region1.id, unitType: "infantry", organization: 100, supplyLevel: 100, health: 100, isTraining: false, trainingStartedAt: null, trainingCompletesAt: null, createdAt: new Date(), updatedAt: new Date() });
    store.insert("militaryUnits", { name: "2nd Armor Brigade", ownerId: account3.id, stateId: state2.id, regionId: region3.id, unitType: "armor", organization: 85, supplyLevel: 90, health: 100, isTraining: true, trainingStartedAt: new Date(), trainingCompletesAt: new Date(Date.now() + 3600000), createdAt: new Date(), updatedAt: new Date() });
    store.insert("militaryUnits", { name: "3rd Artillery Regiment", ownerId: account5.id, stateId: state2.id, regionId: region4.id, unitType: "artillery", organization: 95, supplyLevel: 80, health: 100, isTraining: false, trainingStartedAt: null, trainingCompletesAt: null, createdAt: new Date(), updatedAt: new Date() });

    // ============ Chat Messages ============
    store.insert("chatMessages", { senderId: account1.id, recipientId: null, messageType: "global", partyId: null, content: "Hello everyone! Welcome to the server.", isDeleted: false, deletedBy: null, deletedAt: null, deletionReason: null, deletionNote: null, sentAt: new Date(Date.now() - 3600000) });
    store.insert("chatMessages", { senderId: account3.id, recipientId: null, messageType: "global", partyId: null, content: "Thanks! Excited to be here.", isDeleted: false, deletedBy: null, deletedAt: null, deletionReason: null, deletionNote: null, sentAt: new Date(Date.now() - 3500000) });
    store.insert("chatMessages", { senderId: account1.id, recipientId: account2.id, messageType: "direct", partyId: null, content: "Hey Bob, can you check the reports?", isDeleted: false, deletedBy: null, deletedAt: null, deletionReason: null, deletionNote: null, sentAt: new Date(Date.now() - 1800000) });

    // ============ Transaction History ============
    store.insert("transactionHistory", { userId: account1.id, transactionType: "market_sale", amount: 600, balanceAfter: 50600, description: "Sold 50 iron at 12/unit", relatedUserId: account3.id, relatedEntityType: "listing", relatedEntityId: 1, metadata: null, createdAt: new Date(Date.now() - 7200000) });
    store.insert("transactionHistory", { userId: account3.id, transactionType: "market_purchase", amount: -600, balanceAfter: 9400, description: "Purchased 50 iron at 12/unit", relatedUserId: account1.id, relatedEntityType: "listing", relatedEntityId: 1, metadata: null, createdAt: new Date(Date.now() - 7200000) });

    // ============ Independent Region ============
    const independentRegion = store.insert("regions", {
        latitude: "41.0082", longitude: "28.9784", stateId: null,
        rating: 1, infrastructure: 0, economy: 0, education: 0, hospitals: 0,
        fortifications: 0, oil: 2, aluminium: 0, rubber: 0, tungsten: 0, steel: 0, chromium: 1,
        createdAt: new Date(),
    });

    // Border between the independent region and Borduria
    store.insert("regionBorders", {
        regionId: Math.min(region5.id as number, independentRegion.id as number),
        neighborId: Math.max(region5.id as number, independentRegion.id as number),
        distanceKm: "200.00",
        createdAt: new Date(),
    });

    // ============ Active Wars ============
    const war1 = store.insert("wars", {
        attackerId: state2.id,
        defenderId: state1.id,
        attackerBlocId: bloc2.id,
        defenderBlocId: bloc1.id,
        declaredBy: account3.id,
        status: "active",
        surrenderedBy: null,
        declaredAt: new Date(Date.now() - 86400000 * 3),
        endedAt: null,
    });

    const war2 = store.insert("wars", {
        attackerId: state1.id,
        defenderId: state3.id,
        attackerBlocId: bloc1.id,
        defenderBlocId: null,
        declaredBy: account1.id,
        status: "active",
        surrenderedBy: null,
        declaredAt: new Date(Date.now() - 86400000),
        endedAt: null,
    });

    // Battles for war1
    const battle1 = store.insert("battles", {
        warId: war1.id,
        regionId: region2.id,
        attackerStateId: state2.id,
        defenderStateId: state1.id,
        phase: "active",
        terrain: "plains",
        attackerPlanningBonus: 5,
        defenderPlanningBonus: 3,
        status: "ongoing",
        startedBy: account3.id,
        preparationEndsAt: new Date(Date.now() - 3600000 * 6),
        planningStartedAt: new Date(Date.now() - 3600000 * 4),
        startedAt: new Date(Date.now() - 3600000 * 8),
        endedAt: null,
    });

    const battle2 = store.insert("battles", {
        warId: war1.id,
        regionId: region1.id,
        attackerStateId: state2.id,
        defenderStateId: state1.id,
        phase: "preparation",
        terrain: "urban",
        attackerPlanningBonus: 0,
        defenderPlanningBonus: 0,
        status: "ongoing",
        startedBy: account5.id,
        preparationEndsAt: new Date(Date.now() + 3600000 * 2),
        planningStartedAt: null,
        startedAt: new Date(Date.now() - 1800000),
        endedAt: null,
    });

    // Battle for war2
    const battle3 = store.insert("battles", {
        warId: war2.id,
        regionId: region5.id,
        attackerStateId: state1.id,
        defenderStateId: state3.id,
        phase: "planning",
        terrain: "hills",
        attackerPlanningBonus: 2,
        defenderPlanningBonus: 0,
        status: "ongoing",
        startedBy: account1.id,
        preparationEndsAt: new Date(Date.now() - 3600000),
        planningStartedAt: new Date(Date.now() - 1800000),
        startedAt: new Date(Date.now() - 7200000),
        endedAt: null,
    });

    // Battle participants
    store.insert("battleParticipants", {
        battleId: battle1.id, unitId: 2, side: "attacker",
        currentStrength: 85, currentOrganization: 70, maxStrength: 100,
        damageTaken: 15, damageDealt: 25,
        isEngaged: true, isExhausted: false,
        joinedAt: new Date(Date.now() - 3600000 * 8), lastActionAt: new Date(Date.now() - 600000), destroyedAt: null,
    });
    store.insert("battleParticipants", {
        battleId: battle1.id, unitId: 1, side: "defender",
        currentStrength: 90, currentOrganization: 80, maxStrength: 100,
        damageTaken: 10, damageDealt: 15,
        isEngaged: true, isExhausted: false,
        joinedAt: new Date(Date.now() - 3600000 * 8), lastActionAt: new Date(Date.now() - 600000), destroyedAt: null,
    });
    store.insert("battleParticipants", {
        battleId: battle1.id, unitId: 3, side: "attacker",
        currentStrength: 95, currentOrganization: 75, maxStrength: 100,
        damageTaken: 5, damageDealt: 20,
        isEngaged: false, isExhausted: false,
        joinedAt: new Date(Date.now() - 3600000 * 4), lastActionAt: null, destroyedAt: null,
    });
    store.insert("battleParticipants", {
        battleId: battle3.id, unitId: 1, side: "attacker",
        currentStrength: 100, currentOrganization: 100, maxStrength: 100,
        damageTaken: 0, damageDealt: 0,
        isEngaged: false, isExhausted: false,
        joinedAt: new Date(Date.now() - 7200000), lastActionAt: null, destroyedAt: null,
    });

    // Battle rounds for battle1
    store.insert("battleRounds", {
        battleId: battle1.id, roundNumber: 1, battlePhase: "active",
        attackerUnitsEngaged: 1, defenderUnitsEngaged: 1,
        attackerTotalDamage: 15, defenderTotalDamage: 10,
        attackerOrgLoss: 10, defenderOrgLoss: 15,
        attackerPlanningBonus: 5, defenderPlanningBonus: 3,
        roundedAt: new Date(Date.now() - 3600000 * 2),
    });
    store.insert("battleRounds", {
        battleId: battle1.id, roundNumber: 2, battlePhase: "active",
        attackerUnitsEngaged: 2, defenderUnitsEngaged: 1,
        attackerTotalDamage: 20, defenderTotalDamage: 5,
        attackerOrgLoss: 5, defenderOrgLoss: 10,
        attackerPlanningBonus: 5, defenderPlanningBonus: 3,
        roundedAt: new Date(Date.now() - 1800000),
    });

    // ============ Ongoing Elections ============
    const election1 = store.insert("parliamentaryElections", {
        stateId: state1.id,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000 * 2),
        status: "active",
        totalSeats: 10,
        isInaugural: false,
        createdAt: new Date(Date.now() - 86400000 * 3),
    });

    const election2 = store.insert("parliamentaryElections", {
        stateId: state2.id,
        startDate: new Date(Date.now() - 3600000 * 6),
        endDate: new Date(Date.now() + 86400000),
        status: "active",
        totalSeats: 15,
        isInaugural: true,
        createdAt: new Date(Date.now() - 86400000 * 2),
    });

    // Election votes
    store.insert("electionVotes", { electionId: election1.id, voterId: account1.id, partyId: party1.id, votedAt: new Date(Date.now() - 3600000 * 12) });
    store.insert("electionVotes", { electionId: election1.id, voterId: account2.id, partyId: party1.id, votedAt: new Date(Date.now() - 3600000 * 10) });
    store.insert("electionVotes", { electionId: election2.id, voterId: account3.id, partyId: party2.id, votedAt: new Date(Date.now() - 3600000 * 4) });
    store.insert("electionVotes", { electionId: election2.id, voterId: account5.id, partyId: party2.id, votedAt: new Date(Date.now() - 3600000 * 2) });
    }

export const MOCK_SESSION_TOKENS = {
    alice: "mock-token-alice",
    bob: "mock-token-bob",
} as const;

export const MOCK_USERS = {
    alice: { id: "user-1", email: "alice@example.com", name: "Alice Admin" },
    bob: { id: "user-2", email: "bob@example.com", name: "Bob Moderator" },
    charlie: { id: "user-3", email: "charlie@example.com", name: "Charlie Citizen" },
    diana: { id: "user-4", email: "diana@example.com", name: "Diana Diplomat" },
    eve: { id: "user-5", email: "eve@example.com", name: "Eve Entrepreneur" },
} as const;
