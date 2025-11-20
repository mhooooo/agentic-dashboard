# Supabase Connection Diagnosis

## Summary

✅ **Connection Status**: Supabase REST API is accessible
❌ **Schema Status**: Database schema is incomplete or not applied
❌ **Test User Status**: Dev test user does not exist in auth.users

## Root Cause

The database migrations have **not been applied** to your Supabase instance. The `user_credentials` table has a foreign key constraint that references `auth.users(id)`, but the test user ID used in development mode doesn't exist in the auth.users table.

### What's Happening

1. Your dev mode code uses test user ID: `00000000-0000-0000-0000-000000000000`
2. The `user_credentials` table requires this user to exist in `auth.users`
3. When you try to save credentials, PostgreSQL rejects it with:
   ```
   insert or update on table "user_credentials" violates foreign key constraint
   "user_credentials_user_id_fkey"
   ```

## Solution: Apply Database Migrations

You need to run the SQL migrations in your Supabase dashboard. Here's how:

### Step 1: Go to Supabase SQL Editor

1. Open your Supabase dashboard: https://app.supabase.com
2. Select your project: `lhcumnvqhulxagvzeffw`
3. Click "SQL Editor" in the left sidebar
4. Click "New query"

### Step 2: Run Migrations in Order

Run each migration file in order. Copy and paste the contents of each file and click "Run".

#### Migration 1: Initial Schema
```bash
# File: supabase/migrations/001_initial_schema.sql
```
This creates:
- `widget_templates` table
- `widget_instances` table
- `widget_secrets` table
- `conversation_history` table
- `dashboard_checkpoints` table
- Row Level Security policies

#### Migration 2: Backend Proxy Tables
```bash
# File: supabase/migrations/002_backend_proxy.sql
```
This creates:
- `user_credentials` table (for GitHub/Jira tokens)
- `webhook_events` table
- RLS policies for credentials

#### Migration 3: Dev Test User (NEW)
```bash
# File: supabase/migrations/003_dev_test_user.sql
```
This creates:
- Test user in `auth.users` with ID `00000000-0000-0000-0000-000000000000`
- Allows dev mode to work without real authentication

### Step 3: Verify Migrations Applied

After running all three migrations, run this verification query in the SQL Editor:

```sql
-- Check if all tables exist
SELECT
  'user_credentials' as table_name,
  COUNT(*) as row_count
FROM user_credentials
UNION ALL
SELECT
  'auth.users',
  COUNT(*)
FROM auth.users
WHERE id = '00000000-0000-0000-0000-000000000000';
```

You should see:
- `user_credentials`: 0 rows (table exists but empty)
- `auth.users`: 1 row (test user exists)

### Step 4: Test the Connection

Run the test script again:

```bash
node test-credentials-flow.js
```

You should now see:
```
✅ ALL TESTS PASSED!
```

## Alternative: Apply Migrations via CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref lhcumnvqhulxagvzeffw

# Apply all migrations
supabase db push
```

## What If Migrations Were Already Applied?

If you think you already ran some migrations but they're not showing up:

1. **Check in SQL Editor**: Run `\dt` to list all tables
2. **Check migration history**: Look for a `schema_migrations` table
3. **Re-run safely**: All our migrations use `IF NOT EXISTS` checks, so they're safe to re-run

## After Migrations Are Applied

Once migrations are applied and test user exists:

1. ✅ Credentials can be saved to database
2. ✅ Dev mode will work without authentication
3. ✅ GitHub and Jira widgets will store credentials properly
4. ✅ The "magic moment" (Event Mesh) will work with real data

## Production Considerations

⚠️ **Important**: The test user (migration 003) should ONLY be used in development:

- For production, users authenticate via Supabase Auth (email/password, OAuth, etc.)
- Never deploy migration 003 to production
- Consider adding a check: `WHERE current_setting('server.environment', true) = 'development'`

## Next Steps

1. Apply all three migrations in your Supabase dashboard
2. Run `node test-credentials-flow.js` to verify
3. Start dev server with `./dev.sh` or `npm run dev`
4. Test credential management from the dashboard UI

## Test Scripts Reference

We created several test scripts to diagnose the issue:

- `test-supabase.js` - Basic connection test
- `test-schema.js` - Schema structure test
- `test-users-table.js` - Users table check
- `test-credentials-flow.js` - Full credentials CRUD test

You can delete these after confirming everything works.
