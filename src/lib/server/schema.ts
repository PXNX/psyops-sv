import { relations } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from "drizzle-orm/pg-core";

// --- ENUMS ---
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
export const resourceTypeEnum = pgEnum("resource_type", ["iron", "copper", "steel", "gunpowder", "wood", "coal"]);
export const productTypeEnum = pgEnum("product_type", ["rifles", "ammunition", "artillery", "vehicles", "explosives"]);
export const factoryTypeEnum = pgEnum("factory_type", ["mine", "refinery", "armaments", "general"]);
export const jobTypeEnum = pgEnum("job_type", ["miner", "refiner", "assembler", "general_worker"]);
export const visaStatusEnum = pgEnum("visa_status", ["active", "expired", "revoked"]);
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
export const taxTypeEnum = pgEnum("tax_type", ["mining", "production", "market_transaction", "income"]);
export const electionStatusEnum = pgEnum("election_status", ["scheduled", "active", "completed"]);
export const militaryUnitTypeEnum = pgEnum("military_unit_type", [
	"air_defence",
	"heavy_armor",
	"ifv",
	"artillery",
	"light_infantry",
	"bomber_squadron",
	"fighter_squadron"
]);
export const militaryUnitSizeEnum = pgEnum("military_unit_size", ["brigade", "division", "corps"]);
export const travelStatusEnum = pgEnum("travel_status", ["in_progress", "completed", "cancelled"]);
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
export const powerPlantTypeEnum = pgEnum("power_plant_type", ["coal", "gas", "nuclear", "solar", "wind", "hydro"]);

// --- AUTH ---
export const accounts = pgTable(
	"account",
	{
		id: text("id").primaryKey(), // Auth-managed ID
		email: varchar("email", { length: 255 }).notNull().unique(),
		role: userRoleEnum("role").notNull().default("user"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({ emailIdx: uniqueIndex("idx_email").on(t.email) })
);

export const userProfiles = pgTable("user_profiles", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	accountId: text("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	name: text("name"),
	logo: integer("logo").references(() => files.id, { onDelete: "set null" }),
	bio: text("bio"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

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
	(t) => ({
		accountIdx: index("idx_session_account").on(t.accountId),
		expiresAtIdx: index("idx_session_expires").on(t.expiresAt)
	})
);

export const oauthTokens = pgTable(
	"oauth_tokens",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
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
	(t) => ({ accountProviderIdx: uniqueIndex("idx_account_provider").on(t.accountId, t.provider) })
);

// --- GEOGRAPHY & RESIDENCE ---
export const states = pgTable("states", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	logo: integer("logo").references(() => files.id, { onDelete: "set null" }),

	background: text("background"),
	description: text("description"),
	population: integer("population").default(0),
	rating: integer("rating").default(0),
	blocId: integer("bloc_id").references(() => blocs.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const regions = pgTable("regions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
	rating: integer("rating").default(0),
	infrastructure: integer("infrastructure").default(0),
	economy: integer("powerplants").default(0),
	education: integer("education").default(0),
	hospitals: integer("hospitals").default(0),
	fortifications: integer("fortifications").default(0),
	oil: integer("oil").default(0),
	aluminium: integer("aluminium").default(0),
	rubber: integer("rubber").default(0),
	tungsten: integer("tungsten").default(0),
	steel: integer("steel").default(0),
	chromium: integer("chromium").default(0),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const files = pgTable("files", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	key: text("key").notNull().unique(),
	fileName: text("file_name").notNull(),
	contentType: text("content_type").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	uploadedBy: text("uploaded_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow()
});

export const residences = pgTable(
	"residences",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" })
			.unique(),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		movedInAt: timestamp("moved_in_at").defaultNow().notNull()
	},
	(t) => ({ userRegionIdx: index("idx_residence_user_region").on(t.userId, t.regionId) })
);

export const residenceApplications = pgTable("residence_applications", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	status: text("status").notNull().default("pending"),
	appliedAt: timestamp("applied_at").defaultNow().notNull(),
	reviewedAt: timestamp("reviewed_at"),
	reviewedBy: text("reviewed_by").references(() => accounts.id, { onDelete: "set null" }),
	reviewNote: text("review_note")
});

// --- POLITICS & GOVERNMENT ---
export const presidents = pgTable("presidents", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	electedAt: timestamp("elected_at").defaultNow().notNull(),
	term: integer("term").default(1)
});

export const governors = pgTable("governors", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" })
		.unique(),
	appointedAt: timestamp("appointed_at").defaultNow().notNull(),
	term: integer("term").default(1)
});

export const regionsRelations = relations(regions, ({ one, many }) => ({
	state: one(states, { fields: [regions.stateId], references: [states.id] }),
	governor: one(governors, {
		fields: [regions.id],
		references: [governors.regionId]
	}),
	factories: many(factories),
	residences: many(residences),
	coordinates: one(regionCoordinates),
	militaryUnits: many(militaryUnits)
}));

// Also add the inverse relation to governorsRelations
export const governorsRelations = relations(governors, ({ one }) => ({
	user: one(accounts, { fields: [governors.userId], references: [accounts.id] }),
	region: one(regions, { fields: [governors.regionId], references: [regions.id] })
}));

export const ministers = pgTable(
	"ministers",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		ministry: ministryTypeEnum("ministry").notNull(),
		appointedAt: timestamp("appointed_at").defaultNow().notNull()
	},
	(t) => ({
		userStateMinistryIdx: uniqueIndex("idx_minister_unique").on(t.userId, t.stateId, t.ministry),
		stateMinistryIdx: uniqueIndex("idx_state_ministry_unique").on(t.stateId, t.ministry)
	})
);

export const politicalParties = pgTable("political_parties", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	name: varchar("name", { length: 50 }).notNull().unique(),
	abbreviation: varchar("abbreviation", { length: 5 }),
	color: varchar("color", { length: 7 }).default("#6366f1").notNull(),
	logo: integer("logo").references(() => files.id, { onDelete: "set null" }),
	ideology: varchar("ideology", { length: 50 }),
	description: text("description"),
	founderId: text("founder_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	foundedAt: timestamp("founded_at").defaultNow().notNull(),
	memberCount: integer("member_count").default(1).notNull()
});

export const partyMembers = pgTable(
	"party_members",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		partyId: integer("party_id")
			.notNull()
			.references(() => politicalParties.id, { onDelete: "cascade" }),
		role: varchar("role", { length: 20 }).default("member").notNull(),
		joinedAt: timestamp("joined_at").defaultNow().notNull()
	},
	(t) => ({ userPartyIdx: uniqueIndex("idx_user_party").on(t.userId, t.partyId) })
);

export const parliamentMembers = pgTable(
	"parliament_members",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		partyAffiliation: varchar("party_affiliation", { length: 100 }),
		electedAt: timestamp("elected_at").defaultNow().notNull(),
		term: integer("term").default(1)
	},
	(t) => ({ userStateIdx: uniqueIndex("idx_parliament_user_state").on(t.userId, t.stateId) })
);

// --- PROPOSALS & ELECTIONS ---
export const parliamentaryProposals = pgTable("parliamentary_proposals", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
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
	requiredMajority: integer("required_majority").default(50).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const parliamentaryVotes = pgTable(
	"parliamentary_votes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		proposalId: integer("proposal_id")
			.notNull()
			.references(() => parliamentaryProposals.id, { onDelete: "cascade" }),
		voterId: text("voter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		voteType: voteTypeEnum("vote_type").notNull(),
		votedAt: timestamp("voted_at").defaultNow().notNull()
	},
	(t) => ({ proposalVoterIdx: uniqueIndex("idx_proposal_voter").on(t.proposalId, t.voterId) })
);

export const parliamentaryElections = pgTable("parliamentary_elections", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	startDate: timestamp("start_date").notNull(),
	endDate: timestamp("end_date").notNull(),
	status: electionStatusEnum("status").notNull().default("scheduled"),
	totalSeats: integer("total_seats").default(0).notNull(),
	isInaugural: boolean("is_inaugural").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const electionVotes = pgTable(
	"election_votes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		electionId: integer("election_id")
			.notNull()
			.references(() => parliamentaryElections.id, { onDelete: "cascade" }),
		voterId: text("voter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		partyId: integer("party_id")
			.notNull()
			.references(() => politicalParties.id, { onDelete: "cascade" }),
		votedAt: timestamp("voted_at").defaultNow().notNull()
	},
	(t) => ({ electionVoterIdx: uniqueIndex("idx_election_voter").on(t.electionId, t.voterId) })
);

export const electionResults = pgTable(
	"election_results",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		electionId: integer("election_id")
			.notNull()
			.references(() => parliamentaryElections.id, { onDelete: "cascade" }),
		partyId: integer("party_id")
			.notNull()
			.references(() => politicalParties.id, { onDelete: "cascade" }),
		votes: integer("votes").default(0).notNull(),
		seatsWon: integer("seats_won").default(0).notNull(),
		votePercentage: integer("vote_percentage").default(0).notNull()
	},
	(t) => ({ electionPartyIdx: uniqueIndex("idx_election_party_result").on(t.electionId, t.partyId) })
);

// --- MEDIA & JOURNALISM ---
export const newspapers = pgTable("newspapers", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	logo: integer("logo").references(() => files.id, { onDelete: "set null" }),
	name: varchar("name", { length: 40 }).notNull(),
	background: text("background"),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const journalists = pgTable(
	"journalists",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		newspaperId: integer("newspaper_id")
			.notNull()
			.references(() => newspapers.id, { onDelete: "cascade" }),
		rank: journalistRankEnum("rank").notNull()
	},
	(t) => ({ userNewspaperIdx: uniqueIndex("user_newspaper_index").on(t.userId, t.newspaperId) })
);

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

// Update your newspapersRelations to properly reference journalists
export const newspapersRelations = relations(newspapers, ({ many }) => ({
	journalists: many(journalists),
	articles: many(articles)
}));

export const articles = pgTable("articles", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	title: varchar("title", { length: 40 }).notNull(),
	content: text("content").notNull(),
	authorId: text("author_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	newspaperId: integer("newspaper_id")
		.notNull()
		.references(() => newspapers.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const upvotes = pgTable(
	"upvotes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		articleId: integer("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" })
	},
	(t) => ({ userArticleIdx: uniqueIndex("user_article_index").on(t.userId, t.articleId) })
);

// --- ECONOMY: COMPANIES & PRODUCTION ---
export const companies = pgTable("companies", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	name: varchar("name", { length: 50 }).notNull(),
	logo: integer("logo").references(() => files.id, { onDelete: "set null" }),
	ownerId: text("owner_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	description: text("description"),
	foundedAt: timestamp("founded_at").defaultNow().notNull()
});

export const resourceInventory = pgTable(
	"resource_inventory",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		resourceType: resourceTypeEnum("resource_type").notNull(),
		quantity: integer("quantity").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({ userResourceIdx: uniqueIndex("idx_user_resource").on(t.userId, t.resourceType) })
);

export const productInventory = pgTable(
	"product_inventory",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		productType: productTypeEnum("product_type").notNull(),
		quantity: integer("quantity").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({ userProductIdx: uniqueIndex("idx_user_product").on(t.userId, t.productType) })
);

export const factories = pgTable("factories", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	companyId: integer("company_id")
		.notNull()
		.references(() => companies.id, { onDelete: "cascade" }),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	factoryType: factoryTypeEnum("factory_type").notNull(),
	resourceOutput: resourceTypeEnum("resource_output"),
	productOutput: productTypeEnum("product_output"),
	maxWorkers: integer("max_workers").default(10).notNull(),
	workerWage: bigint("worker_wage", { mode: "number" }).default(1500).notNull(),
	productionRate: integer("production_rate").default(10).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const factoryWorkers = pgTable("factory_workers", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	factoryId: integer("factory_id")
		.notNull()
		.references(() => factories.id, { onDelete: "cascade" }),
	jobType: jobTypeEnum("job_type").notNull(),
	hiredAt: timestamp("hired_at").defaultNow().notNull(),
	lastWorked: timestamp("last_worked")
});

export const productionQueue = pgTable("production_queue", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	productType: productTypeEnum("product_type").notNull(),
	quantity: integer("quantity").notNull(),
	startedAt: timestamp("started_at").defaultNow().notNull(),
	completesAt: timestamp("completes_at").notNull()
});

// --- MARKET & WALLET ---
export const marketListings = pgTable("market_listings", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	sellerId: text("seller_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	itemType: varchar("item_type", { length: 20 }).notNull(),
	itemName: varchar("item_name", { length: 50 }).notNull(),
	quantity: integer("quantity").notNull(),
	pricePerUnit: bigint("price_per_unit", { mode: "number" }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const marketTransactions = pgTable("market_transactions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	listingId: integer("listing_id")
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

export const userWallets = pgTable("user_wallets", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	balance: bigint("balance", { mode: "number" }).default(10000).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// --- COOLDOWNS ---
export const partyCreationAttempts = pgTable("party_creation_attempts", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastAttemptAt: timestamp("last_attempt_at").defaultNow().notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const factoryCreationCooldown = pgTable("factory_creation_cooldown", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastCreationAt: timestamp("last_creation_at").defaultNow().notNull()
});

export const companyCreationCooldown = pgTable("company_creation_cooldown", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastCreationAt: timestamp("last_creation_at").defaultNow().notNull()
});

export const marketListingCooldowns = pgTable("market_listing_cooldowns", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastRemovedAt: timestamp("last_removed_at").defaultNow().notNull()
});

// --- VISAS & SANCTIONS ---
export const stateVisaSettings = pgTable("state_visa_settings", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	visaRequired: boolean("visa_required").default(false).notNull(),
	visaCost: bigint("visa_cost", { mode: "number" }).default(5000).notNull(),
	visaTaxRate: integer("visa_tax_rate").default(20).notNull(),
	autoApprove: boolean("auto_approve").default(true).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const userVisas = pgTable("user_visas", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	status: visaStatusEnum("status").notNull().default("active"),
	issuedAt: timestamp("issued_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	cost: bigint("cost", { mode: "number" }).notNull(),
	taxPaid: bigint("tax_paid", { mode: "number" }).notNull(),
	approvedBy: text("approved_by").references(() => accounts.id, { onDelete: "set null" }),
	approvedAt: timestamp("approved_at"),
	revokedBy: text("revoked_by").references(() => accounts.id, { onDelete: "set null" }),
	revokedAt: timestamp("revoked_at"),
	revocationReason: text("revocation_reason")
});

export const visaApplications = pgTable("visa_applications", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	status: text("status").notNull().default("pending"),
	purpose: text("purpose"),
	appliedAt: timestamp("applied_at").defaultNow().notNull(),
	reviewedBy: text("reviewed_by").references(() => accounts.id, { onDelete: "set null" }),
	reviewedAt: timestamp("reviewed_at"),
	reviewNote: text("review_note")
});

export const stateSanctions = pgTable("state_sanctions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	targetStateId: integer("target_state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	sanctioningStateId: integer("sanctioning_state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	sanctionedBy: text("sanctioned_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	reason: text("reason").notNull(),
	sanctionedAt: timestamp("sanctioned_at").defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull()
});

// --- TAXATION & TREASURY ---
export const stateTaxes = pgTable("state_taxes", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	taxType: taxTypeEnum("tax_type").notNull(),
	taxRate: integer("tax_rate").notNull(),
	taxName: varchar("tax_name", { length: 100 }).notNull(),
	description: text("description"),
	proposalId: integer("proposal_id").references(() => parliamentaryProposals.id, { onDelete: "set null" }),
	implementedAt: timestamp("implemented_at").defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const stateTreasury = pgTable("state_treasury", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	balance: bigint("balance", { mode: "number" }).default(0).notNull(),
	totalCollected: bigint("total_collected", { mode: "number" }).default(0).notNull(),
	totalSpent: bigint("total_spent", { mode: "number" }).default(0).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const taxRevenue = pgTable("tax_revenue", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	taxId: integer("tax_id")
		.notNull()
		.references(() => stateTaxes.id, { onDelete: "cascade" }),
	amount: bigint("amount", { mode: "number" }).notNull(),
	collectedFrom: text("collected_from")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	transactionType: varchar("transaction_type", { length: 50 }).notNull(),
	collectedAt: timestamp("collected_at").defaultNow().notNull()
});

// --- INFRASTRUCTURE: ENERGY & POWER ---
export const stateEnergy = pgTable("state_energy", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	totalProduction: integer("total_production").default(1000).notNull(),
	usedProduction: integer("used_production").default(0).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const powerPlants = pgTable("power_plants", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	plantType: powerPlantTypeEnum("plant_type").notNull(),
	powerOutput: integer("power_output").notNull(),
	constructionCost: bigint("construction_cost", { mode: "number" }).notNull(),
	isOperational: boolean("is_operational").default(true).notNull(),
	builtBy: text("built_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	builtAt: timestamp("built_at").defaultNow().notNull()
});

// --- MILITARY ---
export const militaryUnits = pgTable("military_units", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	ownerId: text("owner_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	unitType: militaryUnitTypeEnum("unit_type").notNull(),
	unitSize: militaryUnitSizeEnum("unit_size").notNull().default("brigade"),
	attack: integer("attack").notNull(),
	defense: integer("defense").notNull(),
	organization: integer("organization").default(100).notNull(),
	supplyLevel: integer("supply_level").default(100).notNull(),
	isTraining: boolean("is_training").default(false).notNull(),
	trainingStartedAt: timestamp("training_started_at"),
	trainingCompletesAt: timestamp("training_completed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const militaryUnitTemplates = pgTable("military_unit_templates", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	unitType: militaryUnitTypeEnum("unit_type").notNull().unique(),
	displayName: varchar("display_name", { length: 100 }).notNull(),
	description: text("description"),
	baseAttack: integer("base_attack").notNull(),
	baseDefense: integer("base_defense").notNull(),
	trainingDuration: integer("training_duration").notNull(),
	currencyCost: bigint("currency_cost", { mode: "number" }).notNull(),
	ironCost: integer("iron_cost").default(0).notNull(),
	steelCost: integer("steel_cost").default(0).notNull(),
	gunpowderCost: integer("gunpowder_cost").default(0).notNull(),
	riflesCost: integer("rifles_cost").default(0).notNull(),
	ammunitionCost: integer("ammunition_cost").default(0).notNull(),
	artilleryCost: integer("artillery_cost").default(0).notNull(),
	vehiclesCost: integer("vehicles_cost").default(0).notNull(),
	explosivesCost: integer("explosives_cost").default(0).notNull()
});

export const militarySupplyConsumption = pgTable("military_supply_consumption", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	unitId: integer("unit_id")
		.notNull()
		.references(() => militaryUnits.id, { onDelete: "cascade" })
		.unique(),
	lastSupplyCheck: timestamp("last_supply_check").defaultNow().notNull(),
	dailyAmmunitionConsumption: integer("daily_ammunition_consumption").default(10).notNull(),
	dailyFuelConsumption: integer("daily_fuel_consumption").default(5).notNull()
});

// --- TRAVEL ---
export const userTravels = pgTable("user_travels", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	fromRegionId: integer("from_region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	toRegionId: integer("to_region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	departureTime: timestamp("departure_time").defaultNow().notNull(),
	arrivalTime: timestamp("arrival_time").notNull(),
	travelDuration: integer("travel_duration").notNull(),
	status: travelStatusEnum("status").notNull().default("in_progress"),
	distanceKm: integer("distance_km").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const regionCoordinates = pgTable("region_coordinates", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" })
		.unique(),
	centerX: integer("center_x").notNull(),
	centerY: integer("center_y").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// --- GIFT CODES ---
export const giftCodes = pgTable("gift_codes", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	code: varchar("code", { length: 50 }).notNull().unique(),
	description: text("description"),
	currencyAmount: bigint("currency_amount", { mode: "number" }).default(0).notNull(),
	maxRedemptions: integer("max_redemptions"),
	currentRedemptions: integer("current_redemptions").default(0).notNull(),
	expiresAt: timestamp("expires_at"),
	createdBy: text("created_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull()
});

export const giftCodeResources = pgTable("gift_code_resources", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	giftCodeId: integer("gift_code_id")
		.notNull()
		.references(() => giftCodes.id, { onDelete: "cascade" }),
	resourceType: giftCodeResourceTypeEnum("resource_type").notNull(),
	quantity: integer("quantity").notNull()
});

export const giftCodeRedemptions = pgTable(
	"gift_code_redemptions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		giftCodeId: integer("gift_code_id")
			.notNull()
			.references(() => giftCodes.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
		currencyReceived: bigint("currency_received", { mode: "number" }).default(0).notNull()
	},
	(t) => ({ userCodeIdx: uniqueIndex("idx_user_gift_code").on(t.userId, t.giftCodeId) })
);

// --- RELATIONS ---
export const accountsRelations = relations(accounts, ({ one, many }) => ({
	profile: one(userProfiles, { fields: [accounts.id], references: [userProfiles.accountId] }),
	wallet: one(userWallets, { fields: [accounts.id], references: [userWallets.userId] }),
	sessions: many(sessions),
	oauthTokens: one(oauthTokens, { fields: [accounts.id], references: [oauthTokens.accountId] }),
	residence: one(residences),
	companies: many(companies),
	journalists: many(journalists),
	articles: many(articles),
	upvotes: many(upvotes),
	governorships: many(governors),
	presidencies: many(presidents),
	ministries: many(ministers),
	parliamentSeats: many(parliamentMembers),
	medalsReceived: many(userMedals, { relationName: "medal_recipient" }),
	medalsAwarded: many(userMedals, { relationName: "medal_awarder" }),
	sentChatMessages: many(chatMessages),
	receivedInboxMessages: many(inboxMessages, { relationName: "inbox_recipient" }),
	sentInboxMessages: many(inboxMessages, { relationName: "inbox_sender" }),
	rulesAcceptance: one(chatRulesAcceptance),
	warnings: many(userWarnings, { relationName: "warned_user" }),
	issuedWarnings: many(userWarnings, { relationName: "warning_issuer" }),
	restriction: one(chatRestrictions),
	issuedRestrictions: many(chatRestrictions, { relationName: "restrictor" }),
	reportsSubmitted: many(generalReports, { relationName: "general_reporter" }),
	reportsReviewed: many(generalReports, { relationName: "general_reviewer" }),
	flaggedContent: many(contentFlags)
}));

export const statesRelations = relations(states, ({ one, many }) => ({
	regions: many(regions),
	president: one(presidents),
	ministers: many(ministers),
	parliamentMembers: many(parliamentMembers),
	parties: many(politicalParties),
	treasury: one(stateTreasury),
	energy: one(stateEnergy),
	visaSettings: one(stateVisaSettings),
	proposals: many(parliamentaryProposals),
	sanctionsImposed: many(stateSanctions, { relationName: "sanctioning_state" }),
	sanctionsReceived: many(stateSanctions, { relationName: "target_state" }),
	chatMessages: many(chatMessages),
	inboxMessages: many(inboxMessages)
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
	owner: one(accounts, { fields: [companies.ownerId], references: [accounts.id] }),
	factories: many(factories)
}));

export const factoriesRelations = relations(factories, ({ one, many }) => ({
	company: one(companies, { fields: [factories.companyId], references: [companies.id] }),
	region: one(regions, { fields: [factories.regionId], references: [regions.id] }),
	workers: many(factoryWorkers)
}));

export const militaryUnitsRelations = relations(militaryUnits, ({ one }) => ({
	owner: one(accounts, { fields: [militaryUnits.ownerId], references: [accounts.id] }),
	state: one(states, { fields: [militaryUnits.stateId], references: [states.id] }),
	region: one(regions, { fields: [militaryUnits.regionId], references: [regions.id] }),
	supply: one(militarySupplyConsumption)
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
	author: one(accounts, { fields: [articles.authorId], references: [accounts.id] }),
	newspaper: one(newspapers, { fields: [articles.newspaperId], references: [newspapers.id] }),
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

export const politicalPartiesRelations = relations(politicalParties, ({ one, many }) => ({
	founder: one(accounts, { fields: [politicalParties.founderId], references: [accounts.id] }),
	state: one(states, { fields: [politicalParties.stateId], references: [states.id] }),
	members: many(partyMembers),
	chatMessages: many(chatMessages),
	inboxMessages: many(inboxMessages)
}));

export const parliamentaryProposalsRelations = relations(parliamentaryProposals, ({ one, many }) => ({
	state: one(states, { fields: [parliamentaryProposals.stateId], references: [states.id] }),
	creator: one(accounts, { fields: [parliamentaryProposals.proposedBy], references: [accounts.id] }),
	votes: many(parliamentaryVotes)
}));

export const giftCodesRelations = relations(giftCodes, ({ one, many }) => ({
	creator: one(accounts, { fields: [giftCodes.createdBy], references: [accounts.id] }),
	resources: many(giftCodeResources),
	redemptions: many(giftCodeRedemptions)
}));

export const userTravelsRelations = relations(userTravels, ({ one }) => ({
	user: one(accounts, { fields: [userTravels.userId], references: [accounts.id] }),
	fromRegion: one(regions, { fields: [userTravels.fromRegionId], references: [regions.id] }),
	toRegion: one(regions, { fields: [userTravels.toRegionId], references: [regions.id] })
}));

export const partyEditHistory = pgTable("party_edit_history", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	partyId: integer("party_id")
		.notNull()
		.references(() => politicalParties.id, { onDelete: "cascade" }),
	lastEditAt: timestamp("last_edit_at").defaultNow().notNull(),
	lastEditBy: text("last_edit_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
});

// --- TYPES ---
export type Account = typeof accounts.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type State = typeof states.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type PoliticalParty = typeof politicalParties.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Factory = typeof factories.$inferSelect;
export type MilitaryUnit = typeof militaryUnits.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type ParliamentaryProposal = typeof parliamentaryProposals.$inferSelect;

// ============= BLOCS =============
export const blocs = pgTable("blocs", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	name: varchar("name", { length: 100 }).notNull().unique(),
	color: varchar("color", { length: 7 }).notNull(),
	description: text("description"),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const blocsRelations = relations(blocs, ({ many }) => ({ states: many(states) }));

// Add to your schema.ts file

export const medalTypeEnum = pgEnum("medal_type", ["honor", "valor", "service", "excellence", "leadership"]);

export const userMedals = pgTable("user_medals", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	medalType: medalTypeEnum("medal_type").notNull(),
	reason: text("reason").notNull(),
	awardedBy: text("awarded_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	awardedAt: timestamp("awarded_at").defaultNow().notNull()
});

export const userMedalsRelations = relations(userMedals, ({ one }) => ({
	user: one(accounts, {
		fields: [userMedals.userId],
		references: [accounts.id],
		relationName: "medal_recipient"
	}),
	awardedByUser: one(accounts, {
		fields: [userMedals.awardedBy],
		references: [accounts.id],
		relationName: "medal_awarder"
	}),
	state: one(states, {
		fields: [userMedals.stateId],
		references: [states.id]
	})
}));

// ============= CHAT & MESSAGING =============
export const messageTypeEnum = pgEnum("message_type", ["global", "state", "party"]);
export const inboxMessageTypeEnum = pgEnum("inbox_message_type", ["state_broadcast", "party_broadcast", "system"]);
export const violationReasonEnum = pgEnum("violation_reason", [
	"insult",
	"spam",
	"pornography",
	"hate_speech",
	"graphic_violence",
	"privacy_violation",
	"other"
]);

export const reportStatusEnum = pgEnum("report_status", ["pending", "resolved", "dismissed"]);
export const reportTargetTypeEnum = pgEnum("report_target_type", ["message", "account", "party"]);

export const moderationActionEnum = pgEnum("moderation_action", [
	"warning",
	"message_delete",
	"restriction",
	"ban",
	"name_reset",
	"logo_reset"
]);

export const chatRestrictions = pgTable("chat_restrictions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	reason: text("reason").notNull(),
	restrictedBy: text("restricted_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	restrictedAt: timestamp("restricted_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at"),
	isPermanent: boolean("is_permanent").default(false).notNull()
});

export const chatRestrictionsRelations = relations(chatRestrictions, ({ one }) => ({
	user: one(accounts, {
		fields: [chatRestrictions.userId],
		references: [accounts.id]
	}),
	restrictor: one(accounts, {
		fields: [chatRestrictions.restrictedBy],
		references: [accounts.id]
	})
}));

export const chatMessages = pgTable(
	"chat_messages",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		senderId: text("sender_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		messageType: messageTypeEnum("message_type").notNull(),
		stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
		partyId: integer("party_id").references(() => politicalParties.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		isDeleted: boolean("is_deleted").default(false).notNull(),
		deletedBy: text("deleted_by").references(() => accounts.id, { onDelete: "set null" }),
		deletedAt: timestamp("deleted_at"),
		deletionReason: violationReasonEnum("deletion_reason"),
		deletionNote: text("deletion_note"),
		sentAt: timestamp("sent_at").defaultNow().notNull()
	},
	(t) => ({
		messageTypeIdx: index("idx_chat_message_type").on(t.messageType),
		stateIdx: index("idx_chat_state").on(t.stateId),
		partyIdx: index("idx_chat_party").on(t.partyId),
		sentAtIdx: index("idx_chat_sent_at").on(t.sentAt),
		deletedIdx: index("idx_chat_deleted").on(t.isDeleted)
	})
);

// User inbox for broadcast messages
export const inboxMessages = pgTable(
	"inbox_messages",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		recipientId: text("recipient_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		senderId: text("sender_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		messageType: inboxMessageTypeEnum("message_type").notNull(),
		stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
		partyId: integer("party_id").references(() => politicalParties.id, { onDelete: "cascade" }),
		subject: varchar("subject", { length: 200 }).notNull(),
		content: text("content").notNull(),
		isRead: boolean("is_read").default(false).notNull(),
		sentAt: timestamp("sent_at").defaultNow().notNull()
	},
	(t) => ({
		recipientIdx: index("idx_inbox_recipient").on(t.recipientId),
		unreadIdx: index("idx_inbox_unread").on(t.recipientId, t.isRead),
		sentAtIdx: index("idx_inbox_sent_at").on(t.sentAt)
	})
);

// Relations
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
	sender: one(accounts, { fields: [chatMessages.senderId], references: [accounts.id] }),
	state: one(states, { fields: [chatMessages.stateId], references: [states.id] }),
	party: one(politicalParties, { fields: [chatMessages.partyId], references: [politicalParties.id] })
}));

export const inboxMessagesRelations = relations(inboxMessages, ({ one }) => ({
	recipient: one(accounts, {
		fields: [inboxMessages.recipientId],
		references: [accounts.id],
		relationName: "inbox_recipient"
	}),
	sender: one(accounts, {
		fields: [inboxMessages.senderId],
		references: [accounts.id],
		relationName: "inbox_sender"
	}),
	state: one(states, { fields: [inboxMessages.stateId], references: [states.id] }),
	party: one(politicalParties, { fields: [inboxMessages.partyId], references: [politicalParties.id] })
}));

// Track if user has accepted chat rules
export const chatRulesAcceptance = pgTable("chat_rules_acceptance", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
	ipAddress: varchar("ip_address", { length: 45 })
});

// User warnings and moderation history
export const userWarnings = pgTable(
	"user_warnings",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		reason: violationReasonEnum("reason").notNull(),
		description: text("description").notNull(),
		issuedBy: text("issued_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		issuedAt: timestamp("issued_at").defaultNow().notNull()
	},
	(t) => ({
		userIdx: index("idx_warning_user").on(t.userId),
		issuedAtIdx: index("idx_warning_issued_at").on(t.issuedAt)
	})
);

// Enhanced reports - now includes accounts and parties
export const generalReports = pgTable(
	"general_reports",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		targetType: reportTargetTypeEnum("target_type").notNull(),
		targetId: text("target_id").notNull(), // Can be message ID, account ID, or party ID
		reporterId: text("reporter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		reason: text("reason").notNull(),
		violationType: violationReasonEnum("violation_type"),
		status: reportStatusEnum("status").notNull().default("pending"),
		reviewedBy: text("reviewed_by").references(() => accounts.id, { onDelete: "set null" }),
		reviewedAt: timestamp("reviewed_at"),
		reviewNote: text("review_note"),
		actionTaken: moderationActionEnum("action_taken"),
		reportedAt: timestamp("reported_at").defaultNow().notNull()
	},
	(t) => ({
		targetIdx: index("idx_report_target").on(t.targetType, t.targetId),
		statusIdx: index("idx_general_report_status").on(t.status),
		reportedAtIdx: index("idx_general_report_reported_at").on(t.reportedAt)
	})
);

// Flagged content requiring name/logo change
export const contentFlags = pgTable(
	"content_flags",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		targetType: text("target_type").notNull(), // "account" or "party"
		targetId: text("target_id").notNull(),
		flagType: text("flag_type").notNull(), // "name" or "logo"
		reason: text("reason").notNull(),
		flaggedBy: text("flagged_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		flaggedAt: timestamp("flagged_at").defaultNow().notNull(),
		resolvedAt: timestamp("resolved_at"),
		isResolved: boolean("is_resolved").default(false).notNull()
	},
	(t) => ({
		targetIdx: index("idx_flag_target").on(t.targetType, t.targetId),
		resolvedIdx: index("idx_flag_resolved").on(t.isResolved)
	})
);

// Relations
export const chatRulesAcceptanceRelations = relations(chatRulesAcceptance, ({ one }) => ({
	user: one(accounts, {
		fields: [chatRulesAcceptance.userId],
		references: [accounts.id]
	})
}));

export const userWarningsRelations = relations(userWarnings, ({ one }) => ({
	user: one(accounts, {
		fields: [userWarnings.userId],
		references: [accounts.id],
		relationName: "warned_user"
	}),
	issuer: one(accounts, {
		fields: [userWarnings.issuedBy],
		references: [accounts.id],
		relationName: "warning_issuer"
	})
}));

export const generalReportsRelations = relations(generalReports, ({ one }) => ({
	reporter: one(accounts, {
		fields: [generalReports.reporterId],
		references: [accounts.id],
		relationName: "general_reporter"
	}),
	reviewer: one(accounts, {
		fields: [generalReports.reviewedBy],
		references: [accounts.id],
		relationName: "general_reviewer"
	})
}));

export const contentFlagsRelations = relations(contentFlags, ({ one }) => ({
	flagger: one(accounts, {
		fields: [contentFlags.flaggedBy],
		references: [accounts.id]
	})
}));
