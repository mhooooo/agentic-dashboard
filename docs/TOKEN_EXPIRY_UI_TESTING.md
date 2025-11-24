# Token Expiry UI Testing Guide

This guide explains how to test the token expiry warning system with different scenarios.

## Overview

The token expiry warning system alerts users when their OAuth tokens are about to expire or have expired. It provides visual warnings at multiple levels:

1. **Global Banner** - Red banner at top of app (expired tokens only)
2. **Settings Page Warnings** - Detailed cards with countdown timers (warning + expired)
3. **Provider Cards** - Compact badges next to provider names (warning + expired)

## Testing Scenarios

### Scenario 1: Token Expiring in 5 Minutes (Warning State)

**Setup:**
1. Connect a provider with OAuth (e.g., Jira, Linear, Slack, or Google Calendar)
2. Manually update the database to set `expires_at` to 5 minutes from now:
   ```sql
   UPDATE user_credentials
   SET credentials = jsonb_set(
     credentials,
     '{expires_at}',
     to_jsonb((EXTRACT(EPOCH FROM NOW()) * 1000 + 300000)::bigint)
   )
   WHERE provider = 'jira' AND user_id = 'your-user-id';
   ```

**Expected Behavior:**
- ✅ **Settings Page:** Yellow warning card appears at top
- ✅ **Provider Card:** Orange badge shows "5m 0s" countdown
- ✅ **Global Banner:** Does NOT appear (only shows for expired tokens)
- ✅ **Countdown Timer:** Updates every second, shows decreasing time
- ✅ **Warning Text:** Says "Your authentication token will expire soon"
- ✅ **Buttons:** Shows "Refresh Token" and "Reconnect Account"

**Manual Refresh Test:**
1. Click "Refresh Token" button
2. Should see success toast: "Token refreshed successfully for jira"
3. Warning card should disappear
4. Badge should disappear
5. Token expiry should be updated in database

### Scenario 2: Token Expiring in 1 Hour (OK State)

**Setup:**
1. Set `expires_at` to 1 hour from now:
   ```sql
   UPDATE user_credentials
   SET credentials = jsonb_set(
     credentials,
     '{expires_at}',
     to_jsonb((EXTRACT(EPOCH FROM NOW()) * 1000 + 3600000)::bigint)
   )
   WHERE provider = 'jira' AND user_id = 'your-user-id';
   ```

**Expected Behavior:**
- ✅ **Settings Page:** No warning card
- ✅ **Provider Card:** No badge (status is "ok")
- ✅ **Global Banner:** Does NOT appear

### Scenario 3: Token Already Expired

**Setup:**
1. Set `expires_at` to 5 minutes ago:
   ```sql
   UPDATE user_credentials
   SET credentials = jsonb_set(
     credentials,
     '{expires_at}',
     to_jsonb((EXTRACT(EPOCH FROM NOW()) * 1000 - 300000)::bigint)
   )
   WHERE provider = 'jira' AND user_id = 'your-user-id';
   ```

**Expected Behavior:**
- ✅ **Global Banner:** Red banner appears at top with "Your Jira token has expired"
- ✅ **Settings Page:** Red warning card appears at top
- ✅ **Provider Card:** Red badge shows "Expired"
- ✅ **Warning Text:** Says "Your authentication token has expired"
- ✅ **Buttons:** Shows "Refresh Token" (if supported) and red "Reconnect Account"
- ✅ **Dismiss:** Can dismiss global banner (click X button)

### Scenario 4: Multiple Expired Tokens

**Setup:**
1. Set multiple providers to expired:
   ```sql
   UPDATE user_credentials
   SET credentials = jsonb_set(
     credentials,
     '{expires_at}',
     to_jsonb((EXTRACT(EPOCH FROM NOW()) * 1000 - 300000)::bigint)
   )
   WHERE user_id = 'your-user-id';
   ```

**Expected Behavior:**
- ✅ **Global Banner:** Shows "3 tokens have expired"
- ✅ **Banner Text:** Lists provider names (e.g., "Jira, Linear, Slack")
- ✅ **Settings Page:** Shows 3 separate warning cards (one per provider)
- ✅ **Provider Cards:** Each shows red "Expired" badge

### Scenario 5: Token Without Expiry (Manual PAT)

**Setup:**
1. Connect a provider with manual PAT (no OAuth)
2. Credentials should not have `expires_at` field

**Expected Behavior:**
- ✅ **Settings Page:** No warning card
- ✅ **Provider Card:** No badge (status is "no-expiry")
- ✅ **Global Banner:** Does NOT appear

### Scenario 6: Refresh Token Not Supported

**Setup:**
1. Set `expires_at` to 5 minutes from now
2. Remove `refresh_token` from credentials:
   ```sql
   UPDATE user_credentials
   SET credentials = credentials - 'refresh_token'
   WHERE provider = 'github' AND user_id = 'your-user-id';
   ```

**Expected Behavior:**
- ✅ **Warning Card:** Shows warning message
- ✅ **Warning Text:** Says "Please reconnect your account before it expires"
- ✅ **Buttons:** Only shows "Reconnect Account" (no "Refresh Token" button)

## Component Behavior

### TokenExpiryBadge

**Props:**
- `status`: 'ok' | 'warning' | 'expired' | 'no-expiry'
- `expiresAt`: Timestamp in milliseconds
- `timeRemaining`: Initial time remaining in milliseconds
- `compact`: Boolean (compact mode for widget headers)

**States:**
| Status     | Color  | Text                     | Icon |
|------------|--------|--------------------------|------|
| ok         | -      | (hidden)                 | -    |
| warning    | Yellow | "Expires in 5m 30s"      | ⚠️   |
| expired    | Red    | "Expired"                | ❌   |
| no-expiry  | -      | (hidden)                 | -    |

**Compact Mode:**
- Smaller padding (px-1.5 py-0.5 vs px-2 py-1)
- Smaller text (text-xs vs text-sm)
- No icon emoji

### TokenExpiryWarning

**Displays:**
- Detailed warning cards for expiring/expired tokens
- Countdown timer (updates every second)
- Context-aware message based on status and refresh support
- "Refresh Token" button (if `supportsRefresh: true`)
- "Reconnect Account" button (always)

**Styling:**
- Warning state: Yellow background (`bg-yellow-50`)
- Expired state: Red background (`bg-red-50`)

### TokenExpiryBanner

**Displays:**
- Global red banner at top of app
- Only shows for expired tokens (not warnings)
- Lists all expired provider names
- "Fix Now" button → redirects to `/settings/credentials`
- Dismiss button (X icon)

**Auto-refresh:**
- Fetches expiry status every 30 seconds
- Updates banner if new tokens expire

## API Endpoints

### GET /api/credentials/expiry

Returns expiry status for all user credentials.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "provider": "jira",
      "expiresAt": 1732451234567,
      "timeRemaining": 300000,
      "status": "warning",
      "supportsRefresh": true
    },
    {
      "provider": "github",
      "status": "no-expiry",
      "supportsRefresh": false
    }
  ]
}
```

### POST /api/auth/refresh-token

Manually refresh a specific provider's token.

**Request:**
```json
{
  "provider": "jira"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "jira",
    "expiresAt": 1732455234567,
    "refreshedAt": "2025-11-24T10:30:00.000Z"
  }
}
```

## Dev Mode Testing

In development mode, the `/api/credentials/expiry` endpoint returns mock data:

```javascript
const mockStatuses: CredentialExpiryStatus[] = [
  {
    provider: 'github',
    status: 'no-expiry',
    supportsRefresh: false,
  },
  {
    provider: 'jira',
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
    timeRemaining: 5 * 60 * 1000,
    status: 'warning',
    supportsRefresh: true,
  },
];
```

To test different scenarios in dev mode:
1. Modify the mock data in `/app/api/credentials/expiry/route.ts`
2. Refresh the settings page
3. Observe the UI changes

## Edge Cases

### Race Condition: Token Expires While User is Viewing Page

**Scenario:**
1. User views settings page with token expiring in 30 seconds
2. User waits 30 seconds without refreshing

**Expected Behavior:**
- Countdown timer updates from "30s" → "29s" → ... → "0s" → "Expired"
- Badge color changes from yellow to red
- Warning card updates from "will expire soon" to "has expired"
- Global banner appears automatically

### Background Refresh Job Runs While User is Viewing Page

**Scenario:**
1. User views settings page with token expiring in 10 minutes
2. Background cron job refreshes token (extends expiry to 1 hour)
3. User is still viewing the same page

**Expected Behavior:**
- Warning card remains visible (client hasn't fetched new status yet)
- User can manually click "Refresh Token" to update UI
- OR user can refresh the page to see updated status

**Improvement Opportunity:**
- Add real-time subscription to `user_credentials` table
- Auto-update UI when `expires_at` changes in database
- Show toast: "Token auto-refreshed" when background job succeeds

### Network Error on Manual Refresh

**Scenario:**
1. User clicks "Refresh Token"
2. Network request fails

**Expected Behavior:**
- Shows error toast: "Network error while refreshing token"
- Button returns to "Refresh Token" state (not stuck in "Refreshing...")
- Warning card remains visible

## Countdown Timer Format

The countdown timer displays time remaining in human-readable format:

| Time Remaining | Display Format |
|----------------|----------------|
| 5d 12h         | "5d 12h"       |
| 23h 45m        | "23h 45m"      |
| 59m 30s        | "59m 30s"      |
| 45s            | "45s"          |
| 0s             | "Expired"      |

Compact mode shows same format, just without "Expires in " prefix.

## Accessibility

- All buttons have proper hover states
- Dismiss button has `aria-label="Dismiss"`
- Color coding uses both color AND text/icons (not color-only)
- Countdown timer updates are not announced (no ARIA live region to avoid spam)

## Performance

- Countdown timers use `setInterval` with 1-second intervals
- Cleanup on unmount (`clearInterval` in `useEffect` return)
- Global banner auto-refresh every 30 seconds (not 1 second)
- Settings page doesn't auto-refresh (user must manually refresh)

## Known Limitations

1. **No Real-time Updates:** UI doesn't auto-update when background job refreshes tokens. User must refresh page or manually click "Refresh Token".
2. **Client-side Only:** Countdown timer runs in browser. If tab is backgrounded, timer may drift slightly.
3. **No Notification Persistence:** If user dismisses global banner, it won't reappear until next page load.
4. **15-minute Warning Window:** Warnings only appear within 15 minutes of expiry. Tokens expiring in 1 hour show no warning.

## Future Enhancements

- [ ] Add Supabase Realtime subscription to `user_credentials` table
- [ ] Show toast notification when background job auto-refreshes token
- [ ] Add widget header badges (small icon in widget title bar)
- [ ] Add browser notification API for critical expiry warnings
- [ ] Add email notification for expired tokens (backend job)
- [ ] Add "Refresh All Tokens" button on settings page
