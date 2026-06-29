-- Add home_region_id to residences table
-- This separates "current region" (regionId, changes on travel) from
-- "residence" (homeRegionId, permanent citizenship, doesn't change on travel)

ALTER TABLE residences
  ADD COLUMN home_region_id INTEGER REFERENCES regions(id) ON DELETE CASCADE;

-- Backfill: set home_region_id = region_id for all existing users
UPDATE residences SET home_region_id = region_id WHERE home_region_id IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE residences ALTER COLUMN home_region_id SET NOT NULL;
