import { relations, sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	bigint,
	boolean,
	check,
	decimal,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from "drizzle-orm/pg-core";

// --- ENUMS ---
export const journalistRankEnum = pgEnum("journalist_rank", ["author", "editor", "owner"]);
export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]);
// Four cabinet portfolios, each covering a pair of ministries. The first three
// are the historic values kept for existing rows; the rest are additive.
export const ministryTypeEnum = pgEnum("ministry_type", [
	"economy",
	"defense",
	"foreign_affairs",
	"science",
	"health",
	"energy",
	"trade",
	"interior"
]);
export const resourceTypeEnum = pgEnum("resource_type", [
	"iron",
	"copper",
	"steel",
	"gunpowder",
	"wood",
	"coal",
	// Strategic resources (resources.config.ts, industry.config.ts)
	"oil",
	"gas",
	"uranium",
	"rare_earth",
	"silicon",
	"fuel",
	"enriched_uranium"
]);
export const productTypeEnum = pgEnum("product_type", [
	"rifles",
	"ammunition",
	"artillery",
	"vehicles",
	"explosives",
	"chips",
	"electronics",
	// Computing chain (industry.config.ts): hardware feeds datacenters, which
	// sharpen cyber operations and AI. Both are heavy grid and water users.
	"hardware",
	"datacenter",
	// Industrial equipment (equipment.config.ts): built before other plants.
	"machine_tools",
	"fab_equipment"
]);
export const factoryTypeEnum = pgEnum("factory_type", [
	"mine",
	"refinery",
	"armaments",
	"fabrication",
	"equipment",
	"general"
]);
export const jobTypeEnum = pgEnum("job_type", ["miner", "refiner", "assembler", "general_worker"]);
export const visaStatusEnum = pgEnum("visa_status", ["active", "expired", "revoked"]);
// "failed": voted through, but it couldn't be carried out (e.g. the treasury
// couldn't pay for a building any more).
export const proposalStatusEnum = pgEnum("proposal_status", ["active", "passed", "rejected", "expired", "failed"]);
export const voteTypeEnum = pgEnum("vote_type", ["for", "against", "abstain"]);
export const proposalTypeEnum = pgEnum("proposal_type", [
	"budget",
	"tax",
	"infrastructure",
	"hospital",
	"school",
	"power_plant",
	"fortifications",
	"radar",
	"grid",
	"energy_storage",
	"border_control",
	"exploitation",
	"declare_war",
	"salary",
	"martial_law"
]);
// How hard a state lets its natural resources be mined (see resources.config.ts).
export const exploitationPolicyEnum = pgEnum("exploitation_policy", [
	"conservation",
	"standard",
	"industrial",
	"unrestricted"
]);
export const borderStatusEnum = pgEnum("border_status", ["open", "closed"]);
export const taxTypeEnum = pgEnum("tax_type", ["mining", "production", "market_transaction", "income"]);
export const electionStatusEnum = pgEnum("election_status", ["scheduled", "active", "completed"]);
export const militaryUnitTypeEnum = pgEnum("military_unit_type", [
	"air_defence",
	"armor",
	"mechanized",
	"artillery",
	"infantry",
	"bomber_squadron",
	"fighter_squadron",
	// Sea domain (naval.config.ts): surface, undersea, aviation and amphibious.
	"frigate",
	"submarine",
	"carrier",
	"landing_ship",
	"marine",
	// Air arm (aircraft.config.ts)
	"transport_aircraft",
	"bomber",
	"tanker_aircraft",
	"fighterjet",
	"close_air_support",
	"naval_bomber",
	"helicopter"
]);
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
export const powerPlantTypeEnum = pgEnum("power_plant_type", [
	"coal",
	"gas",
	"nuclear",
	"solar",
	"wind",
	"hydro",
	"geothermal",
	"fusion"
]);
export const transactionTypeEnum = pgEnum("transaction_type", [
	"market_purchase",
	"market_sale",
	"gift_code_redemption",
	"factory_wage",
	"company_deposit",
	"company_withdrawal",
	"visa_purchase",
	"factory_edit",
	"company_edit",
	"newspaper_edit",
	"settings_name_change",
	"settings_logo_change",
	"tax_payment",
	"state_resource_purchase",
	"state_resource_sale",
	"state_construction",
	"premium_purchase",
	"share_purchase",
	"share_sale",
	"dividend_payout",
	"recon_mission",
	"official_salary",
	// Smuggling (services/economy/smuggling.ts)
	"smuggling_run",
	"smuggling_fine"
]);

export const governmentBudgetTransactionTypeEnum = pgEnum("government_budget_transaction_type", [
	"resource_purchase",
	"resource_sale",
	"construction",
	"tax_collection",
	"infrastructure",
	"military",
	"other",
	// Cyber operations and psyops (services/military/covert-ops.ts)
	"covert_operation",
	"cyber_defence",
	"covert_theft",
	// Airstrikes and the reparations paid for IHL violations (services/military/strike.ts)
	"airstrike",
	"reparations",
	// Naval operations, space and AI (naval.ts, space.ts, ai.ts)
	"naval_operation",
	"satellite_launch",
	"space_operation",
	"ai_research",
	"smuggling_route",
	"supply_convoy",
	"infrastructure_repair",
	"trade_lane",
	"zone_closure",
	"trade_revenue",
	// Research levels funded from the treasury (services/government/research.ts)
	"research",
	// Weekly pay for the president, ministers and parliament
	"salary"
]);

export const battlePhaseEnum = pgEnum("battle_phase", [
	"preparation", // Units can join, no combat
	"planning", // Combat can begin, planning bonus builds
	"active", // Full combat with planning bonus
	"ended" // Battle concluded
]);

export const terrainTypeEnum = pgEnum("terrain_type", [
	"plains",
	"forest",
	"hills",
	"mountain",
	"urban",
	"desert",
	"jungle",
	"lake",
	"shore",
	"city",
	"town",
	"fields"
]);

// --- AUTH ---
export const accounts = pgTable(
	"account",
	{
		id: text("id").primaryKey(), // Auth-managed ID
		email: varchar("email", { length: 255 }).notNull().unique(),
		role: userRoleEnum("role").notNull().default("user"),
		notifyNewspaperPosts: boolean("notify_newspaper_posts").default(true).notNull(),
		notifyDirectMessages: boolean("notify_direct_messages").default(true).notNull(),
		notifyWarDeclarations: boolean("notify_war_declarations").default(true).notNull(),
		notifyBattleResults: boolean("notify_battle_results").default(true).notNull(),
		notifyElections: boolean("notify_elections").default(true).notNull(),
		notifyTravelComplete: boolean("notify_travel_complete").default(true).notNull(),
		notifyShiftComplete: boolean("notify_shift_complete").default(true).notNull(),
		notifyMarketSales: boolean("notify_market_sales").default(true).notNull(),
		notifyNewProposals: boolean("notify_new_proposals").default(true).notNull(),
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
	name: text("name").default("New user").notNull(),
	logo: integer("logo").references(() => files.id, { onDelete: "set null" }),
	bio: text("bio"),
	telegramId: bigint("telegram_id", { mode: "number" }).unique(),
	telegramUsername: text("telegram_username"),
	theme: text("theme").default("dark").notNull(),
	loadImages: boolean("load_images").default(true).notNull(),
	onboardingStep: integer("onboarding_step"),
	// Premium membership: active while premiumUntil is in the future.
	premiumUntil: timestamp("premium_until"),
	// When true, the premium automation job acts on this user's behalf.
	premiumAutomation: boolean("premium_automation").default(true).notNull(),
	/** Community karma from upvotes — distinct from civilian reputation. */
	karma: integer("karma").default(0).notNull(),
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
	capitulated: boolean("capitulated").default(false).notNull(),
	capitulated_at: timestamp("capitulated_at"),
	blocId: integer("bloc_id").references(() => blocs.id, { onDelete: "set null" }),
	exploitationPolicy: exploitationPolicyEnum("exploitation_policy").default("standard").notNull(),
	// Weekly pay for a parliament member, set by parliament. Ministers earn 3x,
	// the president 5x. Null/zero disables official pay.
	officialSalary: integer("official_salary").default(1000).notNull(),
	lastSalaryPaidAt: timestamp("last_salary_paid_at"),
	// While in the future, parliamentary elections cannot start or be voted in.
	martialLawUntil: timestamp("martial_law_until"),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const regions = pgTable("regions", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	latitude: decimal("latitude").notNull(),
	longitude: decimal("longitude").notNull(),
	stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
	rating: integer("rating").default(0),
	infrastructure: integer("infrastructure").default(0),
	economy: integer("powerplants").default(0),
	education: integer("education").default(0),
	hospitals: integer("hospitals").default(0),
	fortifications: integer("fortifications").default(0),
	// Energy network: grid = transmission/distribution levels, storage =
	// grid-scale batteries. Both are raised by public construction and decide
	// how much power regional plants can actually deliver (energy.config.ts).
	grid: integer("grid").default(0),
	storage: integer("storage").default(0),
	// Air-defence radar coverage (0-3), raised by the radar installation and
	// knocked down by a strike on it. Cues the air defence (recon.config.ts).
	radar: integer("radar").default(0),
	oil: integer("oil").default(0),
	aluminium: integer("aluminium").default(0),
	rubber: integer("rubber").default(0),
	tungsten: integer("tungsten").default(0),
	steel: integer("steel").default(0),
	chromium: integer("chromium").default(0),
	// Ground cover for recon and battles; null = derived (regionTerrain in recon.config.ts).
	terrain: terrainTypeEnum("terrain"),
	// Civilians living here; null until something changes them (strike
	// casualties). Read it through regionPopulation() in population.config.ts,
	// which derives a figure from the region when this is null.
	population: integer("population"),
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
		homeRegionId: integer("home_region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		movedInAt: timestamp("moved_in_at").defaultNow().notNull(),
		regionChangedAt: timestamp("region_changed_at").defaultNow().notNull(),
		homeRegionChangedAt: timestamp("home_region_changed_at").defaultNow().notNull()
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
	state: one(states, {
		fields: [regions.stateId],
		references: [states.id]
	}),
	deposits: many(regionDeposits),
	governor: one(governors, {
		fields: [regions.id],
		references: [governors.regionId]
	}),
	factories: many(factories),
	plants: many(powerPlants),
	residences: many(residences, { relationName: "residenceRegion" }),
	homeResidences: many(residences, { relationName: "homeRegion" }),

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
	autoAcceptMembers: boolean("auto_accept_members").default(false).notNull()
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
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
		acceptedBy: text("accepted_by").references(() => accounts.id, { onDelete: "set null" })
	},
	(t) => ({ userPartyIdx: uniqueIndex("idx_user_party").on(t.userId, t.partyId) })
);

export const partyMembershipApplications = pgTable("party_membership_applications", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	partyId: integer("party_id")
		.notNull()
		.references(() => politicalParties.id, { onDelete: "cascade" }),
	status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, rejected
	appliedAt: timestamp("applied_at").defaultNow().notNull(),
	reviewedBy: text("reviewed_by").references(() => accounts.id, { onDelete: "set null" }),
	reviewedAt: timestamp("reviewed_at"),
	reviewNote: text("review_note")
});

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
		rank: journalistRankEnum("rank").notNull(),
		joinedAt: timestamp("joined_at").defaultNow().notNull()
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
	articles: many(articles),
	subscriptions: many(newspaperSubscriptions)
}));

export const articles = pgTable("articles", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	title: varchar("title", { length: 40 }).notNull(),
	content: text("content").notNull(),
	authorId: text("author_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	newspaperId: integer("newspaper_id").references(() => newspapers.id, { onDelete: "cascade" }),
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

/** A poll attached to a post. Options are plain strings, voted once per user. */
export const polls = pgTable(
	"polls",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		articleId: integer("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" }),
		question: varchar("question", { length: 200 }).notNull(),
		options: jsonb("options").$type<string[]>().notNull(),
		createdBy: text("created_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		closesAt: timestamp("closes_at"),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({ articleIdx: uniqueIndex("uq_poll_article").on(t.articleId) })
);

export const pollVotes = pgTable(
	"poll_votes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		pollId: integer("poll_id")
			.notNull()
			.references(() => polls.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		optionIndex: integer("option_index").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({ userPollIdx: uniqueIndex("uq_poll_vote").on(t.pollId, t.userId) })
);

/** Reader comments on a post. Plain text, capped in the action. */
export const comments = pgTable(
	"comments",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		articleId: integer("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		/** Parent comment for reddit-style threaded replies. */
		parentId: integer("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({ articleIdx: index("idx_comment_article").on(t.articleId, t.id) })
);

export const commentVotes = pgTable(
	"comment_votes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		commentId: integer("comment_id")
			.notNull()
			.references(() => comments.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({ userCommentIdx: uniqueIndex("uq_comment_vote").on(t.commentId, t.userId) })
);

// Newspaper subscriptions
export const newspaperSubscriptions = pgTable(
	"newspaper_subscriptions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		newspaperId: integer("newspaper_id")
			.notNull()
			.references(() => newspapers.id, { onDelete: "cascade" }),
		subscribedAt: timestamp("subscribed_at").defaultNow().notNull()
	},
	(t) => ({
		userNewspaperIdx: uniqueIndex("idx_user_newspaper_subscription").on(t.userId, t.newspaperId),
		newspaperIdx: index("idx_subscription_newspaper").on(t.newspaperId)
	})
);

// Article views for tracking post views
export const articleViews = pgTable(
	"article_views",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		articleId: integer("article_id")
			.notNull()
			.references(() => articles.id, { onDelete: "cascade" }),
		userId: text("user_id").references(() => accounts.id, { onDelete: "set null" }), // null for anonymous views
		viewedAt: timestamp("viewed_at").defaultNow().notNull()
	},
	(t) => ({
		articleIdx: index("idx_article_views_article").on(t.articleId),
		viewedAtIdx: index("idx_article_views_viewed_at").on(t.viewedAt)
	})
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
	// Headquarters region: ties the company to that region's state (embargoes, display), currently cosmetic otherwise.
	regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
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

export const userBlocks = pgTable(
	"user_blocks",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		blockedUserId: text("blocked_user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		blockedAt: timestamp("blocked_at").defaultNow().notNull()
	},
	(t) => ({
		userBlockedIdx: uniqueIndex("idx_user_blocked").on(t.userId, t.blockedUserId)
	})
);

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
	user: one(accounts, {
		fields: [userBlocks.userId],
		references: [accounts.id],
		relationName: "blocker"
	}),
	blockedUser: one(accounts, {
		fields: [userBlocks.blockedUserId],
		references: [accounts.id],
		relationName: "blocked"
	})
}));

export const marketPriceHistory = pgTable(
	"market_price_history",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		itemType: varchar("item_type", { length: 20 }).notNull(), // "resource" or "product"
		itemName: varchar("item_name", { length: 50 }).notNull(),
		pricePerUnit: integer("price_per_unit").notNull(),
		quantity: integer("quantity").notNull(),
		transactionType: varchar("transaction_type", { length: 20 }).notNull(), // "sale" or "listing"
		recordedAt: timestamp("recorded_at").defaultNow().notNull()
	},
	(t) => ({
		itemIdx: index("idx_price_history_item").on(t.itemType, t.itemName),
		recordedAtIdx: index("idx_price_history_recorded_at").on(t.recordedAt)
	})
);

// Market statistics - aggregated data per item (updated periodically)
export const marketStatistics = pgTable(
	"market_statistics",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		itemType: varchar("item_type", { length: 20 }).notNull(),
		itemName: varchar("item_name", { length: 50 }).notNull(),
		currentAvgPrice: integer("current_avg_price").notNull(),
		lowestPrice: integer("lowest_price").notNull(),
		highestPrice: integer("highest_price").notNull(),
		totalVolume: integer("total_volume").default(0).notNull(),
		activeListings: integer("active_listings").default(0).notNull(),
		lastUpdated: timestamp("last_updated").defaultNow().notNull()
	},
	(t) => ({
		itemIdx: uniqueIndex("idx_market_stats_item").on(t.itemType, t.itemName)
	})
);

// Relations
export const marketPriceHistoryRelations = relations(marketPriceHistory, ({ one }) => ({}));

export const marketStatisticsRelations = relations(marketStatistics, ({ one }) => ({}));

// Types
export type MarketPriceHistory = typeof marketPriceHistory.$inferSelect;
export type MarketStatistics = typeof marketStatistics.$inferSelect;

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
	// Know-how and build quality grow with supplied shifts and fall when the
	// grid, supply line or tools fail (equipment.config.ts).
	efficiency: integer("efficiency").default(50).notNull(),
	quality: integer("quality").default(90).notNull(),
	shiftsCompleted: integer("shifts_completed").default(0).notNull(),
	// An expansion adds posts after a works period; both fields are set together
	// and cleared by the expansion cron when the new posts come online.
	expansionPosts: integer("expansion_posts"),
	expansionCompletesAt: timestamp("expansion_completes_at"),
	// Fair-pay strikes: a weekly cycle can start one at most every 7 days, its
	// severity caps output, and paying the demanded wage resolves it and makes
	// that wage the floor from then on.
	minimumWage: integer("minimum_wage"),
	strikeActive: boolean("strike_active").default(false).notNull(),
	strikeSeverity: integer("strike_severity").default(0).notNull(),
	demandedWage: integer("demanded_wage"),
	lastStrikeAt: timestamp("last_strike_at"),
	// Consecutive completed shifts: a longer clean run makes more per shift.
	uninterruptedShifts: integer("uninterrupted_shifts").default(0).notNull(),
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
	wageAtShiftStart: bigint("wage_at_shift_start", { mode: "number" }),

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

export const userWalletsRelations = relations(userWallets, ({ one }) => ({
	user: one(accounts, {
		fields: [userWallets.userId],
		references: [accounts.id]
	})
}));

// --- TRANSACTION HISTORY ---
export const transactionHistory = pgTable(
	"transaction_history",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		transactionType: transactionTypeEnum("transaction_type").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
		description: text("description").notNull(),
		// Optional related entities
		relatedUserId: text("related_user_id").references(() => accounts.id, { onDelete: "set null" }),
		relatedEntityType: varchar("related_entity_type", { length: 50 }), // 'listing', 'company', 'factory', etc.
		relatedEntityId: integer("related_entity_id"),
		metadata: text("metadata"), // JSON string for additional data
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		userIdx: index("idx_transaction_user").on(t.userId),
		createdAtIdx: index("idx_transaction_created_at").on(t.createdAt),
		userCreatedIdx: index("idx_transaction_user_created").on(t.userId, t.createdAt)
	})
);

export const transactionHistoryRelations = relations(transactionHistory, ({ one }) => ({
	user: one(accounts, {
		fields: [transactionHistory.userId],
		references: [accounts.id]
	}),
	relatedUser: one(accounts, {
		fields: [transactionHistory.relatedUserId],
		references: [accounts.id]
	})
}));

export type TransactionHistory = typeof transactionHistory.$inferSelect;

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
	// Money the state owes: bond principal lent by players, less what it has
	// repaid or been bailed out of. Shown on the state's economy page.
	debt: bigint("debt", { mode: "number" }).default(0).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Completed research levels and banked points, one row per state and area.
// An absent row means level zero with no progress.
export const stateResearch = pgTable(
	"state_research",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		area: text("area").notNull(),
		level: integer("level").default(0).notNull(),
		points: integer("points").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		stateAreaIdx: uniqueIndex("idx_state_research_unique").on(t.stateId, t.area)
	})
);

export const stateResearchRelations = relations(stateResearch, ({ one }) => ({
	state: one(states, { fields: [stateResearch.stateId], references: [states.id] })
}));

// What a state's civilians think of a foreign state. One row per pair, created
// only when something happens (war, strikes, a bailout); an absent row is
// neutral. `observerStateId` owns the civilians, `targetStateId` is judged.
export const civilianStances = pgTable(
	"civilian_stances",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		observerStateId: integer("observer_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		stance: integer("stance").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		pairIdx: uniqueIndex("idx_civilian_stance_pair").on(t.observerStateId, t.targetStateId),
		targetIdx: index("idx_civilian_stance_target").on(t.targetStateId)
	})
);

// A transfer from one state's treasury to another's. Kept as a ledger so the
// goodwill a bailout bought can be traced back to the transfer that earned it.
export const stateBailouts = pgTable(
	"state_bailouts",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		donorStateId: integer("donor_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		recipientStateId: integer("recipient_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		amount: bigint("amount", { mode: "number" }).notNull(),
		debtRelieved: bigint("debt_relieved", { mode: "number" }).default(0).notNull(),
		authorizedBy: text("authorized_by").references(() => accounts.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		recipientIdx: index("idx_bailout_recipient").on(t.recipientStateId),
		donorIdx: index("idx_bailout_donor").on(t.donorStateId)
	})
);

// One-off explainers shown the first time a player opens a company or takes
// office. A row exists once the milestone has been reached; `seenAt` is set
// when the page actually showed the detail, so it is never shown twice.
export const userFirsts = pgTable(
	"user_firsts",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		kind: varchar("kind", { length: 40 }).notNull(),
		reachedAt: timestamp("reached_at").defaultNow().notNull(),
		seenAt: timestamp("seen_at")
	},
	(t) => ({ userKindIdx: uniqueIndex("idx_user_first_user_kind").on(t.userId, t.kind) })
);

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

// State resource inventory
export const stateResourceInventory = pgTable(
	"state_resource_inventory",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		resourceType: resourceTypeEnum("resource_type").notNull(),
		quantity: integer("quantity").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({ stateResourceIdx: uniqueIndex("idx_state_resource").on(t.stateId, t.resourceType) })
);

// State product inventory
export const stateProductInventory = pgTable(
	"state_product_inventory",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		productType: productTypeEnum("product_type").notNull(),
		quantity: integer("quantity").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({ stateProductIdx: uniqueIndex("idx_state_product").on(t.stateId, t.productType) })
);

// Government budget transactions
export const governmentBudgetTransactions = pgTable(
	"government_budget_transactions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		transactionType: governmentBudgetTransactionTypeEnum("transaction_type").notNull(),
		amount: bigint("amount", { mode: "number" }).notNull(),
		balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
		description: text("description").notNull(),
		// Who authorized the transaction
		authorizedBy: text("authorized_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		// Optional related entity data
		itemType: varchar("item_type", { length: 20 }), // "resource" or "product"
		itemName: varchar("item_name", { length: 50 }),
		quantity: integer("quantity"),
		pricePerUnit: bigint("price_per_unit", { mode: "number" }),
		metadata: text("metadata"), // JSON string for additional data
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_gov_transaction_state").on(t.stateId),
		createdAtIdx: index("idx_gov_transaction_created_at").on(t.createdAt),
		stateCreatedIdx: index("idx_gov_transaction_state_created").on(t.stateId, t.createdAt)
	})
);

// --- INFRASTRUCTURE: ENERGY & POWER ---
export const stateEnergy = pgTable("state_energy", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	totalProduction: integer("total_production").default(1000).notNull(),
	usedProduction: integer("used_production").default(0).notNull(),
	/** Refined-fuel policy: whole percentages adding to 100. */
	civilianShare: integer("civilian_share").default(50).notNull(),
	militaryShare: integer("military_share").default(30).notNull(),
	exportShare: integer("export_share").default(20).notNull(),
	/** Pools set by the daily energy tick. */
	civilianFuel: integer("civilian_fuel").default(0).notNull(),
	militaryFuel: integer("military_fuel").default(0).notNull(),
	exportedFuel: integer("exported_fuel").default(0).notNull(),
	/** Fuel and upkeep shortfalls, in percent (100 = fully supplied). */
	fuelFactor: integer("fuel_factor").default(100).notNull(),
	maintenanceFactor: integer("maintenance_factor").default(100).notNull(),
	lastEnergyTickAt: timestamp("last_energy_tick_at"),
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
	// Where the plant stands. Legacy state-level plants keep this null and
	// their recorded output; new plants are sited in a specific region.
	regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
	/** Siting multiplier in basis points (1000 = nameplate output). */
	sitingFactor: integer("siting_factor").default(1000),
	isUnderConstruction: boolean("is_under_construction").default(false).notNull(),
	constructionCompletesAt: timestamp("construction_completes_at"),
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
	/** Airgroup / division this unit belongs to, if any. */
	groupId: integer("group_id").references(() => unitGroups.id, { onDelete: "set null" }),
	organization: integer("organization").default(100).notNull(),
	supplyLevel: integer("supply_level").default(100).notNull(),
	/** Fuel for aircraft and other vehicles; restored from the state reserve. */
	fuel: integer("fuel").default(100).notNull(),
	health: integer("health").default(100).notNull(),
	experience: integer("experience").default(0).notNull(),
	isTraining: boolean("is_training").default(true).notNull(),
	trainingStartedAt: timestamp("training_started_at"),
	trainingCompletesAt: timestamp("training_completed_at"),
	isExercising: boolean("is_exercising").default(false).notNull(),
	exerciseStartedAt: timestamp("exercise_started_at"),
	exerciseCompletesAt: timestamp("exercise_completed_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
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

// --- GIFT CODES ---
export const giftCodes = pgTable("gift_codes", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	code: varchar("code", { length: 50 }).notNull().unique(),
	description: text("description"),
	currencyAmount: bigint("currency_amount", { mode: "number" }).default(0).notNull(),
	premiumDays: integer("premium_days").default(0).notNull(),
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
		currencyReceived: bigint("currency_received", { mode: "number" }).default(0).notNull(),
		premiumDaysReceived: integer("premium_days_received").default(0).notNull()
	},
	(t) => ({ userCodeIdx: uniqueIndex("idx_user_gift_code").on(t.userId, t.giftCodeId) })
);

// --- RELATIONS ---
export const accountsRelations = relations(accounts, ({ one, many }) => ({
	profile: one(userProfiles, {
		fields: [accounts.id],
		references: [userProfiles.accountId]
	}),
	wallet: one(userWallets, {
		fields: [accounts.id],
		references: [userWallets.userId]
	}),
	sessions: many(sessions),
	oauthTokens: one(oauthTokens, {
		fields: [accounts.id],
		references: [oauthTokens.accountId]
	}),
	residence: one(residences),
	companies: many(companies),
	journalists: many(journalists),
	articles: many(articles),
	upvotes: many(upvotes),
	governorships: many(governors),
	presidencies: many(presidents),
	ministries: many(ministers),
	blocHighRepresentatives: many(blocHighRepresentatives),
	parliamentSeats: many(parliamentMembers),
	medalsReceived: many(userMedals, { relationName: "medal_recipient" }),
	medalsAwarded: many(userMedals, { relationName: "medal_awarder" }),
	sentChatMessages: many(chatMessages, { relationName: "message_sender" }),
	receivedChatMessages: many(chatMessages, { relationName: "message_recipient" }),
	deletedChatMessages: many(chatMessages, { relationName: "message_deleter" }),
	receivedInboxMessages: many(inboxMessages, { relationName: "inbox_recipient" }),
	sentInboxMessages: many(inboxMessages, { relationName: "inbox_sender" }),
	rulesAcceptance: one(chatRulesAcceptance),
	warnings: many(userWarnings, { relationName: "warned_user" }),
	issuedWarnings: many(userWarnings, { relationName: "warning_issuer" }),
	restriction: one(chatRestrictions),
	issuedRestrictions: many(chatRestrictions, { relationName: "restrictor" }),
	reportsSubmitted: many(generalReports, { relationName: "general_reporter" }),
	reportsReviewed: many(generalReports, { relationName: "general_reviewer" }),
	flaggedContent: many(contentFlags),
	blockedUsers: many(userBlocks, { relationName: "blocker" }),
	blockedBy: many(userBlocks, { relationName: "blocked" })
}));

export const statesRelations = relations(states, ({ one, many }) => ({
	regions: many(regions), // This should reference the regions table
	president: one(presidents, {
		fields: [states.id],
		references: [presidents.stateId]
	}),
	ministers: many(ministers),
	research: many(stateResearch),
	parliamentMembers: many(parliamentMembers),
	parties: many(politicalParties),
	treasury: one(stateTreasury, {
		fields: [states.id],
		references: [stateTreasury.stateId]
	}),
	energy: one(stateEnergy, {
		fields: [states.id],
		references: [stateEnergy.stateId]
	}),
	visaSettings: one(stateVisaSettings, {
		fields: [states.id],
		references: [stateVisaSettings.stateId]
	}),
	border: one(stateBorders, {
		fields: [states.id],
		references: [stateBorders.stateId]
	}),
	proposals: many(parliamentaryProposals),
	sanctionsImposed: many(stateSanctions, { relationName: "sanctioning_state" }),
	sanctionsReceived: many(stateSanctions, { relationName: "target_state" }),
	chatMessages: many(chatMessages),
	inboxMessages: many(inboxMessages),
	bloc: one(blocs, {
		fields: [states.blocId],
		references: [blocs.id]
	})
}));
export const companiesRelations = relations(companies, ({ one, many }) => ({
	owner: one(accounts, { fields: [companies.ownerId], references: [accounts.id] }),
	region: one(regions, { fields: [companies.regionId], references: [regions.id] }),
	factories: many(factories),
	budget: one(companyBudgets, {
		fields: [companies.id],
		references: [companyBudgets.companyId]
	}),
	shares: one(companyShares, {
		fields: [companies.id],
		references: [companyShares.companyId]
	}),
	shareHoldings: many(shareHoldings),
	shareListings: many(shareListings)
}));
export type StateBorder = typeof stateBorders.$inferSelect;

export const factoriesRelations = relations(factories, ({ one, many }) => ({
	company: one(companies, { fields: [factories.companyId], references: [companies.id] }),
	region: one(regions, { fields: [factories.regionId], references: [regions.id] }),
	workers: many(factoryWorkers)
}));

export const militaryUnitsRelations = relations(militaryUnits, ({ one }) => ({
	owner: one(accounts, { fields: [militaryUnits.ownerId], references: [accounts.id] })
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
	author: one(accounts, { fields: [articles.authorId], references: [accounts.id] }),
	newspaper: one(newspapers, { fields: [articles.newspaperId], references: [newspapers.id] }),
	upvotes: many(upvotes),
	views: many(articleViews)
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

export const newspaperSubscriptionsRelations = relations(newspaperSubscriptions, ({ one }) => ({
	user: one(accounts, {
		fields: [newspaperSubscriptions.userId],
		references: [accounts.id]
	}),
	newspaper: one(newspapers, {
		fields: [newspaperSubscriptions.newspaperId],
		references: [newspapers.id]
	})
}));

export const articleViewsRelations = relations(articleViews, ({ one }) => ({
	article: one(articles, {
		fields: [articleViews.articleId],
		references: [articles.id]
	}),
	user: one(accounts, {
		fields: [articleViews.userId],
		references: [accounts.id]
	})
}));

export const politicalPartiesRelations = relations(politicalParties, ({ one, many }) => ({
	founder: one(accounts, { fields: [politicalParties.founderId], references: [accounts.id] }),
	state: one(states, { fields: [politicalParties.stateId], references: [states.id] }),
	members: many(partyMembers),
	applications: many(partyMembershipApplications),
	chatMessages: many(chatMessages),
	inboxMessages: many(inboxMessages)
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

export const giftCodeResourcesRelations = relations(giftCodeResources, ({ one }) => ({
	giftCode: one(giftCodes, {
		fields: [giftCodeResources.giftCodeId],
		references: [giftCodes.id]
	})
}));

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
	logo: integer("logo").references(() => files.id, { onDelete: "set null" }),
	color: varchar("color", { length: 7 }).notNull(),
	description: text("description"),
	visaFreeForMembers: boolean("visa_free_for_members").default(false).notNull(),
	/** Bloc-wide guideline: share of state income that should go to defence. */
	defenceSpendingGuideline: integer("defence_spending_guideline"),
	capitulated: boolean("capitulated").default(false).notNull(),
	capitulated_at: timestamp("capitulated_at"),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const blocsRelations = relations(blocs, ({ many }) => ({
	states: many(states),
	highRepresentatives: many(blocHighRepresentatives)
}));

export const blocLeaders = pgTable("bloc_leaders", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	blocId: integer("bloc_id")
		.notNull()
		.references(() => blocs.id, { onDelete: "cascade" })
		.unique(),
	appointedAt: timestamp("appointed_at").defaultNow().notNull()
});

export const blocDiplomats = pgTable(
	"bloc_diplomats",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		blocId: integer("bloc_id")
			.notNull()
			.references(() => blocs.id, { onDelete: "cascade" }),
		appointedAt: timestamp("appointed_at").defaultNow().notNull()
	},
	(t) => ({
		userBlocIdx: uniqueIndex("idx_bloc_diplomat_unique").on(t.userId, t.blocId)
	})
);

// A bloc mirrors the four cabinet portfolios with High Representatives. One
// person may hold several portfolios, and may also lead a member state's
// government — the unique indexes only stop two people holding the same seat.
export const blocHighRepresentatives = pgTable(
	"bloc_high_representatives",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		blocId: integer("bloc_id")
			.notNull()
			.references(() => blocs.id, { onDelete: "cascade" }),
		portfolio: text("portfolio").notNull(),
		appointedAt: timestamp("appointed_at").defaultNow().notNull()
	},
	(t) => ({
		userBlocPortfolioIdx: uniqueIndex("idx_bloc_high_rep_unique").on(t.userId, t.blocId, t.portfolio),
		blocPortfolioIdx: uniqueIndex("idx_bloc_high_rep_portfolio_unique").on(t.blocId, t.portfolio)
	})
);

export const blocLeadersRelations = relations(blocLeaders, ({ one }) => ({
	user: one(accounts, { fields: [blocLeaders.userId], references: [accounts.id] }),
	bloc: one(blocs, { fields: [blocLeaders.blocId], references: [blocs.id] })
}));

export const blocHighRepresentativesRelations = relations(blocHighRepresentatives, ({ one }) => ({
	user: one(accounts, { fields: [blocHighRepresentatives.userId], references: [accounts.id] }),
	bloc: one(blocs, { fields: [blocHighRepresentatives.blocId], references: [blocs.id] })
}));

export const blocDiplomatsRelations = relations(blocDiplomats, ({ one }) => ({
	user: one(accounts, { fields: [blocDiplomats.userId], references: [accounts.id] }),
	bloc: one(blocs, { fields: [blocDiplomats.blocId], references: [blocs.id] })
}));

// Bloc leader elections: every 30-day cycle, state presidents of member states can
// nominate a citizen of the bloc (not themselves) during the final 2 days of the
// cycle, then vote for one of the nominated candidates.
export const blocLeaderElections = pgTable("bloc_leader_elections", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	blocId: integer("bloc_id")
		.notNull()
		.references(() => blocs.id, { onDelete: "cascade" }),
	cycleStartsAt: timestamp("cycle_starts_at").notNull(),
	votingStartsAt: timestamp("voting_starts_at").notNull(),
	votingEndsAt: timestamp("voting_ends_at").notNull(),
	status: electionStatusEnum("status").notNull().default("scheduled"),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const blocLeaderCandidates = pgTable(
	"bloc_leader_candidates",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		electionId: integer("election_id")
			.notNull()
			.references(() => blocLeaderElections.id, { onDelete: "cascade" }),
		candidateUserId: text("candidate_user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		nominatedBy: text("nominated_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		nominatedAt: timestamp("nominated_at").defaultNow().notNull()
	},
	(t) => ({
		electionCandidateIdx: uniqueIndex("idx_bloc_election_candidate").on(t.electionId, t.candidateUserId)
	})
);

export const blocLeaderVotes = pgTable(
	"bloc_leader_votes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		electionId: integer("election_id")
			.notNull()
			.references(() => blocLeaderElections.id, { onDelete: "cascade" }),
		voterId: text("voter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		candidateUserId: text("candidate_user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		votedAt: timestamp("voted_at").defaultNow().notNull()
	},
	(t) => ({
		electionVoterIdx: uniqueIndex("idx_bloc_election_voter").on(t.electionId, t.voterId)
	})
);

export const blocLeaderElectionsRelations = relations(blocLeaderElections, ({ one, many }) => ({
	bloc: one(blocs, { fields: [blocLeaderElections.blocId], references: [blocs.id] }),
	candidates: many(blocLeaderCandidates),
	votes: many(blocLeaderVotes)
}));

export const blocLeaderCandidatesRelations = relations(blocLeaderCandidates, ({ one }) => ({
	election: one(blocLeaderElections, {
		fields: [blocLeaderCandidates.electionId],
		references: [blocLeaderElections.id]
	}),
	candidate: one(accounts, { fields: [blocLeaderCandidates.candidateUserId], references: [accounts.id] }),
	nominator: one(accounts, { fields: [blocLeaderCandidates.nominatedBy], references: [accounts.id] })
}));

export const blocLeaderVotesRelations = relations(blocLeaderVotes, ({ one }) => ({
	election: one(blocLeaderElections, { fields: [blocLeaderVotes.electionId], references: [blocLeaderElections.id] }),
	voter: one(accounts, { fields: [blocLeaderVotes.voterId], references: [accounts.id] }),
	candidate: one(accounts, { fields: [blocLeaderVotes.candidateUserId], references: [accounts.id] })
}));

// Bloc membership applications: a state president applies, and the presidents of the
// bloc's member states vote pro or contra (one vote per member state) until a
// majority is reached or the voting window expires.
export const blocApplicationStatusEnum = pgEnum("bloc_application_status", [
	"pending",
	"accepted",
	"rejected",
	"withdrawn"
]);

export const blocApplications = pgTable(
	"bloc_applications",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		blocId: integer("bloc_id")
			.notNull()
			.references(() => blocs.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		appliedBy: text("applied_by").references(() => accounts.id, { onDelete: "set null" }),
		status: blocApplicationStatusEnum("status").notNull().default("pending"),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		resolvedAt: timestamp("resolved_at")
	},
	(t) => ({
		blocStatusIdx: index("idx_bloc_application_bloc_status").on(t.blocId, t.status),
		// A state can only have one open application at a time
		pendingStateIdx: uniqueIndex("idx_bloc_application_pending_state")
			.on(t.stateId)
			.where(sql`status = 'pending'`)
	})
);

export const blocApplicationVotes = pgTable(
	"bloc_application_votes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		applicationId: integer("application_id")
			.notNull()
			.references(() => blocApplications.id, { onDelete: "cascade" }),
		voterStateId: integer("voter_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		voterId: text("voter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		inFavor: boolean("in_favor").notNull(),
		votedAt: timestamp("voted_at").defaultNow().notNull()
	},
	(t) => ({
		applicationStateIdx: uniqueIndex("idx_bloc_application_vote_state").on(t.applicationId, t.voterStateId)
	})
);

export const blocApplicationsRelations = relations(blocApplications, ({ one, many }) => ({
	bloc: one(blocs, { fields: [blocApplications.blocId], references: [blocs.id] }),
	state: one(states, { fields: [blocApplications.stateId], references: [states.id] }),
	applicant: one(accounts, { fields: [blocApplications.appliedBy], references: [accounts.id] }),
	votes: many(blocApplicationVotes)
}));

export const blocApplicationVotesRelations = relations(blocApplicationVotes, ({ one }) => ({
	application: one(blocApplications, {
		fields: [blocApplicationVotes.applicationId],
		references: [blocApplications.id]
	}),
	voterState: one(states, { fields: [blocApplicationVotes.voterStateId], references: [states.id] }),
	voter: one(accounts, { fields: [blocApplicationVotes.voterId], references: [accounts.id] })
}));

// Expelling a member state from a bloc: a member president (or the bloc
// leader) proposes it and the other member states vote, one vote per state.
// The targeted state has no vote.
export const blocExpulsionStatusEnum = pgEnum("bloc_expulsion_status", [
	"pending",
	"expelled",
	"rejected",
	"cancelled"
]);

export const blocExpulsions = pgTable(
	"bloc_expulsions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		blocId: integer("bloc_id")
			.notNull()
			.references(() => blocs.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		proposedBy: text("proposed_by").references(() => accounts.id, { onDelete: "set null" }),
		reason: text("reason"),
		status: blocExpulsionStatusEnum("status").notNull().default("pending"),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		resolvedAt: timestamp("resolved_at")
	},
	(t) => ({
		// One open expulsion vote per state at a time
		pendingStateIdx: uniqueIndex("idx_bloc_expulsion_pending_state")
			.on(t.blocId, t.stateId)
			.where(sql`status = 'pending'`)
	})
);

export const blocExpulsionVotes = pgTable(
	"bloc_expulsion_votes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		expulsionId: integer("expulsion_id")
			.notNull()
			.references(() => blocExpulsions.id, { onDelete: "cascade" }),
		voterStateId: integer("voter_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		voterId: text("voter_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		inFavor: boolean("in_favor").notNull(),
		votedAt: timestamp("voted_at").defaultNow().notNull()
	},
	(t) => ({
		expulsionStateIdx: uniqueIndex("idx_bloc_expulsion_vote_state").on(t.expulsionId, t.voterStateId)
	})
);

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
export const messageTypeEnum = pgEnum("message_type", ["global", "state", "party", "direct"]);

export const inboxMessageTypeEnum = pgEnum("inbox_message_type", [
	"state_broadcast",
	"party_broadcast",
	"system",
	"medal_award",
	"moderation"
]);
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
export const reportTargetTypeEnum = pgEnum("report_target_type", ["message", "account", "party", "comment", "article"]);

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

// Update the chatMessages table to include recipientId
export const chatMessages = pgTable(
	"chat_messages",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		senderId: text("sender_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		recipientId: text("recipient_id").references(() => accounts.id, { onDelete: "cascade" }), // For direct messages
		messageType: messageTypeEnum("message_type").notNull(),
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
		partyIdx: index("idx_chat_party").on(t.partyId),
		recipientIdx: index("idx_chat_recipient").on(t.recipientId),
		directConvoIdx: index("idx_chat_direct_convo").on(t.senderId, t.recipientId),
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
	sender: one(accounts, {
		fields: [chatMessages.senderId],
		references: [accounts.id],
		relationName: "message_sender"
	}),
	recipient: one(accounts, {
		fields: [chatMessages.recipientId],
		references: [accounts.id],
		relationName: "message_recipient"
	}),

	party: one(politicalParties, {
		fields: [chatMessages.partyId],
		references: [politicalParties.id]
	}),
	deletedByUser: one(accounts, {
		fields: [chatMessages.deletedBy],
		references: [accounts.id],
		relationName: "message_deleter"
	})
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

export const partyMembersRelations = relations(partyMembers, ({ one }) => ({
	user: one(accounts, {
		fields: [partyMembers.userId],
		references: [accounts.id]
	}),
	party: one(politicalParties, {
		fields: [partyMembers.partyId],
		references: [politicalParties.id]
	}),
	acceptedByUser: one(accounts, {
		fields: [partyMembers.acceptedBy],
		references: [accounts.id],
		relationName: "member_acceptor"
	})
}));

export const partyMembershipApplicationsRelations = relations(partyMembershipApplications, ({ one }) => ({
	user: one(accounts, {
		fields: [partyMembershipApplications.userId],
		references: [accounts.id]
	}),
	party: one(politicalParties, {
		fields: [partyMembershipApplications.partyId],
		references: [politicalParties.id]
	}),
	reviewer: one(accounts, {
		fields: [partyMembershipApplications.reviewedBy],
		references: [accounts.id]
	})
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	account: one(accounts, {
		fields: [userProfiles.accountId],
		references: [accounts.id]
	}),
	logoFile: one(files, {
		fields: [userProfiles.logo],
		references: [files.id]
	})
}));

export const buildingTypeEnum = pgEnum("building_type", [
	"hospital",
	"school",
	"power_plant",
	"road",
	"bridge",
	"infrastructure",
	"fortifications",
	"radar",
	"grid",
	"energy_storage"
]);

export const stateBuildings = pgTable("state_buildings", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	buildingType: buildingTypeEnum("building_type").notNull(),

	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),

	proposalId: integer("proposal_id").references(() => parliamentaryProposals.id, { onDelete: "set null" }),
	builtBy: text("built_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),

	// A building sits here while its construction time (per BUILDING_TEMPLATES) elapses;
	// it raises its region's level only once isUnderConstruction flips to false.
	isUnderConstruction: boolean("is_under_construction").default(false).notNull(),
	constructionStartedAt: timestamp("construction_started_at"),
	constructionCompletesAt: timestamp("construction_completes_at"),

	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const stateBuildingsRelations = relations(stateBuildings, ({ one }) => ({
	region: one(regions, {
		fields: [stateBuildings.regionId],
		references: [regions.id]
	}),
	state: one(states, {
		fields: [stateBuildings.stateId],
		references: [states.id]
	}),
	proposal: one(parliamentaryProposals, {
		fields: [stateBuildings.proposalId],
		references: [parliamentaryProposals.id]
	}),
	builder: one(accounts, {
		fields: [stateBuildings.builtBy],
		references: [accounts.id]
	})
}));

export type StateBuilding = typeof stateBuildings.$inferSelect;
// Add this to your schema.ts file - Missing relations for stateSanctions

export const stateSanctionsRelations = relations(stateSanctions, ({ one }) => ({
	targetState: one(states, {
		fields: [stateSanctions.targetStateId],
		references: [states.id],
		relationName: "target_state"
	}),
	sanctioningState: one(states, {
		fields: [stateSanctions.sanctioningStateId],
		references: [states.id],
		relationName: "sanctioning_state"
	}),
	sanctioner: one(accounts, {
		fields: [stateSanctions.sanctionedBy],
		references: [accounts.id]
	})
}));

// Update statesRelations to include the logo file relation
export const statesRelationsUpdated = relations(states, ({ one, many }) => ({
	regions: many(regions),
	president: one(presidents, {
		fields: [states.id],
		references: [presidents.stateId]
	}),
	ministers: many(ministers),
	research: many(stateResearch),
	parliamentMembers: many(parliamentMembers),
	parties: many(politicalParties),
	treasury: one(stateTreasury, {
		fields: [states.id],
		references: [stateTreasury.stateId]
	}),
	energy: one(stateEnergy, {
		fields: [states.id],
		references: [stateEnergy.stateId]
	}),
	visaSettings: one(stateVisaSettings, {
		fields: [states.id],
		references: [stateVisaSettings.stateId]
	}),
	proposals: many(parliamentaryProposals),
	sanctionsImposed: many(stateSanctions, { relationName: "sanctioning_state" }),
	sanctionsReceived: many(stateSanctions, { relationName: "target_state" }),
	chatMessages: many(chatMessages),
	inboxMessages: many(inboxMessages),
	bloc: one(blocs, {
		fields: [states.blocId],
		references: [blocs.id]
	}),
	logoFile: one(files, {
		fields: [states.logo],
		references: [files.id]
	})
}));

// Also add relations for visaApplications and userVisas if missing

export const visaApplicationsRelations = relations(visaApplications, ({ one }) => ({
	user: one(accounts, {
		fields: [visaApplications.userId],
		references: [accounts.id]
	}),
	state: one(states, {
		fields: [visaApplications.stateId],
		references: [states.id]
	}),
	reviewer: one(accounts, {
		fields: [visaApplications.reviewedBy],
		references: [accounts.id]
	})
}));

export const userVisasRelations = relations(userVisas, ({ one }) => ({
	user: one(accounts, {
		fields: [userVisas.userId],
		references: [accounts.id]
	}),
	state: one(states, {
		fields: [userVisas.stateId],
		references: [states.id]
	}),
	approver: one(accounts, {
		fields: [userVisas.approvedBy],
		references: [accounts.id]
	}),
	revoker: one(accounts, {
		fields: [userVisas.revokedBy],
		references: [accounts.id]
	})
}));

export const stateVisaSettingsRelations = relations(stateVisaSettings, ({ one }) => ({
	state: one(states, {
		fields: [stateVisaSettings.stateId],
		references: [states.id]
	})
}));

export const residenceApplicationsRelations = relations(residenceApplications, ({ one }) => ({
	user: one(accounts, {
		fields: [residenceApplications.userId],
		references: [accounts.id]
	}),
	region: one(regions, {
		fields: [residenceApplications.regionId],
		references: [regions.id]
	}),
	reviewer: one(accounts, {
		fields: [residenceApplications.reviewedBy],
		references: [accounts.id]
	})
}));

export const residencesRelations = relations(residences, ({ one }) => ({
	user: one(accounts, {
		fields: [residences.userId],
		references: [accounts.id]
	}),
	region: one(regions, {
		fields: [residences.regionId],
		references: [regions.id],
		relationName: "residenceRegion"
	}),
	homeRegion: one(regions, {
		fields: [residences.homeRegionId],
		references: [regions.id],
		relationName: "homeRegion"
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

export const stateTreasuryRelations = relations(stateTreasury, ({ one }) => ({
	state: one(states, {
		fields: [stateTreasury.stateId],
		references: [states.id]
	})
}));

export const stateResourceInventoryRelations = relations(stateResourceInventory, ({ one }) => ({
	state: one(states, {
		fields: [stateResourceInventory.stateId],
		references: [states.id]
	})
}));

export const stateProductInventoryRelations = relations(stateProductInventory, ({ one }) => ({
	state: one(states, {
		fields: [stateProductInventory.stateId],
		references: [states.id]
	})
}));

export const governmentBudgetTransactionsRelations = relations(governmentBudgetTransactions, ({ one }) => ({
	state: one(states, {
		fields: [governmentBudgetTransactions.stateId],
		references: [states.id]
	}),
	authorizer: one(accounts, {
		fields: [governmentBudgetTransactions.authorizedBy],
		references: [accounts.id]
	})
}));

export const stateEnergyRelations = relations(stateEnergy, ({ one }) => ({
	state: one(states, {
		fields: [stateEnergy.stateId],
		references: [states.id]
	})
}));

export const powerPlantsRelations = relations(powerPlants, ({ one }) => ({
	state: one(states, {
		fields: [powerPlants.stateId],
		references: [states.id]
	}),
	region: one(regions, {
		fields: [powerPlants.regionId],
		references: [regions.id]
	}),
	builder: one(accounts, {
		fields: [powerPlants.builtBy],
		references: [accounts.id]
	})
}));

export const blocActionCooldowns = pgTable("bloc_action_cooldowns", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastActionAt: timestamp("last_action_at").defaultNow().notNull()
});

export const stateEditCooldowns = pgTable("state_edit_cooldowns", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastEditAt: timestamp("last_edit_at").defaultNow().notNull()
});

// Add these enums and tables to your schema.ts file

export const warStatusEnum = pgEnum("war_status", ["active", "ended"]);
export const warEndReasonEnum = pgEnum("war_end_reason", ["exhaustion", "stalemate", "capitulation", "surrender"]);
export const battleStatusEnum = pgEnum("battle_status", ["ongoing", "attacker_won", "defender_won"]);
export const surrenderTypeEnum = pgEnum("surrender_type", ["full", "conditional"]);

// Wars table
export const wars = pgTable("wars", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	attackerId: integer("attacker_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	defenderId: integer("defender_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	attackerBlocId: integer("attacker_bloc_id").references(() => blocs.id, {
		onDelete: "set null"
	}),
	defenderBlocId: integer("defender_bloc_id").references(() => blocs.id, {
		onDelete: "set null"
	}),
	declaredBy: text("declared_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	status: warStatusEnum("status").notNull().default("active"),
	surrenderedBy: integer("surrendered_by").references(() => states.id, {
		onDelete: "set null"
	}),
	// Accumulated war weariness (0-100); at WAR_CONFIG.EXHAUSTION_LIMIT the
	// war-resolution cron ends the war in a white peace.
	exhaustion: integer("exhaustion").default(0).notNull(),
	// How an ended war ended ("exhaustion", "stalemate", "capitulation", "surrender")
	endedReason: warEndReasonEnum("ended_reason"),
	declaredAt: timestamp("declared_at").defaultNow().notNull(),
	endedAt: timestamp("ended_at")
});

// Battles table
export const battles = pgTable("battles", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	warId: integer("war_id")
		.notNull()
		.references(() => wars.id, { onDelete: "cascade" }),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	attackerStateId: integer("attacker_state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	defenderStateId: integer("defender_state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),

	// NEW: Phase system
	phase: battlePhaseEnum("phase").notNull().default("preparation"),
	terrain: terrainTypeEnum("terrain").notNull().default("plains"),

	// Planning bonus (builds during planning phase)
	attackerPlanningBonus: integer("attacker_planning_bonus").default(0).notNull(),
	defenderPlanningBonus: integer("defender_planning_bonus").default(0).notNull(),

	status: battleStatusEnum("status").notNull().default("ongoing"),
	startedBy: text("started_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),

	// Phase timestamps
	preparationEndsAt: timestamp("preparation_ends_at"),
	planningStartedAt: timestamp("planning_started_at"),

	startedAt: timestamp("started_at").defaultNow().notNull(),
	endedAt: timestamp("ended_at"),

	// Region levels destroyed when the attacker took the region, e.g.
	// { fortifications: 3, infrastructure: 1 }. Null if nothing was lost.
	buildingsDestroyed: jsonb("buildings_destroyed").$type<Partial<Record<string, number>>>(),
	// Opened by an amphibious assault (naval.config.ts): the attackers landed
	// from the sea, so no land border was needed.
	amphibious: boolean("amphibious").default(false).notNull()
});

// Battle participants - links military units to battles
export const battleParticipants = pgTable(
	"battle_participants",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		battleId: integer("battle_id")
			.notNull()
			.references(() => battles.id, { onDelete: "cascade" }),
		unitId: integer("unit_id")
			.notNull()
			.references(() => militaryUnits.id, { onDelete: "cascade" }),
		side: varchar("side", { length: 10 }).notNull(), // "attacker" or "defender"

		// Combat stats (snapshot at join time)
		currentStrength: integer("current_strength").notNull(), // renamed from health
		currentOrganization: integer("current_organization").notNull(),
		maxStrength: integer("max_strength").notNull().default(100),

		// Combat tracking
		damageTaken: integer("damage_taken").default(0).notNull(),
		damageDealt: integer("damage_dealt").default(0).notNull(),

		// NEW: Engagement status
		isEngaged: boolean("is_engaged").default(false).notNull(), // Currently in combat width
		isExhausted: boolean("is_exhausted").default(false).notNull(), // Org below threshold

		// Timing
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
		lastActionAt: timestamp("last_action_at"),
		destroyedAt: timestamp("destroyed_at")
	},
	(t) => ({
		battleUnitIdx: uniqueIndex("idx_battle_unit").on(t.battleId, t.unitId),
		engagedIdx: index("idx_participant_engaged").on(t.battleId, t.isEngaged),
		sideIdx: index("idx_participant_side").on(t.battleId, t.side)
	})
);

// Battle rounds - tracks each attack round
export const battleRounds = pgTable(
	"battle_rounds",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		battleId: integer("battle_id")
			.notNull()
			.references(() => battles.id, { onDelete: "cascade" }),
		roundNumber: integer("round_number").notNull(), // Sequential round counter

		// Phase during this round
		battlePhase: battlePhaseEnum("battle_phase").notNull(),

		// Aggregate combat results for the round
		attackerUnitsEngaged: integer("attacker_units_engaged").notNull(),
		defenderUnitsEngaged: integer("defender_units_engaged").notNull(),

		attackerTotalDamage: integer("attacker_total_damage").notNull(),
		defenderTotalDamage: integer("defender_total_damage").notNull(),

		attackerOrgLoss: integer("attacker_org_loss").notNull(),
		defenderOrgLoss: integer("defender_org_loss").notNull(),

		// Modifiers applied
		attackerPlanningBonus: integer("attacker_planning_bonus").default(0).notNull(),
		defenderPlanningBonus: integer("defender_planning_bonus").default(0).notNull(),

		roundedAt: timestamp("rounded_at").defaultNow().notNull()
	},
	(t) => ({
		battleRoundIdx: index("idx_battle_round").on(t.battleId, t.roundNumber)
	})
);

// War surrenders
export const warSurrenders = pgTable("war_surrenders", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	warId: integer("war_id")
		.notNull()
		.references(() => wars.id, { onDelete: "cascade" }),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	surrenderType: surrenderTypeEnum("surrender_type").notNull(),
	surrenderedBy: text("surrendered_by")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	reason: text("reason"),
	surrenderedAt: timestamp("surrendered_at").defaultNow().notNull()
});

// Relations
export const warsRelations = relations(wars, ({ one, many }) => ({
	attacker: one(states, {
		fields: [wars.attackerId],
		references: [states.id],
		relationName: "war_attacker"
	}),
	defender: one(states, {
		fields: [wars.defenderId],
		references: [states.id],
		relationName: "war_defender"
	}),
	attackerBloc: one(blocs, {
		fields: [wars.attackerBlocId],
		references: [blocs.id],
		relationName: "war_attacker_bloc"
	}),
	defenderBloc: one(blocs, {
		fields: [wars.defenderBlocId],
		references: [blocs.id],
		relationName: "war_defender_bloc"
	}),
	declarer: one(accounts, {
		fields: [wars.declaredBy],
		references: [accounts.id]
	}),
	battles: many(battles),
	surrenders: many(warSurrenders)
}));

export const battlesRelations = relations(battles, ({ one, many }) => ({
	war: one(wars, {
		fields: [battles.warId],
		references: [wars.id]
	}),
	region: one(regions, {
		fields: [battles.regionId],
		references: [regions.id]
	}),
	attackerState: one(states, {
		fields: [battles.attackerStateId],
		references: [states.id],
		relationName: "battle_attacker"
	}),
	defenderState: one(states, {
		fields: [battles.defenderStateId],
		references: [states.id],
		relationName: "battle_defender"
	}),
	starter: one(accounts, {
		fields: [battles.startedBy],
		references: [accounts.id]
	}),
	participants: many(battleParticipants),
	rounds: many(battleRounds)
}));

export const battleParticipantsRelations = relations(battleParticipants, ({ one, many }) => ({
	battle: one(battles, {
		fields: [battleParticipants.battleId],
		references: [battles.id]
	}),
	unit: one(militaryUnits, {
		fields: [battleParticipants.unitId],
		references: [militaryUnits.id]
	}),
	actions: many(battleUnitActions)
}));

export const battleRoundsRelations = relations(battleRounds, ({ one, many }) => ({
	battle: one(battles, {
		fields: [battleRounds.battleId],
		references: [battles.id]
	}),
	unitActions: many(battleUnitActions)
}));

export const warSurrendersRelations = relations(warSurrenders, ({ one }) => ({
	war: one(wars, {
		fields: [warSurrenders.warId],
		references: [wars.id]
	}),
	state: one(states, {
		fields: [warSurrenders.stateId],
		references: [states.id]
	}),
	surrenderer: one(accounts, {
		fields: [warSurrenders.surrenderedBy],
		references: [accounts.id]
	})
}));

// Types
export type War = typeof wars.$inferSelect;
export type Battle = typeof battles.$inferSelect;
export type BattleParticipant = typeof battleParticipants.$inferSelect;
export type BattleRound = typeof battleRounds.$inferSelect;
export type WarSurrender = typeof warSurrenders.$inferSelect;

export const regionBorders = pgTable(
	"region_borders",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		neighborId: integer("neighbor_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		distanceKm: decimal("distance_km", { precision: 10, scale: 2 }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		uniqueBorder: uniqueIndex("idx_unique_border").on(t.regionId, t.neighborId),
		checkOrder: check("check_region_order", sql`${t.regionId} < ${t.neighborId}`)
	})
);

export const regionBordersRelations = relations(regionBorders, ({ one }) => ({
	region: one(regions, {
		fields: [regionBorders.regionId],
		references: [regions.id]
	}),
	neighbor: one(regions, {
		fields: [regionBorders.neighborId],
		references: [regions.id]
	})
}));

// Schema additions for HoI4-style battles
export const battleUnitActions = pgTable(
	"battle_unit_actions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		roundId: integer("round_id")
			.notNull()
			.references(() => battleRounds.id, { onDelete: "cascade" }),
		participantId: integer("participant_id")
			.notNull()
			.references(() => battleParticipants.id, { onDelete: "cascade" }),

		// What this unit did
		damageDealt: integer("damage_dealt").notNull(),
		damageTaken: integer("damage_taken").notNull(),
		orgLoss: integer("org_loss").notNull(),

		// State after action
		strengthAfter: integer("strength_after").notNull(),
		organizationAfter: integer("organization_after").notNull(),

		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		roundParticipantIdx: index("idx_round_participant").on(t.roundId, t.participantId)
	})
);

export const battleUnitActionsRelations = relations(battleUnitActions, ({ one }) => ({
	round: one(battleRounds, {
		fields: [battleUnitActions.roundId],
		references: [battleRounds.id]
	}),
	participant: one(battleParticipants, {
		fields: [battleUnitActions.participantId],
		references: [battleParticipants.id]
	})
}));

export const companyBudgets = pgTable("company_budgets", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	companyId: integer("company_id")
		.notNull()
		.references(() => companies.id, { onDelete: "cascade" })
		.unique(),
	balance: bigint("balance", { mode: "number" }).default(0).notNull(),
	totalDeposited: bigint("total_deposited", { mode: "number" }).default(0).notNull(),
	totalSpent: bigint("total_spent", { mode: "number" }).default(0).notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const companyBudgetsRelations = relations(companyBudgets, ({ one }) => ({
	company: one(companies, {
		fields: [companyBudgets.companyId],
		references: [companies.id]
	})
}));

export type CompanyBudget = typeof companyBudgets.$inferSelect;

// --- STOCK MARKET: COMPANY SHARES ---
// A company "goes public" once via an IPO action, which fixes its total share
// count and locks a controlling block to the founder (companies.ownerId) that
// can never be listed for sale. Only the remaining float is tradeable, using
// the same listing/order-book model as the goods market.
export const companyShares = pgTable("company_shares", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	companyId: integer("company_id")
		.notNull()
		.references(() => companies.id, { onDelete: "cascade" })
		.unique(),
	totalShares: integer("total_shares").notNull(),
	founderLockedShares: integer("founder_locked_shares").notNull(),
	ipoPrice: bigint("ipo_price", { mode: "number" }).notNull(),
	ipoAt: timestamp("ipo_at").defaultNow().notNull(),
	// An IPO is public at once, but its float only reaches the order book after
	// a 72-hour listing window. listAt is the due time; listedAt is set by the
	// listing cron when the float is actually created (null while pending).
	listAt: timestamp("list_at").defaultNow().notNull(),
	listedAt: timestamp("listed_at").defaultNow(),
	lastDividendAt: timestamp("last_dividend_at"),
	// Automatic dividend policy, run by an hourly cron at most once per dividend
	// cooldown: pay out this percentage (0-100) of the budget above
	// dividendReserve. 0 means dividends are only declared by hand.
	dividendPayoutRatio: integer("dividend_payout_ratio").default(0).notNull(),
	dividendReserve: bigint("dividend_reserve", { mode: "number" }).default(0).notNull()
});

export const companySharesRelations = relations(companyShares, ({ one }) => ({
	company: one(companies, {
		fields: [companyShares.companyId],
		references: [companies.id]
	})
}));

export type CompanyShares = typeof companyShares.$inferSelect;

// Per-user share ownership. The founder's row includes their locked block, so
// the sum of all holdings for a company always equals its totalShares.
export const shareHoldings = pgTable(
	"share_holdings",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		companyId: integer("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		quantity: integer("quantity").default(0).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		companyUserIdx: uniqueIndex("idx_share_holding_company_user").on(t.companyId, t.userId),
		companyIdx: index("idx_share_holding_company").on(t.companyId)
	})
);

export const shareHoldingsRelations = relations(shareHoldings, ({ one }) => ({
	company: one(companies, { fields: [shareHoldings.companyId], references: [companies.id] }),
	user: one(accounts, { fields: [shareHoldings.userId], references: [accounts.id] })
}));

// Sell-side order book, mirroring marketListings. Shares are moved out of the
// seller's holding into escrow as soon as a listing is created.
export const shareListings = pgTable(
	"share_listings",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		companyId: integer("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		sellerId: text("seller_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		quantity: integer("quantity").notNull(),
		pricePerUnit: bigint("price_per_unit", { mode: "number" }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({ companyIdx: index("idx_share_listing_company").on(t.companyId) })
);

export const shareListingsRelations = relations(shareListings, ({ one }) => ({
	company: one(companies, { fields: [shareListings.companyId], references: [companies.id] }),
	seller: one(accounts, { fields: [shareListings.sellerId], references: [accounts.id] })
}));

export const shareTransactions = pgTable(
	"share_transactions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		companyId: integer("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		listingId: integer("listing_id").references(() => shareListings.id, { onDelete: "set null" }),
		buyerId: text("buyer_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		sellerId: text("seller_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		quantity: integer("quantity").notNull(),
		totalPrice: bigint("total_price", { mode: "number" }).notNull(),
		completedAt: timestamp("completed_at").defaultNow().notNull()
	},
	(t) => ({ companyIdx: index("idx_share_transaction_company").on(t.companyId) })
);

export const shareTransactionsRelations = relations(shareTransactions, ({ one }) => ({
	company: one(companies, { fields: [shareTransactions.companyId], references: [companies.id] }),
	buyer: one(accounts, { fields: [shareTransactions.buyerId], references: [accounts.id] }),
	seller: one(accounts, { fields: [shareTransactions.sellerId], references: [accounts.id] })
}));

// Log of periodic dividend payouts, so shareholders can see their history.
export const dividendPayouts = pgTable(
	"dividend_payouts",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		companyId: integer("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		amount: bigint("amount", { mode: "number" }).notNull(),
		sharesHeld: integer("shares_held").notNull(),
		// Per-share rate of the payout this row belongs to; every row of one
		// payout shares the same paidAt.
		perShare: bigint("per_share", { mode: "number" }).default(0).notNull(),
		automatic: boolean("automatic").default(false).notNull(),
		paidAt: timestamp("paid_at").defaultNow().notNull()
	},
	(t) => ({
		companyIdx: index("idx_dividend_company").on(t.companyId),
		userIdx: index("idx_dividend_user").on(t.userId)
	})
);

export const dividendPayoutsRelations = relations(dividendPayouts, ({ one }) => ({
	company: one(companies, { fields: [dividendPayouts.companyId], references: [companies.id] }),
	user: one(accounts, { fields: [dividendPayouts.userId], references: [accounts.id] })
}));

export const companyEditCooldown = pgTable("company_edit_cooldown", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" })
		.unique(),
	lastEditAt: timestamp("last_edit_at").defaultNow().notNull()
});

export const companyEditCooldownRelations = relations(companyEditCooldown, ({ one }) => ({
	user: one(accounts, {
		fields: [companyEditCooldown.userId],
		references: [accounts.id]
	})
}));

export const stateBorders = pgTable("state_borders", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	status: borderStatusEnum("status").notNull().default("open"),
	maintenanceCostPerDay: bigint("maintenance_cost_per_day", { mode: "number" }).default(50000).notNull(),
	lastMaintenancePaid: timestamp("last_maintenance_paid").defaultNow().notNull(),
	closedBy: text("closed_by").references(() => accounts.id, { onDelete: "set null" }),
	closedAt: timestamp("closed_at"),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const stateBordersRelations = relations(stateBorders, ({ one }) => ({
	state: one(states, {
		fields: [stateBorders.stateId],
		references: [states.id]
	}),
	closedByUser: one(accounts, {
		fields: [stateBorders.closedBy],
		references: [accounts.id]
	})
}));

// Add these to your schema.ts file

// Tax proposal details
export const proposalTaxDetails = pgTable("proposal_tax_details", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	proposalId: integer("proposal_id")
		.notNull()
		.references(() => parliamentaryProposals.id, { onDelete: "cascade" })
		.unique(),
	taxType: taxTypeEnum("tax_type").notNull(),
	taxRate: integer("tax_rate").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Building proposal details
export const proposalBuildingDetails = pgTable("proposal_building_details", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	proposalId: integer("proposal_id")
		.notNull()
		.references(() => parliamentaryProposals.id, { onDelete: "cascade" })
		.unique(),
	regionId: integer("region_id")
		.notNull()
		.references(() => regions.id, { onDelete: "cascade" }),
	quantity: integer("quantity").notNull().default(1),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Border control proposal details
export const proposalBorderDetails = pgTable("proposal_border_details", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	proposalId: integer("proposal_id")
		.notNull()
		.references(() => parliamentaryProposals.id, { onDelete: "cascade" })
		.unique(),
	borderStatus: borderStatusEnum("border_status").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Declaring war by parliamentary vote: the state the war would be declared on.
export const proposalWarDetails = pgTable("proposal_war_details", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	proposalId: integer("proposal_id")
		.notNull()
		.references(() => parliamentaryProposals.id, { onDelete: "cascade" })
		.unique(),
	targetStateId: integer("target_state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const proposalWarDetailsRelations = relations(proposalWarDetails, ({ one }) => ({
	proposal: one(parliamentaryProposals, {
		fields: [proposalWarDetails.proposalId],
		references: [parliamentaryProposals.id]
	}),
	target: one(states, { fields: [proposalWarDetails.targetStateId], references: [states.id] })
}));

// Parliament-set weekly salary for a parliament member (ministers 3x, president 5x).
export const proposalSalaryDetails = pgTable("proposal_salary_details", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	proposalId: integer("proposal_id")
		.notNull()
		.references(() => parliamentaryProposals.id, { onDelete: "cascade" })
		.unique(),
	salaryAmount: integer("salary_amount").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// A one-week suspension of parliamentary elections.
export const proposalMartialLawDetails = pgTable("proposal_martial_law_details", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	proposalId: integer("proposal_id")
		.notNull()
		.references(() => parliamentaryProposals.id, { onDelete: "cascade" })
		.unique(),
	durationDays: integer("duration_days").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

export const proposalExploitationDetails = pgTable("proposal_exploitation_details", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	proposalId: integer("proposal_id")
		.notNull()
		.references(() => parliamentaryProposals.id, { onDelete: "cascade" })
		.unique(),
	policy: exploitationPolicyEnum("policy").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Natural resource deposits per region. Mines draw them down; output falls
// as `remaining` approaches 0 (see mineYield in resources.config.ts).
export const regionDeposits = pgTable(
	"region_deposits",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		resourceType: resourceTypeEnum("resource_type").notNull(),
		capacity: integer("capacity").notNull(),
		remaining: integer("remaining").notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		regionResourceIdx: uniqueIndex("idx_region_deposit").on(t.regionId, t.resourceType),
		remainingCheck: check("check_deposit_remaining", sql`${t.remaining} >= 0 AND ${t.remaining} <= ${t.capacity}`)
	})
);

export const regionDepositsRelations = relations(regionDeposits, ({ one }) => ({
	region: one(regions, { fields: [regionDeposits.regionId], references: [regions.id] })
}));

// Relations
export const parliamentaryProposalsRelations = relations(parliamentaryProposals, ({ one, many }) => ({
	state: one(states, { fields: [parliamentaryProposals.stateId], references: [states.id] }),
	creator: one(accounts, { fields: [parliamentaryProposals.proposedBy], references: [accounts.id] }),
	votes: many(parliamentaryVotes),
	taxDetails: one(proposalTaxDetails, {
		fields: [parliamentaryProposals.id],
		references: [proposalTaxDetails.proposalId]
	}),
	buildingDetails: one(proposalBuildingDetails, {
		fields: [parliamentaryProposals.id],
		references: [proposalBuildingDetails.proposalId]
	}),
	borderDetails: one(proposalBorderDetails, {
		fields: [parliamentaryProposals.id],
		references: [proposalBorderDetails.proposalId]
	}),
	warDetails: one(proposalWarDetails, {
		fields: [parliamentaryProposals.id],
		references: [proposalWarDetails.proposalId]
	}),
	exploitationDetails: one(proposalExploitationDetails, {
		fields: [parliamentaryProposals.id],
		references: [proposalExploitationDetails.proposalId]
	}),
	salaryDetails: one(proposalSalaryDetails, {
		fields: [parliamentaryProposals.id],
		references: [proposalSalaryDetails.proposalId]
	}),
	martialLawDetails: one(proposalMartialLawDetails, {
		fields: [parliamentaryProposals.id],
		references: [proposalMartialLawDetails.proposalId]
	})
}));

export const proposalExploitationDetailsRelations = relations(proposalExploitationDetails, ({ one }) => ({
	proposal: one(parliamentaryProposals, {
		fields: [proposalExploitationDetails.proposalId],
		references: [parliamentaryProposals.id]
	})
}));

export const proposalTaxDetailsRelations = relations(proposalTaxDetails, ({ one }) => ({
	proposal: one(parliamentaryProposals, {
		fields: [proposalTaxDetails.proposalId],
		references: [parliamentaryProposals.id]
	})
}));

export const proposalBuildingDetailsRelations = relations(proposalBuildingDetails, ({ one }) => ({
	proposal: one(parliamentaryProposals, {
		fields: [proposalBuildingDetails.proposalId],
		references: [parliamentaryProposals.id]
	}),
	region: one(regions, {
		fields: [proposalBuildingDetails.regionId],
		references: [regions.id]
	})
}));

export const proposalBorderDetailsRelations = relations(proposalBorderDetails, ({ one }) => ({
	proposal: one(parliamentaryProposals, {
		fields: [proposalBorderDetails.proposalId],
		references: [parliamentaryProposals.id]
	})
}));

// Types
export type ProposalTaxDetails = typeof proposalTaxDetails.$inferSelect;
export type ProposalBuildingDetails = typeof proposalBuildingDetails.$inferSelect;
export type ProposalBorderDetails = typeof proposalBorderDetails.$inferSelect;
// Push notification subscriptions
export const pushSubscriptions = pgTable(
	"push_subscriptions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		endpoint: text("endpoint").notNull(),
		p256dhKey: text("p256dh_key").notNull(),
		authKey: text("auth_key").notNull(),
		userAgent: text("user_agent"),
		subscribedAt: timestamp("subscribed_at").defaultNow().notNull()
	},
	(t) => ({
		endpointIdx: uniqueIndex("idx_push_endpoint").on(t.endpoint),
		userIdx: index("idx_push_user").on(t.userId)
	})
);

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
	user: one(accounts, {
		fields: [pushSubscriptions.userId],
		references: [accounts.id]
	})
}));

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewspaperSubscription = typeof newspaperSubscriptions.$inferSelect;
export type ArticleView = typeof articleViews.$inferSelect;
export type StateResourceInventory = typeof stateResourceInventory.$inferSelect;
export type StateProductInventory = typeof stateProductInventory.$inferSelect;
export type GovernmentBudgetTransaction = typeof governmentBudgetTransactions.$inferSelect;

// --- BIRTHDAY REWARDS ---
export const birthdayRewards = pgTable(
	"birthday_rewards",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		year: integer("year").notNull(),
		collectedAt: timestamp("collected_at").defaultNow().notNull()
	},
	(t) => ({
		userYearIdx: uniqueIndex("idx_birthday_reward_user_year").on(t.userId, t.year)
	})
);
export const birthdayRewardsRelations = relations(birthdayRewards, ({ one }) => ({
	user: one(accounts, {
		fields: [birthdayRewards.userId],
		references: [accounts.id]
	})
}));
export type BirthdayReward = typeof birthdayRewards.$inferSelect;

// --- BROADCASTS (single record shown on dashboard) ---
export const broadcastTypeEnum = pgEnum("broadcast_type", ["system", "state", "party", "bloc"]);

export const broadcasts = pgTable(
	"broadcasts",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		broadcastType: broadcastTypeEnum("broadcast_type").notNull(),
		title: varchar("title", { length: 200 }).notNull(),
		content: text("content").notNull(),
		issuedBy: text("issued_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
		partyId: integer("party_id").references(() => politicalParties.id, { onDelete: "cascade" }),
		blocId: integer("bloc_id").references(() => blocs.id, { onDelete: "cascade" }),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		activeIdx: index("idx_broadcast_active").on(t.isActive),
		stateIdx: index("idx_broadcast_state").on(t.stateId, t.isActive),
		partyIdx: index("idx_broadcast_party").on(t.partyId, t.isActive),
		blocIdx: index("idx_broadcast_bloc").on(t.blocId, t.isActive),
		typeIdx: index("idx_broadcast_type").on(t.broadcastType, t.isActive)
	})
);

export const broadcastsRelations = relations(broadcasts, ({ one }) => ({
	issuer: one(accounts, {
		fields: [broadcasts.issuedBy],
		references: [accounts.id]
	}),
	state: one(states, {
		fields: [broadcasts.stateId],
		references: [states.id]
	}),
	party: one(politicalParties, {
		fields: [broadcasts.partyId],
		references: [politicalParties.id]
	}),
	bloc: one(blocs, {
		fields: [broadcasts.blocId],
		references: [blocs.id]
	})
}));

export type Broadcast = typeof broadcasts.$inferSelect;

// --- RECONNAISSANCE ---
// A player flies one sensor (drone, satellite pass or radar sweep) over a
// region; once it is done (completesAt) it files an intel report that the
// player's whole side (state and its bloc) can read until the report goes
// stale (expiresAt). Reports are fused into one picture per region, which
// also drives targeting in battle. Rules in services/military/recon.ts, all
// tunables in config/game/recon.config.ts.
export const reconMissionStatusEnum = pgEnum("recon_mission_status", ["in_progress", "completed"]);
export const reconSensorEnum = pgEnum("recon_sensor", [
	"drone_eo",
	"drone_ir",
	"sat_eo",
	"sat_ir",
	"sat_sar",
	// Retired: ground radar is air defence now, not a recon sensor. Kept in
	// the enum so reports filed before the switch still load (as SAR frames).
	"ground_radar"
]);

export const reconMissions = pgTable(
	"recon_missions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		launchedBy: text("launched_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		// The launcher's state at launch; the report belongs to it.
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetRegionId: integer("target_region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id").references(() => states.id, { onDelete: "set null" }),
		sensor: reconSensorEnum("sensor").notNull(),
		cost: integer("cost").notNull(),
		status: reconMissionStatusEnum("status").notNull().default("in_progress"),
		launchedAt: timestamp("launched_at").defaultNow().notNull(),
		completesAt: timestamp("completes_at").notNull(),
		completedAt: timestamp("completed_at")
	},
	(t) => ({
		dueIdx: index("idx_recon_mission_due").on(t.status, t.completesAt),
		launcherIdx: index("idx_recon_mission_launcher").on(t.launchedBy, t.sensor, t.launchedAt),
		stateIdx: index("idx_recon_mission_state").on(t.stateId, t.sensor, t.launchedAt)
	})
);

/** What one recon pass saw. Counts may carry an estimation error. */
export interface IntelFindings {
	sensor: string;
	/** "obscured": weather/darkness blinded the sensor; "intercepted": the drone was shot down. */
	outcome: "ok" | "obscured" | "intercepted";
	conditions: { weather: string; night: boolean; cover: string };
	ownerStateId: number | null;
	ownerStateName: string | null;
	/** Enemy air-defence units and radar levels the drone flew into, and its chance of being shot down. */
	airDefence: { units: number; radar: number; interceptChance: number } | null;
	/** Detection chance per category (0 = not observed). Count 0 with coverage means "none seen". */
	coverage: Record<string, number>;
	categories: { category: string; count: number; estimated: boolean; confidence: number }[];
	/** Exact types, from visual passes only. */
	unitTypes: { unitType: string; count: number; estimated: boolean }[] | null;
	/** Recently fired artillery positions picked up by thermal sensors. */
	firingPositions: { count: number; confidence: number } | null;
	buildings: {
		infrastructure: number;
		economy: number;
		education: number;
		hospitals: number;
		fortifications: number;
		/** Air-defence radar coverage levels seen in the region. */
		radar: number;
		underConstruction: number;
	} | null;
	battle: {
		id: number;
		phase: string;
		attackerStateId: number;
		attackerStateName: string | null;
		defenderStateId: number;
		defenderStateName: string | null;
		attacker: { units: number; strength: number };
		defender: { units: number; strength: number };
	} | null;
}

export const intelReports = pgTable(
	"intel_reports",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		missionId: integer("mission_id")
			.notNull()
			.references(() => reconMissions.id, { onDelete: "cascade" }),
		// The side that owns the report (the launcher's state); its bloc can read it too.
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id").references(() => states.id, { onDelete: "set null" }),
		filedBy: text("filed_by").references(() => accounts.id, { onDelete: "set null" }),
		sensor: reconSensorEnum("sensor").notNull(),
		findings: jsonb("findings").$type<IntelFindings>().notNull(),
		observedAt: timestamp("observed_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull()
	},
	(t) => ({
		missionIdx: uniqueIndex("idx_intel_report_mission").on(t.missionId),
		stateRegionIdx: index("idx_intel_report_state_region").on(t.stateId, t.regionId, t.observedAt),
		expiresIdx: index("idx_intel_report_expires").on(t.expiresAt)
	})
);

export type ReconMission = typeof reconMissions.$inferSelect;
export type IntelReport = typeof intelReports.$inferSelect;

// --- COVERT OPERATIONS: CYBER & PSYOPS ---
// A state's leadership (president, defence or foreign minister) launches a
// cyber operation or a psyops campaign against another state, paid from the
// treasury. It resolves at once: success, whether the target noticed
// (detected) and whether it knows who did it (attributed). A successful
// operation leaves a time-limited state effect (grid down, sensors jammed,
// morale shaken, false intel planted, ...). Rules in
// services/military/covert-ops.ts, tunables in config/game/cyber.config.ts
// and config/game/psyops.config.ts.
export const covertOpKindEnum = pgEnum("covert_op_kind", [
	// cyber
	"grid_attack",
	"c2_disruption",
	"financial_theft",
	"comms_intercept",
	"air_defence_spoof",
	"supply_chain",
	// psyops
	"morale_campaign",
	"disinformation",
	"counter_propaganda",
	"leaflet_drop"
]);
export const stateEffectKindEnum = pgEnum("state_effect_kind", [
	"grid_degraded", // energy capacity and factory output down by magnitude %
	"c2_degraded", // recon coverage down, passes slower, battle coordination worse
	"morale_shaken", // battle output down (stacks with diminishing returns)
	"deception", // recon of regionId sees counts × (100 + magnitude)%
	"morale_boost", // own battle output up, resists enemy psyops
	"casus_belli", // sourceStateId was caught attacking in peacetime
	"comms_intercept", // observer reads enemy traffic: sharper recon, true strike picture
	"defence_blinded", // spoofed radars: less AD cueing, drones and strikes get through
	"supply_disrupted" // poisoned supply chains: factory output down
]);

export const covertOperations = pgTable(
	"covert_operations",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		kind: covertOpKindEnum("kind").notNull(),
		launchedBy: text("launched_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		// The launching state and its target (the launcher itself for counter-propaganda).
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		// Disinformation: the region whose recon picture is falsified.
		targetRegionId: integer("target_region_id").references(() => regions.id, { onDelete: "set null" }),
		cost: integer("cost").notNull(),
		// Odds at launch, in percent, and how it went.
		successChance: integer("success_chance").notNull(),
		attributionChance: integer("attribution_chance").notNull(),
		succeeded: boolean("succeeded").notNull(),
		detected: boolean("detected").notNull(),
		attributed: boolean("attributed").notNull(),
		atWar: boolean("at_war").notNull(),
		// Effect strength in percent (signed for disinformation: + inflate, - conceal).
		magnitude: integer("magnitude").default(0).notNull(),
		// Financial theft: what was taken from the target's treasury.
		amount: bigint("amount", { mode: "number" }).default(0).notNull(),
		// Leaflet drop: the leaflet's text, shown to the target's residents.
		message: text("message"),
		launchedAt: timestamp("launched_at").defaultNow().notNull(),
		effectEndsAt: timestamp("effect_ends_at")
	},
	(t) => ({
		stateKindIdx: index("idx_covert_op_state_kind").on(t.stateId, t.kind, t.launchedAt),
		targetIdx: index("idx_covert_op_target").on(t.targetStateId, t.launchedAt)
	})
);

export const stateEffects = pgTable(
	"state_effects",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		// The state the effect works on.
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		// Deception only: the region whose picture is falsified for stateId.
		regionId: integer("region_id").references(() => regions.id, { onDelete: "cascade" }),
		kind: stateEffectKindEnum("kind").notNull(),
		magnitude: integer("magnitude").notNull(),
		sourceStateId: integer("source_state_id").references(() => states.id, { onDelete: "set null" }),
		operationId: integer("operation_id").references(() => covertOperations.id, { onDelete: "cascade" }),
		startsAt: timestamp("starts_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull()
	},
	(t) => ({
		activeIdx: index("idx_state_effect_active").on(t.stateId, t.kind, t.expiresAt),
		regionIdx: index("idx_state_effect_region").on(t.regionId, t.expiresAt)
	})
);

export const stateCyberDefence = pgTable("state_cyber_defence", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	level: integer("level").default(0).notNull(),
	upgradedBy: text("upgraded_by").references(() => accounts.id, { onDelete: "set null" }),
	upgradedAt: timestamp("upgraded_at").defaultNow().notNull()
});

export type CovertOperation = typeof covertOperations.$inferSelect;
export type StateEffect = typeof stateEffects.$inferSelect;

// --- INFILTRATION NETWORKS ---
// The player-driven layer under cyber ops and psyops. A state plants assets
// in a target, uses them to probe sites, watch their security cameras and
// pull sensitive files, and spends money to cover its tracks. Each action
// adds heat; a burned asset is lost. Live footholds improve the odds of the
// ordinary covert operations (see cyber.config.ts's network bonus).
// Rules: config/game/infiltration.config.ts, service:
// services/military/infiltration.ts.
export const infiltrationAssetKindEnum = pgEnum("infiltration_asset_kind", [
	"relay",
	"agent",
	"botnet",
	"implant",
	"insider"
]);
export const infiltrationAssetStatusEnum = pgEnum("infiltration_asset_status", ["active", "burned"]);
export const infiltrationActionKindEnum = pgEnum("infiltration_action_kind", ["probe", "camera", "files", "cover"]);

export const infiltrationAssets = pgTable(
	"infiltration_assets",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		/** The state that owns the network. */
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		/** The state the asset operates inside. */
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		kind: infiltrationAssetKindEnum("kind").notNull(),
		codename: text("codename").notNull(),
		access: integer("access").notNull(),
		heat: integer("heat").default(0).notNull(),
		status: infiltrationAssetStatusEnum("status").default("active").notNull(),
		plantedBy: text("planted_by").references(() => accounts.id, { onDelete: "set null" }),
		plantedAt: timestamp("planted_at").defaultNow().notNull(),
		lastActionAt: timestamp("last_action_at").defaultNow().notNull()
	},
	(t) => ({
		ownerTargetIdx: index("idx_infiltration_asset_owner_target").on(t.stateId, t.targetStateId),
		targetIdx: index("idx_infiltration_asset_target").on(t.targetStateId, t.status)
	})
);

export const infiltrationActions = pgTable(
	"infiltration_actions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		assetId: integer("asset_id")
			.notNull()
			.references(() => infiltrationAssets.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		/** Site catalogue key (sites are generated from the target state). */
		siteId: text("site_id").notNull(),
		action: infiltrationActionKindEnum("action").notNull(),
		success: boolean("success").notNull(),
		chance: integer("chance").notNull(),
		detail: text("detail"),
		heatAfter: integer("heat_after").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		ownerIdx: index("idx_infiltration_action_owner").on(t.stateId, t.targetStateId, t.createdAt)
	})
);

export const infiltrationFiles = pgTable(
	"infiltration_files",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		siteId: text("site_id").notNull(),
		assetId: integer("asset_id").references(() => infiltrationAssets.id, { onDelete: "set null" }),
		title: text("title").notNull(),
		classification: text("classification").notNull(),
		body: text("body").notNull(),
		/** Filled when the file was copied from an intrusion's file system. */
		path: text("path"),
		recordId: text("record_id"),
		capturedAt: timestamp("captured_at").defaultNow().notNull()
	},
	(t) => ({
		ownerIdx: index("idx_infiltration_file_owner").on(t.stateId, t.targetStateId, t.capturedAt)
	})
);

export type InfiltrationAsset = typeof infiltrationAssets.$inferSelect;
export type InfiltrationAction = typeof infiltrationActions.$inferSelect;
export type InfiltrationFile = typeof infiltrationFiles.$inferSelect;

// An interactive intrusion into one site by one asset: the scan, the chosen
// attack vector, escalation and lateral movement, with a transcript of what
// the operator saw. One session per asset/site pair, kept until it is reset.
export const intrusionStageEnum = pgEnum("intrusion_stage", ["scan", "access", "escalate", "pivot"]);
export const intrusionSessions = pgTable(
	"intrusion_sessions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		assetId: integer("asset_id")
			.notNull()
			.references(() => infiltrationAssets.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		siteId: text("site_id").notNull(),
		stage: intrusionStageEnum("stage").notNull().default("scan"),
		host: text("host").notNull(),
		ip: text("ip").notNull(),
		os: text("os").notNull(),
		ports: jsonb("ports").$type<{ port: number; service: string; version: string; vector?: string }[]>().notNull(),
		vector: text("vector"),
		privileges: text("privileges").default("unauthenticated").notNull(),
		segment: text("segment"),
		log: jsonb("log").$type<{ t: string; line: string; tone: "info" | "ok" | "warn" | "bad" }[]>().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		assetSiteIdx: uniqueIndex("idx_intrusion_asset_site").on(t.assetId, t.siteId),
		ownerIdx: index("idx_intrusion_owner").on(t.stateId, t.targetStateId)
	})
);

export type IntrusionSession = typeof intrusionSessions.$inferSelect;

// --- AIRSTRIKES & INTERNATIONAL HUMANITARIAN LAW ---
// The president or defence minister of a state at war orders a strike on an
// enemy region: strategic (power grid, industry), operational (logistics,
// bridges, fortifications, air defence) or tactical (units in battle). Each
// strike is resolved at once and logged with its odds, outcome, damage and
// civilian casualties. Lasting effects (supply cut, grid damaged, industry
// disrupted) live in region_effects until they expire; IHL violations in
// ihl_violations, from which a state's standing is computed on read. Rules in
// services/military/strike.ts, tunables in config/game/strike.config.ts and
// config/game/ihl.config.ts.
export const strikeTierEnum = pgEnum("strike_tier", ["strategic", "operational", "tactical"]);
export const strikeTargetEnum = pgEnum("strike_target", [
	"power_grid",
	"industry",
	"hospital",
	"logistics",
	"bridges",
	"fortifications",
	"air_defence",
	"radar",
	"units"
]);
export const strikeWeaponEnum = pgEnum("strike_weapon", [
	"cruise_missile",
	"ballistic_missile",
	"guided_bomb",
	"gps_bomb",
	"unguided_bombs",
	"attack_drone",
	"close_air_support"
]);
export const strikeOutcomeEnum = pgEnum("strike_outcome", ["hit", "partial", "miss", "intercepted"]);
export const regionEffectKindEnum = pgEnum("region_effect_kind", ["supply", "energy", "industry", "supply_boost"]);
export const convoyOutcomeEnum = pgEnum("convoy_outcome", ["delivered", "intercepted", "lost"]);
export const ihlViolationKindEnum = pgEnum("ihl_violation_kind", [
	"protected_target",
	"indiscriminate",
	"disproportionate"
]);

/** What a strike did, for the log. */
export interface StrikeDamage {
	/** Region levels knocked down, e.g. { economy: 1 }. */
	levels?: Partial<Record<string, number>>;
	/** Effect left on the region's owner. */
	effect?: { kind: string; magnitude: number; expiresAt: string } | null;
	/** Strength taken off enemy units. */
	units?: { unitId: number; name: string; unitType: string; damage: number; destroyed: boolean }[];
	/** The attacker's aircraft hit by air defence. */
	aircraftLost?: { unitId: number; name: string; damage: number } | null;
	/** Reparations paid to the victim state. */
	reparations?: number;
}

export const strikes = pgTable(
	"strikes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		attackerStateId: integer("attacker_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		// The region's owner when it was struck.
		targetStateId: integer("target_state_id").references(() => states.id, { onDelete: "set null" }),
		warId: integer("war_id").references(() => wars.id, { onDelete: "set null" }),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		battleId: integer("battle_id").references(() => battles.id, { onDelete: "set null" }),
		orderedBy: text("ordered_by").references(() => accounts.id, { onDelete: "set null" }),
		tier: strikeTierEnum("tier").notNull(),
		target: strikeTargetEnum("target").notNull(),
		weapon: strikeWeaponEnum("weapon").notNull(),
		// The aircraft that flew the sortie (null for missiles and drones).
		unitId: integer("unit_id").references(() => militaryUnits.id, { onDelete: "set null" }),
		cost: integer("cost").notNull(),
		outcome: strikeOutcomeEnum("outcome").notNull(),
		// Odds at launch, in percent, and what they rested on.
		interceptChance: integer("intercept_chance").notNull(),
		accuracy: integer("accuracy").notNull(),
		intelConfidence: integer("intel_confidence").notNull(),
		conditions: jsonb("conditions").$type<{ weather: string; night: boolean; cover: string }>().notNull(),
		exposedCivilians: integer("exposed_civilians").default(0).notNull(),
		expectedCasualties: integer("expected_casualties").default(0).notNull(),
		civilianCasualties: integer("civilian_casualties").default(0).notNull(),
		protectedTarget: boolean("protected_target").default(false).notNull(),
		damage: jsonb("damage").$type<StrikeDamage>().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		regionIdx: index("idx_strike_region").on(t.regionId, t.createdAt),
		attackerTierIdx: index("idx_strike_attacker_tier").on(t.attackerStateId, t.tier, t.createdAt),
		warIdx: index("idx_strike_war").on(t.warId, t.createdAt),
		unitIdx: index("idx_strike_unit").on(t.unitId, t.createdAt)
	})
);

export const regionEffects = pgTable(
	"region_effects",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		regionId: integer("region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		// The state that suffers it (the region's owner when it was struck).
		stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
		kind: regionEffectKindEnum("kind").notNull(),
		// Share taken off (0-1); effects of one kind stack up to EFFECT_CAP.
		magnitude: real("magnitude").notNull(),
		strikeId: integer("strike_id").references(() => strikes.id, { onDelete: "cascade" }),
		startsAt: timestamp("starts_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull()
	},
	(t) => ({
		regionIdx: index("idx_region_effect_region").on(t.regionId, t.kind, t.expiresAt),
		stateIdx: index("idx_region_effect_state").on(t.stateId, t.kind, t.expiresAt)
	})
);

export const ihlViolations = pgTable(
	"ihl_violations",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		victimStateId: integer("victim_state_id").references(() => states.id, { onDelete: "set null" }),
		warId: integer("war_id").references(() => wars.id, { onDelete: "set null" }),
		strikeId: integer("strike_id").references(() => strikes.id, { onDelete: "cascade" }),
		kind: ihlViolationKindEnum("kind").notNull(),
		// 1 minor, 2 serious, 3 grave.
		severity: integer("severity").notNull(),
		// Standing points at the time (base + casualties); they decay on read.
		points: integer("points").notNull(),
		casualties: integer("casualties").default(0).notNull(),
		reason: text("reason").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_ihl_violation_state").on(t.stateId, t.createdAt)
	})
);

export type Strike = typeof strikes.$inferSelect;
export type RegionEffect = typeof regionEffects.$inferSelect;
export type IhlViolation = typeof ihlViolations.$inferSelect;

// --- NAVAL OPERATIONS ---
// Sea power beyond the land battle: blockades, shore bombardments,
// amphibious assaults, sea-lane raids and minefields. Rules and numbers live
// in config/game/naval.config.ts; resolution in services/military/naval.ts.
// A blockade is its own row because it works on the target state (trade,
// energy, smuggling) rather than on one region.
export const navalOpKindEnum = pgEnum("naval_op_kind", [
	"blockade",
	"shore_bombardment",
	"amphibious_assault",
	"sea_lane_raid",
	"minelaying"
]);
export const navalOpOutcomeEnum = pgEnum("naval_op_outcome", ["success", "partial", "failed", "intercepted"]);

/** What a naval operation did, for the log. */
export interface NavalDamage {
	/** Region levels knocked down, e.g. { infrastructure: 1 }. */
	levels?: Partial<Record<string, number>>;
	/** Units damaged or destroyed, by side. */
	units?: { unitId: number; name: string; damage: number; destroyed: boolean; side: "own" | "enemy" }[];
	/** Treasury or resources taken by a sea-lane raid. */
	haul?: number;
	/** The battle an amphibious assault opened. */
	battleId?: number;
	/** Civilians harmed by a bombardment. */
	civilians?: number;
}

export const navalOperations = pgTable(
	"naval_operations",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id").references(() => states.id, { onDelete: "set null" }),
		regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
		battleId: integer("battle_id").references(() => battles.id, { onDelete: "set null" }),
		orderedBy: text("ordered_by").references(() => accounts.id, { onDelete: "set null" }),
		kind: navalOpKindEnum("kind").notNull(),
		outcome: navalOpOutcomeEnum("outcome").notNull(),
		cost: integer("cost").notNull(),
		/** Sea control the fleet brought, 0-100. */
		seaControl: integer("sea_control").notNull(),
		/** How strongly a blockade bites or a raid lands, 0-100. */
		strength: integer("strength").notNull(),
		damage: jsonb("damage").$type<NavalDamage>(),
		message: text("message"),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_naval_op_state").on(t.stateId, t.createdAt),
		targetIdx: index("idx_naval_op_target").on(t.targetStateId, t.createdAt)
	})
);

export const navalBlockades = pgTable(
	"naval_blockades",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		blockaderStateId: integer("blockader_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		operationId: integer("operation_id").references(() => navalOperations.id, { onDelete: "cascade" }),
		/** Strength 0-100. */
		strength: integer("strength").notNull(),
		startsAt: timestamp("starts_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull()
	},
	(t) => ({
		activeIdx: index("idx_blockade_active").on(t.targetStateId, t.expiresAt),
		blockaderIdx: index("idx_blockade_blockader").on(t.blockaderStateId, t.expiresAt)
	})
);

// --- FLEET AT SEA ---
// The spatial layer under the older naval operations: a bounded axial hex sea,
// ships that actually move across it, ports that refuel and transship cargo,
// docks with construction/repair queues, and minefields that blockade a port.
// Pure rules live in config/game/fleet.config.ts; resolution in
// services/military/fleet.ts.

/** Every hull class from fleet.config.ts. Keep the two lists in sync. */
export const shipClassEnum = pgEnum("ship_class", [
	"carrier",
	"frigate",
	"helipad",
	"support_ship",
	"corvette",
	"destroyer",
	"light_aa",
	"gnss_jammer",
	"torpedo_sub",
	"vls_sub",
	"container_ship",
	"roro_ferry",
	"tanker"
]);
export const shipStatusEnum = pgEnum("ship_status", ["idle", "moving", "repairing", "sunk"]);
export const dockQueueKindEnum = pgEnum("dock_queue_kind", ["construct", "repair"]);
export const dockQueueStatusEnum = pgEnum("dock_queue_status", ["queued", "building", "done", "cancelled"]);

/** A port: refuels ships and holds cargo for loading/unloading. */
export const seaPorts = pgTable(
	"sea_ports",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		regionId: integer("region_id").references(() => regions.id, { onDelete: "set null" }),
		q: integer("q").notNull(),
		r: integer("r").notNull(),
		name: varchar("name", { length: 100 }).notNull(),
		level: integer("level").default(1).notNull(),
		/** Fuel units currently in the port's tanks. */
		fuelStock: integer("fuel_stock").default(0).notNull(),
		/** Cargo stockpiles by resource/product key, e.g. { steel: 400 }. */
		stock: jsonb("stock").$type<Record<string, number>>().default({}).notNull(),
		builtBy: text("built_by").references(() => accounts.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_sea_port_state").on(t.stateId),
		hexIdx: uniqueIndex("uq_sea_port_hex").on(t.q, t.r),
		regionIdx: uniqueIndex("uq_sea_port_region").on(t.regionId)
	})
);

/** A dock at a port: builds and repairs ships through a queue. */
export const seaDocks = pgTable(
	"sea_docks",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		portId: integer("port_id")
			.notNull()
			.references(() => seaPorts.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		q: integer("q").notNull(),
		r: integer("r").notNull(),
		/** Each level adds a build/repair slot and speeds the work. */
		level: integer("level").default(1).notNull(),
		builtBy: text("built_by").references(() => accounts.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		portIdx: uniqueIndex("uq_sea_dock_port").on(t.portId),
		stateIdx: index("idx_sea_dock_state").on(t.stateId)
	})
);

/** An officer earned through the state's officer academy. Traits and portrait
 *  are picked once at graduation and stay with the commander. */
/** A trade embargo declared by a bloc against another state. */
export const blocEmbargoes = pgTable(
	"bloc_embargoes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		blocId: integer("bloc_id")
			.notNull()
			.references(() => blocs.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		declaredBy: text("declared_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		reason: text("reason").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({ blocTargetIdx: uniqueIndex("uq_bloc_embargo").on(t.blocId, t.targetStateId) })
);

export const commanders = pgTable(
	"commanders",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		ownerId: text("owner_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		traitIds: jsonb("trait_ids").$type<string[]>().notNull().default([]),
		portrait: integer("portrait").notNull().default(0),
		/** 0–100; a commander can be wounded and, at zero, is killed in battle. */
		health: integer("health").default(100).notNull(),
		/** Lifetime experience, mapped to ten small performance levels. */
		experience: integer("experience").default(0).notNull(),
		alive: boolean("alive").default(true).notNull(),
		graduatedAt: timestamp("graduated_at").defaultNow().notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_commander_state").on(t.stateId)
	})
);

/** A pending officer-academy course: expensive and slow, resolved by cron. */
export const commanderTrainings = pgTable(
	"commander_trainings",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		ownerId: text("owner_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		completesAt: timestamp("completes_at").notNull()
	},
	(t) => ({
		dueIdx: index("idx_commander_training_due").on(t.completedAt, t.completesAt),
		stateIdx: index("idx_commander_training_state").on(t.stateId)
	})
);

/** A named group of ships that can be ordered to hold an area of the sea. */
export const fleets = pgTable(
	"fleets",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		ownerId: text("owner_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		commanderId: integer("commander_id").references(() => commanders.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_fleet_state").on(t.stateId)
	})
);

/** An airgroup or division: several units under one commander. */
export const unitGroupKindEnum = pgEnum("unit_group_kind", ["airgroup", "division"]);

export const unitGroups = pgTable(
	"unit_groups",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		ownerId: text("owner_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		kind: unitGroupKindEnum("kind").notNull(),
		name: varchar("name", { length: 100 }).notNull(),
		commanderId: integer("commander_id").references(() => commanders.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_unit_group_state").on(t.stateId),
		commanderIdx: index("idx_unit_group_commander").on(t.commanderId)
	})
);

/** The sea area a fleet has been ordered to hold (one row per hex). */
export const fleetHexes = pgTable(
	"fleet_hexes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		fleetId: integer("fleet_id")
			.notNull()
			.references(() => fleets.id, { onDelete: "cascade" }),
		q: integer("q").notNull(),
		r: integer("r").notNull(),
		assignedAt: timestamp("assigned_at").defaultNow().notNull()
	},
	(t) => ({
		hexUnique: uniqueIndex("uq_fleet_hex").on(t.fleetId, t.q, t.r),
		hexIdx: index("idx_fleet_hex_hex").on(t.q, t.r)
	})
);

/** One ship: its class, hex position, condition, fuel and current cargo. */
export const fleetShips = pgTable(
	"fleet_ships",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		/** Null while the hull is unassigned or the fleet is disbanded. */
		fleetId: integer("fleet_id").references(() => fleets.id, { onDelete: "set null" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		ownerId: text("owner_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		dockId: integer("dock_id").references(() => seaDocks.id, { onDelete: "set null" }),
		name: varchar("name", { length: 100 }).notNull(),
		shipClass: shipClassEnum("ship_class").notNull(),
		q: integer("q").notNull(),
		r: integer("r").notNull(),
		health: integer("health").default(100).notNull(),
		fuel: integer("fuel").default(0).notNull(),
		/** Cargo carried, if the hull has a hold (container/vehicle/fuel). */
		cargoType: varchar("cargo_type", { length: 40 }),
		cargoAmount: integer("cargo_amount").default(0).notNull(),
		status: shipStatusEnum("status").default("idle").notNull(),
		/** Remaining legs of a movement order, starting with the next hex. */
		orderPath: jsonb("order_path").$type<{ q: number; r: number }[]>(),
		/** When the current leg began/ends; the cron advances one leg at a time. */
		legStartsAt: timestamp("leg_starts_at"),
		legArrivesAt: timestamp("leg_arrives_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_fleet_ship_state").on(t.stateId),
		hexIdx: index("idx_fleet_ship_hex").on(t.q, t.r),
		fleetIdx: index("idx_fleet_ship_fleet").on(t.fleetId)
	})
);

/** The construction and repair queue of a single dock. */
export const fleetDockQueue = pgTable(
	"fleet_dock_queue",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		dockId: integer("dock_id")
			.notNull()
			.references(() => seaDocks.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		kind: dockQueueKindEnum("kind").notNull(),
		shipClass: shipClassEnum("ship_class"),
		shipId: integer("ship_id").references(() => fleetShips.id, { onDelete: "set null" }),
		orderedBy: text("ordered_by").references(() => accounts.id, { onDelete: "set null" }),
		cost: integer("cost").notNull(),
		status: dockQueueStatusEnum("status").default("queued").notNull(),
		queuedAt: timestamp("queued_at").defaultNow().notNull(),
		startsAt: timestamp("starts_at"),
		completesAt: timestamp("completes_at")
	},
	(t) => ({
		dockIdx: index("idx_fleet_queue_dock").on(t.dockId, t.status, t.id),
		stateIdx: index("idx_fleet_queue_state").on(t.stateId)
	})
);

/** A minefield on one hex. Merchant traffic is denied; warships take damage. */
export const navalMines = pgTable(
	"naval_mines",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		q: integer("q").notNull(),
		r: integer("r").notNull(),
		/** Remaining strength; each detonation spends some of it. */
		strength: integer("strength").default(100).notNull(),
		laidBy: text("laid_by").references(() => accounts.id, { onDelete: "set null" }),
		laidAt: timestamp("laid_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull()
	},
	(t) => ({
		hexIdx: index("idx_naval_mine_hex").on(t.q, t.r),
		stateIdx: index("idx_naval_mine_state").on(t.stateId)
	})
);

/** Combat, mining, cargo and blockade events for the fleet log. */
export const fleetEvents = pgTable(
	"fleet_events",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id").references(() => states.id, { onDelete: "cascade" }),
		kind: varchar("kind", { length: 40 }).notNull(),
		q: integer("q"),
		r: integer("r"),
		message: text("message"),
		data: jsonb("data").$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_fleet_event_state").on(t.stateId, t.createdAt),
		hexIdx: index("idx_fleet_event_hex").on(t.q, t.r)
	})
);

// --- SEA RECONNAISSANCE ---
// Sea passes target a hex, not a region. Sonar finds submarines; maritime
// radar and satellite SAR find surface ships and minefields.
export const seaIntelStatusEnum = pgEnum("sea_intel_status", ["in_progress", "completed"]);

export interface SeaIntelFindings {
	/** Ship-class counts when the sensor identified types, else category counts. */
	contacts: Record<string, number>;
	mines: number;
	/** 0-100 confidence in the picture. */
	confidence: number;
}

export const seaIntelMissions = pgTable(
	"sea_intel_missions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		launchedBy: text("launched_by")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		sensor: varchar("sensor", { length: 30 }).notNull(),
		q: integer("q").notNull(),
		r: integer("r").notNull(),
		cost: integer("cost").notNull(),
		status: seaIntelStatusEnum("status").default("in_progress").notNull(),
		findings: jsonb("findings").$type<SeaIntelFindings>(),
		launchedAt: timestamp("launched_at").defaultNow().notNull(),
		completesAt: timestamp("completes_at").notNull(),
		observedAt: timestamp("observed_at")
	},
	(t) => ({
		stateIdx: index("idx_sea_intel_state").on(t.stateId, t.launchedAt),
		hexIdx: index("idx_sea_intel_hex").on(t.q, t.r, t.observedAt),
		dueIdx: index("idx_sea_intel_due").on(t.status, t.completesAt)
	})
);

// Directed air missions: a squadron flies a named task to a region or hex.
export const airMissionStatusEnum = pgEnum("air_mission_status", ["in_progress", "completed", "cancelled"]);

export interface AirMissionResult {
	message: string;
	damage?: number;
	supply?: number;
	fuel?: number;
	contacts?: Record<string, number>;
}

export const airMissions = pgTable(
	"air_missions",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		unitId: integer("unit_id")
			.notNull()
			.references(() => militaryUnits.id, { onDelete: "cascade" }),
		orderedBy: text("ordered_by").references(() => accounts.id, { onDelete: "set null" }),
		kind: varchar("kind", { length: 40 }).notNull(),
		sourceRegionId: integer("source_region_id").references(() => regions.id, { onDelete: "set null" }),
		targetRegionId: integer("target_region_id").references(() => regions.id, { onDelete: "set null" }),
		q: integer("q"),
		r: integer("r"),
		fuelCost: integer("fuel_cost").notNull(),
		status: airMissionStatusEnum("status").default("in_progress").notNull(),
		result: jsonb("result").$type<AirMissionResult>(),
		launchedAt: timestamp("launched_at").defaultNow().notNull(),
		completesAt: timestamp("completes_at").notNull()
	},
	(t) => ({
		stateIdx: index("idx_air_mission_state").on(t.stateId, t.launchedAt),
		dueIdx: index("idx_air_mission_due").on(t.status, t.completesAt)
	})
);

// --- SPACE ---
// A state's constellation of satellites, its space defence, and the
// operations that blind a rival's. Rules in config/game/space.config.ts;
// resolution in services/military/space.ts.
export const satelliteKindEnum = pgEnum("satellite_kind", ["recon", "navigation", "comms", "early_warning"]);
export const satelliteOrbitEnum = pgEnum("satellite_orbit", ["leo", "meo", "geo"]);
export const satelliteStatusEnum = pgEnum("satellite_status", ["operational", "damaged", "destroyed"]);

export const satellites = pgTable(
	"satellites",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		kind: satelliteKindEnum("kind").notNull(),
		orbit: satelliteOrbitEnum("orbit").notNull(),
		health: integer("health").default(100).notNull(),
		status: satelliteStatusEnum("status").default("operational").notNull(),
		launchedBy: text("launched_by").references(() => accounts.id, { onDelete: "set null" }),
		operationalAt: timestamp("operational_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateKindIdx: index("idx_satellite_state_kind").on(t.stateId, t.kind, t.status)
	})
);

export const spaceOpKindEnum = pgEnum("space_op_kind", ["asat_strike", "uplink_jam", "orbital_sabotage"]);
export const spaceOpOutcomeEnum = pgEnum("space_op_outcome", ["success", "partial", "failed"]);

export const spaceOperations = pgTable(
	"space_operations",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id").references(() => states.id, { onDelete: "set null" }),
		satelliteId: integer("satellite_id").references(() => satellites.id, { onDelete: "set null" }),
		orderedBy: text("ordered_by").references(() => accounts.id, { onDelete: "set null" }),
		kind: spaceOpKindEnum("kind").notNull(),
		outcome: spaceOpOutcomeEnum("outcome").notNull(),
		cost: integer("cost").notNull(),
		successChance: integer("success_chance").notNull(),
		attributionChance: integer("attribution_chance").notNull(),
		attributed: boolean("attributed").default(false).notNull(),
		damage: integer("damage").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_space_op_state").on(t.stateId, t.createdAt),
		targetIdx: index("idx_space_op_target").on(t.targetStateId, t.createdAt)
	})
);

export const stateSpaceDefence = pgTable("state_space_defence", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	level: integer("level").default(0).notNull(),
	upgradedBy: text("upgraded_by").references(() => accounts.id, { onDelete: "set null" }),
	upgradedAt: timestamp("upgraded_at").defaultNow().notNull()
});

// --- ARTIFICIAL INTELLIGENCE ---
// A state's computing capability. Rules in config/game/ai.config.ts;
// resolution in services/military/ai.ts. Level 0 means no programme.
export const stateAi = pgTable("state_ai", {
	id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
	stateId: integer("state_id")
		.notNull()
		.references(() => states.id, { onDelete: "cascade" })
		.unique(),
	level: integer("level").default(0).notNull(),
	researchPoints: integer("research_points").default(0).notNull(),
	upgradedBy: text("upgraded_by").references(() => accounts.id, { onDelete: "set null" }),
	updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// --- SMUGGLING ---
// Shadow trade around sanctions and blockades. A route is opened by a state
// and run by its citizens. Rules in config/game/smuggling.config.ts;
// resolution in services/economy/smuggling.ts.
export const smugglingOutcomeEnum = pgEnum("smuggling_outcome", ["delivered", "seized", "lost"]);
// A cargo may be a raw resource or a finished product (smuggling.config.ts).
export const smugglingGoodEnum = pgEnum("smuggling_good", [
	"chips",
	"electronics",
	"rare_earth",
	"fuel",
	"uranium",
	"rifles",
	"explosives"
]);

export const smugglingRoutes = pgTable(
	"smuggling_routes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		originStateId: integer("origin_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		targetStateId: integer("target_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		good: smugglingGoodEnum("good").notNull(),
		active: boolean("active").default(true).notNull(),
		/** Base interception risk in percent, set when the route opens. */
		risk: integer("risk").default(0).notNull(),
		openedBy: text("opened_by").references(() => accounts.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		routeIdx: index("idx_smuggling_route").on(t.originStateId, t.targetStateId, t.good),
		activeIdx: index("idx_smuggling_route_active").on(t.active)
	})
);

export const smugglingRuns = pgTable(
	"smuggling_runs",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		routeId: integer("route_id")
			.notNull()
			.references(() => smugglingRoutes.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		good: smugglingGoodEnum("good").notNull(),
		quantity: integer("quantity").notNull(),
		outcome: smugglingOutcomeEnum("outcome").notNull(),
		/** What the run paid (delivered) or cost in fines (seized). */
		payout: integer("payout").default(0).notNull(),
		fine: integer("fine").default(0).notNull(),
		risk: integer("risk").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		userIdx: index("idx_smuggling_run_user").on(t.userId, t.createdAt),
		routeIdx: index("idx_smuggling_run_route").on(t.routeId, t.createdAt)
	})
);

export type NavalOperation = typeof navalOperations.$inferSelect;
export type NavalBlockade = typeof navalBlockades.$inferSelect;
export type Satellite = typeof satellites.$inferSelect;
export type SpaceOperation = typeof spaceOperations.$inferSelect;
export type StateAi = typeof stateAi.$inferSelect;
export type SmugglingRoute = typeof smugglingRoutes.$inferSelect;
export type SmugglingRun = typeof smugglingRuns.$inferSelect;

// --- SUPPLY CONVOYS ---
// Player-ordered relief and resupply runs. A delivered convoy leaves a timed
// supply_boost effect on the region, which the logistics service folds into
// the region's carrying capacity. Escorts come from the state's sea control.
export const supplyConvoys = pgTable(
	"supply_convoys",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		originRegionId: integer("origin_region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		targetRegionId: integer("target_region_id")
			.notNull()
			.references(() => regions.id, { onDelete: "cascade" }),
		orderedBy: text("ordered_by").references(() => accounts.id, { onDelete: "set null" }),
		cargo: integer("cargo").notNull(),
		escortPoints: integer("escort_points").default(0).notNull(),
		interceptionChance: integer("interception_chance").notNull(),
		travelHours: integer("travel_hours").notNull(),
		cost: integer("cost").notNull(),
		outcome: convoyOutcomeEnum("outcome").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		stateIdx: index("idx_supply_convoy_state").on(t.stateId, t.createdAt),
		targetIdx: index("idx_supply_convoy_target").on(t.targetRegionId, t.createdAt)
	})
);

export type SupplyConvoy = typeof supplyConvoys.$inferSelect;

// --- AERIAL AND MARITIME TRADE ---
// Legal trade lanes pay treasury each collection cycle. Closing airspace or
// an EEZ denies a rival the lane and raises the risk of running it anyway.
export const tradeLaneKindEnum = pgEnum("trade_lane_kind", ["air", "sea"]);
export const closureKindEnum = pgEnum("closure_kind", ["airspace", "eez"]);

export const tradeLanes = pgTable(
	"trade_lanes",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		partnerStateId: integer("partner_state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		kind: tradeLaneKindEnum("kind").notNull(),
		capacity: integer("capacity").notNull(),
		active: boolean("active").default(true).notNull(),
		openedBy: text("opened_by").references(() => accounts.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		ownerIdx: index("idx_trade_lane_owner").on(t.stateId, t.kind),
		pairIdx: index("idx_trade_lane_pair").on(t.stateId, t.partnerStateId, t.kind)
	})
);

export const closedZones = pgTable(
	"closed_zones",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		kind: closureKindEnum("kind").notNull(),
		/** Null closes the zone to everyone; otherwise only to this state. */
		targetStateId: integer("target_state_id").references(() => states.id, { onDelete: "cascade" }),
		strength: integer("strength").default(100).notNull(),
		orderedBy: text("ordered_by").references(() => accounts.id, { onDelete: "set null" }),
		startsAt: timestamp("starts_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		targetIdx: index("idx_closed_zone_target").on(t.targetStateId, t.kind, t.expiresAt),
		ownerIdx: index("idx_closed_zone_owner").on(t.stateId, t.kind, t.expiresAt)
	})
);

export type TradeLane = typeof tradeLanes.$inferSelect;
export type ClosedZone = typeof closedZones.$inferSelect;

/** A daily snapshot of the world: who held what, and the numbers behind it. */
export const mapSnapshots = pgTable(
	"map_snapshots",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		capturedAt: timestamp("captured_at").notNull(),
		/** Region-level state/bloc ownership at capture time. */
		regions: jsonb("regions").$type<MapSnapshotRegion[]>().notNull(),
		/** State-level economy and military statistics. */
		states: jsonb("states").$type<MapSnapshotState[]>().notNull(),
		/** Bloc membership and names. */
		blocs: jsonb("blocs").$type<MapSnapshotBloc[]>().notNull()
	},
	(t) => ({ capturedIdx: uniqueIndex("uq_map_snapshot_day").on(t.capturedAt) })
);

export interface MapSnapshotRegion {
	id: number;
	stateId: number | null;
	blocId: number | null;
	terrain: string | null;
	/** Civilians living here at capture time. */
	population?: number;
	/** Player residents living here at capture time (absent in older snapshots). */
	residents?: number;
}

export interface MapSnapshotState {
	id: number;
	name: string;
	blocId: number | null;
	regionCount: number;
	army: number;
	ships: number;
	aircraft: number;
	steel: number;
	/** Legacy figure; civilian population is on regions. */
	population: number;
	civilians: number;
	/** Player residents in the state's regions (absent in older snapshots). */
	residents?: number;
	power: number;
	usedPower: number;
	fuelFactor: number;
	maintenanceFactor: number;
	treasury: number;
	debt: number;
}

export interface MapSnapshotBloc {
	id: number;
	name: string;
	color: string;
	memberStateIds: number[];
}

