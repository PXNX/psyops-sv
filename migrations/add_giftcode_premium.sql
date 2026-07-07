-- Premium rewards for gift codes.
-- Admins can configure a number of premium days granted when a code is redeemed.

-- Number of premium days granted by the gift code (0 = no premium reward).
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS premium_days integer NOT NULL DEFAULT 0;

-- Number of premium days a user actually received for a given redemption.
ALTER TABLE gift_code_redemptions ADD COLUMN IF NOT EXISTS premium_days_received integer NOT NULL DEFAULT 0;
