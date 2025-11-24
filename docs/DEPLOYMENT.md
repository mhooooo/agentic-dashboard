# Production Deployment Guide

Complete step-by-step guide for deploying the Agentic Dashboard to production on Vercel with Supabase backend.

---

## Prerequisites

Before starting deployment, ensure you have:

- [x] **Vercel account** - Sign up at https://vercel.com
- [x] **Supabase account** - Sign up at https://supabase.com
- [x] **GitHub repository** - Code pushed to GitHub/GitLab/Bitbucket
- [x] **Domain name** (optional) - For custom domain setup
- [x] **OAuth apps configured** - For all 5 providers (see [OAuth Setup Guide](OAUTH_SETUP.md))

**Estimated deployment time:** 45-60 minutes (first time)

---

## Part 1: Supabase Project Setup

### 1.1 Create Supabase Project

1. Visit https://supabase.com/dashboard
2. Click **"New project"**
3. Fill in project details:
   - **Name:** `agentic-dashboard-prod` (or your preferred name)
   - **Database Password:** Generate a strong password (save this securely!)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan:** Free tier is sufficient for testing; Pro for production
4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

### 1.2 Configure Database

**Run Database Migrations:**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Find YOUR_PROJECT_REF in your project URL:
# https://supabase.com/dashboard/project/YOUR_PROJECT_REF

# Run all migrations
supabase db push
```

**Migrations applied:**
- `001_initial_schema.sql` - Core tables (widget_templates, widget_instances, etc.)
- `002_backend_proxy.sql` - User credentials and webhook events tables
- `003_dev_test_user.sql` - Development test user (optional)
- `004_add_oauth_providers.sql` - OAuth provider constraints

**Verify migrations:**

```bash
# Check tables were created
supabase db list
```

You should see: `widget_templates`, `widget_instances`, `user_credentials`, `webhook_events`, `conversation_history`, `dashboard_checkpoints`

### 1.3 Enable Realtime Replication

Realtime enables live dashboard updates across browser tabs/sessions.

1. Go to **Database** → **Replication** in Supabase dashboard
2. Find the `widget_instances` table
3. Click the toggle to **enable replication**
4. Verify status shows "Enabled"

**Why:** Enables `useRealtimeSubscription` hook to receive INSERT/UPDATE/DELETE events in real-time.

### 1.4 Get API Credentials

1. Go to **Settings** → **API** in Supabase dashboard
2. Copy the following values (you'll need these for Vercel environment variables):
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
   - **service_role** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string, keep secret!)

**Security note:** The `service_role` key bypasses Row Level Security. NEVER expose it in client-side code or public repositories.

### 1.5 Configure Row Level Security (RLS)

RLS is automatically enabled by the migrations. Verify policies exist:

1. Go to **Authentication** → **Policies**
2. Confirm policies exist for:
   - `widget_instances` - Users can CRUD their own widgets
   - `user_credentials` - Users can CRUD their own credentials
   - `conversation_history` - Users can view/insert their own messages
   - `dashboard_checkpoints` - Users can manage their own checkpoints

### 1.6 Enable Email Authentication

1. Go to **Authentication** → **Providers** → **Email**
2. Ensure "Email" is **enabled**
3. Configure email templates (optional):
   - Confirmation email
   - Reset password email
   - Magic link email (if using)

**For production:** Configure custom SMTP server for branded emails (Settings → Auth → SMTP Settings)

---

## Part 2: Vercel Deployment

### 2.1 Import Project to Vercel

1. Visit https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your `agentic-dashboard` repository
4. Click **"Import"**

**Framework Preset:** Next.js (auto-detected)
**Root Directory:** `./` (default)

### 2.2 Configure Environment Variables

In the Vercel import screen, click **"Environment Variables"** and add the following:

#### Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Application URL

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Important:** After first deployment, update this with your actual Vercel URL (or custom domain).

#### OAuth Provider Credentials

Add credentials for each provider you want to support:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=Ov23liXXXXXXXXXXXXXX
GITHUB_CLIENT_SECRET=your-github-client-secret

# Jira OAuth (Atlassian)
JIRA_CLIENT_ID=your-jira-client-id
JIRA_CLIENT_SECRET=your-jira-client-secret

# Linear OAuth
LINEAR_CLIENT_ID=your-linear-client-id
LINEAR_CLIENT_SECRET=your-linear-client-secret

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret

# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Note:** If you haven't created OAuth apps yet, see [OAuth Setup Guide](OAUTH_SETUP.md).

#### Cron Secret (for Token Refresh)

Generate a random secret for protecting the token refresh endpoint:

```bash
# Generate secret (run in terminal)
openssl rand -base64 32

# Add to Vercel
CRON_SECRET=your-generated-random-secret-here
```

#### Optional: Claude API Key

Only needed if implementing AI agent features:

```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 2.3 Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for build and deployment
3. Vercel will show deployment URL: `https://your-app.vercel.app`

**Build commands (automatic):**
```bash
npm install
npm run build
```

**Deployment verification:**
- Visit `https://your-app.vercel.app` - Should see login page
- Check build logs - Should show 0 TypeScript errors

### 2.4 Update OAuth Callback URLs

Now that you have a production URL, update ALL OAuth apps with production callback URLs:

**GitHub:**
- Go to https://github.com/settings/developers
- Edit your OAuth App
- Add callback URL: `https://your-app.vercel.app/api/auth/github/callback`

**Jira:**
- Go to https://developer.atlassian.com/console/myapps/
- Edit your OAuth 2.0 integration
- Add callback URL: `https://your-app.vercel.app/api/auth/jira/callback`

**Linear:**
- Go to Linear workspace → Settings → API → OAuth applications
- Edit your app
- Add callback URL: `https://your-app.vercel.app/api/auth/linear/callback`

**Slack:**
- Go to https://api.slack.com/apps
- Edit your app → OAuth & Permissions
- Add redirect URL: `https://your-app.vercel.app/api/auth/slack/callback`

**Google Calendar:**
- Go to https://console.cloud.google.com/apis/credentials
- Edit your OAuth 2.0 Client ID
- Add authorized redirect URI: `https://your-app.vercel.app/api/auth/calendar/callback`

**Important:** Most providers allow multiple callback URLs, so keep both development (`http://localhost:3000/...`) and production URLs.

### 2.5 Update Environment Variable

After adding callback URLs, update the app URL in Vercel:

1. Go to Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_APP_URL`
3. Change value to `https://your-app.vercel.app` (or your custom domain)
4. Click **"Save"**
5. Trigger a redeploy: **Deployments** → **...** (three dots) → **Redeploy**

---

## Part 3: Vercel Cron Job Setup

The cron job automatically refreshes OAuth tokens before they expire.

### 3.1 Configure Cron Job

The `vercel.json` file in your repository already configures the cron job:

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

**Schedule:** Runs every 5 minutes
**Endpoint:** `/api/auth/refresh-tokens`

### 3.2 Verify Cron Job

1. Go to Vercel dashboard → Your project → **Settings** → **Cron Jobs**
2. Confirm the job is listed:
   - **Path:** `/api/auth/refresh-tokens`
   - **Schedule:** `*/5 * * * *` (every 5 minutes)
   - **Status:** Active

### 3.3 Test Cron Job Manually

**Option A: Via Vercel Dashboard**
1. Go to **Settings** → **Cron Jobs**
2. Click **"Trigger"** next to the refresh job
3. Check **Logs** tab to verify execution

**Option B: Via API**
```bash
# The cron job automatically includes authorization header
curl -X POST https://your-app.vercel.app/api/auth/refresh-tokens
```

**Expected response:**
```json
{
  "success": true,
  "summary": {
    "totalChecked": 0,
    "successfulRefreshes": 0,
    "failedRefreshes": 0,
    "executedAt": "2025-11-20T10:30:00.000Z",
    "results": []
  }
}
```

**Notes:**
- `totalChecked: 0` is normal if no tokens are expiring within 15 minutes
- Vercel Cron automatically authenticates using the `CRON_SECRET` environment variable
- See [OAuth Token Refresh Guide](OAUTH_TOKEN_REFRESH.md) for detailed monitoring

---

## Part 4: Post-Deployment Verification

### 4.1 Test User Registration

1. Visit `https://your-app.vercel.app/signup`
2. Create a test account with your email
3. Check email for confirmation link (check spam folder)
4. Click confirmation link
5. Verify redirect to login page

### 4.2 Test Login & Dashboard

1. Visit `https://your-app.vercel.app/login`
2. Log in with test account credentials
3. Verify redirect to main dashboard
4. Check welcome widget appears

### 4.3 Test OAuth Provider Connection

For each provider you configured:

1. Go to **Settings** → **API Credentials** (or `/settings/credentials`)
2. Click **"Connect with OAuth"** for a provider
3. Authorize permissions on provider's page
4. Verify redirect back to credentials page with success message
5. Confirm provider shows "Connected" status

### 4.4 Test Widget Functionality

1. Click **"+ Add [Provider] Widget"** (e.g., GitHub, Jira)
2. Verify widget loads data from your connected account
3. Test Event Mesh magic:
   - Add GitHub widget showing PRs
   - Add Jira widget showing issues
   - Click a GitHub PR with ticket ID (e.g., "PROJ-123")
   - Verify Jira widget auto-filters to that ticket

### 4.5 Test Realtime Updates

1. Open dashboard in two browser tabs
2. In tab 1: Add a new widget
3. In tab 2: Verify widget appears automatically (with toast notification)
4. In tab 1: Remove a widget
5. In tab 2: Verify widget disappears automatically

### 4.6 Test Token Refresh (Long-term)

This requires waiting for tokens to approach expiration:

**Jira tokens** (1 hour lifespan):
1. Connect Jira via OAuth
2. Wait 45 minutes
3. Check Vercel logs - Should see refresh job executing
4. Verify Jira widget still works after 1+ hours

**Linear tokens** (24 hour lifespan):
1. Connect Linear via OAuth
2. Wait 23+ hours
3. Check Vercel logs for refresh execution
4. Verify Linear widget still works after 24+ hours

**Monitoring:**
- Vercel dashboard → **Logs** → Filter by `/api/auth/refresh-tokens`
- Look for log messages: `[RefreshJob] ✓ Successfully refreshed [provider] token`

---

## Part 5: Custom Domain Setup (Optional)

### 5.1 Add Custom Domain in Vercel

1. Go to Vercel dashboard → Your project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `dashboard.yourdomain.com` (or `yourdomain.com`)
4. Click **"Add"**

### 5.2 Configure DNS

**If using subdomain (e.g., `dashboard.yourdomain.com`):**

Add a CNAME record in your DNS provider:

```
Type:  CNAME
Name:  dashboard
Value: cname.vercel-dns.com
TTL:   3600 (or automatic)
```

**If using apex domain (e.g., `yourdomain.com`):**

Add an A record in your DNS provider:

```
Type:  A
Name:  @
Value: 76.76.21.21
TTL:   3600
```

**Common DNS providers:**
- **Cloudflare:** DNS tab → Add record
- **Namecheap:** Advanced DNS → Add new record
- **GoDaddy:** DNS Management → Add record

### 5.3 Update Environment Variables

After domain is verified:

1. Vercel → **Settings** → **Environment Variables**
2. Edit `NEXT_PUBLIC_APP_URL`
3. Change to `https://dashboard.yourdomain.com`
4. Save and redeploy

### 5.4 Update OAuth Callback URLs (Again)

Add new callback URLs for each OAuth app:

```
https://dashboard.yourdomain.com/api/auth/[provider]/callback
```

Replace `[provider]` with: `github`, `jira`, `linear`, `slack`, `calendar`

**Important:** Keep both Vercel subdomain and custom domain callback URLs for redundancy.

---

## Part 6: Production Hardening

### 6.1 Enable Production Security Headers

Update `next.config.ts` (or create if missing):

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

Commit and push to trigger redeploy.

### 6.2 Configure Supabase Email Rate Limits

1. Supabase dashboard → **Authentication** → **Rate Limits**
2. Set limits to prevent abuse:
   - Email signups: 10 per hour per IP
   - Password resets: 5 per hour per IP
   - Magic link requests: 10 per hour per IP

### 6.3 Enable Supabase Vault Encryption (Optional)

For enhanced security, encrypt the `credentials` JSONB field:

```sql
-- Run in Supabase SQL Editor
SELECT vault.create_secret('user_credentials', 'credentials', 'aes-256-gcm');
```

**Note:** This is optional. Credentials are already stored server-side only and protected by RLS.

### 6.4 Set Up Monitoring & Alerts

**Vercel:**
1. Dashboard → **Settings** → **Integrations**
2. Add **Sentry** (error tracking) or **LogDrain** (log aggregation)

**Supabase:**
1. Dashboard → **Reports** → Enable daily email reports
2. Set up alerts for:
   - High API error rate (>5%)
   - Database CPU usage (>80%)
   - Storage usage (>80% quota)

### 6.5 Configure Backups

**Supabase automatic backups:**
- Free tier: Daily backups (7-day retention)
- Pro tier: Point-in-time recovery (30-day retention)

**Manual backup:**
```bash
# Export database schema and data
supabase db dump > backup-$(date +%Y%m%d).sql
```

Store backups in secure location (S3, Google Drive, etc.).

---

## Part 7: Performance Optimization

### 7.1 Enable Vercel Analytics

1. Vercel dashboard → **Analytics** tab
2. Click **"Enable Analytics"**
3. Add analytics snippet (Vercel auto-injects)

**Metrics tracked:**
- Page load times
- Time to First Byte (TTFB)
- Web Vitals (LCP, FID, CLS)

### 7.2 Configure Caching Headers

Update API routes to include cache headers for expensive operations:

```typescript
// Example: Cache provider data for 60 seconds
export async function GET(request: Request) {
  // ... fetch data ...

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
}
```

### 7.3 Enable Compression

Vercel automatically compresses responses. Verify:

```bash
curl -H "Accept-Encoding: gzip" https://your-app.vercel.app -I | grep content-encoding
# Should show: content-encoding: gzip
```

---

## Rollback Procedure

If deployment fails or has critical bugs:

### Quick Rollback (Vercel)

1. Vercel dashboard → **Deployments**
2. Find previous working deployment
3. Click **...** (three dots) → **Promote to Production**
4. Confirm rollback

**Time to rollback:** ~30 seconds

### Database Rollback (Supabase)

If migrations broke the database:

```bash
# Revert last migration
supabase migration repair --status reverted <migration-name>

# Or restore from backup
supabase db restore backup-20251120.sql
```

**Important:** Test migrations on staging environment before production.

---

## Troubleshooting Deployment Issues

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for common problems and solutions.

**Quick checks:**

1. **Build fails:**
   - Check Vercel build logs for TypeScript errors
   - Run `npm run build` locally to reproduce
   - Verify all environment variables are set

2. **Database connection fails:**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
   - Check `SUPABASE_SERVICE_ROLE_KEY` has no extra spaces
   - Confirm Supabase project is not paused (Free tier auto-pauses after 1 week inactivity)

3. **OAuth fails:**
   - Verify callback URLs exactly match (including https://)
   - Check `NEXT_PUBLIC_APP_URL` matches actual deployment URL
   - Confirm OAuth app client ID/secret are correct

4. **Cron job not running:**
   - Verify `vercel.json` is in repository root
   - Check **Settings** → **Cron Jobs** shows the job
   - Confirm `CRON_SECRET` is set in environment variables

---

## Cost Estimate

**Monthly costs for 100 active users:**

| Service | Tier | Monthly Cost | Notes |
|---------|------|--------------|-------|
| Vercel | Hobby | $0 | Free tier supports 100 GB bandwidth |
| Vercel | Pro | $20 | Required for team features, better support |
| Supabase | Free | $0 | 500 MB database, 5 GB bandwidth |
| Supabase | Pro | $25 | 8 GB database, 50 GB bandwidth, daily backups |
| Domain | - | $12/year | Optional (.com domain) |
| **Total** | - | **$0-45/month** | Depends on tier selection |

**Scaling considerations:**
- Free tiers are sufficient for MVP and testing
- Upgrade to Pro tiers when:
  - Users > 50 active daily
  - Database > 400 MB
  - Need team collaboration features
  - Require SLA guarantees

---

## Next Steps After Deployment

1. **Invite beta users** - Send production URL to testers
2. **Monitor logs** - Watch Vercel logs for errors in first 24 hours
3. **Set up analytics** - Track usage patterns and performance
4. **Documentation** - Create user guide for connecting providers
5. **Backup strategy** - Schedule automated database backups
6. **Staging environment** - Set up separate Vercel project for testing

---

## Support Resources

**Vercel:**
- Documentation: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions
- Support: Pro plan includes email support

**Supabase:**
- Documentation: https://supabase.com/docs
- Community: https://github.com/supabase/supabase/discussions
- Support: Pro plan includes email support

**This Project:**
- [OAuth Setup Guide](OAUTH_SETUP.md)
- [OAuth Token Refresh Guide](OAUTH_TOKEN_REFRESH.md)
- [Known Issues](KNOWN_ISSUES.md)
- [Architecture Decisions](../CLAUDE.md)

---

**Last Updated:** November 24, 2025
**Document Version:** 1.0.0
**Tested With:** Vercel (Hobby/Pro), Supabase (Free/Pro), Next.js 15
