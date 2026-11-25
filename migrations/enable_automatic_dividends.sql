-- Dividends are now paid automatically by default. Existing public companies
-- that never touched their policy still have the old 0 (off) value, so enable
-- them as well; an explicit 0 set by an owner is indistinguishable here and is
-- turned on too.
ALTER TABLE company_shares
  ALTER COLUMN dividend_payout_ratio SET DEFAULT 50;

UPDATE company_shares
  SET dividend_payout_ratio = 50
  WHERE dividend_payout_ratio = 0;
