# OAuth Token Refresh System

Automatic token refresh system to prevent widget breakage from expired OAuth tokens.

## Overview

The token refresh system automatically refreshes OAuth access tokens before they expire, ensuring continuous widget functionality without user intervention.

### Supported Providers

| Provider | Token Lifespan | Refresh Token Support | Notes |
|----------|----------------|----------------------|-------|
| GitHub | Never expires | ❌ No | Tokens don't expire; refresh not needed |
| Jira | 1 hour | ✅ Yes (rotating) | New refresh token issued with each refresh |
| Linear | 24 hours | ✅ Yes | Tokens issued after Oct 1, 2025 support refresh |
| Slack | Variable | ✅ Yes | Refresh tokens issued by default |
| Google Calendar | 1 hour | ✅ Yes | Standard OAuth 2.0 refresh flow |

## Architecture

### Flow

1. **OAuth Callback** (`app/api/auth/[provider]/callback/route.ts`)
   - Exchanges authorization code for access token
   - Stores `access_token`, `refresh_token`, and `expires_at` in database
   - `expires_at` = `Date.now() + expires_in * 1000` (milliseconds)

2. **Refresh Job** (`lib/oauth/refresh-job.ts`)
   - Queries for tokens expiring within 15 minutes
   - Calls provider refresh endpoint with `refresh_token`
   - Updates database with new `access_token` and `expires_at`
   - Logs successes and failures

3. **API Endpoint** (`app/api/auth/refresh-tokens/route.ts`)
   - POST endpoint to trigger refresh job
   - Protected by authorization header in production
   - Returns summary of refresh operations

### Database Schema

Tokens stored in `user_credentials` table:

```sql
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  credentials JSONB NOT NULL, -- { pat, refresh_token, expires_at, ... }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
```

**Credentials JSONB Structure:**

```json
{
  "pat": "access_token_here",
  "refresh_token": "refresh_token_here",
  "expires_at": 1700000000000,
  "email": "user@example.com"
}
```

## Setup

### 1. Environment Variables

Add to `.env.local`:

```bash
# OAuth Client Credentials (required for token exchange)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret
LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_client_secret
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Supabase (required for database operations)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Secret (optional, for securing refresh endpoint)
CRON_SECRET=random_secret_string_here
# OR
OAUTH_REFRESH_SECRET=random_secret_string_here
```

### 2. Cron Job Configuration

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/auth/refresh-tokens",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Note:** Vercel Cron automatically includes authorization header with secret.

#### Option B: GitHub Actions (For any deployment)

Create `.github/workflows/oauth-refresh.yml`:

```yaml
name: OAuth Token Refresh
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Token Refresh
        run: |
          curl -X POST https://your-app.vercel.app/api/auth/refresh-tokens \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub repository secrets.

#### Option C: Manual Trigger (For testing)

```bash
# Development (no auth required)
curl -X POST http://localhost:3000/api/auth/refresh-tokens

# Production (requires auth)
curl -X POST https://your-app.vercel.app/api/auth/refresh-tokens \
  -H "Authorization: Bearer your_cron_secret"
```

## Usage

### Testing the Refresh System

1. **Check endpoint health:**

```bash
curl http://localhost:3000/api/auth/refresh-tokens
```

Returns:
```json
{
  "endpoint": "/api/auth/refresh-tokens",
  "method": "POST",
  "description": "Triggers OAuth token refresh job for expiring tokens",
  "authentication": "optional (dev mode)",
  "schedule": "Run every 5 minutes via cron or on-demand"
}
```

2. **Trigger refresh job:**

```bash
curl -X POST http://localhost:3000/api/auth/refresh-tokens
```

Returns:
```json
{
  "success": true,
  "summary": {
    "totalChecked": 3,
    "successfulRefreshes": 2,
    "failedRefreshes": 1,
    "executedAt": "2025-11-20T10:30:00.000Z",
    "results": [
      {
        "provider": "jira",
        "userId": "12345678...",
        "success": true
      },
      {
        "provider": "linear",
        "userId": "87654321...",
        "success": true
      },
      {
        "provider": "slack",
        "userId": "11111111...",
        "success": false,
        "error": "Token refresh failed: invalid_grant"
      }
    ]
  }
}
```

### Monitoring

**Server Logs:**

```
[RefreshJob] Starting token refresh job...
[RefreshJob] Found 2 tokens expiring within 15 minutes
[RefreshJob] Refreshing token for jira (user: 12345678-1234-1234-1234-123456789012)
[RefreshJob] ✓ Successfully refreshed jira token for user 12345678-1234-1234-1234-123456789012
[RefreshJob] Refreshing token for linear (user: 87654321-4321-4321-4321-210987654321)
[RefreshJob] ✓ Successfully refreshed linear token for user 87654321-4321-4321-4321-210987654321
[RefreshJob] Completed in 1245ms
[RefreshJob] Summary: 2 succeeded, 0 failed
```

## Error Handling

### Common Errors

1. **"No refresh token available"**
   - Cause: User connected with manual PAT instead of OAuth
   - Solution: Re-connect using OAuth flow

2. **"Token refresh failed: invalid_grant"**
   - Cause: Refresh token expired or revoked
   - Solution: User must re-authenticate

3. **"Missing OAuth credentials for provider"**
   - Cause: `CLIENT_ID` or `CLIENT_SECRET` not configured
   - Solution: Add environment variables

4. **"Failed to query expiring tokens"**
   - Cause: Supabase connection issue
   - Solution: Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Error Recovery

When a token refresh fails:
1. Error logged to console with details
2. Database not updated (keeps old token)
3. Widget will retry with old token (may fail if expired)
4. User sees "Re-auth needed" UI warning

**User Action Required:**
- Go to Settings → Credentials
- Re-connect the failing provider
- New OAuth flow issues fresh tokens

## Testing Checklist

- [ ] OAuth callback stores `expires_at` correctly
- [ ] Refresh job queries expiring tokens (SQL query works)
- [ ] Refresh job successfully refreshes Jira token (1 hour lifespan)
- [ ] Refresh job successfully refreshes Linear token (24 hour lifespan)
- [ ] Refresh job successfully refreshes Google Calendar token (1 hour lifespan)
- [ ] Refresh job successfully refreshes Slack token
- [ ] Refresh job skips GitHub (no refresh needed)
- [ ] Failed refresh logs error but doesn't crash system
- [ ] API endpoint returns correct summary
- [ ] API endpoint requires auth in production
- [ ] Cron job triggers every 5 minutes

## Future Enhancements

1. **Token Expiry UI Warnings** (Next Priority)
   - Show "Token expires in 5m" badge on widgets
   - Show "Re-auth needed" for expired tokens
   - Add "Refresh now" button for manual refresh

2. **Proactive Refresh Strategy**
   - Refresh tokens at 50% lifespan (not just 15 min before expiry)
   - Reduces risk of widgets breaking mid-use

3. **Retry Logic**
   - Exponential backoff for failed refreshes
   - Automatic retry 3 times before giving up

4. **User Notifications**
   - Email when token refresh fails
   - Dashboard notification: "Action required: Re-connect Jira"

5. **Analytics**
   - Track refresh success rate per provider
   - Identify providers with frequent refresh failures

## References

- OAuth 2.0 Refresh Token Flow: https://oauth.net/2/grant-types/refresh-token/
- Supabase REST API: https://postgrest.org/en/stable/api.html
- Vercel Cron Jobs: https://vercel.com/docs/cron-jobs
- Next.js 15 App Router: https://nextjs.org/docs/app

---

**Last Updated:** November 20, 2025
**Author:** AI Agent (Claude Code)
