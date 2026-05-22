// Shared types mirroring the Drizzle schema
// These types represent the data shapes without requiring drizzle-orm

export interface Account {
    id: string;
    email: string;
    role: "user" | "moderator" | "admin";
    notifyNewspaperPosts: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserProfile {
    id: number;
    accountId: string;
    name: string;
    logo: number | null;
    bio: string | null;
    telegramId: number | null;
    telegramUsername: string | null;
    theme: string;
    loadImages: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    id: string;
    accountId: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface State {
    id: number;
    name: string;
    logo: number | null;
    background: string | null;
    description: string | null;
    population: number;
    rating: number;
    capitulated: boolean;
    capitulated_at: Date | null;
    blocId: number | null;
    createdAt: Date;
}

export interface Region {
    id: number;
    latitude: string;
    longitude: string;
    stateId: number | null;
    rating: number;
    infrastructure: number;
    economy: number;
    education: number;
    hospitals: number;
    fortifications: number;
    oil: number;
    aluminium: number;
    rubber: number;
    tungsten: number;
    steel: number;
    chromium: number;
    createdAt: Date;
}

export interface MockFile {
    id: number;
    key: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    uploadedBy: string;
    uploadedAt: Date;
}

export interface Residence {
    id: number;
    userId: string;
    regionId: number;
    movedInAt: Date;
}

export interface UserWallet {
    id: number;
    userId: string;
    balance: number;
    updatedAt: Date;
}

export interface Company {
    id: number;
    name: string;
    logo: number | null;
    ownerId: string;
    description: string | null;
    foundedAt: Date;
}

export interface CompanyBudget {
    id: number;
    companyId: number;
    balance: number;
    totalDeposited: number;
    totalSpent: number;
    updatedAt: Date;
}

export interface Factory {
    id: number;
    name: string;
    companyId: number;
    regionId: number;
    factoryType: "mine" | "refinery" | "armaments" | "general";
    resourceOutput: string | null;
    productOutput: string | null;
    maxWorkers: number;
    workerWage: number;
    productionRate: number;
    createdAt: Date;
}

export interface FactoryWorker {
    id: number;
    userId: string;
    factoryId: number;
    jobType: "miner" | "refiner" | "assembler" | "general_worker";
    hiredAt: Date;
    wageAtShiftStart: number | null;
    lastWorked: Date | null;
}

export interface MarketListing {
    id: number;
    sellerId: string;
    itemType: string;
    itemName: string;
    quantity: number;
    pricePerUnit: number;
    createdAt: Date;
}

export interface MarketTransaction {
    id: number;
    listingId: number;
    buyerId: string;
    sellerId: string;
    quantity: number;
    totalPrice: number;
    completedAt: Date;
}

export interface PoliticalParty {
    id: number;
    name: string;
    abbreviation: string | null;
    color: string;
    logo: number | null;
    ideology: string | null;
    description: string | null;
    founderId: string;
    stateId: number;
    foundedAt: Date;
    autoAcceptMembers: boolean;
}

export interface PartyMember {
    id: number;
    userId: string;
    partyId: number;
    role: string;
    joinedAt: Date;
    acceptedBy: string | null;
}

export interface ChatMessage {
    id: number;
    senderId: string;
    recipientId: string | null;
    messageType: "global" | "state" | "party" | "direct";
    partyId: number | null;
    content: string;
    isDeleted: boolean;
    deletedBy: string | null;
    deletedAt: Date | null;
    deletionReason: string | null;
    deletionNote: string | null;
    sentAt: Date;
}

export interface InboxMessage {
    id: number;
    recipientId: string;
    senderId: string;
    messageType: "state_broadcast" | "party_broadcast" | "system";
    stateId: number | null;
    partyId: number | null;
    subject: string;
    content: string;
    isRead: boolean;
    sentAt: Date;
}

export interface ResourceInventory {
    id: number;
    userId: string;
    resourceType: string;
    quantity: number;
    updatedAt: Date;
}

export interface ProductInventory {
    id: number;
    userId: string;
    productType: string;
    quantity: number;
    updatedAt: Date;
}

export interface MilitaryUnit {
    id: number;
    name: string;
    ownerId: string;
    stateId: number;
    regionId: number;
    unitType: string;
    organization: number;
    supplyLevel: number;
    health: number;
    isTraining: boolean;
    trainingStartedAt: Date | null;
    trainingCompletesAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface RegionBorder {
    id: number;
    regionId: number;
    neighborId: number;
    distanceKm: string;
    createdAt: Date;
}

export interface Newspaper {
    id: number;
    logo: number | null;
    name: string;
    background: string | null;
    createdAt: Date;
}

export interface Article {
    id: number;
    title: string;
    content: string;
    authorId: string;
    newspaperId: number;
    createdAt: Date;
}

export interface Bloc {
    id: number;
    name: string;
    logo: number | null;
    color: string;
    description: string | null;
    capitulated: boolean;
    capitulated_at: Date | null;
    createdAt: Date;
}

export interface StateTreasury {
    id: number;
    stateId: number;
    balance: number;
    totalCollected: number;
    totalSpent: number;
    updatedAt: Date;
}

export interface TransactionHistory {
    id: number;
    userId: string;
    transactionType: string;
    amount: number;
    balanceAfter: number;
    description: string;
    relatedUserId: string | null;
    relatedEntityType: string | null;
    relatedEntityId: number | null;
    metadata: string | null;
    createdAt: Date;
}

// Table name union for type safety
export type TableName =
    | "accounts"
    | "userProfiles"
    | "sessions"
    | "states"
    | "regions"
    | "files"
    | "residences"
    | "userWallets"
    | "companies"
    | "companyBudgets"
    | "factories"
    | "factoryWorkers"
    | "marketListings"
    | "marketTransactions"
    | "politicalParties"
    | "partyMembers"
    | "chatMessages"
    | "inboxMessages"
    | "resourceInventory"
    | "productInventory"
    | "militaryUnits"
    | "regionBorders"
    | "newspapers"
    | "articles"
    | "blocs"
    | "stateTreasury"
    | "transactionHistory";
