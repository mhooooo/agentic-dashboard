-- Add Linear and Google Calendar to allowed providers
-- Migration: 004_add_oauth_providers.sql
-- Date: 2025-11-20
-- Description: Expands provider constraint to include Linear and Google Calendar for OAuth support

-- Drop existing constraints
ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_provider_check;
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_provider_check;

-- Add updated constraints with all 5 providers
ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_provider_check
  CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'calendar'));

ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_provider_check
  CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'calendar'));
