import { relations } from "drizzle-orm";
import {
	bigint,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from "drizzle-orm/pg-core";

// Enums
export const journalistRankEnum = pgEnum("journalist_rank", ["author", "editor", "owner"]);
export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
export const ministryTypeEnum = pgEnum("ministry_type", [
	"education",
	"defense",
	"finance",
	"health",
	"infrastructure",
	"justice",
	"foreign_affairs"
]);

// Accounts table
export const accounts = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		role: userRoleEnum("role").notNull().default("user"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => ({
		emailIdx: uniqueIndex("idx_email").on(table.email)
	})
);

// User Profiles table
export const userProfiles = pgTable("user_profiles", {
	id: uuid("id").defaultRandom().primaryKey(),
	accountId: text("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	name: text("name"),
	avatar: text("avatar"),
	bio: text("bio"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Sessions table
export const sessions = pgTable(
	"sessions",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(table) => ({
		accountIdx: index("idx_session_account").on(table.accountId),
		expiresAtIdx: index("idx_session_expires").on(table.expiresAt)
	})
);

// OAuth Tokens tablef
export const oauthTokens = pgTable(
	"oauth_tokens",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		accountId: text("account_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" })
			.unique(),
		provider: varchar("provider", { length: 50 }).notNull().default("google"),
		accessToken: text("access_token").notNull(),
		refreshToken: text("refresh_token"),
		tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true, mode: "date" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => ({
		accountProviderIdx: uniqueIndex("idx_account_provider").on(table.accountId, table.provider)
	})
);

// States table
export const states = pgTable("states", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	avatar: text("avatar"),
	background: text("background"),
	description: text("description"),
	population: integer("population").default(0),
	rating: integer("rating").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Regions table (belongs to states)
export const regions = pgTable("regions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(), // Add .primaryKey()
	name: varchar("name", { length: 100 }).notNull(),
	avatar: text("avatar"),
	background: text("background"),
	description: text("description"),
	stateId: uuid("state_id").references(() => states.id, { onDelete: "cascade" }),
	population: integer("population").default(0),
	rating: integer("rating").default(0),
	development: integer("development").default(0),
	infrastructure: integer("infrastructure").default(0),
	economy: integer("economy").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Governors table (one per region)
export const governors = pgTable(
	"governors",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" })
			.unique(),
		appointedAt: timestamp("appointed_at").defaultNow().notNull(),
		term: integer("term").default(1)
	},
	(table) => ({
		userRegionIdx: index("idx_governor_user_region").on(table.userId, table.regionId)
	})
);

// Presidents table (one per state)
export const presidents = pgTable(
	"presidents",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		stateId: uuid("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" })
			.unique(),
		electedAt: timestamp("elected_at").defaultNow().notNull(),
		term: integer("term").default(1)
	},
	(table) => ({
		userStateIdx: index("idx_president_user_state").on(table.userId, table.stateId)
	})
);

// Ministers table (multiple per state)
export const ministers = pgTable(
	"ministers",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		stateId: uuid("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		ministry: ministryTypeEnum("ministry").notNull(),
		appointedAt: timestamp("appointed_at").defaultNow().notNull()
	},
	(table) => ({
		userStateMinistryIdx: uniqueIndex("idx_minister_unique").on(table.userId, table.stateId, table.ministry),
		stateMinistryIdx: uniqueIndex("idx_state_ministry_unique").on(table.stateId, table.ministry)
	})
);

// Parliament Members table
export const parliamentMembers = pgTable(
	"parliament_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		stateId: uuid("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		partyAffiliation: varchar("party_affiliation", { length: 100 }),
		electedAt: timestamp("elected_at").defaultNow().notNull(),
		term: integer("term").default(1)
	},
	(table) => ({
		userStateIdx: uniqueIndex("idx_parliament_user_state").on(table.userId, table.stateId)
	})
);

// Residences table (tracks where users live)
export const residences = pgTable(
	"residences",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		isPrimary: integer("is_primary").default(0), // 1 for primary residence, 0 for secondary
		movedInAt: timestamp("moved_in_at").defaultNow().notNull()
	},
	(table) => ({
		userRegionIdx: index("idx_residence_user_region").on(table.userId, table.regionId)
	})
);

// Newspapers table
export const newspapers = pgTable("newspapers", {
	id: uuid("id").defaultRandom().primaryKey(),
	avatar: text("avatar"),
	name: varchar("name", { length: 40 }).notNull(),
	background: text("background"),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Journalists table
export const journalists = pgTable(
	"journalists",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		newspaperId: uuid("newspaper_id")
			.notNull()
			.references(() => newspapers.id, { onDelete: "cascade" }),
		rank: journalistRankEnum("rank").notNull()
	},
	(table) => ({
		userNewspaperIdx: uniqueIndex("user_newspaper_index").on(table.userId, table.newspaperId)
	})
);

// Articles table
export const articles = pgTable("articles", {
	id: uuid("id").defaultRandom().primaryKey(),
	title: varchar("title", { length: 40 }).notNull(),
	content: text("content").notNull(),
	authorId: text("author_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	newspaperId: uuid("newspaper_id")
		.notNull()
		.references(() => newspapers.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Upvotes table
export const upvotes = pgTable(
	"upvotes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		articleId: uuid("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" })
	},
	(table) => ({
		userArticleIdx: uniqueIndex("user_article_index").on(table.userId, table.articleId)
	})
);

// Relations
export const accountsRelations = relations(accounts, ({ one, many }) => ({
	profile: one(userProfiles, {
		fields: [accounts.id],
		references: [userProfiles.accountId]
	}),
	oauthTokens: one(oauthTokens, {
		fields: [accounts.id],
		references: [oauthTokens.accountId]
	}),
	sessions: many(sessions),
	journalists: many(journalists),
	articles: many(articles),
	upvotes: many(upvotes),
	governorships: many(governors),
	presidencies: many(presidents),
	ministries: many(ministers),
	parliamentSeats: many(parliamentMembers),
	residences: many(residences)
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	account: one(accounts, {
		fields: [userProfiles.accountId],
		references: [accounts.id]
	})
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	account: one(accounts, {
		fields: [sessions.accountId],
		references: [accounts.id]
	})
}));

export const oauthTokensRelations = relations(oauthTokens, ({ one }) => ({
	account: one(accounts, {
		fields: [oauthTokens.accountId],
		references: [accounts.id]
	})
}));

export const statesRelations = relations(states, ({ one, many }) => ({
	regions: many(regions),
	president: one(presidents),
	ministers: many(ministers),
	parliamentMembers: many(parliamentMembers)
}));

export const regionsRelations = relations(regions, ({ one, many }) => ({
	state: one(states, {
		fields: [regions.stateId],
		references: [states.id]
	}),
	governor: one(governors),
	residences: many(residences)
}));

export const governorsRelations = relations(governors, ({ one }) => ({
	user: one(accounts, {
		fields: [governors.userId],
		references: [accounts.id]
	}),
	region: one(regions, {
		fields: [governors.regionId],
		references: [regions.id]
	})
}));

export const presidentsRelations = relations(presidents, ({ one }) => ({
	user: one(accounts, {
		fields: [presidents.userId],
		references: [accounts.id]
	}),
	state: one(states, {
		fields: [presidents.stateId],
		references: [states.id]
	})
}));

export const ministersRelations = relations(ministers, ({ one }) => ({
	user: one(accounts, {
		fields: [ministers.userId],
		references: [accounts.id]
	}),
	state: one(states, {
		fields: [ministers.stateId],
		references: [states.id]
	})
}));

export const parliamentMembersRelations = relations(parliamentMembers, ({ one }) => ({
	user: one(accounts, {
		fields: [parliamentMembers.userId],
		references: [accounts.id]
	}),
	state: one(states, {
		fields: [parliamentMembers.stateId],
		references: [states.id]
	})
}));

export const residencesRelations = relations(residences, ({ one }) => ({
	user: one(accounts, {
		fields: [residences.userId],
		references: [accounts.id]
	}),
	region: one(regions, {
		fields: [residences.regionId],
		references: [regions.id]
	})
}));

export const newspapersRelations = relations(newspapers, ({ many }) => ({
	journalists: many(journalists),
	articles: many(articles)
}));

export const journalistsRelations = relations(journalists, ({ one }) => ({
	user: one(accounts, {
		fields: [journalists.userId],
		references: [accounts.id]
	}),
	newspaper: one(newspapers, {
		fields: [journalists.newspaperId],
		references: [newspapers.id]
	})
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
	author: one(accounts, {
		fields: [articles.authorId],
		references: [accounts.id]
	}),
	newspaper: one(newspapers, {
		fields: [articles.newspaperId],
		references: [newspapers.id]
	}),
	upvotes: many(upvotes)
}));

export const upvotesRelations = relations(upvotes, ({ one }) => ({
	user: one(accounts, {
		fields: [upvotes.userId],
		references: [accounts.id]
	}),
	article: one(articles, {
		fields: [upvotes.articleId],
		references: [articles.id]
	})
}));

export const resourceTypeEnum = pgEnum("resource_type", ["iron", "copper", "steel", "gunpowder", "wood", "coal"]);
export const productTypeEnum = pgEnum("product_type", ["rifles", "ammunition", "artillery", "vehicles", "explosives"]);
export const factoryTypeEnum = pgEnum("factory_type", ["mine", "refinery", "armaments", "general"]);
export const jobTypeEnum = pgEnum("job_type", ["miner", "refiner", "assembler", "general_worker"]);

// Companies table
export const companies = pgTable("companies", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	logo: text("logo"), // URL or path to logo
	ownerId: text("owner_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	description: text("description"),
	foundedAt: timestamp("founded_at").defaultNow().notNull()
});

// Resources Inventory table
export const resourceInventory = pgTable(
	"resource_inventory",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		resourceType: resourceTypeEnum("resource_type").notNull(),
		quantity: integer("quantity").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => ({
		userResourceIdx: uniqueIndex("idx_user_resource").on(table.userId, table.resourceType)
	})
);

// Products Inventory table
export const productInventory = pgTable(
	"product_inventory",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		productType: productTypeEnum("product_type").notNull(),
		quantity: integer("quantity").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => ({
		userProductIdx: uniqueIndex("idx_user_product").on(table.userId, table.productType)
	})
);

// Factories table
export const factories = pgTable("factories", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	companyId: uuid("company_id")
		.notNull()
		.references(() => companies.id, { onDelete: "cascade" }),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	factoryType: factoryTypeEnum("factory_type").notNull(),
	resourceOutput: resourceTypeEnum("resource_output"), // For mines
	productOutput: productTypeEnum("product_output"), // For armament factories
	maxWorkers: integer("max_workers").default(10).notNull(),
	workerWage: bigint("worker_wage", { mode: "number" }).default(1500).notNull(),
	productionRate: integer("production_rate").default(10).notNull(), // Resources produced per shift
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Factory Workers table
export const factoryWorkers = pgTable("factory_workers", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(), // One job per user
	factoryId: uuid("factory_id")
		.notNull()
		.references(() => factories.id, { onDelete: "cascade" }),
	jobType: jobTypeEnum("job_type").notNull(),
	hiredAt: timestamp("hired_at").defaultNow().notNull(),
	lastWorked: timestamp("last_worked")
});

// Production Queue table (one active slot per user)
export const productionQueue = pgTable("production_queue", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	productType: productTypeEnum("product_type").notNull(),
	quantity: integer("quantity").notNull(),
	startedAt: timestamp("started_at").defaultNow().notNull(),
	completesAt: timestamp("completes_at").notNull()
});

// Market Listings table
export const marketListings = pgTable("market_listings", {
	id: uuid("id").defaultRandom().primaryKey(),
	sellerId: text("seller_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	itemType: varchar("item_type", { length: 20 }).notNull(), // 'resource' or 'product'
	itemName: varchar("item_name", { length: 50 }).notNull(), // e.g., 'iron', 'rifles'
	quantity: integer("quantity").notNull(),
	pricePerUnit: bigint("price_per_unit", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Market Transactions table
export const marketTransactions = pgTable("market_transactions", {
	id: uuid("id").defaultRandom().primaryKey(),
	listingId: uuid("listing_id")
		.notNull()
		.references(() => marketListings.id, { onDelete: "cascade" }),
	buyerId: text("buyer_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	sellerId: text("seller_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	quantity: integer("quantity").notNull(),
	totalPrice: bigint("total_price", { mode: "number" }).notNull(),
	completedAt: timestamp("completed_at").defaultNow().notNull()
});

// User Wallet table
export const userWallets = pgTable("user_wallets", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	balance: bigint("balance", { mode: "number" }).default(10000).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations
export const companiesRelations = relations(companies, ({ one, many }) => ({
	owner: one(accounts, {
		fields: [companies.ownerId],
		references: [accounts.id]
	}),
	factories: many(factories)
}));

export const resourceInventoryRelations = relations(resourceInventory, ({ one }) => ({
	user: one(accounts, {
		fields: [resourceInventory.userId],
		references: [accounts.id]
	})
}));

export const productInventoryRelations = relations(productInventory, ({ one }) => ({
	user: one(accounts, {
		fields: [productInventory.userId],
		references: [accounts.id]
	})
}));

export const factoriesRelations = relations(factories, ({ one, many }) => ({
	company: one(companies, {
		fields: [factories.companyId],
		references: [companies.id]
	}),
	region: one(regions, {
		fields: [factories.regionId],
		references: [regions.id]
	}),
	workers: many(factoryWorkers)
}));

export const factoryWorkersRelations = relations(factoryWorkers, ({ one }) => ({
	user: one(accounts, {
		fields: [factoryWorkers.userId],
		references: [accounts.id]
	}),
	factory: one(factories, {
		fields: [factoryWorkers.factoryId],
		references: [factories.id]
	})
}));

export const productionQueueRelations = relations(productionQueue, ({ one }) => ({
	user: one(accounts, {
		fields: [productionQueue.userId],
		references: [accounts.id]
	})
}));

export const marketListingsRelations = relations(marketListings, ({ one }) => ({
	seller: one(accounts, {
		fields: [marketListings.sellerId],
		references: [accounts.id]
	})
}));

export const userWalletsRelations = relations(userWallets, ({ one }) => ({
	user: one(accounts, {
		fields: [userWallets.userId],
		references: [accounts.id]
	})
}));

export const files = pgTable("files", {
	id: text("id").primaryKey(),
	key: text("key").notNull().unique(),
	fileName: text("file_name").notNull(),
	contentType: text("content_type").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	uploadedBy: text("uploaded_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow()
});

// Enums for parliament system
export const proposalStatusEnum = pgEnum("proposal_status", ["active", "passed", "rejected", "expired"]);
export const voteTypeEnum = pgEnum("vote_type", ["for", "against", "abstain"]);
export const proposalTypeEnum = pgEnum("proposal_type", [
	"budget",
	"tax",
	"infrastructure",
	"education",
	"defense",
	"healthcare",
	"environment",
	"justice",
	"general"
]);

export const politicalParties = pgTable("political_parties", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull().unique(),
	abbreviation: varchar("abbreviation", { length: 10 }),
	color: varchar("color", { length: 7 }).default("#6366f1").notNull(), // Hex color
	logo: text("logo"), // File ID reference to files table
	ideology: varchar("ideology", { length: 50 }), // e.g., "Liberal", "Conservative", "Socialist"
	description: text("description"),
	founderId: text("founder_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	stateId: uuid("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	foundedAt: timestamp("founded_at").defaultNow().notNull(),
	memberCount: integer("member_count").default(1).notNull()
});

// Party Members table
export const partyMembers = pgTable(
	"party_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		partyId: uuid("party_id")
			.notNull()
			.references(() => politicalParties.id, { onDelete: "cascade" }),
		role: varchar("role", { length: 20 }).default("member").notNull(), // member, leader, deputy
		joinedAt: timestamp("joined_at").defaultNow().notNull()
	},
	(table) => ({
		userPartyIdx: uniqueIndex("idx_user_party").on(table.userId, table.partyId)
	})
);

// Relations
export const politicalPartiesRelations = relations(politicalParties, ({ one, many }) => ({
	founder: one(accounts, {
		fields: [politicalParties.founderId],
		references: [accounts.id]
	}),
	state: one(states, {
		fields: [politicalParties.stateId],
		references: [states.id]
	}),
	members: many(partyMembers)
}));

export const partyMembersRelations = relations(partyMembers, ({ one }) => ({
	user: one(accounts, {
		fields: [partyMembers.userId],
		references: [accounts.id]
	}),
	party: one(politicalParties, {
		fields: [partyMembers.partyId],
		references: [politicalParties.id]
	})
}));

export type PartyMember = typeof partyMembers.$inferSelect;
export type NewPartyMember = typeof partyMembers.$inferInsert;

// Update parliament members to reference parties
// Add this column to parliamentMembers table:
// partyId: uuid("party_id").references(() => politicalParties.id, { onDelete: "set null" })

// Parliamentary Proposals/Laws table
export const parliamentaryProposals = pgTable("parliamentary_proposals", {
	id: uuid("id").defaultRandom().primaryKey(),
	stateId: uuid("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	title: varchar("title", { length: 200 }).notNull(),
	description: text("description").notNull(),
	proposalType: proposalTypeEnum("proposal_type").notNull(),
	proposedBy: text("proposed_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	status: proposalStatusEnum("status").notNull().default("active"),
	votingStartsAt: timestamp("voting_starts_at").defaultNow().notNull(),
	votingEndsAt: timestamp("voting_ends_at").notNull(),
	requiredMajority: integer("required_majority").default(50).notNull(), // Percentage needed to pass
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Parliamentary Votes table
export const parliamentaryVotes = pgTable(
	"parliamentary_votes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		proposalId: uuid("proposal_id")
			.notNull()
			.references(() => parliamentaryProposals.id, { onDelete: "cascade" }),
		voterId: text("voter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		voteType: voteTypeEnum("vote_type").notNull(),
		votedAt: timestamp("voted_at").defaultNow().notNull()
	},
	(table) => ({
		proposalVoterIdx: uniqueIndex("idx_proposal_voter").on(table.proposalId, table.voterId)
	})
);

export const parliamentaryVotesRelations = relations(parliamentaryVotes, ({ one }) => ({
	proposal: one(parliamentaryProposals, {
		fields: [parliamentaryVotes.proposalId],
		references: [parliamentaryProposals.id]
	}),
	voter: one(accounts, {
		fields: [parliamentaryVotes.voterId],
		references: [accounts.id]
	})
}));

// TypeScript types
export type PoliticalParty = typeof politicalParties.$inferSelect;
export type NewPoliticalParty = typeof politicalParties.$inferInsert;

export type ParliamentaryProposal = typeof parliamentaryProposals.$inferSelect;
export type NewParliamentaryProposal = typeof parliamentaryProposals.$inferInsert;

export type ParliamentaryVote = typeof parliamentaryVotes.$inferSelect;
export type NewParliamentaryVote = typeof parliamentaryVotes.$inferInsert;

// TypeScript types
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type ResourceInventory = typeof resourceInventory.$inferSelect;
export type NewResourceInventory = typeof resourceInventory.$inferInsert;

export type ProductInventory = typeof productInventory.$inferSelect;
export type NewProductInventory = typeof productInventory.$inferInsert;

export type Factory = typeof factories.$inferSelect;
export type NewFactory = typeof factories.$inferInsert;

export type FactoryWorker = typeof factoryWorkers.$inferSelect;
export type NewFactoryWorker = typeof factoryWorkers.$inferInsert;

export type ProductionQueue = typeof productionQueue.$inferSelect;
export type NewProductionQueue = typeof productionQueue.$inferInsert;

export type MarketListing = typeof marketListings.$inferSelect;
export type NewMarketListing = typeof marketListings.$inferInsert;

export type MarketTransaction = typeof marketTransactions.$inferSelect;
export type NewMarketTransaction = typeof marketTransactions.$inferInsert;

export type UserWallet = typeof userWallets.$inferSelect;
export type NewUserWallet = typeof userWallets.$inferInsert;

// TypeScript types
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;

export type State = typeof states.$inferSelect;
export type NewState = typeof states.$inferInsert;

export type Region = typeof regions.$inferSelect;
export type NewRegion = typeof regions.$inferInsert;

export type Governor = typeof governors.$inferSelect;
export type NewGovernor = typeof governors.$inferInsert;

export type President = typeof presidents.$inferSelect;
export type NewPresident = typeof presidents.$inferInsert;

export type Minister = typeof ministers.$inferSelect;
export type NewMinister = typeof ministers.$inferInsert;

export type ParliamentMember = typeof parliamentMembers.$inferSelect;
export type NewParliamentMember = typeof parliamentMembers.$inferInsert;

export type Residence = typeof residences.$inferSelect;
export type NewResidence = typeof residences.$inferInsert;

export type Newspaper = typeof newspapers.$inferSelect;
export type NewNewspaper = typeof newspapers.$inferInsert;

export type Journalist = typeof journalists.$inferSelect;
export type NewJournalist = typeof journalists.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type Upvote = typeof upvotes.$inferSelect;
export type NewUpvote = typeof upvotes.$inferInsert;

// Gift code resource type enum
export const giftCodeResourceTypeEnum = pgEnum("gift_code_resource_type", [
	"iron",
	"copper",
	"steel",
	"gunpowder",
	"wood",
	"coal",
	"rifles",
	"ammunition",
	"artillery",
	"vehicles",
	"explosives",
	"currency"
]);

// Gift Codes table
export const giftCodes = pgTable("gift_codes", {
	id: uuid("id").defaultRandom().primaryKey(),
	code: varchar("code", { length: 50 }).notNull().unique(),
	description: text("description"),

	// Rewards
	currencyAmount: bigint("currency_amount", { mode: "number" }).default(0).notNull(),

	// Usage limits
	maxRedemptions: integer("max_redemptions"), // null = unlimited
	currentRedemptions: integer("current_redemptions").default(0).notNull(),

	// Time limits
	expiresAt: timestamp("expires_at"),

	// Metadata
	createdBy: text("created_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	isActive: integer("is_active").default(1).notNull() // 1 = active, 0 = inactive
});

// Gift Code Resources - many-to-many for multiple resource rewards
export const giftCodeResources = pgTable("gift_code_resources", {
	id: uuid("id").defaultRandom().primaryKey(),
	giftCodeId: uuid("gift_code_id")
		.notNull()
		.references(() => giftCodes.id, { onDelete: "cascade" }),
	resourceType: giftCodeResourceTypeEnum("resource_type").notNull(),
	quantity: integer("quantity").notNull()
});

// Gift Code Redemptions - track who claimed what
export const giftCodeRedemptions = pgTable(
	"gift_code_redemptions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		giftCodeId: uuid("gift_code_id")
			.notNull()
			.references(() => giftCodes.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),

		// Store what they received for history
		currencyReceived: bigint("currency_received", { mode: "number" }).default(0).notNull()
	},
	(table) => ({
		userCodeIdx: uniqueIndex("idx_user_gift_code").on(table.userId, table.giftCodeId)
	})
);

// Gift Code Redemption Resources - track specific resources received
export const giftCodeRedemptionResources = pgTable("gift_code_redemption_resources", {
	id: uuid("id").defaultRandom().primaryKey(),
	redemptionId: uuid("redemption_id")
		.notNull()
		.references(() => giftCodeRedemptions.id, { onDelete: "cascade" }),
	resourceType: giftCodeResourceTypeEnum("resource_type").notNull(),
	quantity: integer("quantity").notNull()
});

// Relations
export const giftCodesRelations = relations(giftCodes, ({ one, many }) => ({
	creator: one(accounts, {
		fields: [giftCodes.createdBy],
		references: [accounts.id]
	}),
	resources: many(giftCodeResources),
	redemptions: many(giftCodeRedemptions)
}));

export const giftCodeResourcesRelations = relations(giftCodeResources, ({ one }) => ({
	giftCode: one(giftCodes, {
		fields: [giftCodeResources.giftCodeId],
		references: [giftCodes.id]
	})
}));

export const giftCodeRedemptionsRelations = relations(giftCodeRedemptions, ({ one, many }) => ({
	giftCode: one(giftCodes, {
		fields: [giftCodeRedemptions.giftCodeId],
		references: [giftCodes.id]
	}),
	user: one(accounts, {
		fields: [giftCodeRedemptions.userId],
		references: [accounts.id]
	}),
	resources: many(giftCodeRedemptionResources)
}));

export const giftCodeRedemptionResourcesRelations = relations(giftCodeRedemptionResources, ({ one }) => ({
	redemption: one(giftCodeRedemptions, {
		fields: [giftCodeRedemptionResources.redemptionId],
		references: [giftCodeRedemptions.id]
	})
}));

// TypeScript types
export type GiftCode = typeof giftCodes.$inferSelect;
export type NewGiftCode = typeof giftCodes.$inferInsert;

export type GiftCodeResource = typeof giftCodeResources.$inferSelect;
export type NewGiftCodeResource = typeof giftCodeResources.$inferInsert;

export type GiftCodeRedemption = typeof giftCodeRedemptions.$inferSelect;
export type NewGiftCodeRedemption = typeof giftCodeRedemptions.$inferInsert;

export type GiftCodeRedemptionResource = typeof giftCodeRedemptionResources.$inferSelect;
export type NewGiftCodeRedemptionResource = typeof giftCodeRedemptionResources.$inferInsert;

export const electionStatusEnum = pgEnum("election_status", ["scheduled", "active", "completed"]);

// Parliamentary Elections table
export const parliamentaryElections = pgTable("parliamentary_elections", {
	id: uuid("id").defaultRandom().primaryKey(),
	stateId: uuid("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	startDate: timestamp("start_date").notNull(),
	endDate: timestamp("end_date").notNull(),
	status: electionStatusEnum("status").notNull().default("scheduled"),
	totalSeats: integer("total_seats").default(0).notNull(),
	isInaugural: integer("is_inaugural").default(0).notNull(), // ADD THIS LINE: 1 = first election, 0 = regular
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Also update the TypeScript type
export type ParliamentaryElection = typeof parliamentaryElections.$inferSelect;
export type NewParliamentaryElection = typeof parliamentaryElections.$inferInsert;

// Election Votes table (tracks user votes for parties)
export const electionVotes = pgTable(
	"election_votes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		electionId: uuid("election_id")
			.notNull()
			.references(() => parliamentaryElections.id, { onDelete: "cascade" }),
		voterId: text("voter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		partyId: uuid("party_id")
			.notNull()
			.references(() => politicalParties.id, { onDelete: "cascade" }),
		votedAt: timestamp("voted_at").defaultNow().notNull()
	},
	(table) => ({
		electionVoterIdx: uniqueIndex("idx_election_voter").on(table.electionId, table.voterId)
	})
);

// Election Results table (stores final seat distribution)
export const electionResults = pgTable(
	"election_results",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		electionId: uuid("election_id")
			.notNull()
			.references(() => parliamentaryElections.id, { onDelete: "cascade" }),
		partyId: uuid("party_id")
			.notNull()
			.references(() => politicalParties.id, { onDelete: "cascade" }),
		votes: integer("votes").default(0).notNull(),
		seatsWon: integer("seats_won").default(0).notNull(),
		votePercentage: integer("vote_percentage").default(0).notNull()
	},
	(table) => ({
		electionPartyIdx: uniqueIndex("idx_election_party_result").on(table.electionId, table.partyId)
	})
);

// Relations
export const parliamentaryElectionsRelations = relations(parliamentaryElections, ({ one, many }) => ({
	state: one(states, {
		fields: [parliamentaryElections.stateId],
		references: [states.id]
	}),
	votes: many(electionVotes),
	results: many(electionResults)
}));

export const electionVotesRelations = relations(electionVotes, ({ one }) => ({
	election: one(parliamentaryElections, {
		fields: [electionVotes.electionId],
		references: [parliamentaryElections.id]
	}),
	voter: one(accounts, {
		fields: [electionVotes.voterId],
		references: [accounts.id]
	}),
	party: one(politicalParties, {
		fields: [electionVotes.partyId],
		references: [politicalParties.id]
	})
}));

export const electionResultsRelations = relations(electionResults, ({ one }) => ({
	election: one(parliamentaryElections, {
		fields: [electionResults.electionId],
		references: [parliamentaryElections.id]
	}),
	party: one(politicalParties, {
		fields: [electionResults.partyId],
		references: [politicalParties.id]
	})
}));

export type ElectionVote = typeof electionVotes.$inferSelect;
export type NewElectionVote = typeof electionVotes.$inferInsert;

export type ElectionResult = typeof electionResults.$inferSelect;
export type NewElectionResult = typeof electionResults.$inferInsert;

// Party Creation Attempts table - tracks cooldowns
export const partyCreationAttempts = pgTable("party_creation_attempts", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(), // One cooldown per user
	lastAttemptAt: timestamp("last_attempt_at").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Party Edit History table - tracks when parties were last edited
export const partyEditHistory = pgTable("party_edit_history", {
	id: uuid("id").defaultRandom().primaryKey(),
	partyId: uuid("party_id")
		.notNull()
		.references(() => politicalParties.id, { onDelete: "cascade" })
		.unique(), // One record per party
	lastEditAt: timestamp("last_edit_at").defaultNow().notNull(),
	lastEditBy: text("last_edit_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
});

// Profile Edit History table - tracks when profiles were last edited
export const profileEditHistory = pgTable("profile_edit_history", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(), // One record per user
	lastEditAt: timestamp("last_edit_at").defaultNow().notNull()
});

// Relations
export const partyCreationAttemptsRelations = relations(partyCreationAttempts, ({ one }) => ({
	user: one(accounts, {
		fields: [partyCreationAttempts.userId],
		references: [accounts.id]
	})
}));

export const partyEditHistoryRelations = relations(partyEditHistory, ({ one }) => ({
	party: one(politicalParties, {
		fields: [partyEditHistory.partyId],
		references: [politicalParties.id]
	}),
	editor: one(accounts, {
		fields: [partyEditHistory.lastEditBy],
		references: [accounts.id]
	})
}));

export const profileEditHistoryRelations = relations(profileEditHistory, ({ one }) => ({
	user: one(accounts, {
		fields: [profileEditHistory.userId],
		references: [accounts.id]
	})
}));

// TypeScript types
export type PartyCreationAttempt = typeof partyCreationAttempts.$inferSelect;
export type NewPartyCreationAttempt = typeof partyCreationAttempts.$inferInsert;

export type PartyEditHistory = typeof partyEditHistory.$inferSelect;
export type NewPartyEditHistory = typeof partyEditHistory.$inferInsert;

export type ProfileEditHistory = typeof profileEditHistory.$inferSelect;
export type NewProfileEditHistory = typeof profileEditHistory.$inferInsert;
export const regionalResourcesEnum = pgEnum("regional_resource", ["iron", "copper", "coal", "wood"]);

export const regionalResources = pgTable("regional_resources", {
	id: uuid("id").defaultRandom().primaryKey(),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	resourceType: regionalResourcesEnum("resource_type").notNull(),
	totalReserves: integer("total_reserves").notNull(), // Total available
	remainingReserves: integer("remaining_reserves").notNull(), // What's left
	extractionRate: integer("extraction_rate").default(100).notNull(), // Per work cycle
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// State Energy Production
export const stateEnergy = pgTable("state_energy", {
	id: uuid("id").defaultRandom().primaryKey(),
	stateId: uuid("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	totalProduction: integer("total_production").default(1000).notNull(), // Total MW available
	usedProduction: integer("used_production").default(0).notNull(), // Currently consumed
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Factory Creation Cooldown
export const factoryCreationCooldown = pgTable("factory_creation_cooldown", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastCreationAt: timestamp("last_creation_at").defaultNow().notNull()
});

// Relations
export const regionalResourcesRelations = relations(regionalResources, ({ one }) => ({
	region: one(regions, {
		fields: [regionalResources.regionId],
		references: [regions.id]
	})
}));

export const stateEnergyRelations = relations(stateEnergy, ({ one }) => ({
	state: one(states, {
		fields: [stateEnergy.stateId],
		references: [states.id]
	})
}));

export const factoryCreationCooldownRelations = relations(factoryCreationCooldown, ({ one }) => ({
	user: one(accounts, {
		fields: [factoryCreationCooldown.userId],
		references: [accounts.id]
	})
}));

// TypeScript types
export type RegionalResource = typeof regionalResources.$inferSelect;
export type NewRegionalResource = typeof regionalResources.$inferInsert;

export type StateEnergy = typeof stateEnergy.$inferSelect;
export type NewStateEnergy = typeof stateEnergy.$inferInsert;

export type FactoryCreationCooldown = typeof factoryCreationCooldown.$inferSelect;
export type NewFactoryCreationCooldown = typeof factoryCreationCooldown.$inferInsert;

// Tax Types Enum
export const taxTypeEnum = pgEnum("tax_type", [
	"mining", // Tax on mining operations
	"production", // Tax on manufacturing
	"market_transaction", // Tax on market sales
	"income" // Tax on wages/earnings
]);

// State Taxes table
export const stateTaxes = pgTable("state_taxes", {
	id: uuid("id").defaultRandom().primaryKey(),
	stateId: uuid("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	taxType: taxTypeEnum("tax_type").notNull(),
	taxRate: integer("tax_rate").notNull(), // Percentage (e.g., 10 = 10%)
	taxName: varchar("tax_name", { length: 100 }).notNull(),
	description: text("description"),
	proposalId: uuid("proposal_id").references(() => parliamentaryProposals.id, { onDelete: "set null" }), // Track which proposal created this
	implementedAt: timestamp("implemented_at").defaultNow().notNull(),
	isActive: integer("is_active").default(1).notNull(), // 1 = active, 0 = repealed
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Tax Revenue Collection tracking
export const taxRevenue = pgTable("tax_revenue", {
	id: uuid("id").defaultRandom().primaryKey(),
	stateId: uuid("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	taxId: uuid("tax_id")
		.notNull()
		.references(() => stateTaxes.id, { onDelete: "cascade" }),
	amount: bigint("amount", { mode: "number" }).notNull(),
	collectedFrom: text("collected_from")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	transactionType: varchar("transaction_type", { length: 50 }).notNull(), // "mining", "production", "market_sale"
	collectedAt: timestamp("collected_at").defaultNow().notNull()
});

// State Treasury to hold tax revenue
export const stateTreasury = pgTable("state_treasury", {
	id: uuid("id").defaultRandom().primaryKey(),
	stateId: uuid("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	balance: bigint("balance", { mode: "number" }).default(0).notNull(),
	totalCollected: bigint("total_collected", { mode: "number" }).default(0).notNull(),
	totalSpent: bigint("total_spent", { mode: "number" }).default(0).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Add tax metadata to parliamentary proposals
// This is additional data stored as JSON in the proposal description or as separate fields

// Relations
export const stateTaxesRelations = relations(stateTaxes, ({ one, many }) => ({
	state: one(states, {
		fields: [stateTaxes.stateId],
		references: [states.id]
	}),
	proposal: one(parliamentaryProposals, {
		fields: [stateTaxes.proposalId],
		references: [parliamentaryProposals.id]
	}),
	revenue: many(taxRevenue)
}));

export const taxRevenueRelations = relations(taxRevenue, ({ one }) => ({
	state: one(states, {
		fields: [taxRevenue.stateId],
		references: [states.id]
	}),
	tax: one(stateTaxes, {
		fields: [taxRevenue.taxId],
		references: [stateTaxes.id]
	}),
	payer: one(accounts, {
		fields: [taxRevenue.collectedFrom],
		references: [accounts.id]
	})
}));

export const stateTreasuryRelations = relations(stateTreasury, ({ one }) => ({
	state: one(states, {
		fields: [stateTreasury.stateId],
		references: [states.id]
	})
}));

// TypeScript types
export type StateTax = typeof stateTaxes.$inferSelect;
export type NewStateTax = typeof stateTaxes.$inferInsert;

export type TaxRevenue = typeof taxRevenue.$inferSelect;
export type NewTaxRevenue = typeof taxRevenue.$inferInsert;

export type StateTreasury = typeof stateTreasury.$inferSelect;
export type NewStateTreasury = typeof stateTreasury.$inferInsert;
