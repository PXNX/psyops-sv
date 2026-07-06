-- Premium membership support.
-- Adds premium tracking columns to user_profiles and a new transaction type.

-- Premium is active while premium_until is in the future.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS premium_until timestamp;

-- Master switch for the premium automation job (production / training / factory work).
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS premium_automation boolean NOT NULL DEFAULT true;

-- New transaction type for premium purchases and gifts.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block; run this statement on its own.
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'premium_purchase';
