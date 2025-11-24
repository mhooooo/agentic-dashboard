# Month 5 Implementation Guide: Universal Orchestration Layer

**Created:** November 24, 2025
**Status:** Ready for Implementation
**Timeline:** December 1-28, 2025 (4 weeks)

**Related Documents:**
- **RFC:** [RFC-001: Universal Orchestration Layer](rfcs/RFC-001-MONTH-5-UNIVERSAL-ORCHESTRATION.md)
- **Vision:** [CLAUDE.md](../CLAUDE.md#month-5)
- **Roadmap:** [plan.md](../plan.md#month-5)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Problem-First Widget Wizard](#phase-1-problem-first-widget-wizard)
4. [Phase 2: Glass Factory Foundation](#phase-2-glass-factory-foundation)
5. [Phase 3: Domain Expansion](#phase-3-domain-expansion)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting](#troubleshooting)
8. [Migration from Month 4](#migration-from-month-4)

---

## Overview

### What We're Building

Month 5 transforms the Agentic Dashboard from an "interconnected dashboard" into a **Universal Orchestration Layer** - a system that observes, automates, and documents any workflow.

**Three Key Components:**

1. **Problem-First Widget Wizard** (70% effort)
   - Conversational interface that asks "What problem are you solving?" instead of "What provider?"
   - 5-stage flow: Problem Discovery → Clarifying Questions → Visualization → Preview → Deploy
   - Captures user intent automatically for Glass Factory

2. **Glass Factory MVP** (30% effort)
   - Self-documenting system that generates Twitter threads from your technical decisions
   - Observes events marked `shouldDocument: true`
   - Builds narrative context over time (decisions, trade-offs, outcomes)

3. **Domain Expansion** (parallel)
   - Stripe (payments) + Twilio (notifications) providers
   - Proves Universal Orchestration works beyond dev tools
   - Example: Payment received → SMS notification automatically

### Timeline Summary

```
Week 17 (Dec 1-7):   Foundations (Claude API, database migrations)
Week 18 (Dec 8-14):  Core Implementation (wizard stages, Journalist Agent)
Week 19 (Dec 15-21): Integration (end-to-end flows, UI polish)
Week 20 (Dec 22-28): Domain Expansion (Stripe, Twilio) + polish
```

### Effort Distribution

- **Widget Wizard:** 70% (proven need, user-facing)
- **Glass Factory:** 30% (differentiator, experimental)
- **Track parallelization:** Both tracks run simultaneously where possible

---

## Prerequisites

### Technical Requirements

**Completed:**
- [x] Month 4 complete (OAuth 2.0, token refresh, production infrastructure)
- [x] Build passes with 0 TypeScript errors
- [x] Supabase project configured and deployed
- [x] 5 providers working (GitHub, Jira, Linear, Slack, Google Calendar)

**Required:**
- [x] Claude API access (Anthropic account)
- [x] Stripe test account (for provider integration)
- [x] Twilio account (for SMS integration)
- [x] Local dev environment running (`npm run dev`)

### Environment Variables

Add to `.env.local`:

```bash
# Claude API (for Widget Wizard + Journalist Agent)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Stripe (for payment provider)
STRIPE_API_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

### Test Accounts

**Stripe Test Mode:**
- Dashboard: https://dashboard.stripe.com/test
- Test card: 4242 4242 4242 4242 (any future date, any CVC)

**Twilio Console:**
- Dashboard: https://console.twilio.com
- Free trial: 500 SMS/month
- Test phone: Use your verified number

### Knowledge Prerequisites

**Developers should understand:**
- Anthropic Claude API (Messages API, streaming, structured outputs)
- Zustand state management (for conversation store)
- Supabase database operations (INSERT, SELECT with JSONB)
- Event Mesh architecture (publish/subscribe pattern)

**Recommended reading:**
- [AI_AGENT_ARCHITECTURE.md](AI_AGENT_ARCHITECTURE.md) - Claude API integration patterns
- [month3-factory-design.md](month3-factory-design.md) - UniversalDataWidget system
- [EVENT_MESH_V2.md](EVENT_MESH_V2.md) - DocumentableEvent architecture (coming)

---

## Phase 1: Problem-First Widget Wizard

**Timeline:** Week 17-19 (3 weeks)
**Effort:** 70% of total sprint
**Goal:** Ship conversational widget creation that captures user intent automatically

### Week 17: Foundations

#### Step 1: Claude API Client Setup

**Install dependencies:**

```bash
npm install @anthropic-ai/sdk
```

**Create Claude client:**

```typescript
// lib/ai/claude-client.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const callClaude = async (
  systemPrompt: string,
  userMessage: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
) => {
  const response = await client.messages.create({
    model: options?.model || 'claude-sonnet-4-5-20250929',
    max_tokens: options?.maxTokens || 2000,
    temperature: options?.temperature || 0.7,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  // Extract text content
  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format from Claude API');
};

export { client };
```

**Test API connection:**

```bash
# Create test script
cat > scripts/test-claude-api.ts << 'EOF'
import { callClaude } from '../lib/ai/claude-client';

async function test() {
  try {
    const response = await callClaude(
      'You are a helpful assistant.',
      'Say hello!'
    );
    console.log('✅ Claude API working:', response);
  } catch (error) {
    console.error('❌ Claude API error:', error);
  }
}

test();
EOF

# Run test
npx tsx scripts/test-claude-api.ts
```

**Expected output:** Claude responds with a greeting.

**Troubleshooting:**
- "Invalid API key": Check `ANTHROPIC_API_KEY` in `.env.local`
- "Rate limit exceeded": Wait 60 seconds and retry
- "Network error": Check internet connection and firewall

---

#### Step 2: System Prompt Engineering

**Create prompt for problem extraction:**

```typescript
// lib/ai/prompts/widget-creation.ts
export const WIDGET_CREATION_SYSTEM_PROMPT = `
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
- "Track pull requests" → GitHub PR widget
- "See team calendar" → Google Calendar widget
- "Monitor payment transactions" → Stripe payments widget
- "Sprint tasks" → Jira issue board widget
- "Slack messages" → Slack message list widget

## Response Format

Always respond with valid JSON in this format:

{
  "stage": "problem_discovery",
  "extractedIntent": {
    "problemSolved": "...",
    "painPoint": "...",
    "goal": "...",
    "expectedOutcome": "...",
    "impactMetric": "..." // optional
  },
  "inferredWidget": {
    "provider": "github",
    "type": "pr-list"
  },
  "message": "Got it! I can create a GitHub PR widget that shows all your pull requests in one place. Let me ask a few questions..."
}

## Guidelines

- Be conversational and friendly
- Explain technical concepts simply
- Ask ONE question at a time
- Use user's language (if they say "see PRs", don't say "retrieve pull request data")
- Validate inferences ("Does this sound right?")
`;

export const PROBLEM_TO_WIDGET_EXAMPLES = [
  {
    problem: 'Track pull requests across multiple repos',
    widget: { provider: 'github', type: 'pr-list' },
  },
  {
    problem: 'See team calendar and upcoming meetings',
    widget: { provider: 'google-calendar', type: 'calendar-grid' },
  },
  {
    problem: 'Monitor payment transactions',
    widget: { provider: 'stripe', type: 'payment-list' },
  },
  {
    problem: 'Track sprint tasks and progress',
    widget: { provider: 'jira', type: 'issue-board' },
  },
  {
    problem: 'See recent Slack messages from specific channels',
    widget: { provider: 'slack', type: 'message-list' },
  },
];
```

**Test prompt quality:**

```typescript
// scripts/test-problem-extraction.ts
import { callClaude } from '../lib/ai/claude-client';
import { WIDGET_CREATION_SYSTEM_PROMPT } from '../lib/ai/prompts/widget-creation';

const testProblems = [
  'My team is losing track of pull requests across 3 repos.',
  'I need to see upcoming meetings for the week.',
  'Monitor Stripe payments and send notifications.',
  'Track Jira tickets for current sprint.',
  'See Slack messages from #engineering channel.',
];

async function test() {
  for (const problem of testProblems) {
    console.log('\n📝 Testing:', problem);
    const response = await callClaude(
      WIDGET_CREATION_SYSTEM_PROMPT,
      problem
    );

    try {
      const parsed = JSON.parse(response);
      console.log('✅ Extracted intent:', parsed.extractedIntent);
      console.log('✅ Inferred widget:', parsed.inferredWidget);
    } catch (error) {
      console.error('❌ Invalid JSON response:', response);
    }
  }
}

test();
```

**Success criteria:**
- All 5 test problems return valid JSON
- `problemSolved` field captures the core issue
- `inferredWidget` matches expected provider (manual review)

---

#### Step 3: Conversation State Management

**Create Zustand store:**

```typescript
// stores/conversation-store.ts
import { create } from 'zustand';

export interface UserIntent {
  problemSolved: string;
  painPoint: string;
  goal: string;
  expectedOutcome: string;
  impactMetric?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type WizardStage =
  | 'problem_discovery'
  | 'clarifying_questions'
  | 'visualization'
  | 'preview'
  | 'deploy';

interface ConversationState {
  // Wizard state
  currentStage: WizardStage;
  isLoading: boolean;

  // Extracted data
  extractedIntent?: UserIntent;
  inferredWidget?: { provider: string; type: string };
  implementationDetails: Record<string, any>;
  selectedVisualization?: 'list' | 'table' | 'cards' | 'metric';
  generatedSchema?: any;

  // Chat history
  messages: Message[];

  // Actions
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setStage: (stage: WizardStage) => void;
  setLoading: (loading: boolean) => void;
  setExtractedIntent: (intent: UserIntent) => void;
  setInferredWidget: (widget: { provider: string; type: string }) => void;
  updateImplementationDetails: (details: Record<string, any>) => void;
  setSelectedVisualization: (viz: ConversationState['selectedVisualization']) => void;
  setGeneratedSchema: (schema: any) => void;
  reset: () => void;
}

const initialState = {
  currentStage: 'problem_discovery' as WizardStage,
  isLoading: false,
  messages: [],
  implementationDetails: {},
};

export const useConversationStore = create<ConversationState>((set) => ({
  ...initialState,

  addMessage: (role, content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { role, content, timestamp: new Date() },
      ],
    })),

  setStage: (stage) => set({ currentStage: stage }),

  setLoading: (loading) => set({ isLoading: loading }),

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

  reset: () => set(initialState),
}));
```

---

#### Step 4: Intent Extraction Logic

**Create widget creation agent:**

```typescript
// lib/ai/widget-creation-agent.ts
import { callClaude } from './claude-client';
import { WIDGET_CREATION_SYSTEM_PROMPT } from './prompts/widget-creation';
import { UserIntent } from '@/stores/conversation-store';

interface ProblemDiscoveryResponse {
  stage: 'problem_discovery';
  extractedIntent: UserIntent;
  inferredWidget: { provider: string; type: string };
  message: string;
}

export const inferWidgetFromProblem = async (
  problemDescription: string
): Promise<ProblemDiscoveryResponse> => {
  const response = await callClaude(
    WIDGET_CREATION_SYSTEM_PROMPT,
    `User described their problem: "${problemDescription}"\n\nExtract intent and infer widget type. Respond with JSON only.`
  );

  // Parse JSON response
  try {
    return JSON.parse(response);
  } catch (error) {
    throw new Error(`Failed to parse Claude response: ${response}`);
  }
};

interface ClarifyingQuestionResponse {
  stage: 'clarifying_questions';
  question: string;
  fieldName: string; // What we're asking about (e.g., "repositories", "dateRange")
  inputType: 'text' | 'multi_select' | 'number' | 'date';
  options?: string[]; // For multi_select
  context: Record<string, any>;
}

export const generateClarifyingQuestion = async (
  inferredWidget: { provider: string; type: string },
  implementationDetails: Record<string, any>
): Promise<ClarifyingQuestionResponse> => {
  const prompt = `
The user needs a ${inferredWidget.provider} widget of type ${inferredWidget.type}.

We've collected these details so far:
${JSON.stringify(implementationDetails, null, 2)}

What's the NEXT question we should ask to complete the widget configuration?

Respond with JSON:
{
  "stage": "clarifying_questions",
  "question": "Which repositories should I monitor?",
  "fieldName": "repositories",
  "inputType": "multi_select",
  "options": ["owner/repo1", "owner/repo2"],
  "context": {}
}
`;

  const response = await callClaude(WIDGET_CREATION_SYSTEM_PROMPT, prompt);
  return JSON.parse(response);
};
```

---

### Week 17 Testing Checklist

- [ ] Claude API client connects successfully
- [ ] System prompt returns valid JSON for 5 test problems
- [ ] `extractedIntent` includes problemSolved, painPoint, goal
- [ ] `inferredWidget` maps to correct provider (manual review)
- [ ] Conversation store updates correctly
- [ ] `inferWidgetFromProblem()` works end-to-end
- [ ] No TypeScript errors in new files

---

### Week 18: Core Implementation

#### Step 5: Wizard UI Components

**Create wizard component:**

```typescript
// components/WidgetCreationWizard.tsx
'use client';

import { useState } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function WidgetCreationWizard() {
  const {
    currentStage,
    messages,
    isLoading,
    addMessage,
    setLoading,
  } = useConversationStore();

  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    addMessage('user', inputValue);
    setLoading(true);

    try {
      // Call API
      const response = await fetch('/api/ai/widget-creation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          currentStage,
        }),
      });

      const data = await response.json();

      // Add assistant response
      addMessage('assistant', data.message);

      // Update state based on response
      if (data.extractedIntent) {
        useConversationStore.getState().setExtractedIntent(data.extractedIntent);
      }
      if (data.inferredWidget) {
        useConversationStore.getState().setInferredWidget(data.inferredWidget);
      }
      if (data.nextStage) {
        useConversationStore.getState().setStage(data.nextStage);
      }

      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('assistant', 'Sorry, something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stage indicator */}
      <div className="p-4 border-b">
        <StageIndicator stage={currentStage} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your response..."
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function StageIndicator({ stage }: { stage: string }) {
  const stages = [
    { id: 'problem_discovery', label: 'Problem Discovery' },
    { id: 'clarifying_questions', label: 'Details' },
    { id: 'visualization', label: 'Visualization' },
    { id: 'preview', label: 'Preview' },
    { id: 'deploy', label: 'Deploy' },
  ];

  const currentIdx = stages.findIndex((s) => s.id === stage);

  return (
    <div className="flex items-center justify-between">
      {stages.map((s, idx) => (
        <div
          key={s.id}
          className={`flex items-center gap-2 ${
            idx <= currentIdx ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              idx <= currentIdx ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {idx + 1}
          </div>
          <span className="text-sm font-medium">{s.label}</span>
          {idx < stages.length - 1 && (
            <div className="w-12 h-px bg-border mx-2" />
          )}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: { role: string; content: string } }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <Card
        className={`max-w-[80%] p-3 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <p className="text-sm">{message.content}</p>
      </Card>
    </div>
  );
}
```

---

#### Step 6: API Endpoint

**Create chat endpoint:**

```typescript
// app/api/ai/widget-creation/chat/route.ts
import { NextResponse } from 'next/server';
import { inferWidgetFromProblem, generateClarifyingQuestion } from '@/lib/ai/widget-creation-agent';
import { getCurrentUserId } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, currentStage } = await request.json();

    if (currentStage === 'problem_discovery') {
      // Stage 1: Extract intent and infer widget
      const response = await inferWidgetFromProblem(message);

      return NextResponse.json({
        message: response.message,
        extractedIntent: response.extractedIntent,
        inferredWidget: response.inferredWidget,
        nextStage: 'clarifying_questions',
      });
    } else if (currentStage === 'clarifying_questions') {
      // Stage 2: Generate clarifying question
      // (Implementation depends on widget type)
      // For now, return placeholder
      return NextResponse.json({
        message: 'What else do you need to configure?',
        nextStage: 'visualization',
      });
    }

    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
  } catch (error) {
    console.error('Error in widget creation chat:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
```

---

### Week 18: Testing Checklist

- [ ] Wizard UI renders correctly
- [ ] Stage indicator shows current progress
- [ ] User can type message and send
- [ ] Messages display in chat bubbles
- [ ] Loading state shows during API call
- [ ] Stage 1 (Problem Discovery) works end-to-end
- [ ] `extractedIntent` stored in conversation state
- [ ] No console errors or warnings

---

### Week 19: Integration & Polish

#### Step 7: Complete All 5 Stages

**Stage 3: Visualization Selection**

Add visualization options UI:

```typescript
// In WidgetCreationWizard.tsx, add after clarifying questions stage

function VisualizationSelector({
  onSelect,
}: {
  onSelect: (viz: 'list' | 'table' | 'cards' | 'metric') => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">How should I display the data?</h3>
      <div className="grid grid-cols-2 gap-4">
        <VisualizationOption
          type="list"
          label="List View"
          description="Like an inbox"
          onClick={() => onSelect('list')}
        />
        <VisualizationOption
          type="table"
          label="Table View"
          description="Sortable columns"
          onClick={() => onSelect('table')}
        />
        <VisualizationOption
          type="cards"
          label="Card Grid"
          description="Visual cards"
          onClick={() => onSelect('cards')}
        />
        <VisualizationOption
          type="metric"
          label="Metric"
          description="Single number"
          onClick={() => onSelect('metric')}
        />
      </div>
    </div>
  );
}
```

**Stage 4: Schema Preview**

Generate and show widget schema:

```typescript
// lib/ai/schema-generator.ts
import { UserIntent } from '@/stores/conversation-store';

export function generateWidgetSchema(
  inferredWidget: { provider: string; type: string },
  implementationDetails: Record<string, any>,
  userIntent: UserIntent,
  visualization: string
) {
  // Generate UniversalWidgetDefinition JSON
  const schema = {
    metadata: {
      id: `${inferredWidget.provider}-${inferredWidget.type}-${Date.now()}`,
      name: `${inferredWidget.provider} ${inferredWidget.type}`,
      description: userIntent.problemSolved,
      provider: inferredWidget.provider,
      category: 'custom',
      version: '1.0.0',
    },
    dataSource: {
      provider: inferredWidget.provider,
      endpoint: implementationDetails.endpoint || '/',
      method: 'GET' as const,
      params: implementationDetails.params || {},
      refreshInterval: 60000,
    },
    fields: implementationDetails.fields || [],
    layout: {
      type: visualization,
      fields: implementationDetails.layoutFields || {},
    },
    interactions: {
      onSelect: {
        eventName: `${inferredWidget.provider}.${inferredWidget.type}.selected`,
        payload: {},
      },
    },
  };

  return schema;
}
```

**Stage 5: Deploy**

Deploy widget and log event:

```typescript
// app/api/ai/widget-creation/deploy/route.ts
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth/server';
import { supabase } from '@/lib/supabase/client';
import { publishDocumentable } from '@/lib/events/event-mesh';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { schema, userIntent } = await request.json();

    // Insert widget instance
    const { data: widget, error } = await supabase
      .from('widget_instances')
      .insert({
        user_id: userId,
        template_id: schema.metadata.id,
        position: { x: 0, y: 0, w: 4, h: 4 },
        config: schema,
      })
      .select()
      .single();

    if (error) throw error;

    // Publish DocumentableEvent
    await publishDocumentable(
      'widget.created',
      { widgetId: widget.id, schema },
      'widget-wizard',
      {
        shouldDocument: true,
        userIntent,
        context: {
          decision: `Created ${schema.metadata.provider} widget via AI wizard`,
          outcome: 'Widget deployed successfully',
          category: 'feature',
        },
      }
    );

    return NextResponse.json({ success: true, widgetId: widget.id });
  } catch (error) {
    console.error('Error deploying widget:', error);
    return NextResponse.json(
      { error: 'Failed to deploy widget' },
      { status: 500 }
    );
  }
}
```

---

### Week 19: Testing Checklist

- [ ] User can complete all 5 stages
- [ ] Visualization selector displays options
- [ ] Schema preview shows valid JSON
- [ ] Widget deploys to dashboard successfully
- [ ] DocumentableEvent logged with userIntent
- [ ] Error handling for failed deployments
- [ ] UI polish (loading states, transitions)
- [ ] Mobile responsive layout

---

## Phase 2: Glass Factory Foundation

**Timeline:** Week 17-19 (3 weeks, parallel to Phase 1)
**Effort:** 30% of total sprint
**Goal:** Build infrastructure for self-documenting system

### Week 17: Database Migrations

#### Step 1: Event History Table

**Create migration:**

```sql
-- supabase/migrations/005_event_history.sql
CREATE TABLE IF NOT EXISTS event_history (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_event_history_user_time ON event_history (user_id, timestamp DESC);
CREATE INDEX idx_event_history_documented ON event_history (user_id, should_document) WHERE should_document = true;

-- RLS policy: users can only see their own events
ALTER TABLE event_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own events"
  ON event_history
  FOR ALL
  USING (auth.uid() = user_id);
```

**Apply migration:**

```bash
# Push to Supabase
supabase db push

# Verify table created
supabase db list
```

---

#### Step 2: Narrative Context Table

**Create migration:**

```sql
-- supabase/migrations/006_narrative_context.sql
CREATE TABLE IF NOT EXISTS narrative_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_range TEXT NOT NULL,  -- "24h", "7d", "30d"
  event_ids UUID[] NOT NULL,  -- Array of event_history.id
  narrative JSONB NOT NULL,   -- Accumulated context
  relationships JSONB,         -- { cause_effect: [...], decision_outcome: [...] }
  themes TEXT[],              -- ["automation", "performance", "UX improvement"]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_narrative_user_time ON narrative_context (user_id, time_range);

-- RLS policy
ALTER TABLE narrative_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own narratives"
  ON narrative_context
  FOR ALL
  USING (auth.uid() = user_id);
```

**Apply migration:**

```bash
supabase db push
```

---

### Week 17: Event Persistence

#### Step 3: Modify Event Mesh

**Update Event Mesh to support persistence:**

```typescript
// lib/events/event-mesh.ts (add to existing file)
import { supabase } from '@/lib/supabase/client';

export interface DocumentableEventOptions {
  shouldDocument?: boolean;
  userIntent?: {
    problemSolved: string;
    painPoint: string;
    goal: string;
    expectedOutcome: string;
    impactMetric?: string;
  };
  context?: {
    decision?: string;
    outcome?: string;
    relatedEvents?: string[];
    category?: 'architecture' | 'bug-fix' | 'feature' | 'refactor';
  };
}

// Automatically document these events
const AUTO_DOCUMENT_EVENTS = [
  'widget.created',
  'widget.deleted',
  'provider.connected',
  'provider.disconnected',
  'automation.created',
  'automation.triggered',
];

export const publishDocumentable = async (
  event: string,
  payload: any,
  source?: string,
  options?: DocumentableEventOptions
) => {
  // In-memory pub/sub (unchanged)
  const entry = {
    timestamp: new Date(),
    event,
    payload,
    source,
    shouldDocument: options?.shouldDocument || AUTO_DOCUMENT_EVENTS.includes(event),
    userIntent: options?.userIntent,
    context: options?.context,
  };

  // Add to in-memory event log (existing Zustand store)
  useEventStore.getState().addEvent(entry);

  // Notify subscribers (existing logic)
  useEventStore.getState().notifySubscribers(event, payload);

  // NEW: Persist to database if documented
  if (entry.shouldDocument) {
    try {
      await supabase.from('event_history').insert({
        user_id: getCurrentUserId(),
        event_name: event,
        payload,
        source,
        should_document: true,
        user_intent: options?.userIntent,
        context: options?.context,
        timestamp: entry.timestamp,
      });
    } catch (error) {
      console.error('Failed to persist event to database:', error);
      // Don't throw - in-memory pub/sub should still work
    }
  }

  return entry;
};
```

**Test event persistence:**

```typescript
// scripts/test-event-persistence.ts
import { publishDocumentable } from '@/lib/events/event-mesh';

async function test() {
  // Publish documented event
  await publishDocumentable(
    'widget.created',
    { widgetId: 'test-123' },
    'test-script',
    {
      shouldDocument: true,
      userIntent: {
        problemSolved: 'Test problem',
        painPoint: 'Test pain point',
        goal: 'Test goal',
        expectedOutcome: 'Test outcome',
      },
      context: {
        decision: 'Test decision',
        outcome: 'Test outcome',
        category: 'feature',
      },
    }
  );

  console.log('✅ Event published and persisted');
}

test();
```

**Verify in Supabase:**

```sql
-- Check events table
SELECT * FROM event_history WHERE should_document = true ORDER BY timestamp DESC LIMIT 10;
```

---

### Week 18: Knowledge Graph Builder

#### Step 4: Relationship Extraction

**Create knowledge graph module:**

```typescript
// lib/narrative/knowledge-graph.ts
import { supabase } from '@/lib/supabase/client';

export interface Relationship {
  type: 'related' | 'cause_effect' | 'decision_outcome';
  source: string; // event_name
  target: string; // event_name
  evidence: string; // Why they're related
}

export const extractRelationships = (events: any[]): Relationship[] => {
  const relationships: Relationship[] = [];

  // Pattern matching for common IDs
  const prPattern = /#(\d+)/;
  const jiraPattern = /(SCRUM-\d+|PROJ-\d+)/;
  const widgetPattern = /widget-(\w+)/;

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const eventA = events[i];
      const eventB = events[j];

      const textA = JSON.stringify(eventA.payload);
      const textB = JSON.stringify(eventB.payload);

      // Check for matching PR references
      const prA = textA.match(prPattern)?.[1];
      const prB = textB.match(prPattern)?.[1];

      if (prA && prA === prB) {
        relationships.push({
          type: 'related',
          source: eventA.event_name,
          target: eventB.event_name,
          evidence: `Both reference PR #${prA}`,
        });
      }

      // Check for matching Jira tickets
      const jiraA = textA.match(jiraPattern)?.[1];
      const jiraB = textB.match(jiraPattern)?.[1];

      if (jiraA && jiraA === jiraB) {
        relationships.push({
          type: 'related',
          source: eventA.event_name,
          target: eventB.event_name,
          evidence: `Both reference ${jiraA}`,
        });
      }

      // Check for matching widget IDs
      const widgetA = textA.match(widgetPattern)?.[1];
      const widgetB = textB.match(widgetPattern)?.[1];

      if (widgetA && widgetA === widgetB) {
        relationships.push({
          type: 'related',
          source: eventA.event_name,
          target: eventB.event_name,
          evidence: `Both reference widget-${widgetA}`,
        });
      }
    }
  }

  return relationships;
};

export const detectThemes = (events: any[]): string[] => {
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

---

#### Step 5: Narrative Accumulator

**Create background job:**

```typescript
// lib/narrative/accumulator.ts
import { supabase } from '@/lib/supabase/client';
import { extractRelationships, detectThemes } from './knowledge-graph';

export const buildNarrative = async (userId: string, timeRange: '24h' | '7d' | '30d') => {
  // Calculate time range start
  const getTimeRangeStart = (range: string): Date => {
    const now = new Date();
    if (range === '24h') {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range === '7d') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    return now;
  };

  // Query documented events
  const { data: events, error } = await supabase
    .from('event_history')
    .select('*')
    .eq('user_id', userId)
    .eq('should_document', true)
    .gte('timestamp', getTimeRangeStart(timeRange).toISOString())
    .order('timestamp', { ascending: true });

  if (error || !events || events.length === 0) {
    console.log('No documented events found for narrative');
    return null;
  }

  // Extract relationships
  const relationships = extractRelationships(events);

  // Detect themes
  const themes = detectThemes(events);

  // Build narrative structure
  const narrative = {
    timeRange,
    eventCount: events.length,
    events: events.map((e) => ({
      event: e.event_name,
      timestamp: e.timestamp,
      userIntent: e.user_intent,
      context: e.context,
    })),
    relationships,
    themes,
    summary: {
      totalEvents: events.length,
      primaryTheme: themes[0] || 'general',
      keyDecisions: events.filter((e) => e.context?.decision).length,
      problemsSolved: events.filter((e) => e.user_intent?.problemSolved).length,
      impactMetrics: events
        .map((e) => e.user_intent?.impactMetric)
        .filter(Boolean),
    },
  };

  // Store in narrative_context table
  await supabase.from('narrative_context').upsert({
    user_id: userId,
    time_range: timeRange,
    event_ids: events.map((e) => e.id),
    narrative,
    relationships,
    themes,
    updated_at: new Date().toISOString(),
  });

  return narrative;
};
```

**Create cron job to run accumulator:**

```typescript
// app/api/cron/accumulate-narratives/route.ts
import { NextResponse } from 'next/server';
import { buildNarrative } from '@/lib/narrative/accumulator';
import { supabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users with documented events in past 24h
    const { data: users } = await supabase
      .from('event_history')
      .select('user_id')
      .eq('should_document', true)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const uniqueUsers = [...new Set(users?.map((u) => u.user_id) || [])];

    // Build narratives for each user
    for (const userId of uniqueUsers) {
      await buildNarrative(userId, '24h');
      await buildNarrative(userId, '7d');
      await buildNarrative(userId, '30d');
    }

    return NextResponse.json({
      success: true,
      usersProcessed: uniqueUsers.length,
    });
  } catch (error) {
    console.error('Error accumulating narratives:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**Add to vercel.json:**

```json
{
  "crons": [
    {
      "path": "/api/auth/refresh-tokens",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/accumulate-narratives",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

### Week 18: Journalist Agent

#### Step 6: System Prompt for Twitter Threads

**Create Journalist prompt:**

```typescript
// lib/ai/prompts/journalist.ts
export const JOURNALIST_SYSTEM_PROMPT = `
You are a technical journalist for an AI-powered workflow orchestration platform.

Your job: Translate technical events into compelling Twitter threads that explain decisions in simple, relatable language.

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
Tweet 8: The insight (what this teaches about workflow automation)

## Kindergarten Translation

Technical terms must be explained simply:
- "OAuth 2.0" → "secure login"
- "Event Mesh" → "widgets talk to each other automatically"
- "Real-time pub/sub" → "updates appear instantly, no refresh needed"
- "JSONB field" → "flexible data storage"
- "Background cron job" → "automatic task that runs every 5 minutes"

## Guidelines

- Each tweet must be ≤280 characters
- Use simple language (avoid jargon)
- Focus on STORY (problem → solution → impact)
- Make it relatable (everyone has similar problems)
- End with insight (what this teaches us)

Your threads should make technical decisions accessible to non-technical audiences.
`;
```

---

#### Step 7: Journalist Agent Implementation

**Create Twitter thread generator:**

```typescript
// lib/ai/journalist-agent.ts
import { callClaude } from './claude-client';
import { JOURNALIST_SYSTEM_PROMPT } from './prompts/journalist';
import { supabase } from '@/lib/supabase/client';

export const generateTwitterThread = async (
  userId: string,
  timeRange: '24h' | '7d' | '30d'
): Promise<string[]> => {
  // Query narrative context
  const { data: narrativeData, error } = await supabase
    .from('narrative_context')
    .select('*')
    .eq('user_id', userId)
    .eq('time_range', timeRange)
    .single();

  if (error || !narrativeData) {
    throw new Error(`No narrative found for user ${userId} in timeRange ${timeRange}`);
  }

  // Generate thread via Claude API
  const prompt = `Generate a Twitter thread from this narrative:\n\n${JSON.stringify(
    narrativeData.narrative,
    null,
    2
  )}`;

  const response = await callClaude(JOURNALIST_SYSTEM_PROMPT, prompt, {
    maxTokens: 2000,
    temperature: 0.7,
  });

  // Parse thread (assuming Claude returns numbered tweets)
  const tweets = parseThread(response);

  // Validate tweet lengths
  for (const tweet of tweets) {
    if (tweet.length > 280) {
      console.warn(`Tweet exceeds 280 chars: ${tweet.length} chars`);
    }
  }

  return tweets;
};

function parseThread(content: string): string[] {
  // Split by tweet numbers (1/7, 2/7, etc.)
  const tweetPattern = /(\d+\/\d+)\s+(.+?)(?=\n\d+\/\d+|$)/gs;
  const matches = [...content.matchAll(tweetPattern)];

  return matches.map((match) => match[2].trim());
}
```

**Create API endpoint:**

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

    const tweets = await generateTwitterThread(userId, timeRange as any);

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

---

### Week 19: Journalist UI

#### Step 8: Thread Preview Component

**Create Journalist panel:**

```typescript
// components/JournalistPanel.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export function JournalistPanel() {
  const [tweets, setTweets] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/journalist/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange }),
      });

      const data = await response.json();

      if (data.tweets) {
        setTweets(data.tweets);
      } else {
        toast.error(data.error || 'Failed to generate thread');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate thread');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const threadText = tweets
      .map((tweet, idx) => `${idx + 1}/${tweets.length} ${tweet}`)
      .join('\n\n');

    navigator.clipboard.writeText(threadText);
    setCopied(true);
    toast.success('Copied to clipboard!');

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Glass Factory: Twitter Thread Generator</h2>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Thread'
            )}
          </Button>
        </div>
      </div>

      {tweets.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Thread Preview</h3>
            <Button onClick={handleCopy} variant="outline" size="sm">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {tweets.map((tweet, idx) => (
              <TweetPreview
                key={idx}
                number={idx + 1}
                total={tweets.length}
                content={tweet}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function TweetPreview({
  number,
  total,
  content,
}: {
  number: number;
  total: number;
  content: string;
}) {
  const charCount = content.length;
  const isOverLimit = charCount > 280;

  return (
    <Card
      className={`p-4 ${
        isOverLimit ? 'border-destructive' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {number}/{total}
        </span>
        <span
          className={`text-sm ${
            isOverLimit ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {charCount}/280
        </span>
      </div>
      <p className="text-sm">{content}</p>
    </Card>
  );
}
```

**Add to Event Flow Debugger:**

```typescript
// In components/EventFlowDebugger.tsx, add button:

<Button onClick={() => openJournalistPanel()}>
  Generate Twitter Thread
</Button>
```

---

## Phase 3: Domain Expansion

**Timeline:** Week 20 (1 week)
**Effort:** 30% of sprint (parallel to polish)
**Goal:** Stripe + Twilio providers working, payment → SMS automation functional

### Step 1: Stripe Provider Adapter

**Install Stripe SDK:**

```bash
npm install stripe
```

**Create adapter:**

```typescript
// lib/providers/stripe-adapter.ts
import { ProviderAdapter, ApiError } from './types';
import Stripe from 'stripe';

export const stripeAdapter: ProviderAdapter = {
  validateCredentials: async (credentials: any) => {
    try {
      const stripe = new Stripe(credentials.api_key, {
        apiVersion: '2024-11-20.acacia',
      });

      // Test API call
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
      apiVersion: '2024-11-20.acacia',
    });

    try {
      if (endpoint === '/charges') {
        const charges = await stripe.charges.list(params);
        return charges.data;
      } else if (endpoint === '/payment_intents') {
        const intents = await stripe.paymentIntents.list(params);
        return intents.data;
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

  transformResponse: (data: any) => data,
};
```

**Register adapter:**

```typescript
// In lib/providers/index.ts:

import { stripeAdapter } from './stripe-adapter';

export const adapters = {
  github: githubAdapter,
  jira: jiraAdapter,
  linear: linearAdapter,
  slack: slackAdapter,
  'google-calendar': googleCalendarAdapter,
  stripe: stripeAdapter, // ADD THIS
};
```

---

### Step 2: Twilio Provider Adapter

**Install Twilio SDK:**

```bash
npm install twilio
```

**Create adapter:**

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

      // Test API call
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
        const messages = await client.messages.list({
          limit: params?.limit || 20,
        });
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

  transformResponse: (data: any) => data,
};
```

**Register adapter:**

```typescript
// In lib/providers/index.ts:

import { twilioAdapter } from './twilio-adapter';

export const adapters = {
  // ... existing adapters
  stripe: stripeAdapter,
  twilio: twilioAdapter, // ADD THIS
};
```

---

### Step 3: Widget Definitions

**Stripe Recent Payments widget:**

```json
// lib/widgets/definitions/stripe-payments.json
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
      "eventName": "payment.received",
      "payload": {
        "paymentId": "{{$.id}}",
        "amount": "{{$.amount}}",
        "customer": "{{$.billing_details}}"
      }
    }
  }
}
```

**Twilio SMS Automation widget:**

```json
// lib/widgets/definitions/twilio-sms-automation.json
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

### Step 4: Test Automation

**Create test script:**

```bash
# scripts/test-payment-automation.sh
#!/bin/bash

# 1. Connect Stripe provider
echo "Step 1: Connect Stripe..."
curl -X POST http://localhost:3000/api/providers/connect \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stripe",
    "credentials": {
      "api_key": "'$STRIPE_API_KEY'"
    }
  }'

# 2. Connect Twilio provider
echo "Step 2: Connect Twilio..."
curl -X POST http://localhost:3000/api/providers/connect \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "twilio",
    "credentials": {
      "account_sid": "'$TWILIO_ACCOUNT_SID'",
      "auth_token": "'$TWILIO_AUTH_TOKEN'",
      "phone_number": "'$TWILIO_PHONE_NUMBER'"
    }
  }'

# 3. Create payment widget
echo "Step 3: Creating Stripe payment widget..."
# (Use wizard or API)

# 4. Create SMS automation widget
echo "Step 4: Creating SMS automation widget..."
# (Use wizard or API)

# 5. Simulate payment event
echo "Step 5: Simulating payment event..."
curl -X POST http://localhost:3000/api/events/publish \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.received",
    "payload": {
      "paymentId": "ch_test_123",
      "amount": 5000,
      "customer": {
        "phone": "+1234567890",
        "name": "Test Customer"
      }
    }
  }'

echo "✅ Test complete! Check your phone for SMS."
```

**Run test:**

```bash
chmod +x scripts/test-payment-automation.sh
./scripts/test-payment-automation.sh
```

**Expected result:** SMS received with payment confirmation message.

---

## Testing & Validation

### Widget Wizard Validation

**Test Checklist:**

- [ ] User completes full wizard flow (5 stages)
- [ ] Average time <5 minutes
- [ ] 80%+ of schemas deploy without errors
- [ ] Intent captured automatically (userIntent field present)
- [ ] Error messages are friendly and actionable
- [ ] Mobile responsive layout works

**User Testing Script:**

```
TASK: Create a GitHub PR widget using the wizard

1. Click "Create Widget" button
2. When prompted "What problem are you solving?", respond:
   "My team is losing track of pull requests across 3 repos. We spend 30 minutes every morning checking each repo manually."
3. Answer clarifying questions:
   - Repositories: owner/repo1, owner/repo2, owner/repo3
   - Filter: Open PRs only
   - Refresh: Real-time
4. Select visualization: List view
5. Preview schema and deploy
6. Verify widget appears on dashboard

MEASURE:
- Time from start to deployed widget: ____ minutes
- Schema deployed successfully? YES / NO
- Intent captured? YES / NO (check event_history table)
```

---

### Glass Factory Validation

**Test Checklist:**

- [ ] 24h narrative accumulates correctly
- [ ] Relationships detected between related events
- [ ] Themes detected (automation, performance, etc.)
- [ ] Twitter thread generation works
- [ ] Thread starts with problem statement
- [ ] Thread includes impact metrics
- [ ] Tweets are ≤280 characters
- [ ] Copy to clipboard works

**User Testing Script:**

```
TASK: Generate a Twitter thread from your recent activity

SETUP:
1. Create 2-3 widgets using the wizard (over 24 hours)
2. Make sure you provide detailed problem descriptions

TEST:
1. Open Event Flow Debugger
2. Click "Generate Twitter Thread"
3. Select time range: Last 24 hours
4. Click "Generate"
5. Review thread preview:
   - Does it start with your problem statement?
   - Does it include time saved or efficiency metrics?
   - Is it engaging and readable?
6. Copy to clipboard
7. Paste into Twitter (draft, don't publish)

MEASURE:
- Thread quality (1-5): ____
- Would you publish without edits? YES / NO
- If NO, what would you change? ____
```

---

### Domain Expansion Validation

**Test Checklist:**

- [ ] Stripe provider connects successfully
- [ ] Twilio provider connects successfully
- [ ] Payment widget displays recent transactions
- [ ] SMS automation widget subscribes to payment.received
- [ ] Test payment triggers SMS notification
- [ ] SMS contains correct payment amount and customer name
- [ ] Glass Factory documents business workflow

**Integration Test:**

```bash
# 1. Create Stripe test payment
curl -X POST https://api.stripe.com/v1/charges \
  -u sk_test_YOUR_KEY: \
  -d amount=5000 \
  -d currency=usd \
  -d source=tok_visa \
  -d description="Test payment"

# 2. Verify SMS sent
# (Check your phone)

# 3. Verify event logged
# (Check event_history table)

# 4. Generate Twitter thread
# (Should include business workflow story)
```

---

## Troubleshooting

### Claude API Issues

**Problem:** "Invalid API key"

**Solution:**
```bash
# Verify API key in .env.local
cat .env.local | grep ANTHROPIC_API_KEY

# Test API key manually
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

---

**Problem:** "Rate limit exceeded"

**Solution:**
- Wait 60 seconds and retry
- Check usage dashboard: https://console.anthropic.com/settings/usage
- Consider adding exponential backoff:

```typescript
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.message?.includes('rate limit') && i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
      } else {
        throw error;
      }
    }
  }
};
```

---

**Problem:** Claude returns invalid JSON

**Solution:**
- Add JSON validation in prompt: "Respond with valid JSON only. No markdown code blocks."
- Parse with error handling:

```typescript
const parseClaudeJSON = (response: string): any => {
  // Remove markdown code blocks if present
  const cleaned = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse Claude response:', cleaned);
    throw new Error('Invalid JSON response from Claude');
  }
};
```

---

### Event Persistence Issues

**Problem:** Events not persisting to database

**Solution:**

```typescript
// Check if Supabase is configured
const { data, error } = await supabase
  .from('event_history')
  .select('count(*)')
  .single();

if (error) {
  console.error('Supabase connection issue:', error);
}

// Verify RLS policies
// Go to Supabase dashboard → Authentication → Policies
// Ensure policy exists: "Users can only access their own events"
```

---

**Problem:** "shouldDocument" events not marked correctly

**Solution:**

```typescript
// Verify AUTO_DOCUMENT_EVENTS list
console.log('Auto-documented events:', AUTO_DOCUMENT_EVENTS);

// Manually mark event as documented
await publishDocumentable(
  'widget.created',
  payload,
  source,
  { shouldDocument: true } // EXPLICIT
);
```

---

### Stripe Integration Issues

**Problem:** "Invalid API key"

**Solution:**
- Verify test mode key starts with `sk_test_`
- Check Stripe dashboard: https://dashboard.stripe.com/test/apikeys
- Ensure key is in `.env.local` not `.env`

---

**Problem:** Charges list is empty

**Solution:**
- Create test charge using Stripe CLI:

```bash
stripe charges create \
  --amount=5000 \
  --currency=usd \
  --source=tok_visa \
  --description="Test charge"
```

---

### Twilio Integration Issues

**Problem:** "Account not found"

**Solution:**
- Verify ACCOUNT_SID starts with `AC`
- Check Twilio console: https://console.twilio.com
- Ensure phone number is verified in trial mode

---

**Problem:** SMS not sending

**Solution:**

```bash
# Test Twilio credentials manually
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
  --data-urlencode "Body=Test SMS" \
  --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
  --data-urlencode "To=+1234567890" \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

---

## Migration from Month 4

### Breaking Changes

**1. Event Mesh API Change**

**Old (Month 4):**
```typescript
publish('widget.created', payload, source);
```

**New (Month 5):**
```typescript
publishDocumentable('widget.created', payload, source, {
  shouldDocument: true,
  userIntent: { ... },
  context: { ... },
});
```

**Migration:**
- Old `publish()` function still works (backward compatible)
- New widgets should use `publishDocumentable()` for Glass Factory support
- Gradually migrate existing event publishers

---

**2. Database Schema Changes**

**New tables added:**
- `event_history` - Permanent event storage
- `narrative_context` - Knowledge graph and narratives

**Migration:**
```bash
# Apply migrations
supabase db push

# Verify tables created
supabase db list
```

**No breaking changes to existing tables.**

---

### Deprecations

**1. Manual Widget Creation Forms**

- Manual JSON editing still works
- Wizard is recommended for new users
- Forms will be deprecated in Month 6

**2. In-Memory Event Log**

- Still works for real-time debugging
- Database persistence added for Glass Factory
- In-memory log retained for performance

---

### Environment Variable Changes

**New required variables:**

```bash
# Add to .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...
STRIPE_API_KEY=sk_test_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Optional (for cron job authentication)
CRON_SECRET=your-random-secret
```

---

### Performance Considerations

**1. Claude API Costs**

- Widget creation: ~$0.06 per widget
- Twitter thread: ~$0.05 per thread
- Estimated: <$1 per user per month

**2. Database Storage**

- Event history grows over time
- Consider cleanup policy (delete events >90 days)
- Monitor storage in Supabase dashboard

**3. Cron Job Frequency**

- Narrative accumulator runs every 5 minutes
- Can be reduced to every 15 minutes if load is high

---

## Next Steps After Month 5

### Month 6 Roadmap (Preview)

**1. Multi-Format Journalist** (if Twitter threads successful)
- LinkedIn posts
- Blog articles
- YouTube video scripts

**2. AI-Powered Knowledge Graph** (if simple approach insufficient)
- Claude analyzes relationships between events
- Infers cause-effect chains
- Detects patterns not visible to keyword matching

**3. MCP Server Integration** (if user demand)
- Let users use Claude Code subscription
- No API fees for widget creation
- "Power user mode" for developers

**4. Express Mode Widget Creation** (if wizard successful)
- Full natural language: "I need X" → deployed widget
- No guided steps, just conversation
- For returning users who know the system

---

**End of Month 5 Implementation Guide**

**Questions or Issues?**
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common problems
- Review [RFC-001](rfcs/RFC-001-MONTH-5-UNIVERSAL-ORCHESTRATION.md) for design rationale
- See [plan.md](../plan.md) for project roadmap

**Ready to begin?** Start with Phase 1, Week 17, Step 1: Claude API Client Setup.
