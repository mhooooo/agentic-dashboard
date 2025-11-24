# Token Expiry UI Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ app/layout.tsx (Root Layout)                                │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ <TokenExpiryBanner />                               │   │
│  │ • Global red banner (only for expired tokens)       │   │
│  │ • Fetches /api/credentials/expiry every 30s         │   │
│  │ • Auto-refreshes status                             │   │
│  │ • Dismissible                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ User Header (email + logout)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {children} - Page Content                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Settings Page Component Tree

```
┌─────────────────────────────────────────────────────────────┐
│ app/settings/credentials/page.tsx                           │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ <TokenExpiryWarning providers={expiryStatuses} />   │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │ TokenExpiryCard (for Jira - WARNING)         │  │   │
│  │  │ • Yellow background                           │  │   │
│  │  │ • Shows countdown timer                       │  │   │
│  │  │ • "Refresh Token" button                      │  │   │
│  │  │ • "Reconnect Account" button                  │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │ TokenExpiryCard (for Linear - EXPIRED)       │  │   │
│  │  │ • Red background                              │  │   │
│  │  │ • Shows "Expired" text                        │  │   │
│  │  │ • "Refresh Token" button                      │  │   │
│  │  │ • "Reconnect Account" button (red, primary)   │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ProviderCard (GitHub)                               │   │
│  │                                                       │   │
│  │  Header: GitHub [Connected] <TokenExpiryBadge />    │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │ <TokenExpiryBadge                            │  │   │
│  │  │   status="no-expiry"                          │  │   │
│  │  │   compact={true} />                           │  │   │
│  │  │ → Hidden (GitHub PATs don't expire)           │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ProviderCard (Jira)                                 │   │
│  │                                                       │   │
│  │  Header: Jira [Connected] ⚠️ 5m 30s                │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │ <TokenExpiryBadge                            │  │   │
│  │  │   status="warning"                            │  │   │
│  │  │   expiresAt={timestamp}                       │  │   │
│  │  │   timeRemaining={330000}                      │  │   │
│  │  │   compact={true} />                           │  │   │
│  │  │ → Yellow badge "5m 30s"                       │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ProviderCard (Linear)                               │   │
│  │                                                       │   │
│  │  Header: Linear [Connected] ❌ Expired              │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │ <TokenExpiryBadge                            │  │   │
│  │  │   status="expired"                            │  │   │
│  │  │   expiresAt={timestamp}                       │  │   │
│  │  │   timeRemaining={-300000}                     │  │   │
│  │  │   compact={true} />                           │  │   │
│  │  │ → Red badge "Expired"                         │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     USER LOADS SETTINGS PAGE                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► fetchConnectedProviders()
                 │   └─► GET /api/credentials
                 │       └─► Returns: [{ provider: "jira" }, ...]
                 │
                 └─► fetchExpiryStatus()
                     └─► GET /api/credentials/expiry
                         │
                         ├─► Backend queries database:
                         │   SELECT user_id, provider, credentials
                         │   FROM user_credentials
                         │   WHERE user_id = 'xxx'
                         │
                         ├─► Extracts expires_at from credentials JSONB
                         │
                         ├─► Calculates timeRemaining = expires_at - now
                         │
                         ├─► Determines status:
                         │   • expired: timeRemaining <= 0
                         │   • warning: timeRemaining <= 15 minutes
                         │   • ok: timeRemaining > 15 minutes
                         │   • no-expiry: no expires_at field
                         │
                         └─► Returns:
                             [{
                               provider: "jira",
                               expiresAt: 1732451234567,
                               timeRemaining: 300000,
                               status: "warning",
                               supportsRefresh: true
                             }]
```

## Manual Refresh Flow

```
┌─────────────────────────────────────────────────────────────┐
│          USER CLICKS "REFRESH TOKEN" BUTTON                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► Button disabled, shows "Refreshing..."
                 │
                 └─► POST /api/auth/refresh-token
                     Body: { provider: "jira" }
                     │
                     ├─► Backend authenticates user
                     │
                     ├─► Fetches current credentials from database
                     │   └─► Validates refresh_token exists
                     │
                     ├─► Calls OAuth provider token endpoint
                     │   POST https://auth.atlassian.com/oauth/token
                     │   Body: {
                     │     grant_type: "refresh_token",
                     │     refresh_token: "xxx",
                     │     client_id: "xxx",
                     │     client_secret: "xxx"
                     │   }
                     │
                     ├─► Provider returns new tokens:
                     │   {
                     │     access_token: "new_token",
                     │     refresh_token: "new_refresh_token",
                     │     expires_in: 3600
                     │   }
                     │
                     ├─► Backend updates database:
                     │   UPDATE user_credentials
                     │   SET credentials = jsonb_set(
                     │     credentials,
                     │     '{pat}', '"new_token"',
                     │     '{refresh_token}', '"new_refresh_token"',
                     │     '{expires_at}', to_jsonb(now + 3600s)
                     │   )
                     │   WHERE user_id = 'xxx' AND provider = 'jira'
                     │
                     └─► Returns success
                         │
                         ├─► Frontend shows success toast
                         │
                         ├─► Calls onRefresh() callback
                         │   └─► Re-fetches expiry status
                         │       └─► Warning card disappears
                         │
                         └─► Button re-enabled, shows "Refresh Token"
```

## Countdown Timer State Machine

```
┌─────────────────────────────────────────────────────────────┐
│               <TokenExpiryBadge /> LIFECYCLE                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► Component mounts with props:
                 │   • status: "warning"
                 │   • expiresAt: 1732451234567
                 │   • timeRemaining: 330000 (5m 30s)
                 │
                 ├─► useEffect sets up interval:
                 │   setInterval(() => {
                 │     const remaining = expiresAt - Date.now()
                 │     setTimeRemaining(remaining)
                 │
                 │     if (remaining <= 0) {
                 │       setStatus('expired')
                 │     } else if (remaining <= 15min) {
                 │       setStatus('warning')
                 │     } else {
                 │       setStatus('ok')
                 │     }
                 │   }, 1000)
                 │
                 ├─► Every second:
                 │   ├─► timeRemaining: 330000 → 329000 → ... → 0 → -1000
                 │   ├─► Display: "5m 30s" → "5m 29s" → ... → "Expired"
                 │   └─► Status: "warning" → "warning" → ... → "expired"
                 │
                 └─► Component unmounts:
                     └─► useEffect cleanup: clearInterval()
```

## Component Props & State

### TokenExpiryBadge

```typescript
interface TokenExpiryBadgeProps {
  status: 'ok' | 'warning' | 'expired' | 'no-expiry';
  expiresAt?: number; // Timestamp in milliseconds
  timeRemaining?: number; // Initial time remaining in milliseconds
  compact?: boolean; // Compact mode for widget headers
}

// Internal state:
const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining || 0);
const [status, setStatus] = useState(initialStatus);
```

### TokenExpiryWarning

```typescript
interface CredentialExpiryStatus {
  provider: string;
  expiresAt?: number;
  timeRemaining?: number;
  status: 'ok' | 'warning' | 'expired' | 'no-expiry';
  supportsRefresh: boolean;
}

interface TokenExpiryWarningProps {
  providers: CredentialExpiryStatus[];
  onRefresh?: () => void;
}

// Internal state (per card):
const [refreshing, setRefreshing] = useState(false);
```

### TokenExpiryBanner

```typescript
// Internal state:
const [expiredProviders, setExpiredProviders] = useState<CredentialExpiryStatus[]>([]);
const [dismissed, setDismissed] = useState(false);
const [loading, setLoading] = useState(true);

// Auto-refresh every 30 seconds:
useEffect(() => {
  fetchExpiryStatus();
  const interval = setInterval(fetchExpiryStatus, 30000);
  return () => clearInterval(interval);
}, []);
```

## API Response Schemas

### GET /api/credentials/expiry

```typescript
// Response
{
  success: boolean;
  data: CredentialExpiryStatus[];
}

// CredentialExpiryStatus
{
  provider: string;
  expiresAt?: number; // Timestamp in milliseconds
  timeRemaining?: number; // Milliseconds until expiry
  status: 'ok' | 'warning' | 'expired' | 'no-expiry';
  supportsRefresh: boolean; // true if credentials.refresh_token exists
}
```

### POST /api/auth/refresh-token

```typescript
// Request
{
  provider: string; // e.g., "jira"
}

// Response (success)
{
  success: true;
  data: {
    provider: string;
    expiresAt: number; // New expiry timestamp
    refreshedAt: string; // ISO timestamp
  }
}

// Response (error)
{
  error: {
    message: string; // Human-readable error message
  }
}
```

## State Transitions

```
┌──────────────┐
│  no-expiry   │  Token has no expires_at field (manual PAT)
│              │  → No badge shown
└──────────────┘

       ↓ User connects with OAuth (expires_at set)

┌──────────────┐
│     ok       │  Token expires in > 15 minutes
│              │  → No badge shown
└──────────────┘

       ↓ Time passes (15 minutes before expiry)

┌──────────────┐
│   warning    │  Token expires in ≤ 15 minutes
│              │  → Yellow badge: "5m 30s"
│              │  → Yellow warning card on settings page
└──────────────┘

       ↓ Time passes (countdown reaches 0)

┌──────────────┐
│   expired    │  Token has expired (timeRemaining ≤ 0)
│              │  → Red badge: "Expired"
│              │  → Red warning card on settings page
│              │  → Red global banner at top of app
└──────────────┘

       ↓ User clicks "Refresh Token"

┌──────────────┐
│     ok       │  Token refreshed (expires in 1+ hours)
│              │  → Badge disappears
│              │  → Warning card disappears
│              │  → Global banner disappears
└──────────────┘
```

## Performance Characteristics

### Countdown Timers
- **Interval:** 1 second
- **Memory:** ~100 bytes per timer (interval ID + state)
- **CPU:** Negligible (simple arithmetic every second)
- **Scalability:** 10 providers = 10 timers (acceptable)

### API Calls
| Component          | Frequency          | Endpoint                    |
|--------------------|--------------------|----------------------------|
| Settings Page      | On mount only      | GET /api/credentials/expiry |
| Global Banner      | Every 30 seconds   | GET /api/credentials/expiry |
| Manual Refresh     | On button click    | POST /api/auth/refresh-token |

### Rendering
- **TokenExpiryBadge:** Re-renders every second (local state update)
- **TokenExpiryWarning:** Re-renders only when refreshing (button click)
- **TokenExpiryBanner:** Re-renders every 30 seconds (API fetch)

## Error Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► Database connection fails
                 │   └─► Gracefully falls back to dev mode (mock data)
                 │
                 ├─► OAuth provider returns error
                 │   └─► Shows error toast: "Failed to refresh token"
                 │   └─► Button returns to "Refresh Token" state
                 │
                 ├─► Network request fails
                 │   └─► Shows error toast: "Network error while refreshing token"
                 │   └─► Button returns to "Refresh Token" state
                 │
                 ├─► No refresh token available
                 │   └─► Hides "Refresh Token" button
                 │   └─► Shows only "Reconnect Account" button
                 │
                 └─► Invalid provider
                     └─► Shows error toast: "Invalid provider: xyz"
```

## Integration Points

### Existing Systems
- **OAuth Callback:** Already sets `credentials.expires_at` and `credentials.refresh_token`
- **Background Refresh Job:** Already refreshes tokens proactively
- **Provider Adapters:** Already validate token format and expiry
- **Database Schema:** Already stores JSONB credentials with expiry fields

### No Changes Required To
- Database schema (uses existing JSONB fields)
- Environment variables (uses existing OAuth configs)
- Middleware (uses existing authentication)
- Cron jobs (uses existing refresh-tokens endpoint)

## Testing Strategy

### Unit Tests (Future)
- [ ] TokenExpiryBadge countdown logic
- [ ] Status transitions (ok → warning → expired)
- [ ] Time formatting (seconds, minutes, hours, days)

### Integration Tests (Future)
- [ ] Expiry API endpoint returns correct statuses
- [ ] Refresh API endpoint updates database correctly
- [ ] Warning cards appear/disappear based on status

### E2E Tests (Future)
- [ ] User sees global banner for expired token
- [ ] User clicks "Refresh Token" and warning disappears
- [ ] Countdown timer updates in real-time

### Manual Testing (Now)
See `docs/TOKEN_EXPIRY_UI_TESTING.md` for detailed scenarios.

## Security Considerations

### Client-side
- Never exposes access tokens or refresh tokens
- Only shows expiry timestamps (public data)
- Countdown timer runs locally (no secrets)

### Server-side
- All API endpoints require authentication
- Refresh endpoint validates user owns credentials
- Database updates use service role key (server-only)
- OAuth credentials never sent to client

### Database
- Credentials stored in JSONB (encrypted at rest by Supabase)
- RLS policies enforce user isolation
- Service role key bypasses RLS (server-only)
