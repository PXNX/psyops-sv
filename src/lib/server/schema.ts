import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

// Enums
export const journalistRankEnum = pgEnum("journalist_rank", ["author", "editor", "owner"]);
export const userRoleEnum = pgEnum("user_role", ["user", "moderator", "admin"]); // Berechtigungen (permissions)

// Accounts table - updated for OAuth2
export const accounts = pgTable(
	"account",
	{
		id: text("id").primaryKey(), // Changed to text to use Google's sub (subject identifier)
		email: varchar("email", { length: 255 }).notNull().unique(),
		role: userRoleEnum("role").notNull().default("user"), // Berechtigungen
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull()
	},
	(table) => ({
		emailIdx: uniqueIndex("idx_email").on(table.email)
	})
);

// User Profiles table - stores additional user information
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

// Sessions table - for managing user sessions
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

// OAuth Tokens table - stores Google OAuth tokens
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

// Newspapers table
export const newspapers = pgTable("newspapers", {
	id: uuid("id").defaultRandom().primaryKey(),
	avatar: text("avatar"),
	name: varchar("name", { length: 40 }).notNull(),
	background: text("background"),
	createdAt: timestamp("created_at").defaultNow().notNull()
});

// Journalists table (junction table for accounts and newspapers)
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

// OAuth state table - removed as it's being handled by cookies in your implementation
// If you want to store state in DB instead of cookies, keep this table

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
	upvotes: many(upvotes)
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

// TypeScript types (inferred from schema)
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type NewOAuthToken = typeof oauthTokens.$inferInsert;

export type Newspaper = typeof newspapers.$inferSelect;
export type NewNewspaper = typeof newspapers.$inferInsert;

export type Journalist = typeof journalists.$inferSelect;
export type NewJournalist = typeof journalists.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type Upvote = typeof upvotes.$inferSelect;
export type NewUpvote = typeof upvotes.$inferInsert;
