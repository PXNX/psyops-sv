-- Regional energy: sited plants, grid/storage levels and the refined-fuel
-- allocation policy. Idempotent so it can be applied more than once.
ALTER TABLE regions ADD COLUMN IF NOT EXISTS grid integer DEFAULT 0;
ALTER TABLE regions ADD COLUMN IF NOT EXISTS storage integer DEFAULT 0;

ALTER TABLE power_plants ADD COLUMN IF NOT EXISTS region_id integer REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE power_plants ADD COLUMN IF NOT EXISTS siting_factor integer DEFAULT 1000;
ALTER TABLE power_plants ADD COLUMN IF NOT EXISTS is_under_construction boolean DEFAULT false NOT NULL;
ALTER TABLE power_plants ADD COLUMN IF NOT EXISTS construction_completes_at timestamp;

ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS civilian_share integer DEFAULT 50 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS military_share integer DEFAULT 30 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS export_share integer DEFAULT 20 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS civilian_fuel integer DEFAULT 0 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS military_fuel integer DEFAULT 0 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS exported_fuel integer DEFAULT 0 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS fuel_factor integer DEFAULT 100 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS maintenance_factor integer DEFAULT 100 NOT NULL;
ALTER TABLE state_energy ADD COLUMN IF NOT EXISTS last_energy_tick_at timestamp;

ALTER TYPE building_type ADD VALUE IF NOT EXISTS 'grid';
ALTER TYPE building_type ADD VALUE IF NOT EXISTS 'energy_storage';
ALTER TYPE proposal_type ADD VALUE IF NOT EXISTS 'grid';
ALTER TYPE proposal_type ADD VALUE IF NOT EXISTS 'energy_storage';
