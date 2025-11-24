# Event Mesh V2: DocumentableEvent Architecture

**Status:** Design Complete (Nov 24, 2025)
**Version:** 2.0.0
**Breaking Changes:** None (fully backward compatible)

---

## Table of Contents

1. [Overview](#overview)
2. [V1 vs V2 Differences](#v1-vs-v2-differences)
3. [DocumentableEvent Schema](#documentableevent-schema)
4. [Breaking Changes](#breaking-changes)
5. [Migration Guide](#migration-guide)
6. [userIntent Field](#userintent-field)
7. [Knowledge Graph Integration](#knowledge-graph-integration)
8. [API Reference](#api-reference)
9. [Examples](#examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Event Mesh V2 introduces **DocumentableEvent**, an enhanced event schema that captures not just *what* happened, but *why* it happened and *what problem it solved*. This enables powerful features like:

- **Explain What Happened:** AI-generated narratives from event history
- **Knowledge Graph:** Link related events to understand workflows
- **Intent Capture:** Record user goals and pain points for future optimization
- **Impact Tracking:** Measure outcomes against user expectations

### Key Design Principles

1. **Backward Compatibility:** All V1 events continue to work unchanged
2. **Progressive Enhancement:** New fields are optional - add when valuable
3. **Zero Configuration:** System auto-marks important events
4. **Developer-Friendly:** Clear interfaces, comprehensive examples

### Use Cases

- **Debugging Workflows:** "Show me why this automation triggered"
- **User Onboarding:** "Explain what this dashboard does"
- **Performance Insights:** "Which widgets solve the most problems?"
- **AI Training:** Use captured intents to improve suggestions

---

## V1 vs V2 Differences

### Event Mesh V1 (Current)

```typescript
interface EventLogEntry {
  id: string;
  eventName: string;
  source: string;
  timestamp: number;
  payload: Record<string, unknown>;
  relatedEvents?: string[];
}
```

**Limitations:**
- No context on WHY event occurred
- No link to user goals or pain points
- No structured outcome tracking
- Hard to build narratives from raw event stream

### Event Mesh V2 (New)

```typescript
interface DocumentableEvent extends EventLogEntry {
  shouldDocument?: boolean;          // Flag for AI narrative generation
  userIntent?: { /* ... */ };        // Captures user goals
  context?: { /* ... */ };           // Decision context and outcomes
  metadata?: { /* ... */ };          // Session and environment info
}
```

**Enhancements:**
- Captures user intent (problem solved, pain point, goal)
- Records decision context and outcomes
- Links related events for workflow understanding
- Enables AI to generate "explain what happened" narratives

**Migration Path:**
- V1 events continue to work (no changes required)
- Gradually enhance critical events with V2 fields
- System auto-marks important events (widget.created, provider.connected, etc.)

---

## DocumentableEvent Schema

### Complete TypeScript Interface

```typescript
/**
 * Enhanced event schema for Event Mesh V2
 * Extends EventLogEntry (V1) with optional context fields
 */
interface DocumentableEvent extends EventLogEntry {
  /**
   * Flag indicating this event should be included in AI-generated narratives
   * Auto-set to true for: widget.created, provider.connected, automation.triggered
   * Manually set for custom events you want to document
   */
  shouldDocument?: boolean;

  /**
   * Captures why the user took this action
   * Essential for "explain what happened" and future AI optimization
   */
  userIntent?: {
    /**
     * High-level problem this action solves
     * Example: "Need to track late payments across customers"
     */
    problemSolved: string;

    /**
     * Specific pain point that triggered this action
     * Example: "Manually checking Stripe for failed payments takes 30min/day"
     */
    painPoint: string;

    /**
     * User's desired outcome
     * Example: "Automatically see failed payments in dashboard"
     */
    goal: string;

    /**
     * Concrete success criteria
     * Example: "Dashboard shows failed payments within 1 minute of occurrence"
     */
    expectedOutcome: string;

    /**
     * Optional: How to measure impact
     * Example: "Reduce manual payment checking from 30min to 0min/day"
     */
    impactMetric?: string;
  };

  /**
   * Contextual information about this event
   */
  context?: {
    /**
     * Decision made at this point
     * Example: "User chose Stripe webhook over polling"
     */
    decision?: string;

    /**
     * Actual outcome (filled in after event completes)
     * Example: "Webhook successfully received 3 payment events in first hour"
     */
    outcome?: string;

    /**
     * Array of related event IDs for workflow linking
     * Example: ["evt_123", "evt_456"] links this event to previous setup steps
     */
    relatedEvents?: string[];

    /**
     * Categorization for filtering/analysis
     */
    category?: 'architecture' | 'bug-fix' | 'feature' | 'refactor';
  };

  /**
   * Technical metadata for debugging
   */
  metadata?: {
    /**
     * User who triggered this event
     */
    userId: string;

    /**
     * Session identifier for grouping related events
     */
    sessionId: string;

    /**
     * Environment where event occurred
     */
    environment: 'dev' | 'prod';
  };
}

/**
 * V1 schema (for reference)
 * All V1 events remain valid in V2
 */
interface EventLogEntry {
  id: string;
  eventName: string;
  source: string;
  timestamp: number;
  payload: Record<string, unknown>;
  relatedEvents?: string[];
}
```

### Field Usage Guidelines

| Field | Required? | When to Use | Example Value |
|-------|-----------|-------------|---------------|
| `shouldDocument` | No | Auto-set for critical events, manually set for custom events | `true` |
| `userIntent.problemSolved` | If capturing intent | When creating widgets, automations, or connections | "Track late payments" |
| `userIntent.painPoint` | If capturing intent | When user explicitly states frustration | "Manual checking takes 30min/day" |
| `userIntent.goal` | If capturing intent | Always when capturing intent | "See failed payments automatically" |
| `userIntent.expectedOutcome` | If capturing intent | Always when capturing intent | "Dashboard shows payments <1min" |
| `userIntent.impactMetric` | No | When user provides measurable goal | "Reduce checking time by 100%" |
| `context.decision` | No | When multiple options were available | "Chose webhooks over polling" |
| `context.outcome` | No | After event completes (async update) | "Webhook received 3 events in 1hr" |
| `context.relatedEvents` | No | When event is part of multi-step workflow | `["evt_123", "evt_456"]` |
| `context.category` | No | For filtering/analysis | `"feature"` |
| `metadata.userId` | No (auto-filled) | System fills automatically | `"usr_789"` |
| `metadata.sessionId` | No (auto-filled) | System fills automatically | `"sess_abc123"` |
| `metadata.environment` | No (auto-filled) | System fills automatically | `"prod"` |

---

## Breaking Changes

**Good news: There are NO breaking changes!**

Event Mesh V2 is **fully backward compatible** with V1. Here's why:

### 1. Optional Fields
All new fields (`shouldDocument`, `userIntent`, `context`, `metadata`) are optional. V1 events without these fields continue to work.

```typescript
// V1 event (still valid in V2)
const v1Event: EventLogEntry = {
  id: 'evt_123',
  eventName: 'github.pr.selected',
  source: 'github_widget_1',
  timestamp: Date.now(),
  payload: { prNumber: 42 }
};

// V2 event (enhanced)
const v2Event: DocumentableEvent = {
  ...v1Event,
  shouldDocument: true,
  userIntent: {
    problemSolved: 'Need to track PR review status',
    painPoint: 'Manually checking GitHub takes 10min/day',
    goal: 'Auto-filter related Jira tickets',
    expectedOutcome: 'Jira widget updates when PR selected'
  }
};
```

### 2. Extends Existing Interface
`DocumentableEvent` extends `EventLogEntry`, so type checking is additive, not restrictive.

```typescript
// Both types accepted
function publishEvent(event: DocumentableEvent | EventLogEntry) {
  // Works for V1 and V2
}
```

### 3. Runtime Detection
System detects V2 fields at runtime and gracefully handles missing data.

```typescript
function shouldIncludeInNarrative(event: DocumentableEvent | EventLogEntry) {
  // Safe access with fallback
  return 'shouldDocument' in event ? event.shouldDocument : false;
}
```

### 4. Auto-Migration for Critical Events
System automatically adds `shouldDocument: true` to important V1 events during processing, so they appear in narratives without code changes.

**Auto-marked events:**
- `widget.created`
- `provider.connected`
- `automation.triggered`
- `workflow.completed`
- `error.occurred`

---

## Migration Guide

### Phase 1: No Changes Required (Immediate)

**What:** V1 events continue to work unchanged.

**Action:** None. Existing widgets and automations function normally.

```typescript
// Your existing code works as-is
eventMesh.publish({
  eventName: 'github.pr.selected',
  source: 'github_widget_1',
  payload: { prNumber: 42 }
});
```

### Phase 2: Enhance Critical Events (Recommended)

**What:** Add `shouldDocument: true` to events you want included in AI narratives.

**Action:** Update 3-5 most important events in your widgets.

**Before:**
```typescript
eventMesh.publish({
  eventName: 'stripe.payment.failed',
  source: 'stripe_widget_1',
  payload: { amount: 5000, customerId: 'cus_123' }
});
```

**After:**
```typescript
eventMesh.publish({
  eventName: 'stripe.payment.failed',
  source: 'stripe_widget_1',
  payload: { amount: 5000, customerId: 'cus_123' },
  shouldDocument: true  // <-- Add this line
});
```

**Impact:** Event now appears in "Explain what happened" narratives.

### Phase 3: Capture User Intent (Optional)

**What:** Add `userIntent` during widget creation or automation setup.

**Action:** Update wizard/creation flows to capture user goals.

**Example: Widget Creation**
```typescript
// During widget setup wizard
const userResponse = await askUserQuestion({
  question: "What problem are you trying to solve?",
  options: [
    "Track late payments",
    "Monitor PR review status",
    "See upcoming meetings"
  ]
});

eventMesh.publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  payload: {
    widgetType: 'stripe_failed_payments',
    providerId: 'stripe'
  },
  shouldDocument: true,
  userIntent: {
    problemSolved: userResponse,
    painPoint: "Manually checking Stripe for failed payments",
    goal: "Automatically see failed payments in dashboard",
    expectedOutcome: "Dashboard shows failed payments within 1 minute"
  }
});
```

### Phase 4: Link Related Events (Advanced)

**What:** Use `context.relatedEvents` to build workflow chains.

**Action:** Track multi-step workflows by linking event IDs.

**Example: Multi-Step Workflow**
```typescript
// Step 1: User connects Stripe
const connectEvent = await eventMesh.publishDocumentable({
  eventName: 'provider.connected',
  source: 'oauth_flow',
  payload: { providerId: 'stripe' },
  shouldDocument: true
});

// Step 2: User creates widget (link to connect event)
const widgetEvent = await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  payload: { widgetType: 'stripe_failed_payments' },
  shouldDocument: true,
  context: {
    relatedEvents: [connectEvent.id]  // <-- Links to previous step
  }
});

// Step 3: Automation triggers (link to both)
await eventMesh.publishDocumentable({
  eventName: 'automation.triggered',
  source: 'automation_engine',
  payload: { automationId: 'auto_123' },
  shouldDocument: true,
  context: {
    relatedEvents: [connectEvent.id, widgetEvent.id]  // <-- Full chain
  }
});
```

### Phase 5: Update Outcomes (Production)

**What:** Async update `context.outcome` after workflows complete.

**Action:** After automation runs, record actual results.

**Example: Outcome Tracking**
```typescript
// Initial automation trigger
const automationEvent = await eventMesh.publishDocumentable({
  eventName: 'automation.triggered',
  source: 'automation_engine',
  payload: { automationId: 'stripe_to_jira' },
  shouldDocument: true,
  userIntent: {
    problemSolved: "Auto-create Jira tickets for failed payments",
    goal: "Save 30min/day of manual ticket creation",
    expectedOutcome: "Jira ticket created within 1 minute of payment failure"
  }
});

// ... automation runs ...

// Update with actual outcome (1 hour later)
await eventMesh.updateEventOutcome(automationEvent.id, {
  outcome: "Successfully created 5 Jira tickets for failed payments in first hour",
  impactMetric: "Saved 25 minutes compared to manual process"
});
```

### Migration Checklist

- [ ] Phase 1: Verify existing events still work (no code changes)
- [ ] Phase 2: Add `shouldDocument: true` to 3-5 critical events
- [ ] Phase 3: Capture `userIntent` during widget/automation creation
- [ ] Phase 4: Link multi-step workflows with `context.relatedEvents`
- [ ] Phase 5: Update `context.outcome` after workflows complete
- [ ] Test: Use "Explain what happened" feature to verify narratives
- [ ] Monitor: Check Event Debugger for missing context

---

## userIntent Field

### Purpose

The `userIntent` field captures **why** the user took an action, not just **what** they did. This enables:

1. **AI Narratives:** Generate human-readable explanations of workflows
2. **Future Optimization:** Learn which problems users solve most often
3. **Impact Measurement:** Compare expected vs actual outcomes
4. **Onboarding:** Show new users how others use the system

### When to Capture

Capture `userIntent` during:

1. **Widget Creation** - "What problem are you trying to solve?"
2. **Provider Connection** - "Why are you connecting Stripe?"
3. **Automation Setup** - "What workflow do you want to automate?"
4. **Dashboard Configuration** - "What metrics do you need to track?"

**Don't capture for:**
- Low-level events (button clicks, hover states)
- System-generated events (token refresh, health checks)
- Transient UI interactions (opening modals, scrolling)

### Field Definitions

#### problemSolved
**Type:** `string`
**Required:** Yes (when capturing intent)
**Purpose:** High-level problem this action addresses.

**Guidelines:**
- Use user's own words when possible
- Focus on business problem, not technical solution
- 1-2 sentences maximum

**Examples:**
- "Need to track late payments across all customers"
- "Want to see which PRs need code review"
- "Monitor server errors in real-time"

#### painPoint
**Type:** `string`
**Required:** Yes (when capturing intent)
**Purpose:** Specific frustration that triggered this action.

**Guidelines:**
- Quantify when possible (time spent, frequency)
- Capture emotional language ("frustrating", "tedious")
- Focus on current state, not desired state

**Examples:**
- "Manually checking Stripe for failed payments takes 30 minutes every day"
- "Have to switch between GitHub and Jira to track PR status"
- "Miss critical alerts because buried in Slack notifications"

#### goal
**Type:** `string`
**Required:** Yes (when capturing intent)
**Purpose:** User's desired outcome.

**Guidelines:**
- Start with action verb ("See", "Track", "Get notified")
- Be specific about what success looks like
- Focus on end state, not implementation

**Examples:**
- "Automatically see failed payments in dashboard without manual checking"
- "Get Slack notification within 1 minute of payment failure"
- "Track all open PRs and their review status in one place"

#### expectedOutcome
**Type:** `string`
**Required:** Yes (when capturing intent)
**Purpose:** Concrete success criteria.

**Guidelines:**
- Must be measurable/observable
- Include timing when relevant
- User should be able to verify success

**Examples:**
- "Dashboard shows failed payments within 1 minute of occurrence"
- "Jira widget auto-filters to tickets linked to selected PR"
- "Receive SMS 10 minutes before each calendar event"

#### impactMetric (Optional)
**Type:** `string`
**Required:** No
**Purpose:** How to measure impact/success.

**Guidelines:**
- Quantifiable improvements preferred
- Time saved, error reduction, efficiency gains
- Compare before/after states

**Examples:**
- "Reduce manual payment checking from 30min to 0min per day"
- "Decrease missed payments by 50%"
- "Save 2 hours per week on status updates"

### Capture Methods

#### Method 1: Conversational Wizard (Recommended)

```typescript
// Problem-first wizard flow
async function createWidgetWithIntent() {
  // Stage 1: Problem Discovery
  const problem = await askUserQuestion({
    question: "What problem are you trying to solve?",
    options: [
      { label: "Track late payments", value: "payments" },
      { label: "Monitor PR status", value: "prs" },
      { label: "See upcoming meetings", value: "calendar" }
    ]
  });

  // Stage 2: Pain Point Capture
  const painPoint = await askUserQuestion({
    question: "What makes this frustrating right now?",
    freeText: true,
    placeholder: "e.g., 'Manually checking takes 30min/day'"
  });

  // Stage 3: Goal Definition
  const goal = await askUserQuestion({
    question: "What would you like to happen instead?",
    freeText: true,
    placeholder: "e.g., 'Automatically see failed payments'"
  });

  // Stage 4: Success Criteria
  const expectedOutcome = await askUserQuestion({
    question: "How will you know this is working?",
    freeText: true,
    placeholder: "e.g., 'Dashboard updates within 1 minute'"
  });

  // Create widget with captured intent
  await eventMesh.publishDocumentable({
    eventName: 'widget.created',
    source: 'widget_wizard',
    payload: { widgetType: mapProblemToWidget(problem) },
    shouldDocument: true,
    userIntent: {
      problemSolved: problem.label,
      painPoint,
      goal,
      expectedOutcome
    }
  });
}
```

#### Method 2: Post-Action Prompt

```typescript
// Capture intent after user completes action
async function captureIntentAfterWidgetCreation(widgetId: string) {
  const response = await showDialog({
    title: "Help us understand",
    message: "What problem does this widget solve for you?",
    input: "textarea",
    skipButton: true  // Allow users to skip
  });

  if (response) {
    await eventMesh.updateEventIntent(widgetId, {
      problemSolved: response,
      goal: "Improve dashboard visibility"  // Default if not captured
    });
  }
}
```

#### Method 3: Infer from Context

```typescript
// Infer intent from user actions
function inferIntentFromActions(actions: UserAction[]) {
  // User connected Stripe then immediately created payment widget
  if (
    actions.includes('stripe.connected') &&
    actions.includes('widget.created:stripe_payments')
  ) {
    return {
      problemSolved: "Track payment status",
      painPoint: "No visibility into payment failures",
      goal: "Monitor Stripe payments in dashboard",
      expectedOutcome: "See payment events in real-time"
    };
  }
}
```

### Best Practices

**DO:**
- Capture intent at the moment user takes action (not days later)
- Use user's exact words when possible
- Make capturing optional (skip button)
- Provide common examples as suggestions
- Allow free-text input for specificity

**DON'T:**
- Force users to fill 5-field form before creating widget
- Use technical jargon ("API polling interval")
- Make every field required
- Capture for trivial actions (UI tweaks, layout changes)
- Store PII in intent fields (customer names, email addresses)

### Testing Intent Capture

```typescript
// Test that intent is captured correctly
describe('userIntent capture', () => {
  it('captures problem solved during widget creation', async () => {
    const event = await createWidgetWithIntent({
      problem: "Track late payments",
      painPoint: "Manually checking Stripe takes 30min/day"
    });

    expect(event.userIntent?.problemSolved).toBe("Track late payments");
    expect(event.userIntent?.painPoint).toContain("30min/day");
  });

  it('allows skipping intent capture', async () => {
    const event = await createWidgetWithIntent({ skipIntent: true });

    expect(event.userIntent).toBeUndefined();
    expect(event.shouldDocument).toBe(true);  // Still documented
  });
});
```

---

## Knowledge Graph Integration

### Overview

The Knowledge Graph links related events to understand **workflows**, not just isolated actions. This powers:

1. **Workflow Visualization:** Show how widgets/automations connect
2. **Root Cause Analysis:** Trace errors back to originating events
3. **Impact Analysis:** See downstream effects of changes
4. **AI Narratives:** Generate coherent stories from event chains

### Linking Events

Use `context.relatedEvents` to link events:

```typescript
interface DocumentableEvent {
  context?: {
    relatedEvents?: string[];  // Array of event IDs
  };
}
```

### Link Types

#### 1. Sequential Links (Workflow Steps)

Events that happen in sequence to accomplish a goal.

```typescript
// Step 1: Connect provider
const step1 = await eventMesh.publishDocumentable({
  eventName: 'provider.connected',
  payload: { providerId: 'stripe' },
  shouldDocument: true
});

// Step 2: Create widget (links to step 1)
const step2 = await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  payload: { widgetType: 'stripe_payments' },
  context: {
    relatedEvents: [step1.id]  // Sequential link
  },
  shouldDocument: true
});

// Step 3: Configure automation (links to step 2)
const step3 = await eventMesh.publishDocumentable({
  eventName: 'automation.created',
  payload: { trigger: 'stripe.payment.failed' },
  context: {
    relatedEvents: [step2.id]  // Sequential link
  },
  shouldDocument: true
});
```

**Graph Visualization:**
```
provider.connected → widget.created → automation.created
```

#### 2. Causal Links (Trigger → Action)

Events that trigger other events.

```typescript
// Trigger event
const trigger = await eventMesh.publishDocumentable({
  eventName: 'stripe.payment.failed',
  payload: { amount: 5000, customerId: 'cus_123' },
  shouldDocument: true
});

// Caused event (automation triggers)
const action1 = await eventMesh.publishDocumentable({
  eventName: 'jira.ticket.created',
  payload: { ticketId: 'SCRUM-42' },
  context: {
    relatedEvents: [trigger.id],  // Causal link
    decision: "Automation triggered based on payment failure"
  },
  shouldDocument: true
});

// Second caused event (notification sent)
const action2 = await eventMesh.publishDocumentable({
  eventName: 'slack.message.sent',
  payload: { channel: '#billing' },
  context: {
    relatedEvents: [trigger.id],  // Causal link
    decision: "Notification sent per automation rules"
  },
  shouldDocument: true
});
```

**Graph Visualization:**
```
stripe.payment.failed
  ├─→ jira.ticket.created
  └─→ slack.message.sent
```

#### 3. Dependency Links (Prerequisite)

Events that depend on other events completing.

```typescript
// Prerequisite event
const oauth = await eventMesh.publishDocumentable({
  eventName: 'oauth.completed',
  payload: { providerId: 'linear' },
  shouldDocument: true
});

// Dependent event (requires OAuth to succeed)
const widget = await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  payload: { widgetType: 'linear_issues' },
  context: {
    relatedEvents: [oauth.id],  // Dependency link
    decision: "Widget requires OAuth token to fetch data"
  },
  shouldDocument: true
});
```

#### 4. Aggregate Links (Multiple Sources)

Events that combine data from multiple sources.

```typescript
// Source event 1
const githubEvent = await eventMesh.publishDocumentable({
  eventName: 'github.pr.selected',
  payload: { prNumber: 42 },
  shouldDocument: true
});

// Source event 2
const jiraEvent = await eventMesh.publishDocumentable({
  eventName: 'jira.issue.selected',
  payload: { issueKey: 'SCRUM-5' },
  shouldDocument: true
});

// Aggregate event (combines both)
const dashboardUpdate = await eventMesh.publishDocumentable({
  eventName: 'dashboard.context.updated',
  payload: {
    pr: 42,
    issue: 'SCRUM-5',
    linkedTickets: ['SCRUM-5', 'SCRUM-8']
  },
  context: {
    relatedEvents: [githubEvent.id, jiraEvent.id],  // Aggregate link
    decision: "Filtered Jira issues based on GitHub PR selection"
  },
  shouldDocument: true
});
```

**Graph Visualization:**
```
github.pr.selected ──┐
                     ├─→ dashboard.context.updated
jira.issue.selected ─┘
```

### Querying the Graph

#### API: queryEventHistory()

```typescript
/**
 * Query Event Mesh history with graph traversal
 */
async function queryEventHistory(options: {
  eventId?: string;           // Start from specific event
  eventName?: string;         // Filter by event type
  source?: string;            // Filter by source widget
  userId?: string;            // Filter by user
  sessionId?: string;         // Filter by session
  startTime?: number;         // Time range start
  endTime?: number;           // Time range end
  includeRelated?: boolean;   // Include linked events
  maxDepth?: number;          // Max graph traversal depth
}): Promise<DocumentableEvent[]>;
```

**Example 1: Get All Events in Workflow**

```typescript
// Get all events related to automation setup
const workflow = await eventMesh.queryEventHistory({
  eventId: 'evt_automation_123',
  includeRelated: true,
  maxDepth: 10  // Follow links up to 10 levels deep
});

// Returns: [
//   { eventName: 'provider.connected', ... },
//   { eventName: 'widget.created', ... },
//   { eventName: 'automation.created', ... }
// ]
```

**Example 2: Root Cause Analysis**

```typescript
// Find what triggered an error
const errorEvent = await eventMesh.getEvent('evt_error_456');
const rootCause = await eventMesh.queryEventHistory({
  eventId: errorEvent.id,
  includeRelated: true,
  maxDepth: 5
});

// Trace back through relatedEvents to find origin
console.log('Error chain:', rootCause.map(e => e.eventName));
// Output: ['widget.created', 'api.call.failed', 'token.expired', 'error.occurred']
```

**Example 3: Impact Analysis**

```typescript
// See all downstream effects of a configuration change
const configChange = await eventMesh.getEvent('evt_config_789');
const impactedEvents = await eventMesh.queryEventHistory({
  startTime: configChange.timestamp,
  userId: configChange.metadata?.userId,
  includeRelated: true
});

// Shows all events that referenced this config change
console.log('Impacted systems:', impactedEvents.map(e => e.source));
```

### Building Narratives

#### API: buildNarrative()

```typescript
/**
 * Generate human-readable narrative from event history
 * Uses AI to create coherent story from linked events
 */
async function buildNarrative(options: {
  events: DocumentableEvent[];
  style?: 'technical' | 'business' | 'tutorial';
  includeIntent?: boolean;
  includeOutcomes?: boolean;
}): Promise<string>;
```

**Example 1: Explain Workflow**

```typescript
// Get workflow events
const workflow = await eventMesh.queryEventHistory({
  sessionId: 'sess_abc123',
  includeRelated: true
});

// Generate narrative
const explanation = await eventMesh.buildNarrative({
  events: workflow,
  style: 'tutorial',
  includeIntent: true,
  includeOutcomes: true
});

console.log(explanation);
// Output:
// "You connected Stripe because you needed to track late payments (manually
// checking was taking 30min/day). Then you created a Failed Payments widget
// to automatically see failures in your dashboard. Finally, you set up an
// automation to create Jira tickets and notify #billing whenever a payment
// fails. In the first hour, this automation successfully processed 5 failed
// payments and saved an estimated 25 minutes compared to manual tracking."
```

**Example 2: Technical Debug Report**

```typescript
const debugNarrative = await eventMesh.buildNarrative({
  events: errorWorkflow,
  style: 'technical',
  includeIntent: false,
  includeOutcomes: true
});

console.log(debugNarrative);
// Output:
// "At 14:32:15, widget stripe_widget_1 attempted to fetch payment data.
// OAuth token had expired (last refreshed 24h ago). Token refresh failed
// due to invalid refresh_token in database. Error propagated to dashboard,
// causing widget to show 'Authentication Failed' state. Resolution: User
// re-authenticated via OAuth flow at 14:45:00."
```

### Graph Storage

Events are stored with their links in the database:

```sql
-- Event log table (simplified)
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  payload JSONB NOT NULL,
  should_document BOOLEAN DEFAULT false,
  user_intent JSONB,
  context JSONB,  -- Contains relatedEvents array
  metadata JSONB,
  user_id TEXT REFERENCES users(id)
);

-- Index for graph traversal
CREATE INDEX idx_related_events ON event_log
USING gin ((context->'relatedEvents'));

-- Index for time-series queries
CREATE INDEX idx_timestamp ON event_log (timestamp DESC);
```

Query example:

```sql
-- Find all events related to a specific event
WITH RECURSIVE event_graph AS (
  -- Start with target event
  SELECT * FROM event_log WHERE id = 'evt_123'

  UNION ALL

  -- Recursively find related events
  SELECT el.*
  FROM event_log el
  JOIN event_graph eg ON el.id = ANY(
    SELECT jsonb_array_elements_text(eg.context->'relatedEvents')
  )
)
SELECT * FROM event_graph ORDER BY timestamp;
```

---

## API Reference

### publishDocumentable()

Publishes an enhanced event with optional intent/context fields.

```typescript
async function publishDocumentable(
  event: DocumentableEvent
): Promise<DocumentableEvent>;
```

**Parameters:**
- `event: DocumentableEvent` - Event object with optional V2 fields

**Returns:**
- `Promise<DocumentableEvent>` - Published event with generated ID

**Example:**

```typescript
const event = await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  payload: { widgetType: 'stripe_payments' },
  shouldDocument: true,
  userIntent: {
    problemSolved: "Track late payments",
    painPoint: "Manually checking Stripe takes 30min/day",
    goal: "See failed payments automatically",
    expectedOutcome: "Dashboard shows failures <1min"
  },
  context: {
    decision: "User chose webhook over polling",
    category: "feature"
  }
});

console.log('Event published:', event.id);
```

### queryEventHistory()

Queries event history with optional graph traversal.

```typescript
async function queryEventHistory(options: {
  eventId?: string;
  eventName?: string;
  source?: string;
  userId?: string;
  sessionId?: string;
  startTime?: number;
  endTime?: number;
  includeRelated?: boolean;
  maxDepth?: number;
}): Promise<DocumentableEvent[]>;
```

**Parameters:**
- `eventId` - Start from specific event (for graph traversal)
- `eventName` - Filter by event type (e.g., "widget.created")
- `source` - Filter by source widget (e.g., "github_widget_1")
- `userId` - Filter by user
- `sessionId` - Filter by session
- `startTime` - Unix timestamp (ms) for range start
- `endTime` - Unix timestamp (ms) for range end
- `includeRelated` - If true, follow `relatedEvents` links
- `maxDepth` - Max graph traversal depth (default: 5)

**Returns:**
- `Promise<DocumentableEvent[]>` - Array of matching events

**Examples:**

```typescript
// Get all events from last hour
const recentEvents = await eventMesh.queryEventHistory({
  startTime: Date.now() - 3600000,
  endTime: Date.now()
});

// Get workflow starting from specific event
const workflow = await eventMesh.queryEventHistory({
  eventId: 'evt_123',
  includeRelated: true,
  maxDepth: 10
});

// Get all widget creations by user
const userWidgets = await eventMesh.queryEventHistory({
  eventName: 'widget.created',
  userId: 'usr_789'
});
```

### buildNarrative()

Generates human-readable narrative from event history.

```typescript
async function buildNarrative(options: {
  events: DocumentableEvent[];
  style?: 'technical' | 'business' | 'tutorial';
  includeIntent?: boolean;
  includeOutcomes?: boolean;
}): Promise<string>;
```

**Parameters:**
- `events` - Array of events to narrate
- `style` - Narrative style:
  - `technical`: Debug-focused, includes timestamps and error details
  - `business`: Outcome-focused, emphasizes impact and metrics
  - `tutorial`: Educational, explains why each step happened
- `includeIntent` - If true, include user goals and pain points
- `includeOutcomes` - If true, include actual results vs expectations

**Returns:**
- `Promise<string>` - Generated narrative text

**Example:**

```typescript
const events = await eventMesh.queryEventHistory({
  sessionId: 'sess_abc123'
});

const narrative = await eventMesh.buildNarrative({
  events,
  style: 'tutorial',
  includeIntent: true,
  includeOutcomes: true
});

console.log(narrative);
// "You connected Stripe because you needed to track late payments..."
```

### updateEventOutcome()

Updates the outcome field of an existing event (async).

```typescript
async function updateEventOutcome(
  eventId: string,
  outcome: {
    outcome: string;
    impactMetric?: string;
  }
): Promise<void>;
```

**Parameters:**
- `eventId` - ID of event to update
- `outcome.outcome` - Actual result that occurred
- `outcome.impactMetric` - Optional: Measured impact

**Example:**

```typescript
// Create automation
const automation = await eventMesh.publishDocumentable({
  eventName: 'automation.created',
  userIntent: {
    expectedOutcome: "Create Jira ticket within 1min of payment failure"
  }
});

// ... wait for automation to run ...

// Update with actual outcome
await eventMesh.updateEventOutcome(automation.id, {
  outcome: "Created 5 Jira tickets in first hour, average time: 45 seconds",
  impactMetric: "100% of payment failures now tracked (was 0% before)"
});
```

---

## Examples

### Example 1: Simple Widget Creation

```typescript
// Minimal V2 event (just flag for documentation)
await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  payload: {
    widgetType: 'github_prs',
    providerId: 'github'
  },
  shouldDocument: true  // Include in narratives
});
```

### Example 2: Widget Creation with Full Intent

```typescript
// Complete V2 event with user intent
await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  payload: {
    widgetType: 'stripe_failed_payments',
    providerId: 'stripe'
  },
  shouldDocument: true,
  userIntent: {
    problemSolved: "Track late payments across all customers",
    painPoint: "Manually checking Stripe dashboard for failed payments takes 30 minutes every day",
    goal: "Automatically see failed payments in dashboard without manual checking",
    expectedOutcome: "Dashboard shows failed payments within 1 minute of occurrence",
    impactMetric: "Reduce manual payment checking from 30min to 0min per day"
  },
  context: {
    decision: "User chose webhook approach over polling for real-time updates",
    category: "feature"
  }
});
```

### Example 3: Multi-Step Workflow

```typescript
// Step 1: Connect provider
const connectEvent = await eventMesh.publishDocumentable({
  eventName: 'provider.connected',
  source: 'oauth_flow',
  payload: {
    providerId: 'stripe',
    scopes: ['read_payments', 'read_customers']
  },
  shouldDocument: true,
  userIntent: {
    problemSolved: "Need access to Stripe payment data",
    painPoint: "No visibility into payment failures",
    goal: "Connect Stripe to dashboard",
    expectedOutcome: "Successfully authenticate and fetch payment data"
  }
});

// Step 2: Create widget (linked to step 1)
const widgetEvent = await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  source: 'widget_wizard',
  payload: {
    widgetType: 'stripe_failed_payments',
    providerId: 'stripe'
  },
  shouldDocument: true,
  context: {
    relatedEvents: [connectEvent.id],
    decision: "Widget requires OAuth token from previous step"
  }
});

// Step 3: Configure automation (linked to step 2)
const automationEvent = await eventMesh.publishDocumentable({
  eventName: 'automation.created',
  source: 'automation_wizard',
  payload: {
    trigger: 'stripe.payment.failed',
    actions: [
      { type: 'create_jira_ticket' },
      { type: 'send_slack_message', channel: '#billing' }
    ]
  },
  shouldDocument: true,
  userIntent: {
    problemSolved: "Automate response to payment failures",
    goal: "Create Jira ticket and notify team when payment fails",
    expectedOutcome: "Ticket created and Slack message sent within 1 minute"
  },
  context: {
    relatedEvents: [connectEvent.id, widgetEvent.id],
    decision: "User wants both ticket creation AND notification"
  }
});

// Generate narrative of complete workflow
const workflow = await eventMesh.queryEventHistory({
  eventId: automationEvent.id,
  includeRelated: true
});

const narrative = await eventMesh.buildNarrative({
  events: workflow,
  style: 'tutorial',
  includeIntent: true
});

console.log(narrative);
// "You connected Stripe to access payment data (you had no visibility into
// failures). Then you created a Failed Payments widget to display this data.
// Finally, you set up an automation to create Jira tickets and send Slack
// notifications whenever a payment fails, with the goal of responding within
// 1 minute instead of checking manually."
```

### Example 4: Automation with Outcome Tracking

```typescript
// Initial trigger
const trigger = await eventMesh.publishDocumentable({
  eventName: 'stripe.payment.failed',
  source: 'stripe_webhook',
  payload: {
    amount: 5000,
    customerId: 'cus_123',
    failureReason: 'insufficient_funds'
  },
  shouldDocument: true
});

// Automation action 1
const jiraTicket = await eventMesh.publishDocumentable({
  eventName: 'jira.ticket.created',
  source: 'automation_engine',
  payload: {
    ticketId: 'SCRUM-42',
    title: 'Payment Failed: $50.00 - Customer cus_123'
  },
  shouldDocument: true,
  context: {
    relatedEvents: [trigger.id],
    decision: "Automation triggered per user configuration"
  }
});

// Automation action 2
const slackMessage = await eventMesh.publishDocumentable({
  eventName: 'slack.message.sent',
  source: 'automation_engine',
  payload: {
    channel: '#billing',
    text: 'Payment failed for cus_123. Jira ticket: SCRUM-42'
  },
  shouldDocument: true,
  context: {
    relatedEvents: [trigger.id, jiraTicket.id],
    decision: "Notification sent after ticket creation"
  }
});

// Update with outcome after 1 hour
setTimeout(async () => {
  await eventMesh.updateEventOutcome(trigger.id, {
    outcome: "Successfully created Jira ticket SCRUM-42 and notified #billing within 45 seconds of payment failure",
    impactMetric: "Automated response vs 30min manual process"
  });
}, 3600000);
```

### Example 5: Error Tracking with Root Cause

```typescript
// Initial action
const apiCall = await eventMesh.publishDocumentable({
  eventName: 'api.call.initiated',
  source: 'stripe_widget_1',
  payload: {
    endpoint: '/v1/payment_intents',
    method: 'GET'
  },
  shouldDocument: true
});

// Token check fails
const tokenError = await eventMesh.publishDocumentable({
  eventName: 'auth.token.expired',
  source: 'stripe_widget_1',
  payload: {
    expiresAt: Date.now() - 3600000,  // Expired 1 hour ago
    lastRefreshAt: Date.now() - 86400000  // Last refresh 24h ago
  },
  shouldDocument: true,
  context: {
    relatedEvents: [apiCall.id],
    decision: "Token expired, refresh required",
    category: "bug-fix"
  }
});

// Error displayed to user
const errorShown = await eventMesh.publishDocumentable({
  eventName: 'widget.error.displayed',
  source: 'stripe_widget_1',
  payload: {
    errorMessage: 'Authentication failed. Please reconnect Stripe.',
    errorCode: 'TOKEN_EXPIRED'
  },
  shouldDocument: true,
  context: {
    relatedEvents: [apiCall.id, tokenError.id],
    decision: "Show user-friendly error with reconnect button"
  }
});

// Query root cause
const errorChain = await eventMesh.queryEventHistory({
  eventId: errorShown.id,
  includeRelated: true
});

console.log('Root cause:', errorChain[0].eventName);
// Output: "api.call.initiated"
```

### Example 6: Complex Multi-Provider Workflow

```typescript
// GitHub PR selected
const prSelected = await eventMesh.publishDocumentable({
  eventName: 'github.pr.selected',
  source: 'github_widget_1',
  payload: { prNumber: 42, branch: 'feature/auth' },
  shouldDocument: true
});

// Jira tickets filtered
const jiraFiltered = await eventMesh.publishDocumentable({
  eventName: 'jira.tickets.filtered',
  source: 'jira_widget_1',
  payload: {
    filterCriteria: { linkedPR: 42 },
    resultCount: 2,
    tickets: ['SCRUM-5', 'SCRUM-8']
  },
  shouldDocument: true,
  context: {
    relatedEvents: [prSelected.id],
    decision: "Auto-filtered based on PR selection"
  }
});

// Slack status updated
const slackUpdated = await eventMesh.publishDocumentable({
  eventName: 'slack.status.updated',
  source: 'slack_widget_1',
  payload: {
    status: 'Reviewing PR #42',
    emoji: ':eyes:'
  },
  shouldDocument: true,
  context: {
    relatedEvents: [prSelected.id],
    decision: "User configured auto-status update for PR reviews"
  }
});

// Calendar event created
const calendarEvent = await eventMesh.publishDocumentable({
  eventName: 'calendar.event.created',
  source: 'calendar_widget_1',
  payload: {
    title: 'Code Review: PR #42',
    duration: 30,
    attendees: ['reviewer@company.com']
  },
  shouldDocument: true,
  context: {
    relatedEvents: [prSelected.id, jiraFiltered.id],
    decision: "User wants 30min blocked for review when >1 linked Jira ticket"
  }
});

// Generate narrative
const narrative = await eventMesh.buildNarrative({
  events: [prSelected, jiraFiltered, slackUpdated, calendarEvent],
  style: 'business',
  includeIntent: false,
  includeOutcomes: true
});

console.log(narrative);
// "When you selected PR #42, the system automatically filtered your Jira
// dashboard to show the 2 linked tickets (SCRUM-5, SCRUM-8), updated your
// Slack status to 'Reviewing PR #42', and created a 30-minute code review
// calendar event. This workflow saved an estimated 5 minutes of manual
// context-switching across tools."
```

---

## Best Practices

### 1. Document Strategically

**DO:**
- Set `shouldDocument: true` for user-initiated actions (widget creation, provider connection, automation setup)
- Document errors and failures (critical for debugging)
- Document workflow completions (measure success)

**DON'T:**
- Document every low-level event (button clicks, hover states)
- Document transient UI interactions (modal open/close)
- Document system health checks or polling

### 2. Capture Intent at the Right Time

**DO:**
- Ask during widget/automation setup (user is engaged)
- Use conversational wizard (feels natural)
- Make it optional (skip button)
- Provide examples/suggestions

**DON'T:**
- Force 5-field form before user can proceed
- Ask days after action was taken (user forgot context)
- Use technical jargon in questions
- Require every field

### 3. Link Events Meaningfully

**DO:**
- Link sequential workflow steps (OAuth → widget → automation)
- Link trigger → action (payment.failed → ticket.created)
- Link prerequisite dependencies (OAuth required for widget)

**DON'T:**
- Link unrelated events (creates false connections)
- Create circular links (infinite loops in graph traversal)
- Over-link (makes graph too complex)

### 4. Update Outcomes Asynchronously

**DO:**
- Update outcomes after workflows complete (minutes/hours later)
- Include actual metrics vs expected
- Note unexpected results (learning opportunity)

**DON'T:**
- Block user waiting for outcome (use async update)
- Forget to update (leaves incomplete data)
- Update with vague statements ("it worked")

### 5. Query Efficiently

**DO:**
- Use time range filters (`startTime`, `endTime`) for recent events
- Limit graph depth (`maxDepth: 5`) to prevent slow queries
- Filter by user/session for scoped queries

**DON'T:**
- Query entire event log without filters
- Set `maxDepth` too high (>10) unless necessary
- Run graph queries in user-facing code (too slow)

### 6. Generate Narratives Appropriately

**DO:**
- Use `tutorial` style for onboarding/education
- Use `business` style for impact reports
- Use `technical` style for debugging
- Cache narratives (expensive to generate)

**DON'T:**
- Generate narratives on every page load
- Use technical style for end users
- Generate narratives for single events (not useful)

---

## Troubleshooting

### Problem: Events Not Appearing in Narratives

**Symptoms:**
- `buildNarrative()` returns empty or incomplete story
- Important events missing from "Explain what happened"

**Causes:**
1. `shouldDocument` not set to `true`
2. Events have no `userIntent` (narrative has no context)
3. Events not linked via `relatedEvents` (appear isolated)

**Solutions:**
```typescript
// ✅ Correct: Flag for documentation
await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  shouldDocument: true,  // <-- Must be true
  userIntent: {
    problemSolved: "Track payments",
    goal: "See failed payments"
  }
});

// ❌ Wrong: Missing shouldDocument flag
await eventMesh.publish({
  eventName: 'widget.created',
  // shouldDocument missing - won't appear in narrative
});
```

### Problem: Graph Traversal Too Slow

**Symptoms:**
- `queryEventHistory()` takes >5 seconds
- UI freezes during graph queries

**Causes:**
1. `maxDepth` set too high (>10)
2. No time range filter (querying all history)
3. Circular event links (infinite loop)

**Solutions:**
```typescript
// ✅ Correct: Limit depth and time range
const events = await eventMesh.queryEventHistory({
  eventId: 'evt_123',
  includeRelated: true,
  maxDepth: 5,  // <-- Limit depth
  startTime: Date.now() - 86400000,  // Last 24h only
  endTime: Date.now()
});

// ❌ Wrong: No limits
const events = await eventMesh.queryEventHistory({
  eventId: 'evt_123',
  includeRelated: true,
  maxDepth: 100  // Way too deep!
});
```

### Problem: Missing Related Events

**Symptoms:**
- Workflow appears incomplete in narratives
- Events show up isolated, not connected

**Causes:**
1. Forgot to set `context.relatedEvents`
2. Event IDs incorrect (typo)
3. Related event published after current event (timing issue)

**Solutions:**
```typescript
// ✅ Correct: Store event ID, then link
const step1 = await eventMesh.publishDocumentable({
  eventName: 'provider.connected',
  shouldDocument: true
});

const step2 = await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  context: {
    relatedEvents: [step1.id]  // <-- Correct ID
  },
  shouldDocument: true
});

// ❌ Wrong: Hardcoded ID (will break)
const step2 = await eventMesh.publishDocumentable({
  eventName: 'widget.created',
  context: {
    relatedEvents: ['evt_123']  // Hardcoded - fragile!
  }
});
```

### Problem: Intent Capture Too Intrusive

**Symptoms:**
- Users skip intent capture every time
- Low completion rate on intent forms

**Causes:**
1. Too many required fields
2. Technical jargon in questions
3. No skip button
4. Asked at wrong time (after action complete)

**Solutions:**
```typescript
// ✅ Correct: Simple, optional, during action
const response = await askUserQuestion({
  question: "What problem are you trying to solve?",
  options: [
    "Track late payments",
    "Monitor PR status",
    "See upcoming meetings"
  ],
  skipButton: true,  // <-- Allow skip
  freeText: true     // <-- Or provide custom answer
});

if (response) {
  // Only capture if user provided answer
  event.userIntent = {
    problemSolved: response,
    goal: "Improve dashboard visibility"
  };
}

// ❌ Wrong: Required 5-field form
const intent = await askUserForm({
  fields: [
    { name: 'problemSolved', required: true },
    { name: 'painPoint', required: true },
    { name: 'goal', required: true },
    { name: 'expectedOutcome', required: true },
    { name: 'impactMetric', required: true }
  ],
  skipButton: false  // No escape!
});
```

### Problem: Narrative Generation Fails

**Symptoms:**
- `buildNarrative()` throws error or returns empty string
- AI generates nonsensical story

**Causes:**
1. Events in wrong chronological order
2. Missing `userIntent` on key events
3. Too many events (AI context limit)

**Solutions:**
```typescript
// ✅ Correct: Sort by timestamp, limit count
const events = await eventMesh.queryEventHistory({
  sessionId: 'sess_123',
  includeRelated: true
});

// Sort chronologically
events.sort((a, b) => a.timestamp - b.timestamp);

// Limit to most important events
const documentedEvents = events
  .filter(e => e.shouldDocument)
  .slice(0, 20);  // Max 20 events for narrative

const narrative = await eventMesh.buildNarrative({
  events: documentedEvents,
  style: 'tutorial',
  includeIntent: true
});

// ❌ Wrong: Pass all events unsorted
const narrative = await eventMesh.buildNarrative({
  events: allEvents,  // Could be 1000s of events!
});
```

### Problem: Outcome Updates Not Appearing

**Symptoms:**
- Called `updateEventOutcome()` but outcome field still empty
- Narrative doesn't include actual results

**Causes:**
1. Wrong event ID
2. Database write failed (permissions)
3. Event not refetched after update

**Solutions:**
```typescript
// ✅ Correct: Store ID, update later, refetch
const event = await eventMesh.publishDocumentable({
  eventName: 'automation.triggered',
  shouldDocument: true
});

// Store event ID for later update
localStorage.setItem('lastAutomation', event.id);

// ... wait for automation to complete ...

// Update outcome
await eventMesh.updateEventOutcome(event.id, {
  outcome: "Successfully processed 5 payments"
});

// Refetch to see updated outcome
const updated = await eventMesh.getEvent(event.id);
console.log(updated.context?.outcome);  // Shows outcome

// ❌ Wrong: Update but never refetch
await eventMesh.updateEventOutcome(event.id, {
  outcome: "Success"
});

console.log(event.context?.outcome);  // Still undefined! (stale data)
```

---

## Migration Checklist

Use this checklist to track your V1 → V2 migration progress:

**Phase 1: Compatibility Verification**
- [ ] All existing V1 events still work
- [ ] No TypeScript errors after upgrading
- [ ] Event Debugger shows V1 events correctly

**Phase 2: Critical Event Enhancement**
- [ ] Added `shouldDocument: true` to widget.created events
- [ ] Added `shouldDocument: true` to provider.connected events
- [ ] Added `shouldDocument: true` to automation.triggered events
- [ ] Added `shouldDocument: true` to error.occurred events

**Phase 3: Intent Capture**
- [ ] Wizard captures `userIntent.problemSolved` during widget creation
- [ ] Wizard captures `userIntent.goal` during automation setup
- [ ] Intent capture is optional (has skip button)
- [ ] Intent fields use user-friendly language (no jargon)

**Phase 4: Event Linking**
- [ ] Sequential workflows link events (OAuth → widget → automation)
- [ ] Trigger → action events linked (payment.failed → ticket.created)
- [ ] Prerequisite dependencies linked (OAuth required for widget)

**Phase 5: Outcome Tracking**
- [ ] Automations update `context.outcome` after completion
- [ ] Outcomes include actual vs expected results
- [ ] Outcomes tracked asynchronously (don't block user)

**Phase 6: Testing**
- [ ] "Explain what happened" generates coherent narratives
- [ ] Event Debugger shows linked workflows
- [ ] Graph traversal performance acceptable (<2 seconds)
- [ ] No circular event links (prevents infinite loops)

**Phase 7: Production Deployment**
- [ ] Database indexes created for `relatedEvents` and `timestamp`
- [ ] Narrative generation cached (not computed every request)
- [ ] Event log retention policy configured (delete old events)
- [ ] Monitoring in place for slow queries

---

**Last Updated:** November 24, 2025
**Status:** Design Complete, Ready for Implementation
**Next Steps:** Begin Phase 1 implementation (database schema + TypeScript interfaces)
