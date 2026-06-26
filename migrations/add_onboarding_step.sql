-- Add onboarding_step column to user_profiles
-- null = onboarding completed/skipped, 0-6 = current onboarding step
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_step integer;
