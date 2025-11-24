# Event Mesh V2: Usage Guide

This guide shows how to use Event Mesh V2 persistence layer for self-documentation and debugging.

## Quick Start

### 1. Import the functions

```typescript
import {
  publishDocumentable,
  queryEventHistory,
  updateEventOutcome,
  getEvent,
  type DocumentableEvent,
  type UserIntent,
} from '@/lib/event-mesh/mesh';
```

### 2. Publish a simple event

```typescript
// Minimal usage - just flag for documentation
const event = await publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  timestamp: Date.now(),
  payload: {
    widgetType: 'github_prs',
    providerId: 'github',
  },
  shouldDocument: true, // Include in narratives
});

console.log('Event published:', event.id);
```

### 3. Publish with user intent

```typescript
// Capture WHY the user took this action
const event = await publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  timestamp: Date.now(),
  payload: {
    widgetType: 'stripe_failed_payments',
    providerId: 'stripe',
  },
  shouldDocument: true,
  userIntent: {
    problemSolved: 'Track late payments across all customers',
    painPoint: 'Manually checking Stripe dashboard takes 30 minutes every day',
    goal: 'Automatically see failed payments in dashboard',
    expectedOutcome: 'Dashboard shows failed payments within 1 minute',
    impactMetric: 'Reduce manual payment checking from 30min to 0min per day',
  },
  context: {
    decision: 'User chose webhook approach over polling',
    category: 'feature',
  },
});
```

### 4. Link related events (workflow)

```typescript
// Step 1: Connect provider
const step1 = await publishDocumentable({
  eventName: 'provider.connected',
  source: 'oauth_flow',
  timestamp: Date.now(),
  payload: { providerId: 'stripe' },
  shouldDocument: true,
  userIntent: {
    problemSolved: 'Need access to Stripe payment data',
    painPoint: 'No visibility into payment failures',
    goal: 'Connect Stripe to dashboard',
    expectedOutcome: 'Successfully authenticate and fetch payment data',
  },
});

// Step 2: Create widget (linked to step 1)
const step2 = await publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  timestamp: Date.now(),
  payload: { widgetType: 'stripe_failed_payments' },
  shouldDocument: true,
  context: {
    relatedEvents: [step1.id], // Link to previous step
    decision: 'Widget requires OAuth token from previous step',
  },
});

// Step 3: Create automation (linked to step 1 and 2)
const step3 = await publishDocumentable({
  eventName: 'automation.created',
  source: 'automation_wizard',
  timestamp: Date.now(),
  payload: { trigger: 'stripe.payment.failed' },
  shouldDocument: true,
  context: {
    relatedEvents: [step1.id, step2.id], // Full workflow chain
  },
});
```

### 5. Query event history

```typescript
// Get all widget creation events
const widgets = await queryEventHistory({
  eventName: 'widget.created',
});

// Get recent events (last hour)
const recent = await queryEventHistory({
  startTime: Date.now() - 3600000,
  endTime: Date.now(),
});

// Get workflow with graph traversal
const workflow = await queryEventHistory({
  eventId: step3.id,
  includeRelated: true, // Follow relatedEvents links
  maxDepth: 5, // Max depth to traverse
});

console.log('Workflow events:', workflow.map(e => e.eventName));
// Output: ['provider.connected', 'widget.created', 'automation.created']
```

### 6. Update event outcome (async)

```typescript
// Create automation
const automation = await publishDocumentable({
  eventName: 'automation.triggered',
  timestamp: Date.now(),
  payload: { automationId: 'auto_123' },
  shouldDocument: true,
  userIntent: {
    problemSolved: 'Automate response to payment failures',
    goal: 'Create Jira ticket within 1 minute',
    expectedOutcome: 'Ticket created and team notified',
  },
});

// ... wait for automation to run ...

// Update with actual outcome
await updateEventOutcome(automation.id, {
  outcome: 'Successfully created 5 Jira tickets in first hour, average time: 45 seconds',
  impactMetric: '100% of payment failures now tracked (was 0% before)',
});

// Refetch to see updated outcome
const updated = await getEvent(automation.id);
console.log('Outcome:', updated?.context?.outcome);
```

## Auto-Marking Important Events

The following events are automatically marked with `shouldDocument: true`:

- `widget.created`
- `provider.connected`
- `automation.triggered`
- `workflow.completed`
- `error.occurred`

You don't need to set `shouldDocument` manually for these events.

```typescript
// This event will auto-mark shouldDocument: true
const event = await publishDocumentable({
  eventName: 'error.occurred',
  timestamp: Date.now(),
  payload: { errorCode: 'TOKEN_EXPIRED' },
  // shouldDocument not set - will auto-mark to true
});

console.log(event.shouldDocument); // true
```

## Dev Mode vs Production

### Dev Mode (No Supabase)

When Supabase is not configured:
- Events stored in memory (persists across hot-reloads)
- All functions work the same way
- Data lost on server restart (acceptable for development)

```typescript
// No environment variables set
// Events will be stored in memory automatically
const event = await publishDocumentable({ /* ... */ });
```

### Production (Supabase)

When Supabase is configured:
- Events stored in PostgreSQL database
- RLS enforces user isolation
- Data persisted permanently
- Graph traversal uses recursive SQL

```typescript
// Environment variables set:
// NEXT_PUBLIC_SUPABASE_URL=...
// NEXT_PUBLIC_SUPABASE_ANON_KEY=...

// Events will be persisted to database automatically
const event = await publishDocumentable({ /* ... */ });
```

## Best Practices

### 1. Document Strategically

**DO:**
- Mark user-initiated actions (widget creation, provider connection)
- Mark errors and failures (debugging)
- Mark workflow completions (success tracking)

**DON'T:**
- Mark every low-level event (button clicks, hover states)
- Mark transient UI interactions (modal open/close)
- Mark system health checks

### 2. Capture Intent at the Right Time

**DO:**
- Ask during widget/automation setup (user is engaged)
- Make it optional (skip button)
- Use conversational language

**DON'T:**
- Force 5-field form before user can proceed
- Use technical jargon
- Ask days after action was taken

### 3. Link Events Meaningfully

**DO:**
- Link sequential workflow steps (OAuth → widget → automation)
- Link trigger → action (payment.failed → ticket.created)

**DON'T:**
- Link unrelated events
- Create circular links (infinite loops)

### 4. Update Outcomes Asynchronously

**DO:**
- Update outcomes after workflows complete
- Include actual metrics vs expected

**DON'T:**
- Block user waiting for outcome
- Forget to update (leaves incomplete data)

## Complete Example: Stripe Automation Workflow

```typescript
import {
  publishDocumentable,
  queryEventHistory,
  updateEventOutcome,
} from '@/lib/event-mesh/mesh';

async function setupStripeAutomation() {
  // Step 1: User connects Stripe via OAuth
  const connectEvent = await publishDocumentable({
    eventName: 'provider.connected',
    source: 'oauth_flow',
    timestamp: Date.now(),
    payload: {
      providerId: 'stripe',
      scopes: ['read_payments', 'read_customers'],
    },
    shouldDocument: true,
    userIntent: {
      problemSolved: 'Need access to Stripe payment data',
      painPoint: 'No visibility into payment failures',
      goal: 'Connect Stripe to dashboard',
      expectedOutcome: 'Successfully authenticate and fetch payment data',
    },
  });

  // Step 2: User creates Failed Payments widget
  const widgetEvent = await publishDocumentable({
    eventName: 'widget.created',
    source: 'widget_wizard',
    timestamp: Date.now(),
    payload: {
      widgetType: 'stripe_failed_payments',
      providerId: 'stripe',
    },
    shouldDocument: true,
    userIntent: {
      problemSolved: 'Track late payments across all customers',
      painPoint: 'Manually checking Stripe takes 30min/day',
      goal: 'Automatically see failed payments in dashboard',
      expectedOutcome: 'Dashboard shows failures within 1 minute',
      impactMetric: 'Reduce checking time from 30min to 0min/day',
    },
    context: {
      relatedEvents: [connectEvent.id],
      decision: 'Widget requires OAuth token from previous step',
      category: 'feature',
    },
  });

  // Step 3: User sets up automation
  const automationEvent = await publishDocumentable({
    eventName: 'automation.created',
    source: 'automation_wizard',
    timestamp: Date.now(),
    payload: {
      trigger: 'stripe.payment.failed',
      actions: [
        { type: 'create_jira_ticket' },
        { type: 'send_slack_message', channel: '#billing' },
      ],
    },
    shouldDocument: true,
    userIntent: {
      problemSolved: 'Automate response to payment failures',
      painPoint: 'Manual ticket creation is slow',
      goal: 'Create Jira ticket and notify team when payment fails',
      expectedOutcome: 'Ticket created and Slack sent within 1 minute',
      impactMetric: 'Save 2 hours per week on manual ticket creation',
    },
    context: {
      relatedEvents: [connectEvent.id, widgetEvent.id],
      decision: 'User wants both ticket creation AND notification',
      category: 'feature',
    },
  });

  // Step 4: Automation triggers (1 hour later)
  const triggerEvent = await publishDocumentable({
    eventName: 'automation.triggered',
    source: 'automation_engine',
    timestamp: Date.now(),
    payload: {
      automationId: automationEvent.payload.automationId,
      trigger: { type: 'stripe.payment.failed', amount: 5000 },
    },
    shouldDocument: true,
    context: {
      relatedEvents: [automationEvent.id],
      decision: 'Payment failure detected, triggering automation',
    },
  });

  // Step 5: Update with actual outcome (after automation completes)
  await updateEventOutcome(triggerEvent.id, {
    outcome: 'Successfully created Jira ticket SCRUM-42 and sent Slack notification in 45 seconds',
    impactMetric: 'Saved 10 minutes compared to manual process',
  });

  // Step 6: Query complete workflow
  const workflow = await queryEventHistory({
    eventId: triggerEvent.id,
    includeRelated: true,
    maxDepth: 10,
  });

  console.log('Complete workflow:');
  workflow.forEach((event, i) => {
    console.log(`${i + 1}. ${event.eventName}`);
    if (event.userIntent) {
      console.log(`   Problem: ${event.userIntent.problemSolved}`);
      console.log(`   Goal: ${event.userIntent.goal}`);
    }
    if (event.context?.outcome) {
      console.log(`   Outcome: ${event.context.outcome}`);
    }
  });

  return workflow;
}
```

## Testing

Run the test suite to verify everything works:

```bash
npx tsx lib/event-mesh/test-persistence.ts
```

Expected output:
```
=== Event Mesh V2 Persistence Test ===

Test 1: Publishing simple documentable event...
✅ Simple event published: faab4471-f8fd-473c-bd9b-1e8279d17ed9

Test 2: Publishing event with user intent...
✅ Event with intent published: 3834a7b2-10cc-4abe-ba54-a43bb75577ce

...

=== All Tests Complete ===
```

## Database Schema

The migration creates two tables:

### `event_history`

Stores all DocumentableEvents with user intent and context.

```sql
CREATE TABLE event_history (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  payload JSONB NOT NULL,
  should_document BOOLEAN DEFAULT false,
  user_intent JSONB,
  context JSONB,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id)
);
```

### `narrative_context`

Stores extended context for events requiring rich text or AI-generated narratives.

```sql
CREATE TABLE narrative_context (
  id UUID PRIMARY KEY,
  event_id TEXT REFERENCES event_history(id),
  long_description TEXT,
  screenshots TEXT[],
  code_snippets JSONB,
  ai_narrative TEXT,
  ai_summary TEXT,
  ai_tags TEXT[]
);
```

## Next Steps

1. **Apply Migration**: Run `supabase migration up` to create tables
2. **Integrate in Widgets**: Update widget creation flows to capture user intent
3. **Build Narratives**: Implement AI narrative generation using event history
4. **Add Visualization**: Create Event Debugger UI showing workflow graphs

See `docs/EVENT_MESH_V2.md` for complete specification and advanced usage.
