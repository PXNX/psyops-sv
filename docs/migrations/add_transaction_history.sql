-- Migration: Add transaction history table and enum
-- This migration adds the transaction_history table to track all money movements

-- Step 1: Create the transaction_type enum
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'market_purchase',
        'market_sale',
        'gift_code_redemption',
        'factory_wage',
        'company_deposit',
        'company_withdrawal',
        'visa_purchase',
        'factory_edit',
        'company_edit',
        'newspaper_edit',
        'settings_name_change',
        'settings_logo_change',
        'tax_payment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create the transaction_history table
CREATE TABLE IF NOT EXISTS transaction_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    description TEXT NOT NULL,
    related_user_id TEXT REFERENCES account(id) ON DELETE SET NULL,
    related_entity_type VARCHAR(50),
    related_entity_id INTEGER,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_user ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON transaction_history(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_user_created ON transaction_history(user_id, created_at DESC);

-- Step 4: Add comment to table
COMMENT ON TABLE transaction_history IS 'Records all financial transactions for users, providing a complete audit trail of money movements';

COMMENT ON COLUMN transaction_history.amount IS 'Transaction amount (negative for deductions, positive for additions)';
COMMENT ON COLUMN transaction_history.balance_after IS 'User wallet balance after this transaction';
COMMENT ON COLUMN transaction_history.related_user_id IS 'ID of another user involved in the transaction (e.g., seller in a purchase)';
COMMENT ON COLUMN transaction_history.related_entity_type IS 'Type of entity this transaction relates to (e.g., "listing", "company", "factory")';
COMMENT ON COLUMN transaction_history.related_entity_id IS 'ID of the related entity';
COMMENT ON COLUMN transaction_history.metadata IS 'JSON string containing additional transaction details';
