-- Add Twilio and Stripe to allowed providers
-- Migration: 006_add_twilio_stripe_providers.sql
-- Date: 2025-12-21
-- Description: Expands provider constraint to include Twilio (SMS/voice) and Stripe (payments)

-- Drop existing constraints
ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_provider_check;
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_provider_check;

-- Add updated constraints with Twilio and Stripe
ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_provider_check
  CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'calendar', 'twilio', 'stripe'));

ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_provider_check
  CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'calendar', 'twilio', 'stripe'));
