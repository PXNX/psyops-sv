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

    // Visas
    DEFAULT_VISA_COST: 5000,
    DEFAULT_VISA_DURATION_DAYS: 30,
    DEFAULT_VISA_TAX_RATE: 20,

    // Gift codes
    MAX_GIFT_CODE_LENGTH: 50,
    DEFAULT_GIFT_CODE_EXPIRATION_DAYS: 30
} as const;

export type ResourceType = "iron" | "copper" | "steel" | "gunpowder" | "wood" | "coal";
export type ProductType = "rifles" | "ammunition" | "artillery" | "vehicles" | "explosives";
export type FactoryType = "mine" | "refinery" | "armaments" | "general";
export type JobType = "miner" | "refiner" | "assembler" | "general_worker";
