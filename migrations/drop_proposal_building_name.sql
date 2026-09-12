-- Construction proposals are only about raising a region's building-type
-- level by a quantity; there's no per-building name for the user to choose,
-- and the column being NOT NULL with nothing populating it was causing
-- proposal submission to fail outright.
ALTER TABLE proposal_building_details DROP COLUMN IF EXISTS building_name;
