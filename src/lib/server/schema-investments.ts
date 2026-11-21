// src/lib/server/schema-investments.ts
// Investment tables, kept apart from the main schema so this feature can land
// independently of other schema work in the same checkout.
//
// State bonds: the player lends coins to a state treasury. The rate is fixed
// at purchase; the biweekly cron pays a coupon from that treasury and returns
// the principal at maturity. Coupon rows are the interest the player earned.
//
// Company earnings: a fortnightly snapshot of the company's balance sheet and
// dividends, published for shareholders and the market pulse.

import { relations } from "drizzle-orm";
import { index, integer, pgTable, timestamp, text, uniqueIndex } from "drizzle-orm/pg-core";
import { accounts, companies, states } from "./schema";

export const stateBonds = pgTable(
	"state_bonds",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => accounts.id, { onDelete: "cascade" }),
		stateId: integer("state_id")
			.notNull()
			.references(() => states.id, { onDelete: "cascade" }),
		principal: integer("principal").notNull(),
		couponRatePercent: integer("coupon_rate_percent").notNull(),
		purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
		lastCouponAt: timestamp("last_coupon_at").defaultNow().notNull(),
		maturesAt: timestamp("matures_at").notNull(),
		redeemedAt: timestamp("redeemed_at")
	},
	(t) => ({
		userIdx: index("idx_state_bond_user").on(t.userId),
		stateIdx: index("idx_state_bond_state").on(t.stateId)
	})
);

export const bondCoupons = pgTable(
	"bond_coupons",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		bondId: integer("bond_id")
			.notNull()
			.references(() => stateBonds.id, { onDelete: "cascade" }),
		amount: integer("amount").notNull(),
		paidAt: timestamp("paid_at").defaultNow().notNull()
	},
	(t) => ({ bondIdx: index("idx_bond_coupon_bond").on(t.bondId) })
);

export const stateBondsRelations = relations(stateBonds, ({ one, many }) => ({
	user: one(accounts, { fields: [stateBonds.userId], references: [accounts.id] }),
	state: one(states, { fields: [stateBonds.stateId], references: [states.id] }),
	coupons: many(bondCoupons)
}));

export const bondCouponsRelations = relations(bondCoupons, ({ one }) => ({
	bond: one(stateBonds, { fields: [bondCoupons.bondId], references: [stateBonds.id] })
}));

export type StateBond = typeof stateBonds.$inferSelect;
export type BondCoupon = typeof bondCoupons.$inferSelect;

export const companyEarningsReports = pgTable(
	"company_earnings_reports",
	{
		id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
		companyId: integer("company_id")
			.notNull()
			.references(() => companies.id, { onDelete: "cascade" }),
		periodStart: timestamp("period_start").notNull(),
		periodEnd: timestamp("period_end").notNull(),
		revenue: integer("revenue").default(0).notNull(),
		expenses: integer("expenses").default(0).notNull(),
		profit: integer("profit").default(0).notNull(),
		dividendsPaid: integer("dividends_paid").default(0).notNull(),
		sharesOutstanding: integer("shares_outstanding").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull()
	},
	(t) => ({
		companyPeriodIdx: uniqueIndex("idx_earnings_report_company_period").on(t.companyId, t.periodEnd),
		companyIdx: index("idx_earnings_report_company").on(t.companyId)
	})
);

export const companyEarningsReportsRelations = relations(companyEarningsReports, ({ one }) => ({
	company: one(companies, { fields: [companyEarningsReports.companyId], references: [companies.id] })
}));

export type CompanyEarningsReport = typeof companyEarningsReports.$inferSelect;
