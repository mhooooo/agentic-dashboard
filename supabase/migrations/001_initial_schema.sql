-- Agentic Dashboard - Initial Database Schema
-- This migration creates the core tables for the dashboard system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Widget Templates Table
-- Stores available widget types (both hardcoded and declarative)
CREATE TABLE widget_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  config_schema JSONB NOT NULL,
  is_declarative BOOLEAN DEFAULT false,
  declarative_template JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on category for filtering
CREATE INDEX idx_widget_templates_category ON widget_templates(category);

-- Widget Instances Table
-- Stores user's active widgets with their positions and configurations
CREATE TABLE widget_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES widget_templates(id) ON DELETE SET NULL,
  position JSONB NOT NULL, -- {x, y, w, h} for react-grid-layout
  config JSONB NOT NULL DEFAULT '{}', -- Widget-specific configuration
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for widget instances
CREATE INDEX idx_widget_instances_user_id ON widget_instances(user_id);
CREATE INDEX idx_widget_instances_template_id ON widget_instances(template_id);
CREATE INDEX idx_widget_instances_status ON widget_instances(status);

-- Widget Secrets Table
-- Stores encrypted API keys and tokens (encrypted by Supabase Vault)
CREATE TABLE widget_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  secret_name TEXT NOT NULL,
  secret_value TEXT NOT NULL, -- Will be encrypted by Vault
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, secret_name)
);

-- Create index for lookups
CREATE INDEX idx_widget_secrets_user_id ON widget_secrets(user_id);

-- Conversation History Table
-- Stores chat messages for agent memory and context
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for conversation lookup
CREATE INDEX idx_conversation_user_session ON conversation_history(user_id, session_id);
CREATE INDEX idx_conversation_created_at ON conversation_history(created_at);

-- Dashboard Checkpoints Table
-- Stores dashboard snapshots for undo/redo functionality
CREATE TABLE dashboard_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot JSONB NOT NULL, -- Full dashboard state
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for checkpoints
CREATE INDEX idx_checkpoints_user_id ON dashboard_checkpoints(user_id);
CREATE INDEX idx_checkpoints_created_at ON dashboard_checkpoints(created_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for widget_instances
CREATE POLICY "Users can view their own widgets"
  ON widget_instances
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own widgets"
  ON widget_instances
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own widgets"
  ON widget_instances
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own widgets"
  ON widget_instances
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for widget_secrets
CREATE POLICY "Users can view their own secrets"
  ON widget_secrets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own secrets"
  ON widget_secrets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own secrets"
  ON widget_secrets
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own secrets"
  ON widget_secrets
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for conversation_history
CREATE POLICY "Users can view their own conversations"
  ON conversation_history
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own messages"
  ON conversation_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for dashboard_checkpoints
CREATE POLICY "Users can view their own checkpoints"
  ON dashboard_checkpoints
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own checkpoints"
  ON dashboard_checkpoints
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own checkpoints"
  ON dashboard_checkpoints
  FOR DELETE
  USING (user_id = auth.uid());

-- Insert initial widget templates
-- These are the hardcoded widgets we'll build in Month 1

INSERT INTO widget_templates (name, description, category, config_schema, is_declarative) VALUES
(
  'GitHub Pull Requests',
  'Track pull requests from your GitHub repositories',
  'development',
  '{
    "fields": [
      {
        "name": "github_token",
        "type": "secret",
        "label": "GitHub Personal Access Token",
        "required": true
      },
      {
        "name": "repositories",
        "type": "multiselect",
        "label": "Repositories to track",
        "required": true
      },
      {
        "name": "filters",
        "type": "checkboxes",
        "label": "Show",
        "options": ["Open PRs", "Your PRs", "Team PRs"],
        "default": ["Open PRs"]
      }
    ]
  }',
  false
),
(
  'Jira Issues',
  'View and manage Jira issues from your projects',
  'project-management',
  '{
    "fields": [
      {
        "name": "jira_url",
        "type": "text",
        "label": "Jira Instance URL",
        "placeholder": "https://yourcompany.atlassian.net",
        "required": true
      },
      {
        "name": "jira_token",
        "type": "secret",
        "label": "Jira API Token",
        "required": true
      },
      {
        "name": "jira_email",
        "type": "email",
        "label": "Your Jira Email",
        "required": true
      },
      {
        "name": "project_key",
        "type": "text",
        "label": "Project Key",
        "placeholder": "PROJ",
        "required": true
      }
    ]
  }',
  false
);

-- Note: Supabase Vault encryption will be enabled separately
-- Run this in Supabase SQL Editor after creating the project:
-- SELECT vault.create_secret('widget_secrets', 'secret_value', 'aes-256-gcm');
