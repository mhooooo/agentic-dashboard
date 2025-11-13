# Supabase Setup Guide

This guide will help you set up Supabase for the Agentic Dashboard.

## Prerequisites

- A Supabase account (free tier works fine)
- Supabase CLI installed (optional, but recommended)

## Quick Setup

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose an organization and project name
4. Select a region close to you
5. Set a strong database password
6. Click "Create new project"

### 2. Run the Migration

Once your project is ready:

1. Go to the SQL Editor in your Supabase dashboard
2. Click "New query"
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste and run the query
5. You should see "Success. No rows returned"

### 3. Enable Supabase Vault (for encrypted secrets)

In the SQL Editor, run:

```sql
SELECT vault.create_secret('widget_secrets', 'secret_value', 'aes-256-gcm');
```

This enables transparent column encryption for API keys and tokens.

### 4. Get Your API Keys

1. Go to Project Settings → API
2. Copy these values:
   - **Project URL** (e.g., https://xxx.supabase.co)
   - **anon/public** key
   - **service_role** key (keep this secret!)

### 5. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Claude API
ANTHROPIC_API_KEY=your-claude-api-key-here
```

### 6. Enable Email Authentication (Optional)

If you want to enable email/password authentication:

1. Go to Authentication → Providers
2. Enable "Email" provider
3. Configure email templates as needed

### 7. Test the Connection

Run the development server:

```bash
npm run dev
```

Visit http://localhost:3000 and check the browser console for any Supabase connection errors.

## Database Schema Overview

The migration creates these tables:

- **widget_templates** - Available widget types (GitHub, Jira, etc.)
- **widget_instances** - User's active widgets with positions
- **widget_secrets** - Encrypted API keys and tokens
- **conversation_history** - Chat messages for agent context
- **dashboard_checkpoints** - Snapshots for undo/redo

All tables have Row Level Security (RLS) enabled, so users can only access their own data.

## Troubleshooting

### "relation does not exist" error

Make sure you ran the migration SQL in the correct order. If you get this error, drop all tables and re-run the migration.

### RLS blocking queries

If you're logged in but can't access data, check that:
1. You're authenticated (use `supabase.auth.getUser()`)
2. The user_id in your INSERT matches `auth.uid()`

### Vault encryption not working

Make sure you ran the `vault.create_secret` command after creating the tables.

## Next Steps

- Set up authentication in your Next.js app
- Create your first widget instance
- Test the Event Mesh interconnections
