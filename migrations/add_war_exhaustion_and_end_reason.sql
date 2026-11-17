-- War resolution cron (api/cron/wars): wars track how exhausted they are and
-- how they ended, so the white-peace / stalemate / surrender paths the cron
-- takes are visible in the UI.
DO $$ BEGIN
	CREATE TYPE "war_end_reason" AS ENUM ('exhaustion', 'stalemate', 'capitulation', 'surrender');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

ALTER TABLE wars ADD COLUMN IF NOT EXISTS exhaustion integer DEFAULT 0 NOT NULL;
ALTER TABLE wars ADD COLUMN IF NOT EXISTS ended_reason "war_end_reason";
