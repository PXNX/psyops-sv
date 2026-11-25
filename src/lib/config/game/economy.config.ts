// Economy and market configuration
export const ECONOMY_CONFIG = {
	// Initial balances
	INITIAL_USER_WALLET: 10000,
	INITIAL_STATE_TREASURY: 0,
	INITIAL_COMPANY_BUDGET: 0,

	// Tax rates (percentages)
	DEFAULT_TAX_RATES: {
		mining: 10,
		production: 15,
		market_transaction: 5,
		income: 20
	},

	// Market
	MARKET_LISTING_FEE: 100,
	MARKET_TRANSACTION_FEE_PERCENT: 2,
	MAX_LISTINGS_PER_USER: 50,

	// Factory
	DEFAULT_FACTORY_WAGE: 1500,
	DEFAULT_FACTORY_MAX_WORKERS: 10,
	DEFAULT_PRODUCTION_RATE: 10,
	WORK_COOLDOWN_HOURS: 24,

	// Company
	COMPANY_CREATION_COST: 50000,
	FACTORY_CREATION_COST: 100000,

	// Stock market
	// Fixed share count issued at IPO; the founder's block is locked (never
	// listable) and only the remaining float trades on the open market.
	IPO_TOTAL_SHARES: 1000,
	IPO_FOUNDER_LOCKED_PERCENT: 51,
	MIN_SHARE_PRICE: 1,
	// % of a public company's budget balance paid out to shareholders per
	// dividend cycle (run by the dividends cron), split pro-rata by holding.
	DIVIDEND_RATE_PERCENT: 5,
	// Companies pay out automatically by default; owners can set the ratio to
	// 0 to turn the cron off and declare payouts by hand instead.
	DIVIDEND_DEFAULT_PAYOUT_RATIO: 50,
	// Dividends (services/economy/dividends.ts): paid from the company budget
	// to every holder pro rata, in whole currency per share, at most once per
	// cooldown (manual and automatic share it). A payout must be at least
	// DIVIDEND_MIN_PER_SHARE per share and DIVIDEND_MIN_TOTAL overall.
	DIVIDEND_COOLDOWN_HOURS: 24,
	DIVIDEND_MIN_PER_SHARE: 1,
	DIVIDEND_MIN_TOTAL: 1000,
	// Window for the dividend yield shown on company and profile pages.
	DIVIDEND_YIELD_WINDOW_DAYS: 30,

	// State bailouts: one treasury transferring funds to another. The aid
	// relieves the recipient's debt first and buys civilian goodwill.
	BAILOUT_MIN_AMOUNT: 10_000,

	// Visas
	DEFAULT_VISA_COST: 5000,
	DEFAULT_VISA_DURATION_DAYS: 30,
	DEFAULT_VISA_TAX_RATE: 20,

	// Gift codes
	MAX_GIFT_CODE_LENGTH: 50,
	DEFAULT_GIFT_CODE_EXPIRATION_DAYS: 30
} as const;

export type ResourceType =
	| "iron"
	| "copper"
	| "steel"
	| "gunpowder"
	| "wood"
	| "coal"
	| "oil"
	| "gas"
	| "uranium"
	| "rare_earth"
	| "silicon"
	| "fuel"
	| "enriched_uranium";
export type ProductType =
	| "rifles"
	| "ammunition"
	| "artillery"
	| "vehicles"
	| "explosives"
	| "chips"
	| "electronics"
	| "machine_tools"
	| "fab_equipment";
export type FactoryType = "mine" | "refinery" | "armaments" | "fabrication" | "equipment" | "general";
export type JobType = "miner" | "refiner" | "assembler" | "general_worker";
