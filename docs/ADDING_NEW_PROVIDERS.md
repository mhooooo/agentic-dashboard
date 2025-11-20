# Adding New OAuth Providers

**The Contract Problem:** Your JavaScript code is flexible, but your SQL database is strict. When you add a new provider in code, the database doesn't automatically know about it.

This guide ensures you don't hit the common "bouncer" errors when adding new providers.

---

## The 3 Common Errors (And How to Avoid Them)

### 1. ❌ CHECK Constraint Error: "The Bouncer Problem"

**Error:**
```
violates check constraint "user_credentials_provider_check"
```

**Why it happens:**
Your database has a rule: `CHECK (provider IN ('github', 'jira', 'slack'))`. When you try to save a new provider like `'calendar'`, the database rejects it like a bouncer with an outdated guest list.

**The Fix:**
Update the database constraint BEFORE deploying code that uses the new provider.

```sql
-- Run this in Supabase SQL Editor FIRST
ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_provider_check;
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_provider_check;

ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_provider_check
  CHECK (provider IN ('github', 'jira', 'slack', 'linear', 'calendar', 'YOUR_NEW_PROVIDER'));

ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_provider_check
  CHECK (provider IN ('github', 'jira', 'slack', 'linear', 'calendar', 'YOUR_NEW_PROVIDER'));
```

---

### 2. ❌ Duplicate Key Error: "The Double-Insert Problem"

**Error:**
```
duplicate key value violates unique constraint "user_credentials_user_id_provider_key"
```

**Why it happens:**
Your code uses `INSERT` to save credentials:
- First time: ✅ Works fine
- Second time: ❌ Database says "I already have Slack for User X!"

**The Fix:**
Use **UPSERT** (Update or Insert) instead of INSERT.

✅ **Correct (lib/api/supabase-rest.ts):**
```typescript
// UPSERT with PostgREST
await restRequest('/user_credentials', {
  method: 'POST',
  body: JSON.stringify(data),
  headers: {
    'Prefer': 'resolution=merge-duplicates,return=representation',
  },
});
```

❌ **Wrong:**
```typescript
// Plain INSERT - fails on second save
await supabase.from('user_credentials').insert(data);
```

**Status:** ✅ **FIXED** in `lib/api/supabase-rest.ts` (with PATCH fallback)

---

### 3. ❌ Validation Error: "The OAuth Token Problem"

**Error:**
```
Invalid Linear API key format. Key should start with "lin_api_"
```

**Why it happens:**
- **Personal Access Tokens** (manual): Start with provider prefix (e.g., `lin_api_`, `ghp_`, `xoxb-`)
- **OAuth Tokens**: Random characters, no consistent prefix

Your validation code expects manual tokens, but OAuth gives you different tokens.

**The Fix:**
Accept BOTH token formats in your provider adapter.

✅ **Correct (lib/providers/linear.ts):**
```typescript
validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
  if (!credentials.pat) {
    return { valid: false, error: 'API key required' };
  }

  // Accept both manual API keys (lin_api_*) AND OAuth tokens (longer random strings)
  if (!credentials.pat.startsWith('lin_api_') && credentials.pat.length < 32) {
    return {
      valid: false,
      error: 'Invalid token format. Must be API key (lin_api_*) or OAuth token',
    };
  }

  return { valid: true };
}
```

❌ **Wrong:**
```typescript
// Too strict - rejects OAuth tokens
if (!credentials.pat.startsWith('lin_api_')) {
  return { valid: false, error: 'Must start with lin_api_' };
}
```

**Status:** ✅ **FIXED** in `lib/providers/linear.ts`

---

## Checklist: Adding a New Provider

Follow this order to avoid all 3 errors:

### Step 1: Database Migration (Do This FIRST)
```sql
-- Add to allowed providers list
ALTER TABLE user_credentials DROP CONSTRAINT user_credentials_provider_check;
ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_provider_check
  CHECK (provider IN ('github', 'jira', 'slack', 'linear', 'calendar', 'NEW_PROVIDER'));
```

### Step 2: Create Provider Adapter
```typescript
// lib/providers/new-provider.ts
export class NewProviderAdapter implements ProviderAdapter {
  readonly name = 'new-provider' as const;
  readonly baseUrl = 'https://api.newprovider.com';

  validateCredentials(credentials: ProviderCredentials) {
    if (!credentials.pat) {
      return { valid: false, error: 'Token required' };
    }

    // IMPORTANT: Accept both manual tokens AND OAuth tokens
    // Manual tokens often have a prefix, OAuth tokens don't
    const hasValidPrefix = credentials.pat.startsWith('provider_prefix_');
    const isOAuthToken = credentials.pat.length >= 32; // OAuth tokens are long

    if (!hasValidPrefix && !isOAuthToken) {
      return {
        valid: false,
        error: 'Invalid token format',
      };
    }

    return { valid: true };
  }

  // ... rest of adapter
}
```

### Step 3: Register Provider
```typescript
// lib/providers/registry.ts
import { NewProviderAdapter } from './new-provider';

const providerAdapters = {
  // ...
  'new-provider': new NewProviderAdapter(),
};
```

### Step 4: Add OAuth Config (If Using OAuth)
```typescript
// lib/oauth/config.ts
export const OAUTH_PROVIDERS: Record<string, OAuthConfig> = {
  // ...
  'new-provider': {
    name: 'new-provider',
    displayName: 'New Provider',
    authUrl: 'https://provider.com/oauth/authorize',
    tokenUrl: 'https://provider.com/oauth/token',
    scopes: ['read', 'write'],
    usePKCE: false,
    supportsRefreshToken: true,
    clientIdEnvVar: 'NEW_PROVIDER_CLIENT_ID',
    clientSecretEnvVar: 'NEW_PROVIDER_CLIENT_SECRET',
  },
};
```

### Step 5: Add to UI
```typescript
// app/settings/credentials/page.tsx
const PROVIDERS: Provider[] = [
  // ...
  {
    name: 'new-provider',
    displayName: 'New Provider',
    description: 'Connect your New Provider account',
    icon: '🆕',
    fields: [
      {
        key: 'pat',
        label: 'API Token',
        type: 'password',
        required: true,
      },
    ],
  },
];
```

### Step 6: Test
1. ✅ Connect via OAuth → Should save successfully
2. ✅ Connect again → Should UPDATE, not error
3. ✅ Disconnect and reconnect → Should work
4. ✅ Check `user_credentials` table → Should have entry

---

## Why This Order Matters

❌ **Wrong Order (Code First):**
1. Add provider in code
2. Deploy
3. User tries to connect
4. ❌ Database rejects: "unknown provider 'new-provider'"
5. 😡 User sees error
6. Fix database
7. Ask user to try again

✅ **Right Order (Database First):**
1. Update database constraint
2. Add provider in code
3. Deploy
4. ✅ User connects successfully
5. 😊 No errors

---

## Testing New Providers

```bash
# 1. Apply database migration
# (via Supabase Dashboard SQL Editor)

# 2. Restart dev server to pick up code changes
./dev.sh

# 3. Test OAuth flow
open http://localhost:3000/settings/credentials

# 4. Verify in database
# Go to Supabase Dashboard → Table Editor → user_credentials
# Should see new row with provider = 'new-provider'

# 5. Test updating (connect same provider again)
# Should NOT see duplicate key error

# 6. Test widget
# Add widget that uses new provider
# Should fetch real data
```

---

## Common Mistakes

### Mistake #1: Forgetting to Update BOTH Tables
```sql
-- WRONG: Only updating user_credentials
ALTER TABLE user_credentials
  ADD CONSTRAINT CHECK (provider IN ('github', 'new'));

-- RIGHT: Update both tables
ALTER TABLE user_credentials ...
ALTER TABLE webhook_events ...
```

### Mistake #2: Token Validation Too Strict
```typescript
// WRONG: Rejects OAuth tokens
if (!token.startsWith('prefix_')) { ... }

// RIGHT: Accept multiple formats
if (!token.startsWith('prefix_') && token.length < 32) { ... }
```

### Mistake #3: Using INSERT Instead of UPSERT
```typescript
// WRONG: Fails on second save
.insert(data)

// RIGHT: Works every time
.upsert(data)
// OR use POST with Prefer: resolution=merge-duplicates
```

---

## Quick Reference

| Step | Action | File/Location |
|------|--------|---------------|
| 1 | Update DB constraint | Supabase SQL Editor |
| 2 | Create provider adapter | `lib/providers/new-provider.ts` |
| 3 | Register adapter | `lib/providers/registry.ts` |
| 4 | Add OAuth config | `lib/oauth/config.ts` |
| 5 | Add to UI | `app/settings/credentials/page.tsx` |
| 6 | Test | http://localhost:3000/settings/credentials |

---

**Last Updated:** November 20, 2025

**Lessons From:** Debugging GitHub, Jira, Linear, Slack, and Google Calendar OAuth integration
