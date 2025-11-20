# OAuth 2.0 Setup Guide

This guide shows you how to set up OAuth 2.0 authentication for each provider, allowing users to connect their accounts with one click instead of manually entering API tokens.

---

## Why OAuth 2.0?

**Benefits over manual token entry:**
- **Faster UX**: One click instead of copying/pasting tokens
- **More secure**: Tokens never pass through clipboard, lower risk of exposure
- **Auto-refresh**: Access tokens automatically refresh when expired (for supported providers)
- **Granular permissions**: Users see exactly what permissions they're granting
- **Better compliance**: OAuth is industry standard for third-party access

---

## Global Setup

### 1. Set Application URL

Add to your `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# OR
NEXT_PUBLIC_APP_URL=https://your-domain.com  # Production
```

This URL is used to construct OAuth callback URLs.

---

## Provider-Specific Setup

### GitHub

**1. Create OAuth App**
- Go to: https://github.com/settings/developers
- Click "New OAuth App"
- Fill in:
  - **Application name**: Agentic Dashboard (or your app name)
  - **Homepage URL**: `http://localhost:3000`
  - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
- Click "Register application"

**2. Get Credentials**
- Copy **Client ID**
- Click "Generate a new client secret" → Copy **Client Secret**

**3. Add to `.env.local`**
```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

**Scopes**: `repo`, `user`

**Notes**:
- GitHub tokens don't expire
- PKCE is recommended (automatically enabled in our implementation)

---

### Jira (Atlassian)

**1. Create OAuth 2.0 (3LO) App**
- Go to: https://developer.atlassian.com/console/myapps/
- Click "Create" → "OAuth 2.0 integration"
- Fill in app details

**2. Configure OAuth 2.0**
- In your app, go to **Authorization** → **OAuth 2.0 (3LO)** → **Configure**
- **Callback URL**: `http://localhost:3000/api/auth/jira/callback`
- **Scopes**: `read:jira-work`, `read:jira-user`, `offline_access`
- Save settings

**3. Get Credentials**
- Go to **Settings** tab
- Copy **Client ID** and **Secret**

**4. Add to `.env.local`**
```bash
JIRA_CLIENT_ID=your-client-id
JIRA_CLIENT_SECRET=your-client-secret
```

**Notes**:
- `offline_access` scope is required for refresh tokens
- Atlassian uses rotating refresh tokens (old token invalidated when new one issued)

---

### Linear

**1. Create OAuth Application**
- Sign in to Linear
- Go to: Your workspace name → **Settings** → **API**
- Click "+ New OAuth application"
- Fill in:
  - **Name**: Agentic Dashboard
  - **Callback URLs**: `http://localhost:3000/api/auth/linear/callback`
  - **Scopes**: `read`, `write` (adjust based on your needs)
- Click "Create"

**2. Get Credentials**
- Copy **Client ID** and **Client Secret**

**3. Add to `.env.local`**
```bash
LINEAR_CLIENT_ID=your-client-id
LINEAR_CLIENT_SECRET=your-client-secret
```

**Notes**:
- Refresh tokens enabled by default (for apps created after Oct 1, 2025)
- Access tokens valid for 24 hours
- PKCE supported (automatically enabled)

---

### Slack

**1. Create Slack App**
- Go to: https://api.slack.com/apps
- Click "Create New App" → "From scratch"
- Fill in:
  - **App Name**: Agentic Dashboard
  - **Workspace**: Select your workspace
- Click "Create App"

**2. Configure OAuth & Permissions**
- In left sidebar, click **OAuth & Permissions**
- Under **Redirect URLs**, click "Add New Redirect URL"
  - Enter: `http://localhost:3000/api/auth/slack/callback`
  - Click "Add" → "Save URLs"
- Under **Scopes** → **Bot Token Scopes**, add:
  - `channels:read`
  - `channels:history`
  - `users:read`

**3. Get Credentials**
- Go to **Basic Information** → **App Credentials**
- Copy **Client ID** and **Client Secret**

**4. Add to `.env.local`**
```bash
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

**Notes**:
- Slack uses workspace-scoped tokens
- Tokens don't expire unless revoked

---

### Google Calendar

**1. Create Google Cloud Project**
- Go to: https://console.cloud.google.com/
- Create a new project (or use existing)
- Enable **Google Calendar API**:
  - Go to **APIs & Services** → **Library**
  - Search "Google Calendar API" → Click → Enable

**2. Create OAuth 2.0 Credentials**
- Go to **APIs & Services** → **Credentials**
- Click "Create Credentials" → "OAuth client ID"
- If prompted, configure OAuth consent screen:
  - User Type: External
  - Fill in app info
  - Add scope: `https://www.googleapis.com/auth/calendar.readonly`
  - Add test users (for development)
- Select **Application type**: Web application
- Fill in:
  - **Name**: Agentic Dashboard
  - **Authorized redirect URIs**: `http://localhost:3000/api/auth/calendar/callback`
- Click "Create"

**3. Get Credentials**
- Copy **Client ID** and **Client Secret**

**4. Add to `.env.local`**
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Notes**:
- Requires OAuth consent screen configuration
- For production, you'll need to verify your app with Google
- Refresh tokens issued when `access_type=offline` (automatically set)

---

## Testing OAuth Flow

### 1. Start Development Server
```bash
./dev.sh
```

### 2. Navigate to Credentials Page
```
http://localhost:3000/settings/credentials
```

### 3. Test Provider Connection
- Click "Connect with OAuth" for a provider
- You'll be redirected to the provider's authorization page
- Approve the permissions
- You'll be redirected back with a success message

### 4. Verify Connection
- The provider card should show "Connected" status
- Check browser console for any errors
- Try using the widget to verify API access works

---

## Production Deployment

### 1. Update Callback URLs
For each OAuth app, add production callback URL:
```
https://your-domain.com/api/auth/{provider}/callback
```

Most providers allow multiple redirect URLs, so you can keep both development and production URLs.

### 2. Update Environment Variables
In your production environment (Vercel, etc.):
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
# ... etc for all providers
```

### 3. Secure Environment Variables
- Never commit `.env.local` to git (already in `.gitignore`)
- Use your hosting platform's environment variable management
- For Vercel: Settings → Environment Variables

---

## Troubleshooting

### "OAuth not configured" error
**Cause**: Missing environment variables
**Fix**: Ensure `{PROVIDER}_CLIENT_ID` and `{PROVIDER}_CLIENT_SECRET` are set in `.env.local`

### "Invalid state - CSRF protection failed"
**Cause**: Cookie not set or expired
**Fix**:
- Clear cookies and try again
- Check that cookies are enabled in your browser
- Verify `NEXT_PUBLIC_APP_URL` matches your actual URL

### "Redirect URI mismatch"
**Cause**: Callback URL doesn't match OAuth app configuration
**Fix**: Ensure callback URL in OAuth app settings exactly matches:
```
{NEXT_PUBLIC_APP_URL}/api/auth/{provider}/callback
```

### Provider-specific issues

**GitHub**: If using GitHub Enterprise, update `authUrl` and `tokenUrl` in `lib/oauth/config.ts`

**Jira**: Callback URL must use HTTPS in production (HTTP allowed in development)

**Linear**: Make sure you're using the correct workspace when creating the OAuth app

**Slack**: Ensure bot token scopes match what you request in the OAuth flow

**Google**: If you see "This app isn't verified", add yourself as a test user in OAuth consent screen settings

---

## Manual Token Entry Fallback

OAuth is optional. Users can still manually enter API tokens by clicking "Or enter token manually" on the credentials page. This is useful for:
- Development/testing without setting up OAuth apps
- Providers you haven't configured OAuth for yet
- Users who prefer manual token management

---

## Security Considerations

### CSRF Protection
- State parameter validates callback authenticity
- State stored in httpOnly cookie with 10-minute expiration
- State validated before token exchange

### PKCE (Proof Key for Code Exchange)
- Enabled for GitHub and Linear (providers that support it)
- Prevents authorization code interception attacks
- Code verifier never leaves the server

### Token Storage
- Access tokens stored encrypted in Supabase Vault
- Refresh tokens stored alongside access tokens
- Tokens never exposed to client-side JavaScript

### Token Refresh
- Automatic refresh for providers that support it (Jira, Linear, Slack, Google)
- Old refresh tokens invalidated when new ones issued (Jira's rotating tokens)
- Refresh logic in `lib/oauth/utils.ts` (`refreshAccessToken()`)

---

## Next Steps

After setting up OAuth:

1. **Implement Refresh Token Handler**: Create a background job to refresh expiring tokens
2. **Add Token Expiry UI**: Show users when their tokens will expire
3. **Error Handling**: Improve user messaging when OAuth fails
4. **Audit Logging**: Track OAuth connections for security compliance

---

**Last Updated**: November 20, 2025
**Version**: 1.0.0
