-- Migration: Add Company Headquarters Region
-- Description: Companies can be headquartered in the owner's residence region.
-- This ties the company to that region's state for display and for embargo
-- checks (state sanctions block share trading between sanctioned states).

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "region_id" INTEGER REFERENCES "regions"("id") ON DELETE SET NULL;
