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

// Add these to your existing schema.ts file

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

// Political Parties table
export const politicalParties = pgTable("political_parties", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	abbreviation: varchar("abbreviation", { length: 10 }),
	color: varchar("color", { length: 7 }).default("#6366f1"), // Hex color
	ideology: text("ideology"),
	description: text("description"),
	foundedAt: timestamp("founded_at").defaultNow().notNull()
});

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

// Relations
export const politicalPartiesRelations = relations(politicalParties, ({ many }) => ({
	members: many(parliamentMembers)
}));

export const parliamentaryProposalsRelations = relations(parliamentaryProposals, ({ one, many }) => ({
	state: one(states, {
		fields: [parliamentaryProposals.stateId],
		references: [states.id]
	}),
	proposer: one(accounts, {
		fields: [parliamentaryProposals.proposedBy],
		references: [accounts.id]
	}),
	votes: many(parliamentaryVotes)
}));

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
