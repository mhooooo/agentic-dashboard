# OAuth 2.0 Troubleshooting Guide

Quick reference guide for diagnosing and fixing OAuth authentication issues.

---

## Table of Contents

1. [OAuth Flow Errors](#oauth-flow-errors)
2. [Token Refresh Issues](#token-refresh-issues)
3. [Callback URL Problems](#callback-url-problems)
4. [CORS & Network Issues](#cors--network-issues)
5. [Provider-Specific Issues](#provider-specific-issues)
6. [Rate Limiting](#rate-limiting)
7. [Debugging Tools](#debugging-tools)

---

## OAuth Flow Errors

### Error: "Invalid state - CSRF protection failed"

**When it happens:** After provider redirects back to your app

**Root causes:**
1. ✅ **State cookie expired** - OAuth flow takes >10 minutes
2. ✅ **Cookies blocked** - Browser privacy settings preventing cookie storage
3. ✅ **HTTP/HTTPS mismatch** - App URL protocol doesn't match callback
4. ✅ **Cross-origin cookies blocked** - Third-party cookie restrictions

**Diagnostic steps:**

```bash
# Step 1: Check browser console
# Look for: "Failed to set cookie" or cookie warnings

# Step 2: Inspect cookies
# Browser DevTools → Application → Cookies → your-app-url
# Should see: oauth_state_github (or other provider)

# Step 3: Verify app URL
echo $NEXT_PUBLIC_APP_URL
# Must match: https://your-actual-url.com (no trailing slash)

# Step 4: Check cookie attributes
# In browser DevTools → Application → Cookies
# Verify: HttpOnly=true, Secure=true (in production), SameSite=Lax
```

**Solutions:**

**Solution A: Clear cookies and retry**
```javascript
// In browser console:
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
// Then retry OAuth flow
```

**Solution B: Fix NEXT_PUBLIC_APP_URL**
```bash
# Vercel dashboard → Settings → Environment Variables
# Change:
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Wrong for production
# To:
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # Correct

# Then redeploy
```

**Solution C: Temporarily disable privacy features**
```
Chrome: Settings → Privacy → Third-party cookies → Allow
Firefox: Settings → Privacy → Enhanced Tracking Protection → Standard
Safari: Preferences → Privacy → Uncheck "Prevent cross-site tracking"
```

**Prevention:**
- Complete OAuth flow within 10 minutes
- Use HTTPS in production (Vercel provides this automatically)
- Set correct `NEXT_PUBLIC_APP_URL` before first deployment

---

### Error: "Missing OAuth configuration"

**When it happens:** Clicking "Connect with OAuth" button

**Message:** "OAuth not configured for this provider"

**Root cause:** Environment variables missing or incorrect

**Fix:**

```bash
# Step 1: Verify environment variables exist
# Vercel: Settings → Environment Variables
# Local: Check .env.local

# Required variables for each provider:
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=7f8a9b...

JIRA_CLIENT_ID=abc123...
JIRA_CLIENT_SECRET=xyz789...

LINEAR_CLIENT_ID=lin_oauth_...
LINEAR_CLIENT_SECRET=...

SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=...

GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Step 2: Check for typos
# Common mistakes:
# - Extra spaces: "abc123 " (trailing space)
# - Wrong variable name: GITHUB_CLIENT vs GITHUB_CLIENT_ID
# - Quotes included: "abc123" instead of abc123

# Step 3: Redeploy after adding variables
# Vercel → Deployments → Redeploy (or push new commit)
```

**Verification test:**

```bash
# Local development:
node -e "console.log(process.env.GITHUB_CLIENT_ID)"
# Should print: Your client ID (not undefined)

# Production (via API route):
# Create test endpoint: app/api/debug/env/route.ts
export async function GET() {
  return Response.json({
    github: !!process.env.GITHUB_CLIENT_ID,
    jira: !!process.env.JIRA_CLIENT_ID,
    // etc... (returns true/false for each)
  });
}
# Visit: https://your-app.vercel.app/api/debug/env
# Should show: {"github": true, "jira": true, ...}
```

---

## Token Refresh Issues

### Error: "Token refresh failed: invalid_grant"

**When it happens:** Automatic token refresh cron job (visible in logs)

**Root causes:**
1. ✅ **Refresh token expired** - User hasn't logged in for 60+ days
2. ✅ **Refresh token revoked** - User disconnected app in provider settings
3. ✅ **Missing offline_access scope** - Jira requires this for refresh tokens
4. ✅ **Rotating refresh tokens** - Old refresh token used after new one issued (Jira)

**Diagnostic:**

```bash
# Check Vercel logs
# Vercel → Logs → Filter: "RefreshJob"

# Look for patterns:
[RefreshJob] Failed to refresh jira token: invalid_grant
# Means: Refresh token is invalid/expired

[RefreshJob] No refresh token available for user
# Means: User connected with manual PAT, not OAuth

[RefreshJob] Missing OAuth credentials for provider
# Means: CLIENT_ID/SECRET not set
```

**Solutions by provider:**

**Jira (rotating refresh tokens):**
```typescript
// Issue: Jira invalidates old refresh token when issuing new one
// Our system handles this automatically

// If seeing errors:
// 1. Check offline_access scope is included
// 2. User must reconnect via OAuth
// 3. Verify JIRA_CLIENT_ID/SECRET are correct
```

**Linear (24-hour tokens):**
```typescript
// Issue: Only apps created after Oct 1, 2025 support refresh

// Check app creation date:
// Linear → Settings → API → Your OAuth app
// If created before Oct 1, 2025: Recreate the app

// Verify refresh token in credentials:
// Check database: user_credentials table
// credentials->>'refresh_token' should NOT be null
```

**Google Calendar (1-hour tokens):**
```typescript
// Issue: access_type=offline not set

// Verify OAuth initiation URL includes:
// access_type=offline&prompt=consent

// Check: lib/oauth/config.ts
export const oauthConfigs = {
  calendar: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    extraAuthParams: {
      access_type: 'offline',  // ← Must be present
      prompt: 'consent',       // ← Forces refresh token
    },
  },
};
```

**Force user to reconnect:**

```typescript
// Option 1: Show UI banner
// "Your [Provider] token expired. Please reconnect."

// Option 2: Auto-redirect to OAuth flow
// Detect expired token in API response:
if (response.status === 401) {
  // Redirect to: /api/auth/[provider]?reconnect=true
}

// Option 3: Email notification
// Send email when refresh fails:
// "Action required: Reconnect your [Provider] account"
```

---

### Error: "Refresh token not found"

**When it happens:** Cron job runs but finds no tokens to refresh

**Log message:** `[RefreshJob] Found 0 tokens expiring within 15 minutes`

**Root causes:**
1. ✅ **All tokens fresh** - No tokens expiring soon (this is normal!)
2. ✅ **Users connected with manual PATs** - Manual tokens don't expire
3. ✅ **Refresh tokens not stored** - OAuth callback not saving refresh_token

**Verification:**

```sql
-- Run in Supabase SQL Editor:
SELECT
  provider,
  credentials->>'expires_at' as expires_at,
  credentials->>'refresh_token' as has_refresh_token,
  (credentials->>'expires_at')::bigint < (extract(epoch from now()) * 1000 + 900000) as expiring_soon
FROM user_credentials
WHERE credentials->>'refresh_token' IS NOT NULL;

-- Expected result:
-- Shows all tokens with refresh tokens and their expiry status
```

**Normal vs. problematic:**

```typescript
// ✅ NORMAL: No tokens expiring soon
{
  "totalChecked": 0,
  "successfulRefreshes": 0,
  "failedRefreshes": 0
}

// ✅ NORMAL: All refreshes succeeded
{
  "totalChecked": 3,
  "successfulRefreshes": 3,
  "failedRefreshes": 0
}

// ❌ PROBLEM: Refreshes failing
{
  "totalChecked": 3,
  "successfulRefreshes": 1,
  "failedRefreshes": 2,  // ← Investigate these
  "results": [...]
}
```

---

## Callback URL Problems

### Error: "Redirect URI mismatch"

**When it happens:** After approving permissions on provider's page

**Provider error messages:**

| Provider | Error Message |
|----------|---------------|
| GitHub | "The redirect_uri MUST match the registered callback URL for this application" |
| Jira | "invalid_request: redirect_uri does not match" |
| Linear | "Invalid redirect_uri parameter" |
| Slack | "invalid_redirect_uri" |
| Google | "Error 400: redirect_uri_mismatch" |

**Diagnosis steps:**

```bash
# Step 1: Capture actual callback URL being used
# Browser DevTools → Network tab → Initiate OAuth
# Find request to provider's /authorize endpoint
# Look for query parameter: redirect_uri=...

# Step 2: Compare with configured callback URL
# GitHub: https://github.com/settings/developers → Your app → Authorization callback URL
# Jira: https://developer.atlassian.com/console/myapps/ → Your app → Authorization → Callback URL
# Linear: Linear → Settings → API → Your app → Callback URLs
# Slack: https://api.slack.com/apps → Your app → OAuth & Permissions → Redirect URLs
# Google: https://console.cloud.google.com/apis/credentials → Your OAuth 2.0 Client → Authorized redirect URIs

# Step 3: Check for differences
# Common mismatches:
# - http vs https
# - Trailing slash: /callback vs /callback/
# - Port number: localhost:3000 vs localhost:3001
# - Subdomain: app.example.com vs example.com
```

**Fix pattern:**

```bash
# Development callback URLs (localhost):
http://localhost:3000/api/auth/github/callback
http://localhost:3000/api/auth/jira/callback
http://localhost:3000/api/auth/linear/callback
http://localhost:3000/api/auth/slack/callback
http://localhost:3000/api/auth/calendar/callback

# Production callback URLs (Vercel):
https://your-app.vercel.app/api/auth/github/callback
https://your-app.vercel.app/api/auth/jira/callback
https://your-app.vercel.app/api/auth/linear/callback
https://your-app.vercel.app/api/auth/slack/callback
https://your-app.vercel.app/api/auth/calendar/callback

# Custom domain:
https://dashboard.yourdomain.com/api/auth/github/callback
# (etc...)
```

**Multiple callback URLs:**

Most providers allow multiple URLs (for dev + prod):

```bash
# GitHub OAuth App: Can have ONE callback URL
# Workaround: Create separate OAuth apps for dev and prod

# Jira: Supports multiple callback URLs (comma-separated)
http://localhost:3000/api/auth/jira/callback,https://your-app.vercel.app/api/auth/jira/callback

# Linear: Supports multiple callback URLs (add multiple entries)
# Slack: Supports multiple redirect URLs (add multiple entries)
# Google: Supports multiple authorized redirect URIs (add multiple entries)
```

---

## CORS & Network Issues

### Error: "CORS policy blocked the request"

**When it happens:** Making API requests from frontend to provider APIs

**Console error:**
```
Access to fetch at 'https://api.github.com/user/repos' from origin 'https://your-app.vercel.app'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root cause:** Attempting to call provider APIs directly from client-side code

**THIS IS A DESIGN ERROR - We use backend proxy to avoid CORS:**

```typescript
// ❌ WRONG: Direct API call from frontend
// components/GitHubWidget.tsx
const response = await fetch('https://api.github.com/user/repos', {
  headers: {
    Authorization: `token ${githubToken}`,  // Token exposed!
  },
});

// ✅ CORRECT: Use backend proxy
// components/GitHubWidget.tsx
const response = await fetch('/api/proxy/github?endpoint=/user/repos', {
  method: 'GET',
  // No auth header - backend handles it
});
```

**Backend proxy handles:**
1. Adding authentication headers server-side
2. Hiding API tokens from client
3. No CORS issues (same-origin request)
4. Request logging and rate limiting

**If you see CORS errors, audit your code:**

```bash
# Search for direct provider API calls:
grep -r "api.github.com" components/ app/
grep -r "atlassian.net" components/ app/
grep -r "api.linear.app" components/ app/

# These should ONLY appear in:
# - lib/providers/*.ts (backend adapters)
# - app/api/proxy/[provider]/route.ts (backend proxy)

# NEVER in:
# - components/*.tsx (frontend widgets)
# - app/(pages)/*.tsx (client-side pages)
```

---

### Error: "Network request failed" / "fetch failed"

**When it happens:** API calls timing out or failing

**Common causes:**

**Cause 1: Supabase project paused**
```bash
# Check project status:
# Supabase Dashboard → Your project → Should show "Active"

# If "Paused" (Free tier auto-pauses after 1 week inactivity):
# Click "Restore project" button
# Wait 2-3 minutes for project to resume
```

**Cause 2: Invalid Supabase URL/keys**
```bash
# Verify environment variables:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connectivity:
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Expected: {"message":"The server is running"}
# If error: URL or key is wrong
```

**Cause 3: Rate limiting (see next section)**

---

## Provider-Specific Issues

### GitHub

**Issue: "Resource not accessible by integration"**

**Cause:** Token missing required scopes

**Required scopes:** `repo`, `user`

**Fix:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Regenerate token with correct scopes
3. Update credentials in dashboard

---

**Issue: "Bad credentials"**

**Token format validation:**
```typescript
// Personal Access Token (PAT):
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  // Starts with ghp_

// OAuth token:
gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  // Starts with gho_

// Classic PAT (deprecated):
1234567890abcdef1234567890abcdef12345678  // 40-char hex

// Our validation accepts all formats:
if (!token.startsWith('ghp_') && !token.startsWith('gho_') && token.length < 32) {
  return { error: 'Invalid GitHub token format' };
}
```

---

### Jira

**Issue: "unauthorized_client" during OAuth**

**Cause:** OAuth 2.0 (3LO) not properly configured

**Fix:**
1. Atlassian Developer Console → Your app
2. Go to **Authorization** tab
3. Click **Configure** under OAuth 2.0 (3LO)
4. Add callback URL
5. Add required scopes: `read:jira-work`, `read:jira-user`, `offline_access`
6. Save configuration

---

**Issue: "Client must be authorized to access resources"**

**Cause:** App not authorized for Jira site

**Fix:**
1. Complete OAuth flow at least once
2. Go to Jira site → Apps → Manage apps
3. Find your app in list
4. Ensure it shows "Authorized"

---

### Linear

**Issue: "Invalid API key"**

**Token format validation:**
```typescript
// Linear API key:
lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  // Starts with lin_api_

// Linear OAuth token:
lin_oauth_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  // Starts with lin_oauth_

// Our validation:
if (!token.startsWith('lin_api_') && !token.startsWith('lin_oauth_') && token.length < 32) {
  return { error: 'Invalid Linear token format' };
}
```

---

**Issue: "Refresh tokens not working"**

**Cause:** App created before Oct 1, 2025

**Fix:** Recreate OAuth application in Linear settings

---

### Slack

**Issue: "token_revoked" or "account_inactive"**

**Cause:** App uninstalled from workspace or user deactivated

**Fix:**
1. Reinstall app to workspace
2. Reconnect via OAuth in dashboard

---

**Issue: "channel_not_found"**

**Cause:** Bot not invited to channel

**Fix:**
```
# In Slack channel:
/invite @Your-App-Name

# Or mention the bot:
@Your-App-Name
```

---

### Google Calendar

**Issue: "Access blocked: This app isn't verified"**

**Temporary workaround (development):**
1. Click "Advanced" on warning screen
2. Click "Go to [Your App] (unsafe)"
3. Complete authorization

**Long-term fix (production):**
1. Google Cloud Console → OAuth consent screen
2. Submit app for verification
3. Wait 3-7 days for Google review

---

**Issue: "Refresh token not returned"**

**Cause:** Missing `access_type=offline` or user already authorized before

**Fix:**
```typescript
// Ensure OAuth URL includes:
const authUrl = new URL(config.authUrl);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');  // Force refresh token

// Force user to re-authorize:
// Prompt=consent ensures refresh token even if user authorized before
```

---

## Rate Limiting

### GitHub API Rate Limits

**Limits:**
- Authenticated: 5,000 requests/hour per user
- Unauthenticated: 60 requests/hour per IP

**Check current limit:**
```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/rate_limit

# Response shows:
{
  "rate": {
    "limit": 5000,
    "remaining": 4999,
    "reset": 1700000000  # Unix timestamp
  }
}
```

**Handling rate limit errors:**

```typescript
// GitHub API returns 403 with specific headers:
if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
  const resetTime = response.headers.get('X-RateLimit-Reset');
  const resetDate = new Date(parseInt(resetTime) * 1000);

  throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}`);
}
```

**Mitigation:**
- Implement caching (store responses for 60 seconds)
- Reduce widget auto-refresh frequency
- Use conditional requests (If-Modified-Since headers)

---

### Jira API Rate Limits

**Limits:** Variable by Atlassian plan (typically 10 requests/second)

**Error response:**
```json
{
  "errorMessages": ["Rate limit exceeded"],
  "statusCode": 429
}
```

**Mitigation:**
- Jira widgets auto-refresh every 60 seconds (not 10 seconds)
- Backend proxy can implement queuing

---

## Debugging Tools

### Browser DevTools Checklist

**Console tab:**
```javascript
// Check for errors:
// Filter by: "OAuth" or "auth" or provider name

// Look for:
// - CORS errors
// - Network failures
// - Cookie warnings
// - State validation failures
```

**Network tab:**
```
// Filter: /api/auth/

// Expected flow:
// 1. GET /api/auth/github → 302 redirect to GitHub
// 2. User approves on GitHub
// 3. GET /api/auth/github/callback?code=... → 302 redirect to success
// 4. GET /settings/credentials?success=github → 200

// Check each request:
// - Status codes (should be 302 or 200)
// - Response headers (Set-Cookie for state)
// - Query parameters (code, state)
```

**Application tab:**
```
// Cookies:
// - Look for: oauth_state_[provider]
// - Verify: HttpOnly, Secure (in prod), SameSite=Lax

// Local Storage:
// - Should NOT contain: tokens, secrets, API keys
// - Only UI state allowed

// Session Storage:
// - Check Supabase auth session
```

---

### Server-Side Debugging

**Vercel Logs:**
```bash
# View logs:
# Vercel Dashboard → Your project → Logs

# Filter by:
# - Function: /api/auth/[provider]/callback
# - Status: 500 (errors only)
# - Search: "OAuth" or "refresh"

# Common error patterns:
# "Failed to exchange code for token" → OAuth credentials wrong
# "Invalid state" → Cookie not set or expired
# "Missing refresh token" → User connected with manual PAT
```

**Supabase Logs:**
```bash
# View logs:
# Supabase Dashboard → Logs → Postgres Logs

# Look for:
# - Constraint violations (invalid provider)
# - RLS policy blocks (user_id mismatch)
# - Connection errors (pool exhausted)
```

---

### Testing OAuth Locally

**Manual test flow:**

```bash
# Step 1: Start dev server
npm run dev

# Step 2: Initiate OAuth
# Visit: http://localhost:3000/api/auth/github
# Should redirect to GitHub

# Step 3: Check state cookie
# Browser DevTools → Application → Cookies
# Should see: oauth_state_github

# Step 4: Approve on GitHub
# Click "Authorize" on GitHub page

# Step 5: Verify callback
# Should redirect to: http://localhost:3000/api/auth/github/callback?code=...&state=...
# Then redirect to: http://localhost:3000/settings/credentials?success=github

# Step 6: Check database
# Supabase → Table Editor → user_credentials
# Should see new row with provider='github'
```

---

### Debug Endpoint (Development Only)

Create temporary debug endpoint to test OAuth config:

```typescript
// app/api/debug/oauth/route.ts
export async function GET() {
  return Response.json({
    github: {
      configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      clientId: process.env.GITHUB_CLIENT_ID?.substring(0, 10) + '...',
    },
    jira: {
      configured: !!(process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET),
      clientId: process.env.JIRA_CLIENT_ID?.substring(0, 10) + '...',
    },
    // ... other providers
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}

// Visit: http://localhost:3000/api/debug/oauth
// Verify all providers show "configured": true
```

**IMPORTANT:** Delete this endpoint before production deployment!

---

## Quick Reference: OAuth Error Codes

| Error Code | Meaning | Common Fix |
|------------|---------|------------|
| `invalid_request` | Malformed request | Check callback URL format |
| `invalid_client` | Client ID/secret wrong | Verify environment variables |
| `invalid_grant` | Auth code/refresh token invalid | User must re-authenticate |
| `unauthorized_client` | App not authorized | Complete OAuth setup in provider console |
| `unsupported_grant_type` | Wrong grant type | Check token exchange request |
| `invalid_scope` | Scope not allowed | Update scopes in OAuth app settings |
| `access_denied` | User declined | User clicked "Cancel" - retry |
| `server_error` | Provider's server error | Temporary - retry in a few minutes |

---

## Escalation Path

If issues persist after trying these solutions:

1. **Check Known Issues:** [docs/KNOWN_ISSUES.md](KNOWN_ISSUES.md)
2. **Review Provider Documentation:**
   - GitHub: https://docs.github.com/en/apps/oauth-apps
   - Jira: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
   - Linear: https://developers.linear.app/docs/oauth
   - Slack: https://api.slack.com/authentication/oauth-v2
   - Google: https://developers.google.com/identity/protocols/oauth2
3. **File Issue:** Include full error message, steps to reproduce, and debug output
4. **Contact Support:** For Vercel/Supabase issues, use their support channels

---

**Last Updated:** November 24, 2025
**Document Version:** 1.0.0
**Tested With:** OAuth 2.0 for GitHub, Jira, Linear, Slack, Google Calendar
