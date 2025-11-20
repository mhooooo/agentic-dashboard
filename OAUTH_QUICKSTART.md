# OAuth Quick Start - Testing All Providers

Quick reference for setting up OAuth apps for all 5 providers. Follow in order for fastest setup.

---

## Prerequisites

Add to `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 1. GitHub (Easiest - 2 minutes)

**Create App:**
1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - Name: `Agentic Dashboard Dev`
   - Homepage: `http://localhost:3000`
   - Callback: `http://localhost:3000/api/auth/github/callback`
4. Click "Register application"
5. Copy Client ID
6. Click "Generate a new client secret" → Copy secret

**Add to `.env.local`:**
```bash
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
```

**Test:** Visit http://localhost:3000/settings/credentials → Click "Connect with OAuth" for GitHub

---

## 2. Linear (Fast - 3 minutes)

**Create App:**
1. Sign in to Linear
2. Click your workspace name → Settings → API
3. Click "+ New OAuth application"
4. Fill in:
   - Name: `Agentic Dashboard Dev`
   - Callback: `http://localhost:3000/api/auth/linear/callback`
   - Scopes: Check `read` and `write`
5. Click "Create"
6. Copy Client ID and Client Secret

**Add to `.env.local`:**
```bash
LINEAR_CLIENT_ID=...
LINEAR_CLIENT_SECRET=...
```

**Test:** http://localhost:3000/settings/credentials → Linear → "Connect with OAuth"

---

## 3. Slack (Medium - 5 minutes)

**Create App:**
1. Go to: https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: `Agentic Dashboard Dev`
4. Select your workspace → "Create App"

**Configure:**
5. Left sidebar → "OAuth & Permissions"
6. Scroll to "Redirect URLs" → "Add New Redirect URL"
   - Enter: `http://localhost:3000/api/auth/slack/callback`
   - Click "Add" → "Save URLs"
7. Scroll to "Bot Token Scopes" → Add:
   - `channels:read`
   - `channels:history`
   - `users:read`

**Get Credentials:**
8. Left sidebar → "Basic Information"
9. Scroll to "App Credentials"
10. Copy "Client ID" and "Client Secret"

**Add to `.env.local`:**
```bash
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
```

**Test:** http://localhost:3000/settings/credentials → Slack → "Connect with OAuth"

---

## 4. Jira (Complex - 10 minutes)

**Create App:**
1. Go to: https://developer.atlassian.com/console/myapps/
2. Click "Create" → "OAuth 2.0 integration"
3. Name: `Agentic Dashboard Dev` → "Create"

**Configure OAuth:**
4. Left sidebar → "Authorization"
5. Click "OAuth 2.0 (3LO)" → "Configure"
6. Callback URL: `http://localhost:3000/api/auth/jira/callback`
7. Click "Save changes"

**Add Permissions:**
8. Left sidebar → "Permissions"
9. Click "Add" for "Jira API"
10. Configure scopes → Add:
    - `read:jira-work`
    - `read:jira-user`
    - `offline_access`
11. Click "Save"

**Get Credentials:**
12. Left sidebar → "Settings"
13. Copy "Client ID" and "Secret"

**Add to `.env.local`:**
```bash
JIRA_CLIENT_ID=...
JIRA_CLIENT_SECRET=...
```

**Test:** http://localhost:3000/settings/credentials → Jira → "Connect with OAuth"

**Note:** You'll need to select your Jira workspace during OAuth flow

---

## 5. Google Calendar (Most Complex - 15 minutes)

**Create Project:**
1. Go to: https://console.cloud.google.com/
2. Create new project: "Agentic Dashboard Dev"
3. Wait for project creation

**Enable API:**
4. Go to: APIs & Services → Library
5. Search "Google Calendar API" → Click → "Enable"

**Configure OAuth Consent:**
6. Go to: APIs & Services → OAuth consent screen
7. User Type: "External" → "Create"
8. Fill in:
   - App name: `Agentic Dashboard Dev`
   - User support email: Your email
   - Developer contact: Your email
9. Click "Save and Continue"
10. Scopes → "Add or Remove Scopes"
    - Search: `calendar.readonly`
    - Check: `https://www.googleapis.com/auth/calendar.readonly`
    - Click "Update" → "Save and Continue"
11. Test users → "Add Users"
    - Add your Google email
    - Click "Save and Continue"
12. Click "Back to Dashboard"

**Create Credentials:**
13. Go to: APIs & Services → Credentials
14. Click "Create Credentials" → "OAuth client ID"
15. Application type: "Web application"
16. Name: `Agentic Dashboard Dev`
17. Authorized redirect URIs → "Add URI"
    - Enter: `http://localhost:3000/api/auth/calendar/callback`
18. Click "Create"
19. Copy Client ID and Client Secret

**Add to `.env.local`:**
```bash
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

**Test:** http://localhost:3000/settings/credentials → Google Calendar → "Connect with OAuth"

**Note:** You'll see "Google hasn't verified this app" warning - click "Continue" (safe for testing)

---

## After Each Setup

1. **Restart dev server** to load new env vars:
   ```bash
   # Press Ctrl+C to stop
   ./dev.sh
   ```

2. **Test the OAuth flow:**
   - Go to http://localhost:3000/settings/credentials
   - Click "Connect with OAuth" for the provider
   - Approve permissions
   - Verify success toast message
   - Check "Connected" badge appears

3. **Verify in dashboard:**
   - Go to http://localhost:3000
   - Add the widget for that provider
   - Verify real data loads

---

## Troubleshooting

**"OAuth not configured" error:**
- Check env vars are in `.env.local`
- Restart dev server: `./dev.sh`
- Check for typos in client ID/secret

**"Redirect URI mismatch":**
- Callback URL in OAuth app must exactly match:
  `http://localhost:3000/api/auth/{provider}/callback`
- Check for http vs https
- Check for trailing slashes

**"Invalid state" error:**
- Clear browser cookies
- Try in incognito window
- Check browser isn't blocking cookies

**Provider-specific:**
- **Jira:** Must select a workspace during OAuth flow
- **Google:** Must add yourself as test user
- **Slack:** Must install app to workspace after OAuth

---

## Quick Test All

After setting up all providers:

```bash
# Visit test page
http://localhost:3000/settings/credentials

# Should see:
# ✅ GitHub - Connected
# ✅ Jira - Connected
# ✅ Linear - Connected
# ✅ Slack - Connected
# ✅ Google Calendar - Connected
```

---

## Estimated Total Time

- **Fast track (just GitHub + Linear):** 5 minutes
- **Core 3 (GitHub + Linear + Slack):** 10 minutes
- **All 5 providers:** 35 minutes

**Recommended order:** GitHub → Linear → Slack → Jira → Google Calendar (easy → hard)
