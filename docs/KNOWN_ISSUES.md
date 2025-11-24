# Known Issues & Troubleshooting Guide

This document catalogs known limitations, common errors, and their solutions for the Agentic Dashboard.

---

## Table of Contents

1. [OAuth Issues](#oauth-issues)
2. [Database & Supabase Issues](#database--supabase-issues)
3. [Development Environment Issues](#development-environment-issues)
4. [Performance & Scalability](#performance--scalability)
5. [Widget-Specific Issues](#widget-specific-issues)
6. [Event Mesh Issues](#event-mesh-issues)
7. [Next.js 15 Specific Issues](#nextjs-15-specific-issues)

---

## OAuth Issues

### 1. "Invalid state - CSRF protection failed"

**Symptom:** OAuth callback returns error: "Invalid state - CSRF protection failed"

**Causes:**
1. Cookie not set or expired (10-minute timeout)
2. Cookies disabled in browser
3. HTTPS/HTTP mismatch between callback and app URL
4. Browser privacy settings blocking third-party cookies

**Solutions:**

```bash
# Check 1: Verify NEXT_PUBLIC_APP_URL matches deployment
# In Vercel environment variables:
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # Must match exactly

# Check 2: Clear cookies and try again
# Browser DevTools → Application → Cookies → Clear All

# Check 3: Verify OAuth app callback URL
# Must be: {NEXT_PUBLIC_APP_URL}/api/auth/{provider}/callback
# Example: https://your-app.vercel.app/api/auth/github/callback
```

**Prevention:**
- Use HTTPS in production (Vercel provides this automatically)
- Set `NEXT_PUBLIC_APP_URL` before deploying
- Test OAuth flow immediately after deployment

---

### 2. "Redirect URI mismatch"

**Symptom:** Provider shows error: "The redirect URI provided does not match"

**Causes:**
1. Callback URL in OAuth app doesn't match actual URL
2. HTTP vs HTTPS mismatch
3. Trailing slash inconsistency
4. Subdomain mismatch

**Solution:**

**Step 1: Check actual callback URL:**
```
Open browser DevTools → Network tab → Initiate OAuth flow
Look for redirect to provider
Copy the redirect_uri parameter
```

**Step 2: Update OAuth app settings:**

| Provider | Settings URL | Callback URL Format |
|----------|-------------|---------------------|
| GitHub | https://github.com/settings/developers | `https://your-app.vercel.app/api/auth/github/callback` |
| Jira | https://developer.atlassian.com/console/myapps/ | `https://your-app.vercel.app/api/auth/jira/callback` |
| Linear | Linear workspace → Settings → API | `https://your-app.vercel.app/api/auth/linear/callback` |
| Slack | https://api.slack.com/apps | `https://your-app.vercel.app/api/auth/slack/callback` |
| Google | https://console.cloud.google.com/apis/credentials | `https://your-app.vercel.app/api/auth/calendar/callback` |

**Important rules:**
- Must use `https://` in production (HTTP only allowed in localhost)
- No trailing slashes: `callback` not `callback/`
- Exact match required - even casing matters for some providers

---

### 3. "OAuth not configured for this provider"

**Symptom:** Clicking "Connect with OAuth" shows error: "OAuth not configured for this provider"

**Cause:** Missing environment variables for OAuth client ID/secret

**Solution:**

```bash
# Verify environment variables exist
# In Vercel: Settings → Environment Variables

# Required for each provider:
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

JIRA_CLIENT_ID=xxx
JIRA_CLIENT_SECRET=xxx

LINEAR_CLIENT_ID=xxx
LINEAR_CLIENT_SECRET=xxx

SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx

GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

**After adding variables:**
1. Redeploy the application (Vercel → Deployments → Redeploy)
2. Wait for deployment to complete
3. Try OAuth connection again

---

### 4. Token Refresh Failures

**Symptom:** Widget stops working after 1-24 hours, shows "Re-auth needed" error

**Causes:**
1. Refresh token expired or revoked
2. Cron job not running
3. Missing `offline_access` scope (Jira)
4. Provider API rate limiting

**Diagnosis:**

```bash
# Check 1: Verify cron job is running
# Vercel dashboard → Settings → Cron Jobs → Check status

# Check 2: Check cron job logs
# Vercel dashboard → Logs → Filter: /api/auth/refresh-tokens

# Check 3: Manually trigger refresh
curl -X POST https://your-app.vercel.app/api/auth/refresh-tokens

# Expected response:
# {"success": true, "summary": {...}}
```

**Solutions by provider:**

**Jira (1 hour token lifespan):**
- Ensure `offline_access` scope is included in OAuth app
- Jira uses rotating refresh tokens - old token invalidated after refresh
- If refresh fails, user must re-authenticate

**Linear (24 hour token lifespan):**
- Only apps created after Oct 1, 2025 support refresh tokens
- Check app creation date in Linear settings
- Recreate OAuth app if created before Oct 1, 2025

**Google Calendar (1 hour token lifespan):**
- Ensure `access_type=offline` is set (automatic in our implementation)
- Check OAuth consent screen is configured for "offline access"

**Slack (variable lifespan):**
- Slack tokens typically don't expire unless revoked
- If refresh fails, check Slack app is still installed in workspace

---

### 5. "This app isn't verified" (Google Calendar)

**Symptom:** Google shows warning: "This app isn't verified. This app hasn't been verified by Google yet."

**Cause:** OAuth consent screen not verified for production use

**Temporary workaround (development/testing):**
1. Click "Advanced" on the warning page
2. Click "Go to [Your App] (unsafe)"
3. Complete OAuth flow

**Long-term solution (production):**
1. Go to https://console.cloud.google.com/apis/credentials
2. Configure OAuth consent screen
3. Submit for verification (Google review process takes 3-7 days)
4. Or add test users to bypass verification:
   - OAuth consent screen → Test users → Add users
   - Add email addresses that need access

**Alternative:** Use service account instead of OAuth for backend-only access

---

## Database & Supabase Issues

### 6. "Failed to connect to Supabase"

**Symptom:** API calls fail with "TypeError: fetch failed" or database operations timeout

**Causes:**
1. Incorrect Supabase URL or API key
2. Supabase project paused (Free tier auto-pauses after 1 week inactivity)
3. Network connectivity issues
4. Row Level Security blocking requests

**Diagnosis:**

```bash
# Check 1: Test Supabase connectivity
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Expected: {"message":"The server is running"}

# Check 2: Verify environment variables
# Vercel → Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Check 3: Verify project is active
# Supabase dashboard → Project should show "Active" status
# If paused, click "Restore" to resume
```

**Solutions:**

**Project paused (Free tier):**
1. Supabase dashboard → Select project
2. Click "Restore project"
3. Wait 2-3 minutes for restoration
4. Retry operation

**Incorrect credentials:**
1. Supabase dashboard → Settings → API
2. Copy fresh credentials
3. Update Vercel environment variables
4. Redeploy application

**RLS blocking requests:**
1. Supabase dashboard → Authentication → Policies
2. Verify policies allow your operations
3. Check you're using correct auth context (user ID)

---

### 7. "Database constraint violation"

**Symptom:** Error: `new row for relation "user_credentials" violates check constraint "user_credentials_provider_check"`

**Cause:** Trying to insert a provider not in the allowed list

**Current allowed providers:** `github`, `jira`, `linear`, `slack`, `calendar`

**Solution for adding new provider:**

```sql
-- Run in Supabase SQL Editor:
ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_provider_check;
ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_provider_check
  CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'calendar', 'YOUR_NEW_PROVIDER'));

-- Repeat for webhook_events table:
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_provider_check;
ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_provider_check
  CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'calendar', 'YOUR_NEW_PROVIDER'));
```

**Important:** Run migration BEFORE deploying code that uses new provider.

---

### 8. Widget positions reset after page refresh

**Symptom:** Carefully arranged widget layout resets to default after refreshing page

**Cause:** Layout changes not saving to database (bug fixed in Nov 20, 2025)

**Verify fix is deployed:**

```typescript
// Check components/Dashboard.tsx contains:
const handleLayoutChange = (newLayout: Layout[]) => {
  setLayout(newLayout);

  // Save to database with debounce
  if (layoutSaveTimeoutRef.current) {
    clearTimeout(layoutSaveTimeoutRef.current);
  }

  layoutSaveTimeoutRef.current = setTimeout(() => {
    // ... PATCH request to save layout ...
  }, 1000);
};
```

**If missing:**
1. Pull latest code from repository
2. Verify commit contains "Widget Layout Persistence" fix (Nov 20, 2025)
3. Redeploy

---

## Development Environment Issues

### 9. Environment variables not loading

**Symptom:** `.env.local` values not being used; seeing placeholder values

**Cause:** System environment variables override `.env.local` in Next.js

**Diagnosis:**

```bash
# Check for system-level env vars
printenv | grep SUPABASE
printenv | grep NEXT_PUBLIC

# If you see variables with placeholder values, they're overriding .env.local
```

**Solution:**

**Option A: Use dev.sh script (recommended):**
```bash
# Start dev server with script that unsets system vars
./dev.sh
```

**Option B: Manual unset:**
```bash
unset NEXT_PUBLIC_SUPABASE_URL
unset NEXT_PUBLIC_SUPABASE_ANON_KEY
unset SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

**Option C: Remove system variables permanently:**
```bash
# Find where they're set (usually ~/.zshrc or ~/.bashrc)
# Remove or comment out export statements
# Restart terminal
```

---

### 10. Hot reload breaks in-memory credentials

**Symptom:** Connected credentials disappear after code changes in dev mode

**Cause:** In-memory storage resets on hot reload

**Solution (already implemented):**

Global variable pattern prevents this:

```typescript
// lib/api/dev-credentials.ts
const devCredentialsStore = global.devCredentialsStore ?? new Map();
if (process.env.NODE_ENV === 'development') {
  global.devCredentialsStore = devCredentialsStore;
}
```

**Verify implementation:**
1. Check `lib/api/dev-credentials.ts` contains above pattern
2. Credentials should persist across hot reloads
3. If still resetting, full server restart required: Ctrl+C, then `npm run dev`

---

### 11. Middleware deprecation warning (Next.js 16)

**Symptom:** Warning in console: "middleware" file convention deprecated, use "proxy" instead

**Impact:** Warning only - functionality still works

**Status:** Not blocking deployment

**Future action (when Next.js 16 stabilizes):**
1. Rename `middleware.ts` to `proxy.ts`
2. Update imports if needed
3. Test auth flow still works

**Current recommendation:** Ignore warning until Next.js 16 is stable

---

## Performance & Scalability

### 12. Slow widget loading with many widgets

**Symptom:** Dashboard takes >3 seconds to load with 10+ widgets

**Causes:**
1. All widgets fetching data simultaneously on mount
2. No request deduplication
3. No caching of API responses

**Mitigation strategies:**

**Short-term (implemented):**
- Widgets auto-refresh every 60 seconds (configurable)
- Data cached in widget component state

**Long-term (future improvements):**
```typescript
// Add to API routes:
export async function GET(request: Request) {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}

// Use SWR or React Query for deduplication:
import useSWR from 'swr';
const { data } = useSWR('/api/proxy/github?endpoint=/user/repos', fetcher);
```

**Current limits:**
- Max recommended widgets: ~20 per dashboard
- Max API requests: ~100 per minute per user (backend proxy rate limit)

---

### 13. Event Mesh causing cascade failures

**Symptom:** One widget breaking causes multiple widgets to stop working

**Cause:** Event subscriptions triggering errors that propagate

**Prevention (implemented):**

**Safe Mode toggle:**
- Users can disable Event Mesh if widgets misbehave
- Click "Safe Mode" in header to disable all event subscriptions
- Widgets work independently without interconnections

**Error boundaries (future improvement):**
```typescript
// Wrap widgets in error boundaries
<ErrorBoundary fallback={<WidgetError />}>
  <Widget {...props} />
</ErrorBoundary>
```

**Current workaround:**
1. Enable Safe Mode (disables Event Mesh)
2. Remove problematic widget
3. Re-enable Mesh

---

## Widget-Specific Issues

### 14. GitHub widget showing "No repositories found"

**Causes:**
1. Token doesn't have `repo` scope
2. Account has no repositories
3. API rate limit exceeded

**Solutions:**

**Check token scopes:**
```bash
# Test token manually
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/user/repos

# If 403 error, recreate token with correct scopes
```

**Required scopes:** `repo`, `user`

**Recreate token:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` and `user` scopes
3. Update credentials in dashboard
4. Test connection

**Rate limit check:**
```bash
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# Response shows remaining requests
# Limit: 5000/hour for authenticated requests
```

---

### 15. Jira widget not filtering correctly

**Symptom:** Clicking GitHub PR doesn't filter Jira widget

**Causes:**
1. PR title doesn't contain Jira ticket ID
2. Event Mesh disabled (Safe Mode on)
3. Jira widget not subscribed to GitHub events

**Diagnosis:**

**Check 1: Open Event Debugger**
- Click "🐛 Debugger" in dashboard header
- Click GitHub PR
- Verify event published: `github.pr.selected`
- Check payload contains `jiraTicket` field

**Check 2: Verify Jira widget subscription**
- Event Debugger → Subscriptions tab
- Find Jira widget in list
- Verify subscribed to pattern: `github.pr.*`

**Check 3: Safe Mode status**
- Header should show "🔗 Mesh Enabled"
- If shows "🔒 Safe Mode", click to toggle

**Solution:**
- Ensure PR title contains ticket ID: "SCRUM-5: Feature description"
- Format: `{PROJECT-KEY}-{NUMBER}` (e.g., PROJ-123, SCRUM-5)

---

### 16. Slack widget showing "Channel not found"

**Causes:**
1. Bot not invited to channel
2. Missing channel permissions
3. Channel is private

**Solution:**

**Step 1: Invite bot to channel**
```
# In Slack channel:
/invite @Your-App-Name

# Or use @ mention:
@Your-App-Name
```

**Step 2: Verify bot scopes**
- Slack app → OAuth & Permissions → Bot Token Scopes
- Required: `channels:read`, `channels:history`, `users:read`

**Step 3: Reconnect OAuth**
1. Dashboard → Settings → Credentials
2. Disconnect Slack
3. Connect with OAuth again (bot will request new permissions)

**Private channels:**
- Bot needs explicit invite even with correct scopes
- Use `/invite @Your-App-Name` in private channel

---

## Event Mesh Issues

### 17. Events not propagating between widgets

**Symptom:** Publishing events but subscribers not receiving them

**Common causes:**

**Cause 1: Safe Mode enabled**
- **Check:** Header shows "🔒 Safe Mode"
- **Fix:** Click to toggle to "🔗 Mesh Enabled"

**Cause 2: Pattern mismatch**
- **Example:** Widget subscribes to `github.pr.selected` but publisher emits `github.pr.clicked`
- **Fix:** Use broader patterns (`github.*`) or exact match

**Cause 3: Widget not subscribed yet**
- **Issue:** Widgets subscribe in `useEffect`, which runs after first render
- **Fix:** Add slight delay before publishing initial events

**Diagnosis with Event Debugger:**

```typescript
// Open Event Debugger (🐛 button in header)
// Events tab shows:
// - All published events with timestamps
// - Which widgets received each event
// - Event payloads

// Subscriptions tab shows:
// - All active subscriptions
// - Which patterns each widget is listening to
```

**Pattern matching reference:**
- `*` - Matches all events
- `github.*` - Matches all GitHub events
- `github.pr.*` - Matches all GitHub PR events
- `github.pr.selected` - Matches only this specific event

---

## Next.js 15 Specific Issues

### 18. Dynamic route params causing runtime errors

**Symptom:** Error: `Route "/api/widgets/[widgetId]" used params.widgetId. params is a Promise`

**Cause:** Next.js 15 changed dynamic route params from synchronous to Promises

**Fix pattern:**

```typescript
// BEFORE (Next.js 14) - BREAKS IN NEXT.JS 15
export async function DELETE(
  request: Request,
  { params }: { params: { widgetId: string } }
) {
  const { widgetId } = params; // ERROR
}

// AFTER (Next.js 15) - CORRECT
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  const { widgetId } = await params; // CORRECT
}
```

**Check all dynamic routes:**
- `app/api/widgets/[widgetId]/route.ts` ✅ Fixed
- `app/api/credentials/[provider]/route.ts` ✅ Fixed
- `app/api/auth/[provider]/callback/route.ts` ✅ Fixed

**If you see this error:**
1. Find the route file in error message
2. Add `await` before destructuring params
3. Update TypeScript type to `Promise<{...}>`

---

### 19. Build errors with undefined middleware

**Symptom:** Build fails with: "Cannot find module 'middleware'"

**Cause:** Middleware imports not resolving correctly

**Solution:**

```typescript
// Ensure middleware.ts is in root directory (not in app/)
// ✅ Correct: /middleware.ts
// ❌ Wrong: /app/middleware.ts

// Check import paths
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Verify export config
export const config = {
  matcher: [...],
};
```

**Rebuild:**
```bash
npm run build
# Should show: ✓ Compiled middleware successfully
```

---

## Browser Compatibility Issues

### 20. Realtime subscriptions not working in Safari

**Symptom:** Dashboard doesn't update in real-time in Safari browser

**Cause:** Safari's privacy settings may block WebSocket connections

**Solution:**

**Option A: User action**
1. Safari → Preferences → Privacy
2. Uncheck "Prevent cross-site tracking" (temporarily)
3. Refresh dashboard

**Option B: Fallback polling (future improvement)**
```typescript
// Add polling fallback when WebSocket fails
if (!subscription) {
  setInterval(() => {
    fetchWidgets(); // Manual refresh every 5 seconds
  }, 5000);
}
```

**Current status:** Realtime works in Chrome, Firefox, Edge; Safari may require manual refresh

---

## API Rate Limiting

### 21. GitHub API rate limit exceeded

**Symptom:** GitHub widget shows "API rate limit exceeded"

**Limits:**
- **Authenticated:** 5,000 requests/hour per user
- **Unauthenticated:** 60 requests/hour per IP

**Check current limit:**
```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/rate_limit
```

**Solutions:**

**Short-term:**
- Wait for rate limit reset (shown in error response)
- Reduce widget auto-refresh frequency (change from 60s to 120s)

**Long-term:**
- Implement caching layer (Redis, Vercel KV)
- Use GitHub webhooks instead of polling
- Request higher rate limits from GitHub (for verified apps)

---

## Security Considerations

### 22. Service role key exposed in client-side code

**Impact:** CRITICAL - Bypasses all Row Level Security

**Prevention (already implemented):**
- Service role key only used in API routes (server-side)
- Never sent to client
- Never logged to console
- Environment variable protected by Vercel

**Verify:**
```bash
# Search codebase for service role key exposure
grep -r "SUPABASE_SERVICE_ROLE_KEY" --include="*.tsx" --include="*.ts" app/

# Should ONLY appear in:
# - API routes (app/api/**/route.ts)
# - Server components
# NEVER in client components ('use client')
```

**If exposed:**
1. Rotate key immediately (Supabase → Settings → API → Reset service_role key)
2. Update environment variable
3. Redeploy application
4. Audit code for other leaks

---

## Getting Help

### When reporting issues:

**Include:**
1. **Environment:** Development or Production
2. **Steps to reproduce:** Exact sequence of actions
3. **Expected behavior:** What should happen
4. **Actual behavior:** What actually happens
5. **Error messages:** Full error text and stack traces
6. **Browser console logs:** Copy relevant console output
7. **Screenshots:** If UI-related issue

**Where to report:**
- GitHub Issues: https://github.com/your-repo/issues
- Internal: Contact development team

### Debug checklist:

- [ ] Check browser console for errors
- [ ] Check Vercel deployment logs
- [ ] Check Supabase logs (Database → Logs)
- [ ] Verify environment variables are set correctly
- [ ] Test in incognito/private browser window
- [ ] Try different browser
- [ ] Check network tab for failed requests
- [ ] Enable Event Debugger to check event flow
- [ ] Verify Safe Mode is disabled (if Event Mesh issue)

---

**Last Updated:** November 24, 2025
**Document Version:** 1.0.0
**Covers:** Next.js 15, Supabase, OAuth 2.0, Vercel deployment
