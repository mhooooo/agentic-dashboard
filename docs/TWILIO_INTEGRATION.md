# Twilio Integration Guide

This guide shows you how to integrate Twilio SMS and voice calling with your Agentic Dashboard, enabling automated notifications, reminders, and communication workflows triggered by events from other services.

---

## Why Twilio Integration?

**What it enables:**
- **SMS notifications**: Send text messages when important events occur (payments fail, meetings start, tickets update)
- **Voice calls**: Trigger phone calls for critical alerts or reminders
- **Two-way communication**: Receive SMS/calls and trigger dashboard actions
- **Event-driven workflows**: Connect any dashboard event to SMS/voice notifications

**Use cases:**
- **Payment alerts**: When Stripe payment fails → send SMS reminder to customer
- **Meeting reminders**: 10 minutes before calendar event → send SMS to attendees
- **On-call notifications**: When Jira P0 bug created → call on-call engineer
- **Customer support**: When support ticket escalated → send SMS to manager
- **Delivery updates**: When shipment status changes → notify customer via SMS

---

## Prerequisites

### 1. Twilio Account Setup
- Create a Twilio account: https://www.twilio.com/try-twilio
- Complete phone number verification
- Note: New accounts start with **trial mode** ($15 credit)

### 2. Trial Mode vs. Production

**Trial Mode** (Free):
- Can only send to verified phone numbers
- Messages include "Sent from a Twilio trial account" prefix
- Perfect for development and testing

**Production Mode** (Paid):
- Send to any phone number
- No message prefix
- Requires paid account upgrade

### 3. Required Information
You'll need:
- **Account SID** (starts with `AC`)
- **Auth Token** (32-character string)
- **Phone Number** (starts with `+1` or country code)

---

## Step 1: Get Twilio Credentials

### 1. Sign Up for Twilio

**Go to:** https://www.twilio.com/try-twilio

**Steps:**
1. Enter your email and create password
2. Verify email address
3. Complete phone verification (you'll receive SMS code)
4. Select "SMS" as primary use case
5. Choose "With code" (not no-code)

### 2. Get Account Credentials

**From Twilio Console:** https://console.twilio.com/

**Steps:**
1. On dashboard, find "Account Info" section
2. Copy **Account SID** (starts with `AC`)
3. Copy **Auth Token** (click "Show" to reveal)
   - **Important**: Keep this secret! It's like a password.

### 3. Get Phone Number

**In Twilio Console:**
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select country (e.g., United States)
3. Check capabilities needed:
   - **SMS**: For text messages
   - **Voice**: For phone calls
   - **MMS**: For multimedia messages (optional)
4. Click **Search**
5. Choose a number (trial accounts get 1 free)
6. Click **Buy**

**Copy your phone number** (format: `+15551234567`)

---

## Step 2: Configure Environment Variables

Add to your `.env.local`:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Optional: For receiving webhooks
TWILIO_WEBHOOK_SECRET=your_generated_secret_here
```

**Security notes:**
- **Never commit** `.env.local` to Git (already in `.gitignore`)
- Auth Token is sensitive - treat like a password
- Rotate Auth Token periodically (in Twilio Console → Settings → General)

---

## Step 3: Add Provider Adapter

Create the Twilio provider adapter to handle API interactions.

### 1. Create Provider File

Create file: `lib/providers/twilio.ts`

```typescript
/**
 * Twilio Provider Adapter
 *
 * Implements API interactions with Twilio REST API v2010-04-01.
 * Supports sending SMS, making voice calls, and receiving webhooks.
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

export class TwilioAdapter implements ProviderAdapter {
  readonly name = 'twilio' as const;
  readonly baseUrl = 'https://api.twilio.com/2010-04-01';

  /**
   * Get authentication headers for Twilio API
   */
  getAuthHeaders(credentials: ProviderCredentials): Record<string, string> {
    if (!credentials.accountSid || !credentials.authToken) {
      throw new Error('Twilio Account SID and Auth Token are required');
    }

    // Twilio uses HTTP Basic Auth: Base64(AccountSID:AuthToken)
    const auth = Buffer.from(
      `${credentials.accountSid}:${credentials.authToken}`
    ).toString('base64');

    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  /**
   * Validate Twilio credentials format
   */
  validateCredentials(credentials: ProviderCredentials): { valid: boolean; error?: string } {
    if (!credentials.accountSid) {
      return { valid: false, error: 'Twilio Account SID is required' };
    }

    if (!credentials.authToken) {
      return { valid: false, error: 'Twilio Auth Token is required' };
    }

    // Account SID starts with 'AC' and is 34 characters
    if (!credentials.accountSid.startsWith('AC') || credentials.accountSid.length !== 34) {
      return {
        valid: false,
        error: 'Invalid Account SID format. Should start with "AC" and be 34 characters',
      };
    }

    // Auth Token is 32 characters
    if (credentials.authToken.length !== 32) {
      return {
        valid: false,
        error: 'Invalid Auth Token format. Should be 32 characters',
      };
    }

    return { valid: true };
  }

  /**
   * Make a request to Twilio API
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
            provider: 'twilio',
            retryable: false,
            action: 'reconnect',
          },
        };
      }

      // Build URL (Twilio uses AccountSid in path)
      const accountSid = credentials.accountSid;
      const endpoint = options.endpoint.startsWith('/Accounts')
        ? options.endpoint
        : `/Accounts/${accountSid}${options.endpoint}`;

      const url = `${this.baseUrl}${endpoint}`;

      // Make request
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: this.getAuthHeaders(credentials),
        body: options.body ? this.encodeFormData(options.body) : undefined,
      });

      // Parse rate limit (Twilio doesn't expose rate limits in headers)
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
          provider: 'twilio',
          retryable: true,
          action: 'retry',
        },
      };
    }
  }

  /**
   * Test connection with Twilio API
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const accountSid = credentials.accountSid;
    const result = await this.request<{ friendly_name: string; status: string }>(
      credentials,
      {
        endpoint: `/Accounts/${accountSid}.json`,
        method: 'GET',
      }
    );

    if (result.success && result.data) {
      return {
        success: true,
        username: accountSid,
        metadata: {
          friendlyName: result.data.friendly_name,
          status: result.data.status,
        },
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * Parse rate limit information (Twilio doesn't provide this)
   */
  parseRateLimit(headers: Headers): RateLimitInfo | undefined {
    return undefined;
  }

  /**
   * Parse error from Twilio API response
   */
  private async parseError(response: Response): Promise<ApiError> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    // Twilio returns errors in { code, message, more_info, status } format
    const twilioCode = errorData.code;
    const twilioMessage = errorData.message || response.statusText;

    // Map HTTP status to error code
    const statusCodeMap: Record<number, ApiError['code']> = {
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
    };

    const code = statusCodeMap[response.status] || 'PROVIDER_ERROR';

    return {
      code,
      message: twilioMessage,
      provider: 'twilio',
      retryable: code === 'RATE_LIMITED' || code === 'PROVIDER_ERROR',
      action: code === 'UNAUTHORIZED' || code === 'FORBIDDEN' ? 'reconnect' : 'retry',
      details: {
        twilioCode,
        moreInfo: errorData.more_info,
      },
    };
  }

  /**
   * Encode body as form data (Twilio uses application/x-www-form-urlencoded)
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

  /**
   * Helper: Send SMS
   */
  async sendSms(
    credentials: ProviderCredentials,
    to: string,
    body: string,
    from?: string
  ): Promise<ApiResponse<any>> {
    const fromNumber = from || credentials.phoneNumber;

    if (!fromNumber) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'From phone number is required',
          provider: 'twilio',
          retryable: false,
          action: 'contact-support',
        },
      };
    }

    return this.request(credentials, {
      endpoint: '/Messages.json',
      method: 'POST',
      body: {
        To: to,
        From: fromNumber,
        Body: body,
      },
    });
  }

  /**
   * Helper: Make voice call
   */
  async makeCall(
    credentials: ProviderCredentials,
    to: string,
    twiml: string,
    from?: string
  ): Promise<ApiResponse<any>> {
    const fromNumber = from || credentials.phoneNumber;

    if (!fromNumber) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'From phone number is required',
          provider: 'twilio',
          retryable: false,
          action: 'contact-support',
        },
      };
    }

    return this.request(credentials, {
      endpoint: '/Calls.json',
      method: 'POST',
      body: {
        To: to,
        From: fromNumber,
        Twiml: twiml,
      },
    });
  }
}

// Export singleton instance
export const twilioAdapter = new TwilioAdapter();
```

### 2. Update Provider Types

Edit `lib/providers/types.ts`:

```typescript
export type ProviderName = 'github' | 'jira' | 'linear' | 'slack' | 'calendar' | 'stripe' | 'twilio';

export interface ProviderCredentials {
  pat?: string; // For token-based auth
  email?: string; // For Jira
  url?: string; // For Jira
  refresh_token?: string; // For OAuth
  expires_at?: number; // For OAuth

  // Twilio-specific
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;

  [key: string]: any; // Additional fields
}
```

### 3. Update Provider Registry

Edit `lib/providers/registry.ts`:

```typescript
import { twilioAdapter } from './twilio';

const providerAdapters = {
  // ... existing providers
  'twilio': twilioAdapter,
};
```

### 4. Update Database Constraint

**IMPORTANT**: Do this BEFORE deploying code.

Run in Supabase SQL Editor:

```sql
-- Add 'twilio' to allowed providers
ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_provider_check;
ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_provider_check
  CHECK (provider IN ('github', 'jira', 'slack', 'linear', 'calendar', 'stripe', 'twilio'));

ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_provider_check;
ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_provider_check
  CHECK (provider IN ('github', 'jira', 'slack', 'linear', 'calendar', 'stripe', 'twilio'));
```

---

## Step 4: Create "Send SMS" Action Widget

Create an action widget that allows users to send SMS messages.

### Widget Definition JSON

Create file: `lib/widgets/definitions/twilio-send-sms.json`

```json
{
  "type": "twilio-send-sms",
  "version": 1,
  "name": "Send SMS",
  "description": "Send SMS messages via Twilio",
  "provider": "twilio",

  "dataSource": {
    "type": "static",
    "data": []
  },

  "display": {
    "view": "card",
    "layout": {
      "height": "auto"
    },
    "fields": [
      {
        "key": "to",
        "label": "To Phone Number",
        "type": "text",
        "placeholder": "+15551234567"
      },
      {
        "key": "body",
        "label": "Message",
        "type": "text",
        "placeholder": "Your message here..."
      }
    ],
    "actions": [
      {
        "trigger": "click",
        "event": "sms.send"
      }
    ]
  },

  "events": {
    "onSubmit": {
      "eventName": "twilio.sms.send",
      "payload": ["to", "body"],
      "source": "twilio-send-sms-widget"
    }
  },

  "subscriptions": [
    {
      "pattern": "stripe.payment.failed",
      "action": "auto-fill",
      "autoFillMapping": {
        "to": "customer_phone",
        "body": "Your payment of {{amount}} {{currency}} failed. Please update your payment method."
      }
    }
  ]
}
```

### Register Widget

Add to `lib/widgets/registry.ts`:

```typescript
export const WIDGET_REGISTRY: Record<string, WidgetMetadata> = {
  // ... existing widgets
  'twilio-send-sms': {
    type: 'twilio-send-sms',
    version: 1,
    name: 'Send SMS',
    description: 'Send SMS messages via Twilio',
    defaultConfig: {},
  },
};
```

---

## Step 5: Add Credentials UI

Update the credentials page to allow manual entry of Twilio credentials.

### Update Credentials Page

Edit `app/settings/credentials/page.tsx`:

```typescript
const PROVIDERS: Provider[] = [
  // ... existing providers
  {
    name: 'twilio',
    displayName: 'Twilio',
    description: 'Send SMS and make voice calls',
    icon: '📱',
    fields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        type: 'text',
        required: true,
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        helpText: 'Starts with AC, 34 characters',
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        type: 'password',
        required: true,
        helpText: '32-character secret token',
      },
      {
        key: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
        placeholder: '+15551234567',
        helpText: 'Your Twilio phone number (with country code)',
      },
    ],
  },
];
```

---

## Step 6: Create Automation Endpoint

Create backend endpoint to handle SMS sending (triggered by events).

### Create SMS Send API Route

Create file: `app/api/actions/twilio/send-sms/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { twilioAdapter } from '@/lib/providers/twilio';

export async function POST(request: NextRequest) {
  try {
    const { to, body, userId } = await request.json();

    if (!to || !body) {
      return NextResponse.json(
        { error: 'Missing required fields: to, body' },
        { status: 400 }
      );
    }

    // Fetch Twilio credentials from database
    // TODO: Implement credential fetching
    // const credentials = await getCredentials(userId, 'twilio');

    // For now, use environment variables
    const credentials = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    };

    if (!credentials.accountSid || !credentials.authToken) {
      return NextResponse.json(
        { error: 'Twilio not configured for this user' },
        { status: 400 }
      );
    }

    // Send SMS
    const result = await twilioAdapter.sendSms(
      credentials,
      to,
      body
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || 'Failed to send SMS' },
        { status: 500 }
      );
    }

    // Publish event to Event Mesh
    // TODO: Implement event publishing
    // await publishEvent('twilio.sms.sent', {
    //   to,
    //   body,
    //   messageSid: result.data.sid,
    // });

    return NextResponse.json({
      success: true,
      messageSid: result.data.sid,
    });
  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Step 7: Testing

### 1. Test Credentials Connection

```bash
# Start dev server
./dev.sh

# Open credentials page
open http://localhost:3000/settings/credentials

# Fill in Twilio credentials:
# - Account SID: AC... (from Twilio Console)
# - Auth Token: (from Twilio Console)
# - Phone Number: +15551234567 (your Twilio number)

# Click "Save"
# Should show "Connected" status
```

### 2. Verify Phone Number (Trial Mode)

**In Twilio Console:**
1. Go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. Click **Add a new number**
3. Enter your phone number (where you want to receive test SMS)
4. Verify via SMS code
5. Now you can send test SMS to this number

### 3. Test Sending SMS

**Option A: Using Widget**
```bash
# Add "Send SMS" widget to dashboard
# Fill in:
# - To: Your verified phone number (+15551234567)
# - Message: "Test message from Agentic Dashboard"
# Click "Send"
# Check your phone for SMS
```

**Option B: Using API Directly**
```bash
curl -X POST http://localhost:3000/api/actions/twilio/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "body": "Test message from API",
    "userId": "your-user-id"
  }'
```

### 4. Test Event-Driven SMS

```bash
# Scenario: Send SMS when Stripe payment fails

# 1. Set up Stripe webhook (see STRIPE_INTEGRATION.md)
# 2. Create automation that listens for "stripe.payment.failed"
# 3. Trigger test payment failure in Stripe Dashboard
# 4. Automation should call Twilio API to send SMS
# 5. Check phone for SMS notification
```

---

## Step 8: Example Automation (Payment Reminder)

Create an automation that sends SMS when Stripe payment fails.

### Create Automation File

Create file: `lib/automations/payment-reminder.ts`

```typescript
/**
 * Payment Reminder Automation
 *
 * When Stripe payment fails, send SMS reminder to customer.
 */

import { useEventMesh } from '@/lib/event-mesh/mesh';
import { twilioAdapter } from '@/lib/providers/twilio';

export function setupPaymentReminderAutomation() {
  const { subscribe } = useEventMesh.getState();

  // Listen for payment failures
  subscribe('stripe.payment.failed', async (payload) => {
    const { customer_phone, amount, currency } = payload;

    if (!customer_phone) {
      console.warn('No phone number for customer, skipping SMS');
      return;
    }

    // Get Twilio credentials
    // TODO: Fetch from database based on user
    const credentials = {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    };

    // Send SMS
    const message = `Your payment of ${amount} ${currency} failed. Please update your payment method at: https://yourapp.com/billing`;

    const result = await twilioAdapter.sendSms(
      credentials,
      customer_phone,
      message
    );

    if (result.success) {
      console.log(`SMS sent to ${customer_phone}: ${result.data.sid}`);

      // Publish success event
      useEventMesh.getState().publish('twilio.sms.sent', {
        to: customer_phone,
        messageSid: result.data.sid,
        body: message,
      });
    } else {
      console.error(`Failed to send SMS: ${result.error?.message}`);
    }
  });
}
```

### Register Automation

Edit `app/layout.tsx` or create automation initializer:

```typescript
'use client';

import { useEffect } from 'react';
import { setupPaymentReminderAutomation } from '@/lib/automations/payment-reminder';

export function AutomationProvider() {
  useEffect(() => {
    // Initialize automations
    setupPaymentReminderAutomation();
  }, []);

  return null;
}
```

---

## Troubleshooting

### "Account SID or Auth Token invalid" Error

**Cause**: Wrong credentials or typo

**Fix**:
1. Double-check Account SID (34 chars, starts with `AC`)
2. Regenerate Auth Token in Twilio Console: Settings → General → API Credentials
3. Clear browser cache and re-enter credentials

---

### "To number is not a valid phone number" Error

**Cause**: Invalid phone number format

**Fix**:
- Use E.164 format: `+[country code][number]`
- Examples:
  - US: `+15551234567`
  - UK: `+447911123456`
  - India: `+919876543210`
- Remove spaces, dashes, parentheses

---

### "Cannot send SMS to unverified number" Error (Trial Mode)

**Cause**: Trying to send to unverified number in trial mode

**Fix**:
1. Verify recipient number in Twilio Console: Phone Numbers → Verified Caller IDs
2. OR upgrade to paid account to send to any number

---

### SMS Not Received

**Possible causes:**
1. **Carrier blocking**: Some carriers block automated SMS
2. **Phone off/no signal**: Recipient phone not reachable
3. **Invalid number**: Wrong format or non-existent number
4. **Geographic permissions**: Twilio account may not have permission for that country

**Fix**:
- Check Twilio logs: Console → Monitor → Logs → Messaging
- Look for delivery status: `queued`, `sent`, `delivered`, or `failed`
- If failed, check error code in logs

---

### Rate Limiting

**Issue**: Twilio rate limits vary by account type:
- **Trial**: 1 SMS per second
- **Standard**: Higher limits based on account history

**Fix**:
- Implement queue for high-volume sending
- Add delays between messages
- Upgrade account for higher limits
- Use Messaging Services for better throughput

---

## Production Checklist

Before going live with Twilio integration:

### Account Setup
- [ ] Upgrade from trial to paid account
- [ ] Register business in Twilio Console
- [ ] Complete A2P 10DLC registration (US SMS compliance)
- [ ] Set up billing alerts to avoid surprise charges

### Security
- [ ] Rotate Auth Token periodically
- [ ] Store credentials in secure environment variables (not in code)
- [ ] Implement webhook signature verification for incoming SMS/calls
- [ ] Use HTTPS for all webhook URLs
- [ ] Add rate limiting to prevent abuse

### Compliance
- [ ] Add opt-out language to SMS: "Reply STOP to unsubscribe"
- [ ] Implement opt-out handling (STOP, UNSUBSCRIBE keywords)
- [ ] Follow TCPA compliance (US) and GDPR (EU)
- [ ] Get user consent before sending SMS
- [ ] Keep records of consent

### Cost Management
- [ ] Understand pricing: ~$0.0079 per SMS (US), varies by country
- [ ] Set up budget alerts in Twilio Console
- [ ] Monitor usage regularly
- [ ] Implement SMS throttling to control costs

### User Experience
- [ ] Add confirmation before sending SMS (prevent accidental sends)
- [ ] Show delivery status in UI (`queued`, `sent`, `delivered`, `failed`)
- [ ] Provide clear error messages if send fails
- [ ] Allow users to test with their own phone first

---

## Cost Estimation

**Twilio pricing** (as of 2025, US numbers):
- **SMS (outbound)**: $0.0079 per message
- **Phone number**: $1.15/month
- **Voice calls**: $0.013/minute

**Example monthly costs:**
- 1,000 SMS/month: $7.90
- 10,000 SMS/month: $79.00
- Phone number rental: $1.15

**Cost optimization tips:**
- Use SMS sparingly for critical notifications
- Batch notifications to reduce message count
- Consider Slack/email for non-urgent notifications
- Use short messages (160 chars = 1 SMS, 161+ = 2 SMS)

---

## Example Workflows

### Workflow 1: Meeting Reminder

Send SMS 10 minutes before calendar event.

**Event Flow:**
1. Calendar widget publishes `calendar.event.starting_soon` (10 min before)
2. Automation listens for event
3. Sends SMS to attendees: "Meeting starting in 10 minutes: {event_title}"
4. Publishes `twilio.sms.sent` event

---

### Workflow 2: On-Call Alert

Call on-call engineer when P0 bug created in Jira.

**Event Flow:**
1. Jira webhook → `jira.issue.created` event
2. Check priority field: `priority === 'P0'`
3. Look up on-call engineer (from rotation schedule)
4. Make voice call: "Critical P0 bug: {issue_summary}. Press 1 to acknowledge."
5. Publish `twilio.call.initiated` event

---

### Workflow 3: Customer Support Escalation

Send SMS to manager when support ticket escalated.

**Event Flow:**
1. Support system → `support.ticket.escalated` event
2. Look up manager phone number
3. Send SMS: "Support ticket #{ticket_id} escalated: {reason}. Review at: {link}"
4. Publish `twilio.sms.sent` event

---

## Next Steps

After setting up Twilio integration:

1. **Add Voice Call Widget**: Create widget for making phone calls
2. **Implement Incoming SMS**: Handle inbound SMS via webhooks (respond to customer replies)
3. **Build SMS Templates**: Create reusable message templates for common scenarios
4. **Add Delivery Tracking**: Show SMS delivery status in dashboard
5. **Optimize Costs**: Implement SMS batching and throttling

---

## Additional Resources

- **Twilio API Docs**: https://www.twilio.com/docs/sms
- **Phone Number Formatting**: https://www.twilio.com/docs/glossary/what-e164
- **A2P 10DLC Registration**: https://www.twilio.com/docs/sms/a2p-10dlc
- **Error Codes**: https://www.twilio.com/docs/api/errors
- **Best Practices**: https://www.twilio.com/docs/sms/best-practices

---

**Last Updated**: November 24, 2025
**Version**: 1.0.0
**Twilio API Version**: 2010-04-01
