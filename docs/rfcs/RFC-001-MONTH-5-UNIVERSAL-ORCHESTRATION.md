# RFC-001: Universal Orchestration Layer & Glass Factory

**Status:** Approved for Implementation
**Created:** 2025-11-24
**Author:** Agentic Dashboard Team
**Related Documents:**
- Vision: [CLAUDE.md](../../CLAUDE.md#month-5)
- Implementation: [MONTH_5_IMPLEMENTATION_GUIDE.md](../MONTH_5_IMPLEMENTATION_GUIDE.md)
- Roadmap: [plan.md](../../plan.md#month-5)

---

## Table of Contents

1. [Summary](#summary)
2. [Motivation](#motivation)
3. [Guide-Level Explanation](#guide-level-explanation)
4. [Reference-Level Explanation](#reference-level-explanation)
5. [Drawbacks](#drawbacks)
6. [Rationale & Alternatives](#rationale--alternatives)
7. [Unresolved Questions](#unresolved-questions)
8. [Implementation Timeline](#implementation-timeline)
9. [Success Metrics](#success-metrics)

---

## Summary

### Vision Evolution

**From:** Interconnected dashboard where widgets communicate via Event Mesh
**To:** Universal Orchestration Layer - a meta-system that observes, automates, and documents any workflow

**Core Thesis:** The system explains itself while you build it.

### Key Components

1. **Problem-First Widget Wizard**
   - Stage 1 asks "What problem are you solving?" not "What provider?"
   - Captures user intent naturally (problemSolved, painPoint, goal, impactMetric)
   - AI infers solution from problem description

2. **Glass Factory (Self-Documenting System)**
   - Observes events marked `shouldDocument: true`
   - Builds narrative context over time (decisions, trade-offs, outcomes)
   - Generates Twitter threads explaining technical decisions in simple language
   - "You build features → 5 minutes later → shareable content"

3. **DocumentableEvent Architecture**
   - Extends Event Mesh with `userIntent` field
   - Stores "why" not just "what"
   - Enables Journalist Agent to tell compelling stories

4. **Domain Expansion**
   - Add Stripe (payments) + Twilio (notifications)
   - Proves: Not just dev tools, works for any workflow
   - Example automation: payment received → SMS notification

### Timeline

4 weeks (December 1-28, 2025)
- **70% effort:** Problem-first Widget Wizard
- **30% effort:** Glass Factory MVP (Twitter threads only)
- **Parallel:** Stripe + Twilio integration

### Differentiator

Most dashboards: passive displays with hardcoded integrations.

This meta-dashboard: active orchestration layer with self-aware documentation. It doesn't just show your work - it observes it, automates it, and explains it.

---

## Motivation

### The Problem with Current Architecture

**Month 1-4 Achievement:**
- Built Event Mesh (widgets interconnect automatically)
- 5 providers integrated (GitHub, Jira, Linear, Slack, Calendar)
- Real API integration, OAuth 2.0, token refresh
- Click PR #1 → Jira auto-filters to SCRUM-5 (the "magic moment")

**What's Missing:**

1. **User Intent is Invisible**
   - System knows "User created GitHub widget"
   - System doesn't know "User was wasting 30min/day tracking PRs manually"
   - Without motivation, can't tell a story, can't explain value

2. **Widget Creation is Technical**
   - Current: "What provider do you need?" (developer mindset)
   - Better: "What problem are you solving?" (human mindset)
   - Technical questions create friction, problem-first questions feel natural

3. **Limited to Dev Tools**
   - All 5 providers are developer-focused (GitHub, Jira, Linear)
   - Vision says "Universal Orchestration" but only proves dev dashboard
   - Need business providers (payments, notifications) to validate thesis

4. **No Self-Documentation**
   - Build complex system → knowledge lives in your head
   - 3 months later: "Why did we build this? What problem did it solve?"
   - Manual documentation is always out of date

### The Insight: Trojan Horse Question

**The "Trojan Horse" Strategy:**

Instead of asking technical questions upfront and *maybe* capturing intent later, **lead with the problem**:

```
Old Stage 1: "What provider do you need?"
New Stage 1: "What problem are you trying to solve today?"
```

Why this is brilliant:
- **Zero added friction** - It's the FIRST question, not an afterthought
- **Natural conversation** - Users explain problems easier than specs
- **Better AI inference** - Understanding context → better widget generation
- **Rich documentation input** - "Wasting 30min/day" vs "Created GitHub widget"

This single question transforms the architecture from technical-first to human-first.

### The Glass Factory Concept

**Inspiration:** Factory with glass walls - you can see every step of the manufacturing process.

**Applied to Software:** What if the system documented its own evolution as you built it?

```
Traditional approach:
1. Build feature
2. Write documentation (maybe)
3. Documentation is out of date in 1 week

Glass Factory approach:
1. Build feature (system observes)
2. System generates documentation automatically
3. Documentation is ALWAYS current (generated from events)
```

**The Magic Moment:**

You make a technical decision → 5 minutes later you have shareable content explaining it.

You spend time building. The system spends time explaining.

### Why This Changes Everything

**Context Continuity:**

Clicking a PR doesn't just filter Jira - it tells Claude Code to prioritize that branch, triggers test runs, updates AI context. One action, entire workflow responds.

**Domain Flexibility:**

Same architecture orchestrates:
- Developer workflows: GitHub → Jira → CI/CD → Docs
- Business operations: Payment → Booking → Tasks → Finance → Notification
- Whatever you build next

**Self-Aware Documentation:**

The system explains itself while you build it. Technical decisions become shareable stories automatically.

### North Star

A single surface where all passive monitoring and active workflow converge, that documents its own evolution while you build.

---

## Guide-Level Explanation

### User Journey: Creating a Widget with Problem-First Wizard

**Scenario:** Sarah's team is losing track of pull requests across 3 repositories.

#### Stage 1: Problem Discovery

```
Wizard: "Hey Sarah! What problem are you trying to solve today?"

Sarah: "My team is losing track of pull requests across 3 repos.
        We spend 30 minutes every morning checking each repo manually."

[Behind the scenes: AI extracts intent]
- Problem: Manual PR tracking
- Pain point: 30min/day wasted time
- Scale: 3 repos
- Goal: Consolidated view
- Expected outcome: Zero manual checking

[AI infers solution]
Wizard: "Got it! I can create a dashboard widget that shows all PRs
         across your 3 repos in one place. Which repos should I track?"
```

**What's different:**
- Old approach: "What provider?" (technical)
- New approach: "What problem?" (human)
- Intent captured automatically, no separate form needed

#### Stage 2: Implementation Details

```
Wizard: "Which repositories should I monitor?"

Sarah: "owner/frontend, owner/backend, owner/mobile"

Wizard: "Should I filter PRs by state? (all, open, closed)"

Sarah: "Just open PRs"

Wizard: "How often should I refresh? (real-time, 5min, hourly)"

Sarah: "Real-time would be great"
```

**What's different:**
- AI only asks questions relevant to the problem (PRs, not Issues)
- Guided by problem context from Stage 1
- Skips irrelevant options

#### Stage 3: Visualization Selection

```
Wizard: "How should I display the PRs?"

[Shows 3 options with previews]
- List view (like inbox)
- Kanban board (draft → review → approved)
- Table view (sortable columns)

Sarah: "List view, sorted by newest first"
```

#### Stage 4: Schema Preview

```
Wizard: "Here's what I'm going to create:"

[Shows JSON schema]
{
  "provider": "github",
  "endpoint": "/repos/{owner}/{repo}/pulls",
  "filters": { "state": "open" },
  "layout": "list",
  "sort": "created_at desc"
}

Wizard: "Does this look right?"

Sarah: "Perfect!"
```

#### Stage 5: Deploy & Event Mesh

```
Wizard: "Creating your widget..."

[System logs DocumentableEvent]
{
  event: "widget.created",
  payload: { type: "github-prs", repos: [...] },
  shouldDocument: true,
  userIntent: {
    problemSolved: "Manual PR tracking across 3 repos taking 30min/day",
    painPoint: "Team losing track of PRs",
    goal: "Consolidated PR view in one dashboard",
    expectedOutcome: "Zero manual checking",
    impactMetric: "Save 30min/day"
  },
  context: {
    decision: "Created GitHub multi-repo PR widget",
    outcome: "All PRs visible in single dashboard"
  }
}

Wizard: "Done! Your PR tracker is live. Want to set up Event Mesh
         connections? (e.g., click PR → Jira auto-filters)"

Sarah: "Yes!"
```

**What's captured:**
- Technical details (provider, endpoint, filters)
- User motivation (why they did this)
- Expected impact (30min/day saved)
- All in one conversation, zero separate forms

### User Journey: Generating Documentation with Glass Factory

**Same scenario, next day:**

```
Sarah: [Clicks "Generate Thread" in Event Flow Debugger]

Glass Factory: [Queries event_history for past 24h]
- Found 1 documented event: widget.created (GitHub PR tracker)
- UserIntent: problemSolved="Manual PR tracking taking 30min/day"
- Context: decision="Created multi-repo PR widget"

[Journalist Agent generates content]

Twitter Thread Preview:

1/7 We were wasting 30 minutes every morning tracking PRs across 3 repos.

Manual checking. Spreadsheets. Constant Slack messages asking "did you review my PR?"

There had to be a better way.

2/7 Built a simple dashboard widget that pulls all PRs into one view.

GitHub API + 10 lines of config.

No more repo-hopping. No more spreadsheets.

3/7 The magic: it's REAL-TIME.

PR opened → appears instantly.
PR reviewed → updates automatically.
PR merged → moves to "Done" column.

Zero manual work.

4/7 Time saved: 30 min/day → 2.5 hours/week → 10 hours/month.

For a 5-person team: 50 hours/month.

That's more than a full work week saved every month.

5/7 Tech details (for the nerds):
- Next.js dashboard
- GitHub OAuth (30sec setup)
- Real-time Event Mesh (widgets auto-sync)
- Works with any GitHub repo

6/7 The system is "magical" because widgets TALK to each other.

Click a PR → Jira auto-filters to that ticket.
One action → entire workflow responds.

Zero configuration needed.

7/7 This is what "10x tooling" means:

Not 10% faster. Not 2x faster.

Going from 30min manual work → 0min automated work.

That's the leverage point.

[Button: Copy to Clipboard]

Sarah: [Copies thread, posts to Twitter, team sees it, CEO retweets]
```

**What just happened:**
- Sarah built a feature yesterday
- Journalist Agent observed the event + userIntent
- Generated shareable content explaining the decision
- Told a STORY (problem → solution → impact), not just technical details
- Total time: 5 minutes from "Generate" to "Posted"

**The magic:**
- Sarah spent time building
- System spent time explaining
- Documentation is ALWAYS current (generated from events)
- Technical decision became shareable story

### User Journey: Domain Flexibility with Stripe + Twilio

**Scenario:** Alex runs a small business, receives payments via Stripe.

```
Alex: "What problem are you trying to solve?"

Alex: "When customers pay, I manually send them a thank-you SMS.
       Takes 5-10 minutes per payment. I do 20 payments/day."

Wizard: "Got it! I can automate that. Connect Stripe (for payments)
         and Twilio (for SMS), then I'll set up the automation."

[Alex connects both providers]

Wizard: "When a payment is received, what should the SMS say?"

Alex: "Thank you for your payment of ${{amount}}! Your order is confirmed."

[System creates automation widget]
{
  subscriptions: [{
    pattern: "payment.received",
    action: {
      type: "api-call",
      provider: "twilio",
      endpoint: "/messages",
      body: {
        to: "{{event.customer.phone}}",
        body: "Thank you for your payment of ${{event.amount}}! Your order is confirmed."
      }
    }
  }]
}

Wizard: "Done! Every time you receive a payment, customers get an SMS automatically."

[Next day: Stripe payment comes in]
- Stripe publishes payment.received event
- Automation widget subscribes
- Twilio sends SMS
- Alex saves 5-10 min per payment (100-200 min/day saved!)
```

**What this proves:**
- Same architecture works for dev tools AND business workflows
- Payment → SMS notification (domain flexibility)
- "Universal Orchestration" is real, not just marketing

**Glass Factory captures it:**
```
Twitter Thread:

1/5 I was spending 100-200 minutes EVERY DAY manually texting customers
    after they paid. Copy payment amount, find phone number, send SMS.
    Repeat 20 times.

2/5 Built a 2-minute automation: Stripe → Twilio.

When payment received → customer gets thank-you SMS automatically.

Zero manual work.

3/5 Time saved: 100-200 min/day → 8-16 hours/day.

Wait, that can't be right... let me recalculate.

[checks notes]

Oh. That IS right. I was spending 10+ hours/day on manual SMS.

4/5 This is the power of workflow automation:

Not "save 10% of your time."

Going from 10 hours → 0 hours.

That's 10,000% improvement.

5/5 Same architecture that handles GitHub PRs handles Stripe payments.

Universal Orchestration Layer: any workflow, any domain.

The dashboard is just the interface. The engine is the Event Mesh.
```

---

## Reference-Level Explanation

### 1. DocumentableEvent Architecture

#### Event Schema Evolution

**Current (Month 1-4):**
```typescript
interface EventLogEntry {
  timestamp: Date;
  event: string;
  payload: any;
  source?: string;
}
```

**New (Month 5+):**
```typescript
interface DocumentableEvent extends EventLogEntry {
  // Glass Factory fields
  shouldDocument?: boolean;

  userIntent?: {
    problemSolved: string;      // "Manual PR tracking across 3 repos"
    painPoint: string;          // "30min/day wasted time"
    goal: string;               // "Consolidated PR view"
    expectedOutcome: string;    // "Zero manual checking"
    impactMetric?: string;      // "Save 30min/day" (optional)
  };

  context?: {
    decision?: string;           // "Created GitHub multi-repo PR widget"
    outcome?: string;            // "All PRs visible in single dashboard"
    relatedEvents?: string[];    // Knowledge graph links
    category?: 'architecture' | 'bug-fix' | 'feature' | 'refactor';
  };

  metadata?: {
    userId: string;
    sessionId: string;
    environment: 'dev' | 'prod';
  };
}
```

#### Migration Strategy

**Backward Compatibility:**
- All new fields are optional
- Existing Event Mesh code works unchanged
- DocumentableEvent is a superset of EventLogEntry

**Opt-In Documentation:**
- Events default to `shouldDocument: false`
- Automatically mark key events:
  - `widget.created`
  - `provider.connected`
  - `automation.triggered`
- Users can manually mark others

**Storage:**
- In-memory: Last 100 events (current behavior)
- Database: All events marked `shouldDocument: true`
- No database impact for undocumented events

### 2. Event Persistence Layer

#### Database Schema

**Table: `event_history`**
```sql
CREATE TABLE event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  source TEXT,
  should_document BOOLEAN DEFAULT false,
  user_intent JSONB,  -- { problemSolved, painPoint, goal, expectedOutcome, impactMetric }
  context JSONB,      -- { decision, outcome, relatedEvents[], category }
  metadata JSONB,     -- { userId, sessionId, environment }
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes for performance
  INDEX idx_event_history_user_time (user_id, timestamp DESC),
  INDEX idx_event_history_documented (user_id, should_document) WHERE should_document = true
);

-- RLS policy: users can only see their own events
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own events"
  ON event_history
  FOR ALL
  USING (auth.uid() = user_id);
```

**Table: `narrative_context`**
```sql
CREATE TABLE narrative_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_range TEXT NOT NULL,  -- "24h", "7d", "30d"
  event_ids UUID[] NOT NULL,  -- Array of event_history.id
  narrative JSONB NOT NULL,   -- Accumulated context
  relationships JSONB,         -- { cause_effect: [...], decision_outcome: [...] }
  themes TEXT[],              -- ["automation", "performance", "UX improvement"]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  INDEX idx_narrative_user_time (user_id, time_range)
);

-- RLS policy
ALTER TABLE narrative_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own narratives"
  ON narrative_context
  FOR ALL
  USING (auth.uid() = user_id);
```

#### Event Mesh Modifications

**Current publish function:**
```typescript
// lib/events/event-mesh.ts
const publish = (event: string, payload: any, source?: string) => {
  // In-memory pub/sub
  const entry: EventLogEntry = {
    timestamp: new Date(),
    event,
    payload,
    source,
  };

  zustandStore.addEvent(entry);
  zustandStore.notifySubscribers(event, payload);
};
```

**New publishDocumentable function:**
```typescript
// lib/events/event-mesh.ts
const publishDocumentable = async (
  event: string,
  payload: any,
  source?: string,
  options?: {
    shouldDocument?: boolean;
    userIntent?: UserIntent;
    context?: EventContext;
  }
) => {
  // In-memory pub/sub (unchanged)
  const entry: DocumentableEvent = {
    timestamp: new Date(),
    event,
    payload,
    source,
    shouldDocument: options?.shouldDocument,
    userIntent: options?.userIntent,
    context: options?.context,
  };

  zustandStore.addEvent(entry);
  zustandStore.notifySubscribers(event, payload);

  // NEW: Persist to database if documented
  if (options?.shouldDocument) {
    await supabase.from('event_history').insert({
      user_id: getCurrentUserId(),
      event_name: event,
      payload,
      source,
      should_document: true,
      user_intent: options.userIntent,
      context: options.context,
      timestamp: entry.timestamp,
    });
  }
};
```

**Automatic documentation marking:**
```typescript
// Automatically mark key events
const AUTO_DOCUMENT_EVENTS = [
  'widget.created',
  'widget.deleted',
  'provider.connected',
  'provider.disconnected',
  'automation.created',
  'automation.triggered',
];

const shouldAutoDocument = (event: string): boolean => {
  return AUTO_DOCUMENT_EVENTS.includes(event);
};
```

### 3. Knowledge Graph Builder

#### Relationship Extraction

**Phase 1: Simple (Month 5 MVP)**

Link events with explicit IDs:
```typescript
// lib/narrative/knowledge-graph.ts
const extractRelationships = (events: DocumentableEvent[]) => {
  const relationships: Relationship[] = [];

  // Look for PR IDs in events
  const prPattern = /#(\d+)/;
  const jiraPattern = /(SCRUM-\d+)/;

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const eventA = events[i];
      const eventB = events[j];

      // Check if both events reference same PR/Jira ticket
      const prA = JSON.stringify(eventA.payload).match(prPattern)?.[1];
      const prB = JSON.stringify(eventB.payload).match(prPattern)?.[1];

      if (prA && prA === prB) {
        relationships.push({
          type: 'related',
          source: eventA.event,
          target: eventB.event,
          evidence: `Both reference PR #${prA}`,
        });
      }

      // Similar for Jira tickets
      const jiraA = JSON.stringify(eventA.payload).match(jiraPattern)?.[1];
      const jiraB = JSON.stringify(eventB.payload).match(jiraPattern)?.[1];

      if (jiraA && jiraA === jiraB) {
        relationships.push({
          type: 'related',
          source: eventA.event,
          target: eventB.event,
          evidence: `Both reference ${jiraA}`,
        });
      }
    }
  }

  return relationships;
};
```

**Phase 2: AI-Powered (Month 6+)**

Use Claude to infer relationships:
```typescript
const extractRelationshipsAI = async (events: DocumentableEvent[]) => {
  const prompt = `
    Analyze these events and identify relationships:
    ${JSON.stringify(events, null, 2)}

    Types of relationships:
    - cause_effect: Event A caused Event B
    - decision_outcome: Decision led to outcome
    - problem_solution: Problem was solved by action

    Return JSON: { relationships: [{ type, source, target, evidence }] }
  `;

  const response = await claudeAPI.analyze(prompt);
  return response.relationships;
};
```

#### Narrative Accumulation

**Background Job (runs every 5 minutes):**
```typescript
// lib/narrative/accumulator.ts
const buildNarrative = async (userId: string, timeRange: string) => {
  // Query documented events
  const events = await supabase
    .from('event_history')
    .select('*')
    .eq('user_id', userId)
    .eq('should_document', true)
    .gte('timestamp', getTimeRangeStart(timeRange))
    .order('timestamp', { ascending: true });

  // Extract relationships
  const relationships = extractRelationships(events.data);

  // Detect themes
  const themes = detectThemes(events.data);
  // Example: If 80%+ events have userIntent.problemSolved containing "manual",
  //          theme = "automation"

  // Build narrative structure
  const narrative = {
    timeRange,
    eventCount: events.data.length,
    events: events.data.map(e => ({
      event: e.event_name,
      timestamp: e.timestamp,
      userIntent: e.user_intent,
      context: e.context,
    })),
    relationships,
    themes,
    summary: generateSummary(events.data, relationships, themes),
  };

  // Store in narrative_context table
  await supabase.from('narrative_context').upsert({
    user_id: userId,
    time_range: timeRange,
    event_ids: events.data.map(e => e.id),
    narrative,
    relationships,
    themes,
    updated_at: new Date(),
  });
};

const generateSummary = (events, relationships, themes) => {
  return {
    totalEvents: events.length,
    primaryTheme: themes[0] || 'general',
    keyDecisions: events.filter(e => e.context?.decision).length,
    problemsSolved: events.filter(e => e.user_intent?.problemSolved).length,
    impactMetrics: events
      .map(e => e.user_intent?.impactMetric)
      .filter(Boolean),
  };
};
```

**Theme Detection:**
```typescript
const detectThemes = (events: DocumentableEvent[]): string[] => {
  const themeKeywords = {
    automation: ['manual', 'automate', 'automatic', 'save time'],
    performance: ['slow', 'fast', 'optimize', 'cache', 'speed'],
    ux: ['user experience', 'friction', 'usability', 'interface'],
    security: ['auth', 'oauth', 'token', 'encrypt', 'secure'],
    integration: ['connect', 'integrate', 'provider', 'api'],
  };

  const themeCounts: Record<string, number> = {};

  for (const event of events) {
    const text = JSON.stringify([
      event.user_intent?.problemSolved,
      event.user_intent?.goal,
      event.context?.decision,
    ]).toLowerCase();

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        }
      }
    }
  }

  // Return themes sorted by frequency
  return Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);
};
```

### 4. Journalist Agent

#### System Prompt

```typescript
const JOURNALIST_SYSTEM_PROMPT = `
You are a technical journalist for an AI-powered workflow orchestration platform.

Your job: Translate technical events into compelling Twitter threads that explain decisions in simple, relatable language.

## Input Format

You receive a "narrative" object containing:
- events: Array of DocumentableEvent with userIntent and context
- relationships: Connections between events
- themes: Detected patterns (automation, performance, UX, etc.)
- timeRange: Period covered (24h, 7d, 30d)

## Output Format

Twitter thread: 5-10 tweets, 280 characters each.

## Translation Philosophy

1. START WITH THE PROBLEM (user's pain point)
   - Bad: "Created GitHub widget"
   - Good: "We were wasting 30 minutes every morning tracking PRs"

2. Show the solution (what they built)
   - Explain WHAT they did in simple terms
   - Avoid jargon ("Event Mesh" → "widgets talk to each other")

3. Quantify the impact (time saved, efficiency gained)
   - Use concrete numbers ("30 min/day saved")
   - Calculate cumulative impact ("2.5 hours/week")

4. Make it relatable (everyone has this problem)
   - Use "we" not "I" (team problem, not individual)
   - Reference common frustrations (spreadsheets, manual checking)

5. End with the insight (what this teaches us)
   - "10x tooling" is about leverage, not incremental improvement
   - Automation isn't about speed, it's about elimination

## Thread Structure

Tweet 1: The problem (pain point, frustration, time waste)
Tweet 2-3: The solution (what was built, how it works)
Tweet 4-5: The impact (time saved, efficiency gained, metrics)
Tweet 6-7: Technical details (for developers, but still simple)
Tweet 8-9: The insight (what this teaches about workflow automation)
Tweet 10: Call to action (optional, if relevant)

## Kindergarten Translation

Technical terms must be explained simply:
- "OAuth 2.0" → "secure login"
- "Event Mesh" → "widgets talk to each other automatically"
- "Real-time pub/sub" → "updates appear instantly, no refresh needed"
- "JSONB field" → "flexible data storage"
- "Background cron job" → "automatic task that runs every 5 minutes"

## Example

Input:
{
  "events": [{
    "event": "widget.created",
    "userIntent": {
      "problemSolved": "Manual PR tracking across 3 repos taking 30min/day",
      "painPoint": "Team losing track of PRs",
      "goal": "Consolidated PR view",
      "impactMetric": "Save 30min/day"
    },
    "context": {
      "decision": "Created GitHub multi-repo PR widget"
    }
  }],
  "themes": ["automation"],
  "timeRange": "24h"
}

Output:
1/7 We were wasting 30 minutes every morning tracking PRs across 3 repos.

Manual checking. Spreadsheets. Constant Slack messages.

There had to be a better way.

2/7 Built a simple dashboard widget that pulls all PRs into one view.

GitHub API + 10 lines of config.

No more repo-hopping. No more spreadsheets.

3/7 The magic: it's REAL-TIME.

PR opened → appears instantly.
PR reviewed → updates automatically.
PR merged → moves to "Done" column.

Zero manual work.

4/7 Time saved: 30 min/day → 2.5 hours/week → 10 hours/month.

For a 5-person team: 50 hours/month.

That's more than a full work week saved every month.

5/7 Tech details (for the nerds):
- Next.js dashboard
- GitHub OAuth (30sec setup)
- Real-time Event Mesh (widgets auto-sync)
- Works with any GitHub repo

6/7 The system is "magical" because widgets TALK to each other.

Click a PR → Jira auto-filters to that ticket.
One action → entire workflow responds.

Zero configuration needed.

7/7 This is what "10x tooling" means:

Not 10% faster. Not 2x faster.

Going from 30min manual work → 0min automated work.

That's the leverage point.

## Guidelines

- Each tweet must be ≤280 characters
- Use simple language (avoid jargon)
- Focus on STORY (problem → solution → impact)
- Make it relatable (everyone has similar problems)
- End with insight (what this teaches us)

Your threads should make technical decisions accessible to non-technical audiences.
`;
```

#### Implementation

```typescript
// lib/ai/journalist-agent.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateThreadOptions {
  userId: string;
  timeRange: '24h' | '7d' | '30d';
}

export const generateTwitterThread = async (
  options: GenerateThreadOptions
): Promise<string[]> => {
  // Query narrative context
  const { data: narrative } = await supabase
    .from('narrative_context')
    .select('*')
    .eq('user_id', options.userId)
    .eq('time_range', options.timeRange)
    .single();

  if (!narrative) {
    throw new Error(`No narrative found for user ${options.userId} in timeRange ${options.timeRange}`);
  }

  // Generate thread via Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2000,
    system: JOURNALIST_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a Twitter thread from this narrative:\n\n${JSON.stringify(narrative.narrative, null, 2)}`,
      },
    ],
  });

  // Parse thread (assuming Claude returns numbered tweets)
  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  const tweets = parseThread(content);

  // Validate tweet lengths
  for (const tweet of tweets) {
    if (tweet.length > 280) {
      console.warn(`Tweet exceeds 280 chars: ${tweet.length} chars`);
    }
  }

  return tweets;
};

const parseThread = (content: string): string[] => {
  // Split by tweet numbers (1/7, 2/7, etc.)
  const tweetPattern = /\d+\/\d+\s+(.+?)(?=\n\d+\/\d+|$)/gs;
  const matches = [...content.matchAll(tweetPattern)];

  return matches.map(match => match[1].trim());
};
```

#### API Endpoint

```typescript
// app/api/journalist/generate/route.ts
import { NextResponse } from 'next/server';
import { generateTwitterThread } from '@/lib/ai/journalist-agent';
import { getCurrentUserId } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeRange } = await request.json();

    if (!['24h', '7d', '30d'].includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid timeRange. Must be 24h, 7d, or 30d' },
        { status: 400 }
      );
    }

    const tweets = await generateTwitterThread({ userId, timeRange });

    return NextResponse.json({ tweets });
  } catch (error) {
    console.error('Error generating thread:', error);
    return NextResponse.json(
      { error: 'Failed to generate thread' },
      { status: 500 }
    );
  }
}
```

### 5. Problem-First Widget Wizard

#### AI Inference Layer

**Problem → Widget Mapping:**

```typescript
// lib/ai/widget-creation-agent.ts
const PROBLEM_TO_WIDGET_EXAMPLES = [
  {
    problem: "Track pull requests across multiple repos",
    widget: {
      provider: "github",
      endpoint: "/repos/{owner}/{repo}/pulls",
      type: "pr-list",
    },
  },
  {
    problem: "See team calendar and upcoming meetings",
    widget: {
      provider: "google-calendar",
      endpoint: "/calendars/primary/events",
      type: "calendar-grid",
    },
  },
  {
    problem: "Monitor payment transactions",
    widget: {
      provider: "stripe",
      endpoint: "/charges",
      type: "payment-list",
    },
  },
  {
    problem: "Track sprint tasks and progress",
    widget: {
      provider: "jira",
      endpoint: "/search?jql=sprint={currentSprint}",
      type: "issue-board",
    },
  },
  {
    problem: "See recent Slack messages from specific channels",
    widget: {
      provider: "slack",
      endpoint: "/conversations.history",
      type: "message-list",
    },
  },
];

const WIDGET_CREATION_SYSTEM_PROMPT = `
You are an AI assistant helping users create dashboard widgets through conversation.

## Your Task

Users will describe a problem they're trying to solve. Your job:
1. Extract the problem, pain point, goal, and expected outcome
2. Infer which provider and widget type would solve their problem
3. Ask clarifying questions to gather implementation details
4. Generate a widget schema

## Problem Extraction

From user description, extract:
- problemSolved: What manual work is being eliminated?
- painPoint: What's the specific frustration or time waste?
- goal: What's the desired end state?
- expectedOutcome: What success looks like
- impactMetric: Quantify the improvement (if mentioned)

Example:
User: "My team is losing track of pull requests across 3 repos. We spend 30 minutes every morning checking each repo manually."

Extract:
{
  "problemSolved": "Manual PR tracking across 3 repos",
  "painPoint": "30min/day wasted time, team losing track",
  "goal": "Consolidated PR view in one dashboard",
  "expectedOutcome": "Zero manual checking, see all PRs instantly",
  "impactMetric": "Save 30min/day"
}

## Widget Inference

Given the problem, infer which provider and widget type to suggest.

Examples:
${JSON.stringify(PROBLEM_TO_WIDGET_EXAMPLES, null, 2)}

## Clarifying Questions

Based on the inferred widget, ask ONLY questions necessary for implementation:
- GitHub PRs: Which repos? Filter by state? Refresh frequency?
- Jira tasks: Which project? Sprint or backlog? Status filters?
- Stripe payments: Date range? Amount filters? Show refunds?
- Calendar: Which calendars? Date range? Event types?

DO NOT ask about visualization yet (that's Stage 3).

## Response Format

Stage 1 (Problem Discovery):
{
  "stage": "problem_discovery",
  "extractedIntent": { ... },
  "inferredWidget": { provider, type },
  "message": "Got it! I can create a [WIDGET_TYPE] that [SOLVES_PROBLEM]. Let me ask a few questions..."
}

Stage 2 (Clarifying Questions):
{
  "stage": "clarifying_questions",
  "question": "Which repositories should I monitor?",
  "options": ["text_input", "multi_select"],
  "context": { ... }
}

## Guidelines

- Be conversational and friendly
- Explain technical concepts simply
- Ask ONE question at a time
- Use user's language (if they say "see PRs", don't say "retrieve pull request data")
- Validate inferences ("Does this sound right?")
`;

export const inferWidgetFromProblem = async (
  problemDescription: string
): Promise<{
  extractedIntent: UserIntent;
  inferredWidget: { provider: string; type: string };
  message: string;
}> => {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1000,
    system: WIDGET_CREATION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `User described their problem: "${problemDescription}"\n\nExtract intent and infer widget type.`,
      },
    ],
  });

  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Parse JSON response
  return JSON.parse(content);
};
```

#### Conversation State Management

```typescript
// stores/conversation-store.ts
import { create } from 'zustand';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationState {
  // Wizard state
  currentStage: 'problem_discovery' | 'clarifying_questions' | 'visualization' | 'preview' | 'deploy';

  // Extracted data
  extractedIntent?: UserIntent;
  inferredWidget?: { provider: string; type: string };
  implementationDetails?: Record<string, any>;
  selectedVisualization?: 'list' | 'table' | 'cards' | 'metric';
  generatedSchema?: any;

  // Chat history
  messages: Message[];

  // Actions
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setStage: (stage: ConversationState['currentStage']) => void;
  setExtractedIntent: (intent: UserIntent) => void;
  setInferredWidget: (widget: { provider: string; type: string }) => void;
  updateImplementationDetails: (details: Record<string, any>) => void;
  setSelectedVisualization: (viz: ConversationState['selectedVisualization']) => void;
  setGeneratedSchema: (schema: any) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  currentStage: 'problem_discovery',
  messages: [],

  addMessage: (role, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { role, content, timestamp: new Date() },
      ],
    })),

  setStage: (stage) => set({ currentStage: stage }),

  setExtractedIntent: (intent) => set({ extractedIntent: intent }),

  setInferredWidget: (widget) => set({ inferredWidget: widget }),

  updateImplementationDetails: (details) =>
    set((state) => ({
      implementationDetails: {
        ...state.implementationDetails,
        ...details,
      },
    })),

  setSelectedVisualization: (viz) => set({ selectedVisualization: viz }),

  setGeneratedSchema: (schema) => set({ generatedSchema: schema }),

  reset: () =>
    set({
      currentStage: 'problem_discovery',
      messages: [],
      extractedIntent: undefined,
      inferredWidget: undefined,
      implementationDetails: undefined,
      selectedVisualization: undefined,
      generatedSchema: undefined,
    }),
}));
```

### 6. Provider Expansion: Stripe & Twilio

#### Stripe Provider Adapter

```typescript
// lib/providers/stripe-adapter.ts
import { ProviderAdapter, ApiError } from './types';
import Stripe from 'stripe';

export const stripeAdapter: ProviderAdapter = {
  validateCredentials: async (credentials: any) => {
    try {
      const stripe = new Stripe(credentials.api_key, {
        apiVersion: '2023-10-16',
      });

      // Test API call: list payment methods
      await stripe.paymentMethods.list({ limit: 1 });

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid Stripe API key',
      };
    }
  },

  makeRequest: async (
    endpoint: string,
    method: string,
    credentials: any,
    params?: any
  ) => {
    const stripe = new Stripe(credentials.api_key, {
      apiVersion: '2023-10-16',
    });

    try {
      // Map endpoints to Stripe SDK methods
      if (endpoint === '/charges') {
        const charges = await stripe.charges.list(params);
        return charges.data;
      } else if (endpoint === '/payment_intents') {
        const intents = await stripe.paymentIntents.list(params);
        return intents.data;
      } else if (endpoint === '/customers') {
        const customers = await stripe.customers.list(params);
        return customers.data;
      }

      throw new Error(`Unsupported Stripe endpoint: ${endpoint}`);
    } catch (error: any) {
      throw new ApiError(
        error.statusCode || 500,
        error.message || 'Stripe API error',
        'stripe'
      );
    }
  },

  transformResponse: (data: any) => {
    // Stripe responses are already well-structured
    return data;
  },
};
```

**Stripe Widget Definition:**

```json
{
  "metadata": {
    "id": "stripe-recent-payments",
    "name": "Recent Payments",
    "description": "Shows recent Stripe payment transactions",
    "provider": "stripe",
    "category": "business",
    "version": "1.0.0"
  },
  "dataSource": {
    "provider": "stripe",
    "endpoint": "/charges",
    "method": "GET",
    "params": {
      "limit": 10
    },
    "refreshInterval": 60000
  },
  "fields": [
    {
      "name": "amount",
      "label": "Amount",
      "path": "$.amount",
      "type": "number",
      "format": "currency",
      "transform": "value / 100"
    },
    {
      "name": "customer",
      "label": "Customer",
      "path": "$.billing_details.name",
      "type": "string"
    },
    {
      "name": "status",
      "label": "Status",
      "path": "$.status",
      "type": "string"
    },
    {
      "name": "created",
      "label": "Date",
      "path": "$.created",
      "type": "date",
      "format": "MMM dd, yyyy"
    }
  ],
  "layout": {
    "type": "list",
    "fields": {
      "primary": "customer",
      "secondary": "amount",
      "tertiary": "status",
      "timestamp": "created"
    }
  },
  "interactions": {
    "onSelect": {
      "eventName": "payment.selected",
      "payload": {
        "paymentId": "{{$.id}}",
        "amount": "{{$.amount}}",
        "customer": "{{$.customer}}"
      }
    }
  }
}
```

#### Twilio Provider Adapter

```typescript
// lib/providers/twilio-adapter.ts
import { ProviderAdapter, ApiError } from './types';
import twilio from 'twilio';

export const twilioAdapter: ProviderAdapter = {
  validateCredentials: async (credentials: any) => {
    try {
      const client = twilio(
        credentials.account_sid,
        credentials.auth_token
      );

      // Test API call: fetch account
      await client.api.accounts(credentials.account_sid).fetch();

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid Twilio credentials',
      };
    }
  },

  makeRequest: async (
    endpoint: string,
    method: string,
    credentials: any,
    params?: any,
    body?: any
  ) => {
    const client = twilio(
      credentials.account_sid,
      credentials.auth_token
    );

    try {
      if (endpoint === '/messages' && method === 'POST') {
        // Send SMS
        const message = await client.messages.create({
          from: credentials.phone_number,
          to: body.to,
          body: body.body,
        });

        return message;
      } else if (endpoint === '/messages' && method === 'GET') {
        // List messages
        const messages = await client.messages.list({ limit: params?.limit || 20 });
        return messages;
      }

      throw new Error(`Unsupported Twilio endpoint: ${endpoint}`);
    } catch (error: any) {
      throw new ApiError(
        error.status || 500,
        error.message || 'Twilio API error',
        'twilio'
      );
    }
  },

  transformResponse: (data: any) => {
    return data;
  },
};
```

**Twilio Action Widget:**

```json
{
  "metadata": {
    "id": "twilio-send-sms",
    "name": "Send SMS",
    "description": "Send SMS notifications via Twilio",
    "provider": "twilio",
    "category": "automation",
    "version": "1.0.0"
  },
  "layout": {
    "type": "form",
    "fields": [
      {
        "name": "to",
        "label": "Phone Number",
        "type": "text",
        "placeholder": "+1234567890",
        "required": true
      },
      {
        "name": "body",
        "label": "Message",
        "type": "textarea",
        "placeholder": "Your message here...",
        "required": true
      }
    ],
    "submitButton": {
      "label": "Send SMS",
      "action": {
        "type": "api-call",
        "provider": "twilio",
        "endpoint": "/messages",
        "method": "POST"
      }
    }
  },
  "interactions": {
    "onSuccess": {
      "eventName": "sms.sent",
      "payload": {
        "to": "{{$.to}}",
        "body": "{{$.body}}",
        "messageId": "{{$.sid}}"
      }
    }
  }
}
```

**Payment → SMS Automation Widget:**

```json
{
  "metadata": {
    "id": "payment-sms-automation",
    "name": "Payment SMS Notification",
    "description": "Automatically send SMS when payment received",
    "category": "automation",
    "version": "1.0.0"
  },
  "layout": {
    "type": "none"
  },
  "subscriptions": [
    {
      "pattern": "payment.received",
      "action": {
        "type": "api-call",
        "provider": "twilio",
        "endpoint": "/messages",
        "method": "POST",
        "body": {
          "to": "{{event.customer.phone}}",
          "body": "Thank you for your payment of ${{event.amount}}! Your order is confirmed."
        }
      }
    }
  ]
}
```

---

## Drawbacks

### 1. AI Inference Accuracy

**Problem:** AI may incorrectly map user problems to widget types.

**Example:**
- User: "I need to track tasks"
- AI infers: Jira widget (wrong if user wants GitHub Issues)

**Mitigation:**
- Show inference to user: "Sounds like you need a Jira widget. Is that right?"
- Allow user to override: "Actually, I meant GitHub Issues"
- Improve with few-shot examples in system prompt

**Acceptance Criteria:** 70%+ accuracy (7 out of 10 problems correctly mapped)

### 2. Intent Extraction Quality

**Problem:** Extracted userIntent may be vague or incomplete.

**Example:**
- User: "I need a GitHub widget"
- AI extracts: problemSolved="Need GitHub widget" (not helpful for Journalist)

**Mitigation:**
- Follow-up questions if description is vague:
  - "Tell me more - what's the pain point?"
  - "What would success look like?"
- Preview extracted intent before deploying widget
- Allow user to edit intent in preview modal

**Acceptance Criteria:** 80%+ of extracted intents include problemSolved, painPoint, and goal

### 3. Journalist Thread Quality

**Problem:** Generated Twitter threads may be too technical or boring.

**Example:**
- Bad thread: "Implemented OAuth 2.0 with PKCE. Added token refresh. Used JSONB."
- Good thread: "We were spending 30min/day re-authenticating. Built automatic token refresh. Zero manual work now."

**Mitigation:**
- Extensive few-shot examples in system prompt
- Emphasize "start with problem" in prompt
- Manual editing in preview modal before publishing
- Iterate based on user feedback

**Acceptance Criteria:** 70%+ of users publish generated threads without edits

### 4. Knowledge Graph Complexity

**Problem:** Extracting relationships between events is hard.

**Example:**
- Events reference same PR but with different formats:
  - "PR #123" vs "pull request 123" vs "github.com/owner/repo/pull/123"
- AI needs to infer these are the same

**Mitigation:**
- Start simple: only link events with explicit matching IDs (PR #123)
- Defer AI-powered relationship detection to Month 6
- Accept lower accuracy in MVP (50%+ relationships detected)

**Acceptance Criteria:** 50%+ of related events are correctly linked

### 5. Stripe/Twilio Integration Time

**Problem:** Adding 2 new providers may take longer than estimated.

**Risk Factors:**
- Stripe OAuth Connect is complex (webhooks, test mode, live mode)
- Twilio phone number verification required
- Different error formats than existing providers

**Mitigation:**
- Budget 2-3 days per provider (vs 1-2 days for simpler providers)
- Start with Twilio (API key auth, simpler)
- If Stripe delayed, defer to Month 6

**Acceptance Criteria:** Both providers working by Week 20 (flexible if one is delayed)

### 6. API Cost (Claude API)

**Problem:** Widget creation uses Claude API (pay per token).

**Cost Estimate:**
- Widget creation conversation: ~2,000 tokens input + 1,000 tokens output = 3,000 tokens
- At $3/$15 per 1M tokens: ~$0.06 per widget creation
- Twitter thread generation: ~1,500 tokens input + 1,000 tokens output = 2,500 tokens
- At $3/$15 per 1M tokens: ~$0.05 per thread

**Total:** ~$0.11 per widget creation + thread generation

**Mitigation:**
- Acceptable cost for MVP (<$1 per user per month)
- If cost becomes issue, switch to cheaper model (Haiku) for certain tasks
- Consider MCP server integration (use user's Claude subscription) in Month 6

**Acceptance Criteria:** <$1 per user per month in Claude API costs

---

## Rationale & Alternatives

### Decision 1: Problem-First vs Provider-First

**Chosen:** Problem-first ("What problem are you solving?")

**Alternative:** Provider-first ("What provider do you need?")

**Rationale:**
- Problem-first captures user intent naturally (zero added friction)
- Users think in problems, not providers ("I need to track PRs" not "I need GitHub")
- Enables better AI inference (problem → solution mapping)
- Gives Journalist Agent rich material (story vs technical details)

**Trade-off:**
- AI inference may be inaccurate (70-80% accuracy expected)
- Requires clarifying questions if problem is vague

**When to revisit:** If <60% accuracy in problem → widget mapping

---

### Decision 2: Twitter-Only vs Multi-Format Day One

**Chosen:** Twitter threads only (simple output)

**Alternative:** Multi-format from day one (Twitter, LinkedIn, YouTube, blog)

**Rationale:**
- Ship faster: 1 format takes 1 week, 4 formats take 3-4 weeks
- Validate concept before expanding (does anyone actually use it?)
- Easier to refine quality with single format
- Simple output with sophisticated backend (knowledge graph)

**Trade-off:**
- Users may want LinkedIn/blog immediately
- Deferred to Month 6

**When to revisit:** When 10+ users request multi-format generation

---

### Decision 3: Web UI vs MCP Server

**Chosen:** Web UI for end users (uses Claude API)

**Alternative:** MCP server as primary interface (users chat with Claude Code)

**Rationale:**
- Web UI is self-contained (no Claude Code subscription required)
- Lower barrier to entry (anyone can use it)
- Easier to build onboarding flow
- Dogfooding with MCP server is still possible (for development)

**Trade-off:**
- Users with Claude Code subscriptions pay API fees
- MCP integration deferred to Month 6 (if users request it)

**When to revisit:** If 20+ users request "let me use Claude Code subscription"

---

### Decision 4: 70/30 Split vs Full Focus

**Chosen:** 70% Widget Wizard, 30% Glass Factory

**Alternative A:** 100% Widget Wizard (defer Glass Factory to Month 6)
**Alternative B:** 100% Glass Factory (defer Widget Wizard to Month 6)

**Rationale:**
- Widget Wizard is proven need (users want easier widget creation)
- Glass Factory is differentiator (self-documenting system is unique)
- Parallel tracks validate both concepts simultaneously
- 70/30 split is manageable (both fit in 4 weeks)

**Trade-off:**
- Risk: Neither finishes well if scope is underestimated
- Mitigation: Both are well-scoped, can shift resources if needed

**When to revisit:** If one track is 80% done by Week 19, shift effort to other track

---

### Decision 5: Knowledge Graph Simple vs AI-Powered

**Chosen:** Simple relationship extraction (explicit ID matching)

**Alternative:** AI-powered relationship detection from day one

**Rationale:**
- Simple approach works for 50%+ of cases (PR #123 → Jira SCRUM-5)
- AI-powered is complex and may be inaccurate
- Ship fast, iterate on quality

**Trade-off:**
- Misses fuzzy relationships ("PR 123" vs "pull request 123")
- Deferred to Month 6

**When to revisit:** When 50%+ of related events are NOT being linked

---

### Decision 6: Stripe + Twilio vs Other Providers

**Chosen:** Stripe (payments) + Twilio (notifications)

**Alternative A:** Shopify (e-commerce) + SendGrid (email)
**Alternative B:** Salesforce (CRM) + HubSpot (marketing)

**Rationale:**
- Stripe + Twilio are widely used (high relevance)
- Simpler integration than alternatives (Shopify has complex webhooks)
- Proves business domain flexibility (not just dev tools)
- Good automation example (payment → SMS notification)

**Trade-off:**
- Not all users need payment/SMS
- Other providers deferred to Month 6

**When to revisit:** If 10+ users request specific alternative provider

---

## Unresolved Questions

### 1. MCP Server Integration Timeline

**Question:** Should we add MCP server integration in Month 6, or wait for user demand?

**Context:**
- MCP server lets users use Claude Code subscription (no API fees)
- Requires building second interface (more complexity)
- Not clear if users want this

**Options:**
- **A)** Build in Month 6 regardless (bet on demand)
- **B)** Wait for 20+ user requests (data-driven)
- **C)** Build as "power user mode" (optional advanced feature)

**Decision needed by:** End of Month 5 (Dec 28)

---

### 2. Multi-Language Thread Generation

**Question:** Should Journalist Agent support non-English threads (Spanish, French, etc.)?

**Context:**
- Twitter is global platform
- Claude supports 12+ languages
- Requires user to specify language preference

**Options:**
- **A)** English only (simplest)
- **B)** Auto-detect from user's browser locale
- **C)** Let user select language in UI

**Decision needed by:** Month 6 planning

---

### 3. Knowledge Graph AI Timing

**Question:** When to add AI-powered relationship detection to knowledge graph?

**Context:**
- Current: Simple ID matching (PR #123)
- AI-powered: Infer relationships ("this PR fixed that bug")
- Increases accuracy but adds complexity

**Options:**
- **A)** Month 6 (after validating simple approach)
- **B)** Month 7 (after multi-format Journalist)
- **C)** Never (simple is good enough)

**Decision criteria:** If <50% of relationships are detected with simple approach, add AI

**Decision needed by:** Month 6 planning

---

### 4. Journalist Agent Editing UI

**Question:** Should users be able to edit generated threads before publishing?

**Context:**
- Current plan: Preview modal with copy-paste
- Users may want to tweak wording
- Editing reduces "magic" but increases control

**Options:**
- **A)** Read-only preview (copy-paste only)
- **B)** Editable preview (users can tweak)
- **C)** Regenerate with feedback ("make it more technical")

**Decision needed by:** Week 19 (before shipping Journalist UI)

---

### 5. Event Privacy & Sharing

**Question:** Should users be able to share their narrative_context publicly?

**Context:**
- Glass Factory generates great content
- Users may want to showcase their dashboards
- Privacy concerns (exposing workflow data)

**Options:**
- **A)** Private only (safest)
- **B)** Opt-in public sharing (users choose)
- **C)** Anonymized public gallery (scrub sensitive data)

**Decision needed by:** Month 7 (if sharing features requested)

---

### 6. Automation Widget Limits

**Question:** Should there be a limit on automation widgets per user?

**Context:**
- Automation widgets trigger API calls (cost implications)
- Infinite loops possible (payment → invoice → payment)
- Need safeguards

**Options:**
- **A)** No limit (trust users)
- **B)** 10 automation widgets per user (reasonable)
- **C)** Rate limiting (max 100 triggers per hour)

**Decision needed by:** Week 20 (before shipping automation widgets)

---

## Implementation Timeline

### Week 17 (December 1-7): Foundations

#### Track A: Widget Wizard (70% effort)

**Goals:**
- Claude API client working
- Problem extraction prototype
- Conversation state management

**Tasks:**
1. **Claude API Client Setup**
   - Install Anthropic SDK (`npm install @anthropic-ai/sdk`)
   - Add env vars (`ANTHROPIC_API_KEY`)
   - Create `lib/ai/claude-client.ts`
   - Test API calls (simple prompt → response)

2. **System Prompt Engineering**
   - Write WIDGET_CREATION_SYSTEM_PROMPT
   - Add few-shot examples (problem → widget mapping)
   - Test prompt quality (5 test problems)

3. **Intent Extraction Logic**
   - Implement `inferWidgetFromProblem()` function
   - Parse JSON responses from Claude
   - Validate extraction quality (manual review)

4. **Conversation State Management**
   - Create Zustand store (`stores/conversation-store.ts`)
   - Define state shape (stage, extractedIntent, messages)
   - Add actions (addMessage, setStage, etc.)

**Deliverables:**
- `lib/ai/claude-client.ts` (working API client)
- `lib/ai/widget-creation-agent.ts` (intent extraction)
- `stores/conversation-store.ts` (state management)

**Success Criteria:**
- Claude API returns valid JSON responses
- Can extract intent from 5 test problems
- Conversation store updates correctly

---

#### Track B: Glass Factory (30% effort)

**Goals:**
- Database tables created
- Event persistence working
- `shouldDocument` flag functional

**Tasks:**
1. **Database Migrations**
   - Create migration: `event_history` table
   - Create migration: `narrative_context` table
   - Add indexes for performance
   - Test migrations on dev Supabase

2. **Event Persistence Layer**
   - Modify Event Mesh (`lib/events/event-mesh.ts`)
   - Add `publishDocumentable()` function
   - Automatic marking of key events (`widget.created`, etc.)
   - Test: Create widget → verify event in database

3. **DocumentableEvent Schema**
   - Update TypeScript types (`types/events.ts`)
   - Add `userIntent` field
   - Add `context` field
   - Ensure backward compatibility

**Deliverables:**
- `supabase/migrations/XXX_event_history.sql`
- `supabase/migrations/XXX_narrative_context.sql`
- Updated `lib/events/event-mesh.ts`
- Updated `types/events.ts`

**Success Criteria:**
- Tables created successfully
- Events persist to `event_history` table
- No breaking changes to existing code

---

### Week 18 (December 8-14): Core Implementation

#### Track A: Widget Wizard (70% effort)

**Goals:**
- Stage 1-3 implemented
- Wizard UI functional
- Claude streaming responses

**Tasks:**
1. **Stage 1: Problem Discovery**
   - Implement AI inference layer
   - Show inferred widget to user ("Sounds like you need...")
   - Handle user overrides ("Actually, I meant...")

2. **Stage 2-3: Clarifying Questions + Visualization**
   - Generate clarifying questions based on widget type
   - Present visualization options (list, table, cards)
   - Store responses in conversation state

3. **Wizard UI Components**
   - Create `components/WidgetCreationWizard.tsx`
   - Chat-style interface (messages, input box)
   - Stage indicators (1/5, 2/5, etc.)
   - Loading states during AI responses

4. **Claude Streaming**
   - Wire up Claude streaming API
   - Display responses as they arrive (typewriter effect)
   - Handle errors gracefully

**Deliverables:**
- `components/WidgetCreationWizard.tsx`
- `app/api/ai/widget-creation/chat/route.ts`
- Functional Stage 1-3 wizard

**Success Criteria:**
- User can describe problem → see inferred widget
- User can answer clarifying questions
- UI feels conversational (not form-like)

---

#### Track B: Glass Factory (30% effort)

**Goals:**
- Knowledge graph builder working
- Journalist Agent prototype
- API endpoint functional

**Tasks:**
1. **Knowledge Graph Builder**
   - Implement `extractRelationships()` (simple ID matching)
   - Implement `detectThemes()` (keyword matching)
   - Create background job (runs every 5 min)
   - Test: Generate narrative from 24h events

2. **Journalist Agent**
   - Write JOURNALIST_SYSTEM_PROMPT
   - Add few-shot examples (event → Twitter thread)
   - Implement `generateTwitterThread()` function
   - Test with 3 sample narratives

3. **API Endpoint**
   - Create `app/api/journalist/generate/route.ts`
   - Query `narrative_context` table
   - Call Journalist Agent
   - Return tweets array

**Deliverables:**
- `lib/narrative/knowledge-graph.ts`
- `lib/ai/journalist-agent.ts`
- `app/api/journalist/generate/route.ts`

**Success Criteria:**
- Relationships extracted from test events
- Generated threads start with problem (not technical details)
- API returns valid Twitter thread (5-10 tweets)

---

### Week 19 (December 15-21): Integration

#### Track A: Widget Wizard (70% effort)

**Goals:**
- Stage 4-5 implemented
- End-to-end widget creation working
- Error handling and edge cases

**Tasks:**
1. **Stage 4: Schema Preview**
   - Generate JSON widget schema from conversation
   - Show schema to user with explanation
   - Allow user to approve or go back

2. **Stage 5: Deploy & Event Logging**
   - Deploy widget instance to dashboard
   - Log DocumentableEvent with `userIntent` field
   - Set up Event Mesh subscriptions (if requested)
   - Show success message

3. **End-to-End Testing**
   - Test full wizard flow (problem → deployed widget)
   - Test edge cases:
     - User gives vague problem description
     - User overrides inferred widget
     - User goes back to change answers
   - Fix bugs

4. **Error Handling**
   - Handle Claude API errors (rate limits, timeouts)
   - Handle invalid JSON responses
   - Show friendly error messages

**Deliverables:**
- Complete 5-stage wizard (problem → deployed widget)
- Error handling for common failures
- Test coverage for edge cases

**Success Criteria:**
- User can create widget in <5 min
- 80%+ of generated schemas deploy without errors
- Intent captured automatically

---

#### Track B: Glass Factory (30% effort)

**Goals:**
- Journalist UI functional
- Thread preview and copy working
- Narrative accumulation tested

**Tasks:**
1. **Journalist UI**
   - Create `components/JournalistPanel.tsx`
   - Add "Generate Thread" button to Event Flow Debugger
   - Show preview modal with tweets
   - Add "Copy to Clipboard" button

2. **Thread Preview**
   - Display tweets with character count
   - Highlight tweets >280 chars (warnings)
   - Number tweets (1/7, 2/7, etc.)
   - Format for readability

3. **Narrative Accumulation Testing**
   - Test 24h event window
   - Test with multiple related events
   - Validate theme detection
   - Check relationship quality

**Deliverables:**
- `components/JournalistPanel.tsx`
- Complete Glass Factory flow (events → thread → copy)
- Documentation for users ("How to use Journalist Agent")

**Success Criteria:**
- User clicks "Generate Thread" → sees preview
- Thread explains technical decision in simple language
- User can copy and paste to Twitter

---

### Week 20 (December 22-28): Domain Expansion & Polish

#### Track A: Widget Wizard (40% effort)

**Goals:**
- Polish UX
- Add example problems
- Documentation

**Tasks:**
1. **UX Polish**
   - Loading states (spinners, skeleton screens)
   - Error messages (friendly, actionable)
   - Smooth transitions between stages
   - Mobile responsiveness

2. **Example Problems**
   - Add seeded prompts for inspiration:
     - "Track pull requests across repos"
     - "See team calendar"
     - "Monitor payment transactions"
   - Show examples when wizard opens

3. **Documentation**
   - Create `docs/PROBLEM_FIRST_WIZARD.md`
   - User guide: "How to create widgets"
   - Developer guide: "How to add widget types"

**Deliverables:**
- Polished wizard UI
- User documentation
- Developer documentation

**Success Criteria:**
- Wizard feels smooth and professional
- Users don't need to read docs to use it

---

#### Track B: Glass Factory (30% effort)

**Goals:**
- Refine Journalist prompts
- Add event categories
- Test multi-day narratives

**Tasks:**
1. **Prompt Refinement**
   - Review generated threads (manual QA)
   - Improve system prompt based on issues:
     - Too technical? Add more "kindergarten" examples
     - Too vague? Emphasize concrete metrics
     - Not engaging? Add storytelling structure
   - Re-test with refined prompt

2. **Event Categories**
   - Add `category` field to DocumentableEvent:
     - `architecture` - System design decisions
     - `bug-fix` - Fixed bugs and issues
     - `feature` - New features added
     - `refactor` - Code improvements
   - Use categories in Journalist prompt (context)

3. **Multi-Day Narratives**
   - Test 7-day event window
   - Test 30-day event window
   - Validate accumulated context quality
   - Check for narrative coherence

**Deliverables:**
- Refined Journalist system prompt
- Event category support
- Multi-day narrative testing

**Success Criteria:**
- 70%+ of generated threads need no edits
- Multi-day narratives tell coherent story

---

#### Track C: Domain Expansion (30% effort)

**Goals:**
- Stripe provider working
- Twilio provider working
- Payment → SMS automation functional

**Tasks:**
1. **Stripe Provider Adapter**
   - Create `lib/providers/stripe-adapter.ts`
   - Implement OAuth 2.0 flow (Stripe Connect)
   - Add validation, makeRequest, transformResponse
   - Test with Stripe test mode

2. **Stripe Widget**
   - Create `lib/widgets/definitions/stripe-payments.json`
   - "Recent Payments" widget (list view)
   - Publish `payment.received` event on selection
   - Test end-to-end

3. **Twilio Provider Adapter**
   - Create `lib/providers/twilio-adapter.ts`
   - Implement API key authentication
   - Add validation, makeRequest, transformResponse
   - Test SMS sending

4. **Twilio Widget**
   - Create `lib/widgets/definitions/twilio-sms.json`
   - "Send SMS" action widget (form)
   - Subscribe to `payment.received` event
   - Test automation: payment → SMS

**Deliverables:**
- Stripe provider adapter + widget
- Twilio provider adapter + widget
- Payment → SMS automation example

**Success Criteria:**
- Stripe + Twilio connect successfully
- Payment event triggers SMS notification
- Glass Factory documents business workflow

---

## Success Metrics

### Widget Creation Wizard

**Goal:** Make widget creation faster and more intuitive

**Metrics:**
1. **Time to Create Widget**
   - Baseline: 15 minutes (manual JSON editing)
   - Target: <5 minutes (conversational wizard)
   - Measurement: Track wizard session duration

2. **Schema Accuracy**
   - Target: 80%+ of generated schemas deploy without errors
   - Measurement: Track widget.created events, count deployment failures

3. **Intent Capture Rate**
   - Target: 100% automatic (no separate form needed)
   - Measurement: Track userIntent field presence in events

4. **User Completion Rate**
   - Target: 70%+ of users who start wizard complete it
   - Measurement: Track wizard starts vs widget.created events

**Validation:**
- 5 users create widgets via wizard
- Average time <5 minutes
- 4 out of 5 schemas deploy successfully

---

### Glass Factory (Self-Documentation)

**Goal:** Prove system can explain itself automatically

**Metrics:**
1. **Thread Generation Success**
   - Target: User generates Twitter thread from 24h events
   - Measurement: Track journalist/generate API calls

2. **Thread Quality**
   - Target: Thread starts with problem (not technical jargon)
   - Measurement: Manual review of first tweet

3. **Impact Metrics**
   - Target: Thread includes impact metrics (time saved, efficiency)
   - Measurement: Manual review for presence of metrics

4. **User Sharing**
   - Target: User shares thread publicly (validation)
   - Measurement: Ask users to share link after posting

5. **Edit Rate**
   - Target: 70%+ of users publish without edits
   - Measurement: Survey users ("Did you edit the thread?")

**Validation:**
- 3 users generate threads
- All 3 threads start with problem statement
- 2 out of 3 share threads publicly

---

### Domain Flexibility

**Goal:** Prove Universal Orchestration works beyond dev tools

**Metrics:**
1. **Provider Integration**
   - Target: Stripe + Twilio working end-to-end
   - Measurement: Test payment → SMS automation

2. **Automation Success**
   - Target: Payment event triggers SMS notification
   - Measurement: Test with Stripe test payment

3. **Documentation Coverage**
   - Target: Glass Factory documents business workflow (not just dev tools)
   - Measurement: Generate thread from payment automation event

**Validation:**
- Connect Stripe + Twilio
- Receive test payment
- SMS sent automatically
- Generate thread explaining automation

---

### Overall Success Criteria

**Month 5 is successful if:**

1. ✅ **Widget Wizard:**
   - 5 users create widgets via wizard
   - Average time <5 minutes
   - 80%+ schemas deploy successfully
   - Intent captured automatically

2. ✅ **Glass Factory:**
   - 3 users generate Twitter threads
   - Threads start with problem statement
   - 2 out of 3 share threads publicly

3. ✅ **Domain Flexibility:**
   - Stripe + Twilio working end-to-end
   - Payment → SMS automation functional
   - Glass Factory documents business workflow

4. ✅ **Technical Milestones:**
   - DocumentableEvent schema deployed
   - Event persistence working
   - Knowledge graph accumulates context
   - Build passes with 0 TypeScript errors

**If all criteria met:** Month 5 vision validated, proceed to Month 6 (workflow orchestration + multi-format Journalist)

**If partial success:** Iterate on failing areas, defer Month 6 start by 1-2 weeks

---

## Appendix

### A. Related Documents

- **Vision & Architecture:** [CLAUDE.md](../../CLAUDE.md)
- **Implementation Guide:** [MONTH_5_IMPLEMENTATION_GUIDE.md](../MONTH_5_IMPLEMENTATION_GUIDE.md)
- **Strategic Roadmap:** [plan.md](../../plan.md)
- **Current Status:** [status.md](../../status.md)
- **API Reference:** [API_REFERENCE.md](../API_REFERENCE.md) (to be created)

### B. Code Locations

**Widget Wizard:**
- `lib/ai/claude-client.ts` - Claude API client
- `lib/ai/widget-creation-agent.ts` - Intent extraction, inference
- `stores/conversation-store.ts` - Conversation state
- `components/WidgetCreationWizard.tsx` - UI
- `app/api/ai/widget-creation/chat/route.ts` - API endpoint

**Glass Factory:**
- `lib/events/event-mesh.ts` - Event persistence
- `lib/narrative/knowledge-graph.ts` - Relationship extraction
- `lib/ai/journalist-agent.ts` - Content generation
- `components/JournalistPanel.tsx` - UI
- `app/api/journalist/generate/route.ts` - API endpoint

**Providers:**
- `lib/providers/stripe-adapter.ts` - Stripe integration
- `lib/providers/twilio-adapter.ts` - Twilio integration
- `lib/widgets/definitions/stripe-*.json` - Stripe widgets
- `lib/widgets/definitions/twilio-*.json` - Twilio widgets

### C. Database Schema

**Tables:**
- `event_history` - Permanent event storage
- `narrative_context` - Knowledge graph and accumulated context

**Indexes:**
- `idx_event_history_user_time` - Query events by user + timestamp
- `idx_event_history_documented` - Query documented events only
- `idx_narrative_user_time` - Query narratives by user + time range

### D. API Endpoints

**Widget Creation:**
- `POST /api/ai/widget-creation/chat` - Send message, get response
- `POST /api/ai/widget-creation/deploy` - Deploy approved widget

**Glass Factory:**
- `POST /api/journalist/generate` - Generate Twitter thread
- `GET /api/narrative?timeRange=24h` - Query accumulated context
- `POST /api/events/document` - Mark event as should_document

**Providers:**
- Standard provider endpoints (see OAUTH_SETUP.md)

---

**Last Updated:** 2025-11-24
**Status:** Approved for Implementation
**Next Review:** 2025-12-28 (End of Month 5)
