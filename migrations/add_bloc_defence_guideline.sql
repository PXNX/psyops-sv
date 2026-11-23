-- Bloc defence-spending guideline: a percentage of state income that member
-- states are expected to spend on defence. NULL means no guideline is set.

ALTER TABLE "blocs"
  ADD COLUMN IF NOT EXISTS "defence_spending_guideline" INTEGER;
