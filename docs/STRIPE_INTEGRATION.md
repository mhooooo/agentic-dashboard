# Stripe Integration Guide

This guide shows you how to integrate Stripe payments with your Agentic Dashboard, enabling payment tracking, subscription management, and automated workflows triggered by payment events.

---

## Why Stripe Integration?

**What it enables:**
- **Payment tracking**: Display recent payments, subscriptions, and customer information in your dashboard
- **Event-driven workflows**: Trigger automations when payments succeed, subscriptions renew, or charges fail
- **Real-time notifications**: Send Slack/SMS alerts when important payment events occur
- **Customer insights**: Connect payment data with Jira tickets, support tickets, or CRM data

**Use cases:**
- **B2B SaaS**: When payment succeeds → create Jira onboarding ticket → notify sales team in Slack
- **Finance operations**: Track failed payments → flag at-risk customers → send reminder SMS
- **Analytics**: Connect Stripe revenue to customer success metrics across tools
- **Support workflows**: When subscription cancelled → create support ticket → trigger win-back campaign

---

## Prerequisites

### 1. Stripe Account Setup
- Create a Stripe account: https://dashboard.stripe.com/register
- Complete onboarding (business details, bank account)
- Note: You can test with **Test Mode** before going live

### 2. Enable Test Mode
- In Stripe Dashboard, toggle "Test Mode" in top-right corner
- Test mode uses separate API keys and test card numbers
- No real money involved - perfect for development

### 3. Required Information
You'll need:
- **Stripe Account ID** (starts with `acct_`)
- **Client ID** (for OAuth - starts with `ca_`)
- **API Secret Key** (starts with `sk_test_` for test mode, `sk_live_` for production)
- **Webhook Secret** (starts with `whsec_` - for verifying webhook signatures)

---

## Step 1: Create Stripe Connect App

Stripe uses **Stripe Connect** for OAuth, allowing users to connect their Stripe accounts with one click.

### 1. Enable Stripe Connect

**Go to:** https://dashboard.stripe.com/settings/applications

**Steps:**
1. Click **Get Started with Connect**
2. Fill in business information:
   - **Business name**: Agentic Dashboard (or your app name)
   - **Business type**: Select appropriate type
   - **Website URL**: `http://localhost:3000` (development) or your production URL
3. Click **Save and continue**

### 2. Create OAuth Application

**In Connect Settings:**
1. Go to **Settings** → **Connect** → **Integration**
2. Under **OAuth settings**, configure:
   - **Redirect URIs**: Add these URLs (one per line):
     ```
     http://localhost:3000/api/auth/stripe/callback
     https://your-domain.com/api/auth/stripe/callback
     ```
   - **Development mode**: Enable (for testing)
3. Click **Save changes**

### 3. Get OAuth Credentials

**Under OAuth settings:**
1. Copy **Client ID** (starts with `ca_`)
2. Click **View test keys** (top-right toggle)
3. Go to **Developers** → **API Keys**
4. Copy **Secret key** (starts with `sk_test_`)

**Important**: Keep test and live keys separate. Never commit keys to Git.

---

## Step 2: Configure Environment Variables

Add to your `.env.local`:

```bash
# Stripe OAuth Configuration
STRIPE_CLIENT_ID=ca_your_client_id_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Webhook Secret (we'll add this in Step 5)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Notes:**
- Use `sk_test_` keys for development
- Use `sk_live_` keys for production (after going live)
- `STRIPE_CLIENT_ID` is the same for test and live modes
- Never commit `.env.local` to Git (already in `.gitignore`)

---

## Step 3: Add Provider Adapter

Create the Stripe provider adapter to handle API interactions.

### 1. Create Provider File

Create file: `lib/providers/stripe.ts`

```typescript
/**
 * Stripe Provider Adapter
 *
 * Implements API interactions with Stripe REST API v2024-06-20.
 * Supports OAuth 2.0 via Stripe Connect for authentication.
 */

import type {
  ProviderAdapter,
  ProviderCredentials,
  ApiRequestOptions,
  ApiResponse,
  ConnectionTestResult,
  RateLimitInfo,
  ApiError,
} from './types';

export class StripeAdapter implements ProviderAdapter {
  readonly name = 'stripe' as const;
  readonly baseUrl = 'https://api.stripe.com/v1';

  /**
   * Get authentication headers for Stripe API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.pat) {
      throw new Error('Stripe access token is required');
    }

    return {
      'Authorization': `Bearer ${credentials.pat}`,
      'Stripe-Version': '2024-06-20',
    };
  }

  /**
   * Validate Stripe credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.pat) {
      return { valid: false, error: 'Stripe access token is required' };
    }

    // Stripe tokens: sk_test_* (test mode), sk_live_* (live mode), or OAuth tokens (rk_*)
    const hasValidPrefix =
      credentials.pat.startsWith('sk_test_') ||
      credentials.pat.startsWith('sk_live_') ||
      credentials.pat.startsWith('rk_'); // Restricted keys (OAuth)

    const isOAuthToken = credentials.pat.length >= 32; // OAuth tokens are long

    if (!hasValidPrefix && !isOAuthToken) {
      return {
        valid: false,
        error: 'Invalid Stripe token format. Token should start with "sk_test_", "sk_live_", or "rk_"',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to Stripe API
   */
  async request<T = any>(
    credentials: ProviderCredentials,
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    try {
      // Validate credentials
      const validation = this.validateCredentials(credentials);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: validation.error || 'Invalid credentials',
            provider: 'stripe',
            retryable: false,
            action: 'reconnect',
          },
        };
      }

      // Build URL with query parameters
      const url = new URL(`${this.baseUrl}${options.endpoint}`);
      if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
      }

      // Make request
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          ...this.getAuthHeaders(credentials),
          ...options.headers,
          ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: options.body ? this.encodeFormData(options.body) : undefined,
      });

      // Parse rate limit (Stripe doesn't expose rate limits in headers)
      const rateLimit = undefined;

      // Handle errors
      if (!response.ok) {
        const error = await this.parseError(response);
        return {
          success: false,
          error,
          rateLimit,
        };
      }

      // Parse response
      const data = await response.json();

      return {
        success: true,
        data: data as T,
        rateLimit,
      };
    } catch (error) {
      // Network or unexpected errors
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
          provider: 'stripe',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Stripe API
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const result = await this.request<{ id: string; email: string }>(credentials, {
      endpoint: '/account',
      method: 'GET',
    });

    if (result.success && result.data) {
      return {
        success: true,
        username: result.data.id,
        metadata: {
          email: result.data.email,
        },
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Parse rate limit information (Stripe doesn't provide this)
   */
  parseRateLimit(headers: Headers): RateLimitInfo | undefined {
    return undefined;
  }

  /**
   * Parse error from Stripe API response
   */
  private async parseError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    // Stripe returns errors in { error: { type, message, code } } format
    const stripeError = errorData.error || {};

    // Map HTTP status to error code
    const statusCodeMap: Record<number, ApiError['code']> = {
      401: 'UNAUTHORIZED',
      402: 'INVALID_REQUEST', // Payment required
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';

    return {
      code,
      message: stripeError.message || `Stripe API error: ${response.status}`,
      provider: 'stripe',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: stripeError,
    };
  }

  /**
   * Encode body as form data (Stripe uses application/x-www-form-urlencoded)
   */
  private encodeFormData(data: any): string {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }
}

// Export singleton instance
export const stripeAdapter = new StripeAdapter();
```

### 2. Update Provider Registry

Edit `lib/providers/registry.ts`:

```typescript
import { stripeAdapter } from './stripe';

const providerAdapters = {
  // ... existing providers
  'stripe': stripeAdapter,
};

export type ProviderName = 'github' | 'jira' | 'linear' | 'slack' | 'calendar' | 'stripe';
```

### 3. Update Database Constraint

**IMPORTANT**: Do this BEFORE deploying code.

Run in Supabase SQL Editor:

```sql
-- Add 'stripe' to allowed providers
ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_provider_check;
ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_provider_check
  CHECK (provider IN ('github', 'jira', 'slack', 'linear', 'calendar', 'stripe'));

ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_provider_check;
ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_provider_check
  CHECK (provider IN ('github', 'jira', 'slack', 'linear', 'calendar', 'stripe'));
```

---

## Step 4: Add OAuth Routes

Create OAuth callback routes to handle Stripe Connect flow.

### 1. Create Authorization Route

Create file: `app/api/auth/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  if (!STRIPE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Stripe OAuth not configured' },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie
  const response = NextResponse.redirect(
    `https://connect.stripe.com/oauth/authorize?` +
    `response_type=code&` +
    `client_id=${STRIPE_CLIENT_ID}&` +
    `scope=read_write&` +
    `state=${state}&` +
    `redirect_uri=${NEXT_PUBLIC_APP_URL}/api/auth/stripe/callback`
  );

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  });

  return response;
}
```

### 2. Create Callback Route

Create file: `app/api/auth/stripe/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Check for errors
  if (error) {
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/settings/credentials?error=${error}`
    );
  }

  // Validate state (CSRF protection)
  const savedState = request.cookies.get('oauth_state')?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/settings/credentials?error=invalid_state`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/settings/credentials?error=no_code`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: STRIPE_CLIENT_ID!,
        client_secret: STRIPE_SECRET_KEY!,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }

    const tokens = await tokenResponse.json();

    // Save credentials to database
    // TODO: Implement credential storage via your backend proxy
    // Example:
    // await saveCredentials({
    //   provider: 'stripe',
    //   credentials: {
    //     pat: tokens.access_token,
    //     refresh_token: tokens.refresh_token,
    //     stripe_user_id: tokens.stripe_user_id,
    //   },
    // });

    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/settings/credentials?success=stripe`
    );
  } catch (error) {
    console.error('Stripe OAuth error:', error);
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/settings/credentials?error=token_exchange_failed`
    );
  }
}
```

---

## Step 5: Create "Recent Payments" Widget

Create a declarative widget definition to display recent Stripe payments.

### Widget Definition JSON

Create file: `lib/widgets/definitions/stripe-payments.json`

```json
{
  "type": "stripe-payments",
  "version": 1,
  "name": "Recent Payments",
  "description": "Display recent successful payments from Stripe",
  "provider": "stripe",

  "dataSource": {
    "type": "api",
    "endpoint": "/charges",
    "method": "GET",
    "params": {
      "limit": 20
    },
    "refreshInterval": 30000
  },

  "transform": {
    "path": "data",
    "mapItem": {
      "id": "id",
      "amount": "amount",
      "currency": "currency",
      "customer": "customer",
      "status": "status",
      "created": "created",
      "description": "description",
      "receipt_url": "receipt_url"
    },
    "filter": [
      {
        "field": "status",
        "operator": "==",
        "value": "succeeded"
      }
    ],
    "sort": {
      "field": "created",
      "direction": "desc"
    }
  },

  "display": {
    "view": "list",
    "layout": {
      "height": "fixed",
      "emptyState": "No recent payments"
    },
    "fields": [
      {
        "key": "amount",
        "label": "Amount",
        "type": "number",
        "format": "currency"
      },
      {
        "key": "customer",
        "label": "Customer",
        "type": "text"
      },
      {
        "key": "description",
        "label": "Description",
        "type": "text"
      },
      {
        "key": "status",
        "label": "Status",
        "type": "badge",
        "style": [
          {
            "condition": "status === 'succeeded'",
            "className": "bg-green-100 text-green-800"
          }
        ]
      },
      {
        "key": "created",
        "label": "Date",
        "type": "date",
        "format": "relative-time"
      }
    ],
    "actions": [
      {
        "trigger": "click",
        "event": "payment.selected"
      }
    ]
  },

  "events": {
    "onItemClick": {
      "eventName": "stripe.payment.selected",
      "payload": ["id", "amount", "currency", "customer", "status"],
      "source": "stripe-payments-widget"
    }
  },

  "subscriptions": []
}
```

### Register Widget

Add to `lib/widgets/registry.ts`:

```typescript
export const WIDGET_REGISTRY: Record<string, WidgetMetadata> = {
  // ... existing widgets
  'stripe-payments': {
    type: 'stripe-payments',
    version: 1,
    name: 'Recent Payments',
    description: 'Display recent successful payments from Stripe',
    defaultConfig: {},
  },
};
```

---

## Step 6: Configure Webhooks (Optional)

Webhooks enable real-time event notifications from Stripe.

### 1. Create Webhook Endpoint

Stripe will POST events to this endpoint.

Create file: `app/api/webhooks/stripe/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    // Handle event
    switch (event.type) {
      case 'charge.succeeded':
        const charge = event.data.object;
        // Publish to Event Mesh
        // await publishEvent('stripe.payment.received', {
        //   id: charge.id,
        //   amount: charge.amount,
        //   currency: charge.currency,
        //   customer: charge.customer,
        // });
        break;

      case 'customer.subscription.created':
        const subscription = event.data.object;
        // Publish to Event Mesh
        // await publishEvent('stripe.subscription.created', {
        //   id: subscription.id,
        //   customer: subscription.customer,
        //   status: subscription.status,
        // });
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
}
```

### 2. Register Webhook in Stripe Dashboard

**Go to:** https://dashboard.stripe.com/webhooks

**Steps:**
1. Click **Add endpoint**
2. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe`
   - For local testing: Use ngrok or similar tunnel
3. **Events to send**: Select events you want to receive:
   - `charge.succeeded`
   - `charge.failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. Copy **Signing secret** (starts with `whsec_`)
6. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## Step 7: Testing

### 1. Test OAuth Connection

```bash
# Start dev server
./dev.sh

# Open credentials page
open http://localhost:3000/settings/credentials

# Click "Connect Stripe"
# You'll be redirected to Stripe OAuth
# Approve permissions
# Redirected back with success message
```

### 2. Test Widget Data Fetching

```bash
# Add "Recent Payments" widget to dashboard
# Widget should fetch and display payments

# If no data appears:
# - Check browser console for errors
# - Verify Stripe API key is correct
# - Ensure you have test payments in Stripe Dashboard
```

### 3. Create Test Payment

Use Stripe test cards to create test payments:

**In Stripe Dashboard:**
1. Go to **Payments** → **Create payment**
2. Use test card: `4242 4242 4242 4242`
3. Expiry: Any future date
4. CVC: Any 3 digits
5. Click **Pay**

**Widget should update** with new payment (after refresh interval).

### 4. Test Event Publishing

```bash
# Click a payment in the widget
# Open Event Debugger (bottom-right icon)
# Should see event: "stripe.payment.selected"
# Payload should include: id, amount, currency, customer, status
```

### 5. Test Webhooks (Optional)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test event
stripe trigger charge.succeeded

# Check terminal for webhook event
# Check Event Mesh for published event
```

---

## Troubleshooting

### "Stripe OAuth not configured" Error

**Cause**: Missing environment variables

**Fix**: Ensure these are set in `.env.local`:
```bash
STRIPE_CLIENT_ID=ca_...
STRIPE_SECRET_KEY=sk_test_...
```

Restart dev server after adding variables.

---

### "Invalid token format" Error

**Cause**: Token validation too strict or wrong key type

**Fix**: Check token prefix:
- Test mode: `sk_test_*`
- Live mode: `sk_live_*`
- OAuth: `rk_*` (restricted key)

If using OAuth, ensure adapter validates all formats (see Step 3).

---

### "No payments showing" in Widget

**Cause**: No test data or API error

**Fix**:
1. Create test payments in Stripe Dashboard
2. Check browser console for API errors
3. Verify endpoint: `/charges` vs `/v1/charges`
4. Check Stripe API version in headers: `2024-06-20`

---

### Webhook Signature Verification Fails

**Cause**: Wrong webhook secret or signature mismatch

**Fix**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
2. Ensure webhook endpoint uses raw body (not parsed JSON)
3. Check Stripe CLI output: `stripe listen --print-secret`

---

### Rate Limiting

**Issue**: Stripe rate limits: 100 requests/second (test mode)

**Fix**:
- Add retry logic with exponential backoff
- Cache responses when possible
- Use webhooks instead of polling

---

## Production Checklist

Before going live with Stripe integration:

### Security
- [ ] Switch from test keys (`sk_test_`) to live keys (`sk_live_`)
- [ ] Store keys in secure environment variables (not in code)
- [ ] Enable webhook signature verification
- [ ] Use HTTPS for all callback URLs
- [ ] Implement proper error handling and logging

### Compliance
- [ ] Review Stripe's terms of service
- [ ] Implement PCI compliance measures (use Stripe Elements, never store card data)
- [ ] Add privacy policy disclosure about Stripe data processing
- [ ] Enable Stripe Radar for fraud prevention

### Performance
- [ ] Set appropriate refresh intervals (avoid polling too frequently)
- [ ] Implement caching for frequently accessed data
- [ ] Use webhooks for real-time updates instead of polling
- [ ] Monitor API usage and stay within rate limits

### User Experience
- [ ] Add loading states during OAuth flow
- [ ] Show clear error messages if connection fails
- [ ] Provide reconnect option if token expires
- [ ] Display payment amounts in correct currency format

---

## Example Workflows

### Workflow 1: Payment → Jira Ticket

When a payment succeeds, automatically create a Jira onboarding ticket.

**Event Flow:**
1. Stripe webhook → `/api/webhooks/stripe` → Publishes `stripe.payment.received` event
2. Backend automation listens for `stripe.payment.received`
3. Creates Jira ticket: "Onboard new customer: {customer_email}"
4. Publishes `jira.issue.created` event
5. Slack widget subscribes to `jira.issue.created` → Posts to #sales channel

**Implementation hint**: See Month 5 orchestration architecture.

---

### Workflow 2: Failed Payment → SMS Reminder

When a payment fails, send SMS reminder to customer.

**Event Flow:**
1. Stripe webhook → `charge.failed` event → Publishes `stripe.payment.failed`
2. Twilio automation listens for `stripe.payment.failed`
3. Sends SMS: "Your payment failed. Please update your payment method: {link}"
4. Publishes `twilio.sms.sent` event

---

## Next Steps

After setting up Stripe integration:

1. **Add Subscription Widget**: Display active subscriptions, MRR, churn rate
2. **Build Custom Reports**: Connect Stripe data with other tools for insights
3. **Automate Workflows**: Use Event Mesh to trigger actions on payment events
4. **Monitor Webhooks**: Set up logging and alerting for webhook failures
5. **Optimize Performance**: Cache frequently accessed data, use webhooks over polling

---

**Last Updated**: November 24, 2025
**Version**: 1.0.0
**Stripe API Version**: 2024-06-20
