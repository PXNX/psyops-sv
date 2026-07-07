-- Unit exercises and combat experience.
-- Adds experience tracking and exercise state to military_units.

-- Combat experience (0-100). Gained by exercising and real combat, lost when
-- units take casualties in battle. Maps to HoI4-style levels (recruit → elite).
ALTER TABLE military_units ADD COLUMN IF NOT EXISTS experience integer NOT NULL DEFAULT 0;

-- Whether the unit is currently on a training exercise. Exercising units cannot
-- join battles or train, gain experience, and lose organization/supply.
ALTER TABLE military_units ADD COLUMN IF NOT EXISTS is_exercising boolean NOT NULL DEFAULT false;
ALTER TABLE military_units ADD COLUMN IF NOT EXISTS exercise_started_at timestamp;
ALTER TABLE military_units ADD COLUMN IF NOT EXISTS exercise_completed_at timestamp;
