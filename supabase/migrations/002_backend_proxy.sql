-- Backend API Proxy Schema Migration
-- Month 3: Real API Integration
-- Added: November 19, 2025

-- User Credentials Table
-- Stores encrypted API tokens (PATs) for external providers
-- RLS ensures users only access their own credentials
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'jira', 'slack')),
  credentials JSONB NOT NULL, -- Encrypted: { pat: "ghp_...", email: "..." }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_user_credentials_user_id ON user_credentials(user_id);
CREATE INDEX idx_user_credentials_provider ON user_credentials(provider);

-- Enable Row Level Security
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users manage only their own credentials
CREATE POLICY "Users can view their own credentials"
  ON user_credentials
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own credentials"
  ON user_credentials
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own credentials"
  ON user_credentials
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own credentials"
  ON user_credentials
  FOR DELETE
  USING (user_id = auth.uid());

-- Webhook Events Table
-- Stores incoming webhook payloads for replay and debugging
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('github', 'jira', 'slack')),
  event_type TEXT NOT NULL, -- 'pull_request', 'issue', etc.
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for webhook queries
CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at DESC);

-- No RLS on webhooks (server-only access via service role)
-- Webhooks are not user-specific; they're broadcast events

-- Auto-update timestamps trigger for user_credentials
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_credentials_updated_at
  BEFORE UPDATE ON user_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cleanup old webhook events (keep last 7 days)
-- Run this as a periodic maintenance task (e.g., via cron or Supabase Edge Functions)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE received_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Note: Supabase Vault encryption should be enabled via Supabase dashboard
-- For production, encrypt the 'credentials' JSONB field using Vault
-- Example: SELECT vault.create_secret('user_credentials', 'credentials', 'aes-256-gcm');
