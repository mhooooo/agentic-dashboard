# Week 18: Backend Integration Guide

**Status:** Implementation Ready
**Week:** December 8-14, 2025
**Focus:** API Routes, UI Integration, Streaming Patterns
**Related Documents:**
- Implementation Guide: [MONTH_5_IMPLEMENTATION_GUIDE.md](MONTH_5_IMPLEMENTATION_GUIDE.md)
- Event Mesh V2: [EVENT_MESH_V2.md](EVENT_MESH_V2.md)
- RFC-001: [rfcs/RFC-001-MONTH-5-UNIVERSAL-ORCHESTRATION.md](rfcs/RFC-001-MONTH-5-UNIVERSAL-ORCHESTRATION.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Routes](#api-routes)
4. [Streaming Responses](#streaming-responses)
5. [Error Handling](#error-handling)
6. [Request/Response Examples](#requestresponse-examples)
7. [Integration with UI](#integration-with-ui)
8. [Troubleshooting](#troubleshooting)
9. [Testing](#testing)

---

## Overview

Week 18 delivers the **backend API infrastructure** that powers the Problem-First Widget Wizard. This includes:

### What's Being Built

1. **Chat Endpoint** (`/api/ai/widget-creation/chat`)
   - Handles conversational widget creation
   - Manages 5-stage wizard flow
   - Streams responses in real-time

2. **Deploy Endpoint** (`/api/ai/widget-creation/deploy`)
   - Deploys approved widget schemas
   - Publishes DocumentableEvent with user intent
   - Returns widget instance ID

### What's Already Done (Week 17)

- ✅ Claude API client (`lib/ai/claude-client.ts`)
- ✅ Widget creation agent (`lib/ai/widget-creation-agent.ts`)
- ✅ Conversation state store (`stores/conversation-store.ts`)
- ✅ DocumentableEvent schema
- ✅ Event Mesh V2 persistence

### Key Technologies

- **Next.js 15 App Router** - API routes with server-side execution
- **Claude Sonnet 4.5** - AI inference and intent extraction
- **Server-Sent Events (SSE)** - Streaming responses to client
- **Zustand** - Client-side conversation state
- **TypeScript** - Type-safe API contracts

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WidgetCreationWizard (React Component)                  │   │
│  │  - Stage indicator (1/5, 2/5, ...)                       │   │
│  │  - Message bubbles (user + assistant)                    │   │
│  │  - Input box + Send button                               │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
                   │ POST /api/ai/widget-creation/chat
                   │ { message, currentStage }
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Next.js Server                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Chat API Route (app/api/ai/widget-creation/chat)       │   │
│  │  1. Extract message + stage from request                │   │
│  │  2. Call widget-creation-agent                           │   │
│  │  3. Stream response back to client                       │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
│                  │ inferWidgetFromProblem()                      │
│                  ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Widget Creation Agent (lib/ai/widget-creation-agent)   │   │
│  │  - Stage 1: Extract intent + infer widget               │   │
│  │  - Stage 2: Generate clarifying questions                │   │
│  │  - Stage 3-4: Schema generation                          │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
│                  │ prompt() / promptStructured()                 │
│                  ▼                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Claude API Client (lib/ai/claude-client)               │   │
│  │  - Anthropic SDK wrapper                                 │   │
│  │  - Streaming support                                     │   │
│  │  - Structured outputs (tool calling)                     │   │
│  └───────────────┬─────────────────────────────────────────┘   │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
                   │ API Call
                   ▼
         ┌─────────────────────┐
         │  Anthropic API      │
         │  Claude Sonnet 4.5  │
         └─────────────────────┘
```

### API Route Organization

```
app/api/ai/widget-creation/
├── chat/
│   └── route.ts           # Conversational widget creation
└── deploy/
    └── route.ts           # Widget deployment + event logging
```

### Data Flow

1. **User Input** → `WidgetCreationWizard` component
2. **POST Request** → `/api/ai/widget-creation/chat`
3. **AI Processing** → Widget Creation Agent → Claude API
4. **Streaming Response** → Server-Sent Events → UI updates
5. **State Update** → Zustand store (extractedIntent, inferredWidget, etc.)
6. **Repeat** until Stage 5 (Deploy)
7. **POST Request** → `/api/ai/widget-creation/deploy`
8. **Database Write** → Widget instance + DocumentableEvent
9. **Response** → Widget ID + success status

---

## API Routes

### 1. Chat Endpoint

**Purpose:** Handle conversational widget creation across all 5 stages.

**File:** `app/api/ai/widget-creation/chat/route.ts`

#### Implementation

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { inferWidgetFromProblem, generateClarifyingQuestion } from '@/lib/ai/widget-creation-agent';
import { getCurrentUserId } from '@/lib/auth/server';

export const runtime = 'nodejs'; // Use Node.js runtime for Claude API

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { message, currentStage, context } = await request.json();

    if (!message || !currentStage) {
      return NextResponse.json(
        { error: 'Missing required fields: message, currentStage' },
        { status: 400 }
      );
    }

    // 3. Route based on stage
    if (currentStage === 'problem_discovery') {
      // Stage 1: Extract intent and infer widget
      const response = await inferWidgetFromProblem(message);

      return NextResponse.json({
        stage: 'problem_discovery',
        message: response.message,
        extractedIntent: response.extractedIntent,
        inferredWidget: response.inferredWidget,
        nextStage: 'clarifying_questions',
      });
    } else if (currentStage === 'clarifying_questions') {
      // Stage 2: Generate clarifying question
      const response = await generateClarifyingQuestion(
        context.inferredWidget,
        context.implementationDetails || {}
      );

      return NextResponse.json({
        stage: 'clarifying_questions',
        message: response.question,
        fieldName: response.fieldName,
        inputType: response.inputType,
        options: response.options,
        nextStage: response.isComplete ? 'visualization' : 'clarifying_questions',
      });
    } else if (currentStage === 'visualization') {
      // Stage 3: Visualization selection (handled client-side, just confirm)
      return NextResponse.json({
        stage: 'visualization',
        message: 'Great choice! Let me generate the widget schema...',
        nextStage: 'preview',
      });
    } else if (currentStage === 'preview') {
      // Stage 4: Schema generation
      const schema = generateWidgetSchema(
        context.inferredWidget,
        context.implementationDetails,
        context.extractedIntent,
        context.selectedVisualization
      );

      return NextResponse.json({
        stage: 'preview',
        message: "Here's the widget I'll create. Does this look correct?",
        generatedSchema: schema,
        nextStage: 'deploy',
      });
    }

    // Invalid stage
    return NextResponse.json(
      { error: `Invalid stage: ${currentStage}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in widget creation chat:', error);

    // Handle Claude API errors specifically
    if (error instanceof Error && error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in 60 seconds.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
```

#### Stage Routing Logic

| Stage | AI Agent Call | Response Data |
|-------|---------------|---------------|
| `problem_discovery` | `inferWidgetFromProblem()` | `extractedIntent`, `inferredWidget`, `message` |
| `clarifying_questions` | `generateClarifyingQuestion()` | `question`, `fieldName`, `inputType`, `options` |
| `visualization` | None (client-side) | Confirmation message |
| `preview` | `generateWidgetSchema()` | `generatedSchema`, confirmation message |
| `deploy` | None (see deploy endpoint) | N/A |

---

### 2. Deploy Endpoint

**Purpose:** Deploy approved widget schema and log DocumentableEvent.

**File:** `app/api/ai/widget-creation/deploy/route.ts`

#### Implementation

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth/server';
import { supabase } from '@/lib/supabase/server';
import { publishDocumentable } from '@/lib/events/event-mesh';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const { schema, userIntent } = await request.json();

    if (!schema) {
      return NextResponse.json(
        { error: 'Missing required field: schema' },
        { status: 400 }
      );
    }

    // 3. Validate schema structure
    if (!schema.metadata || !schema.dataSource || !schema.fields) {
      return NextResponse.json(
        { error: 'Invalid schema: missing required fields (metadata, dataSource, fields)' },
        { status: 400 }
      );
    }

    // 4. Insert widget instance to database
    const { data: widget, error: dbError } = await supabase
      .from('widget_instances')
      .insert({
        user_id: userId,
        template_id: schema.metadata.id,
        position: { x: 0, y: 0, w: 4, h: 4 }, // Default position
        config: schema,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error creating widget:', dbError);
      return NextResponse.json(
        { error: 'Failed to create widget in database' },
        { status: 500 }
      );
    }

    // 5. Publish DocumentableEvent
    await publishDocumentable(
      'widget.created',
      {
        widgetId: widget.id,
        widgetType: schema.metadata.id,
        provider: schema.metadata.provider,
        schema,
      },
      'widget-wizard',
      {
        shouldDocument: true,
        userIntent: userIntent || undefined,
        context: {
          decision: `Created ${schema.metadata.provider} widget via Problem-First Wizard`,
          outcome: 'Widget deployed successfully to dashboard',
          category: 'feature',
        },
      }
    );

    // 6. Return success response
    return NextResponse.json({
      success: true,
      widgetId: widget.id,
      message: 'Widget created successfully!',
    });
  } catch (error) {
    console.error('Error deploying widget:', error);
    return NextResponse.json(
      { error: 'Failed to deploy widget' },
      { status: 500 }
    );
  }
}
```

#### Validation Rules

**Schema Validation:**
- ✅ `metadata` object with `id`, `name`, `provider`
- ✅ `dataSource` object with `provider`, `endpoint`, `method`
- ✅ `fields` array (can be empty for action widgets)
- ✅ `layout` object with `type` field

**User Intent (Optional):**
- `problemSolved` (string)
- `painPoint` (string)
- `goal` (string)
- `expectedOutcome` (string)
- `impactMetric` (string, optional)

---

## Streaming Responses

### Why Streaming?

Traditional request-response cycles feel slow for AI interactions. Streaming provides:
- **Real-time feedback** - Text appears as it's generated
- **Perceived performance** - UI feels responsive
- **Better UX** - Similar to ChatGPT/Claude web interface

### Server-Sent Events (SSE) Pattern

**NOT IMPLEMENTED YET** - Current implementation uses standard JSON responses. Streaming will be added if users request it.

If streaming is needed, here's how to implement it:

#### Server Side (Example)

```typescript
// app/api/ai/widget-creation/chat-stream/route.ts
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { message } = await request.json();

        // Get streaming response from Claude
        const aiStream = await promptStream(message, {
          systemPrompt: WIDGET_CREATION_SYSTEM_PROMPT,
          maxTokens: 1000,
        });

        // Forward chunks to client
        for await (const chunk of aiStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }

        // Send completion signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### Client Side (Example)

```typescript
async function sendMessageWithStreaming(message: string) {
  const response = await fetch('/api/ai/widget-creation/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          break;
        }

        try {
          const chunk = JSON.parse(data);
          // Update UI with partial text
          updateMessageBubble(chunk.text);
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      }
    }
  }
}
```

---

## Error Handling

### Error Response Format

All errors return consistent JSON format:

```typescript
{
  error: string;      // User-friendly error message
  code?: string;      // Machine-readable error code (optional)
  details?: unknown;  // Additional context (optional, dev mode only)
}
```

### Error Types

#### 1. Authentication Errors (401)

```typescript
{
  error: "Unauthorized"
}
```

**Cause:** Missing or invalid session token

**Resolution:**
- Redirect user to login page
- Display "Please sign in to continue"

#### 2. Validation Errors (400)

```typescript
{
  error: "Missing required fields: message, currentStage"
}
```

**Cause:** Invalid request body

**Resolution:**
- Check request payload before sending
- Display field-specific error messages

#### 3. Rate Limit Errors (429)

```typescript
{
  error: "Rate limit exceeded. Please try again in 60 seconds."
}
```

**Cause:** Too many Claude API calls

**Resolution:**
- Show countdown timer (60 seconds)
- Disable send button temporarily
- Retry automatically after countdown

#### 4. Server Errors (500)

```typescript
{
  error: "Failed to process message"
}
```

**Cause:** Unexpected server error (Claude API down, database issue, etc.)

**Resolution:**
- Show generic error message
- Offer "Try Again" button
- Log error details for debugging

### Client-Side Error Handling Pattern

```typescript
const handleSendMessage = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/ai/widget-creation/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: inputValue,
        currentStage,
        context: {
          extractedIntent,
          inferredWidget,
          implementationDetails,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle specific error codes
      if (response.status === 429) {
        setError('Too many requests. Please wait a minute and try again.');
        setTimeout(() => setError(null), 60000); // Clear after 60s
        return;
      } else if (response.status === 401) {
        router.push('/login');
        return;
      } else {
        setError(error.error || 'Something went wrong. Please try again.');
        return;
      }
    }

    const data = await response.json();

    // Update state with response
    addMessage('assistant', data.message);
    if (data.extractedIntent) setExtractedIntent(data.extractedIntent);
    if (data.inferredWidget) setInferredWidget(data.inferredWidget);
    if (data.nextStage) setStage(data.nextStage);

  } catch (error) {
    console.error('Network error:', error);
    setError('Network error. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
};
```

### Retry Strategy

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on client errors (4xx)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Last attempt, throw error
      if (i === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}
```

---

## Request/Response Examples

### Stage 1: Problem Discovery

**Request:**
```json
POST /api/ai/widget-creation/chat
Content-Type: application/json

{
  "message": "My team is losing track of pull requests across 3 repos. We spend 30 minutes every morning checking each repo manually.",
  "currentStage": "problem_discovery"
}
```

**Response:**
```json
{
  "stage": "problem_discovery",
  "message": "Got it! I can create a GitHub PR widget that shows all your pull requests in one place. Which repositories should I monitor?",
  "extractedIntent": {
    "problemSolved": "Manual PR tracking across 3 repos taking 30min/day",
    "painPoint": "Team losing track of PRs, wasting time checking manually",
    "goal": "Consolidated PR view in one dashboard",
    "expectedOutcome": "Zero manual checking, see all PRs instantly",
    "impactMetric": "Save 30min/day"
  },
  "inferredWidget": {
    "provider": "github",
    "type": "pr-list"
  },
  "nextStage": "clarifying_questions"
}
```

---

### Stage 2: Clarifying Questions

**Request:**
```json
POST /api/ai/widget-creation/chat
Content-Type: application/json

{
  "message": "owner/frontend, owner/backend, owner/mobile",
  "currentStage": "clarifying_questions",
  "context": {
    "inferredWidget": {
      "provider": "github",
      "type": "pr-list"
    },
    "implementationDetails": {}
  }
}
```

**Response:**
```json
{
  "stage": "clarifying_questions",
  "message": "Should I filter PRs by state? (all, open, closed)",
  "fieldName": "state",
  "inputType": "multi_select",
  "options": ["all", "open", "closed"],
  "nextStage": "clarifying_questions"
}
```

After all questions answered:
```json
{
  "stage": "clarifying_questions",
  "message": "Perfect! How should I display the PRs?",
  "nextStage": "visualization"
}
```

---

### Stage 3: Visualization Selection

**Request:**
```json
POST /api/ai/widget-creation/chat
Content-Type: application/json

{
  "message": "list",
  "currentStage": "visualization",
  "context": {
    "selectedVisualization": "list"
  }
}
```

**Response:**
```json
{
  "stage": "visualization",
  "message": "Great choice! Let me generate the widget schema...",
  "nextStage": "preview"
}
```

---

### Stage 4: Preview

**Request:**
```json
POST /api/ai/widget-creation/chat
Content-Type: application/json

{
  "message": "continue",
  "currentStage": "preview",
  "context": {
    "inferredWidget": { "provider": "github", "type": "pr-list" },
    "implementationDetails": {
      "repositories": ["owner/frontend", "owner/backend", "owner/mobile"],
      "state": "open",
      "refreshInterval": 60000
    },
    "extractedIntent": { /* ... */ },
    "selectedVisualization": "list"
  }
}
```

**Response:**
```json
{
  "stage": "preview",
  "message": "Here's the widget I'll create. Does this look correct?",
  "generatedSchema": {
    "metadata": {
      "id": "github-multi-repo-prs",
      "name": "Pull Requests",
      "description": "Shows PRs across multiple repositories",
      "provider": "github",
      "category": "development",
      "version": "1.0.0"
    },
    "dataSource": {
      "provider": "github",
      "endpoint": "/repos/{owner}/{repo}/pulls",
      "method": "GET",
      "params": {
        "state": "open"
      },
      "refreshInterval": 60000
    },
    "fields": [
      {
        "name": "title",
        "label": "Title",
        "path": "$.title",
        "type": "string"
      },
      {
        "name": "number",
        "label": "PR #",
        "path": "$.number",
        "type": "number"
      },
      {
        "name": "author",
        "label": "Author",
        "path": "$.user.login",
        "type": "string"
      },
      {
        "name": "created_at",
        "label": "Created",
        "path": "$.created_at",
        "type": "date",
        "format": "MMM dd, yyyy"
      }
    ],
    "layout": {
      "type": "list",
      "fields": {
        "primary": "title",
        "secondary": "author",
        "tertiary": "number",
        "timestamp": "created_at"
      }
    },
    "interactions": {
      "onSelect": {
        "eventName": "github.pr.selected",
        "payload": {
          "prNumber": "{{$.number}}",
          "repo": "{{$.base.repo.full_name}}"
        }
      }
    }
  },
  "nextStage": "deploy"
}
```

---

### Stage 5: Deploy

**Request:**
```json
POST /api/ai/widget-creation/deploy
Content-Type: application/json

{
  "schema": { /* generatedSchema from Stage 4 */ },
  "userIntent": {
    "problemSolved": "Manual PR tracking across 3 repos taking 30min/day",
    "painPoint": "Team losing track of PRs, wasting time checking manually",
    "goal": "Consolidated PR view in one dashboard",
    "expectedOutcome": "Zero manual checking, see all PRs instantly",
    "impactMetric": "Save 30min/day"
  }
}
```

**Response:**
```json
{
  "success": true,
  "widgetId": "widget_abc123",
  "message": "Widget created successfully!"
}
```

---

## Integration with UI

### Wizard Component Flow

```typescript
// components/WidgetCreationWizard.tsx
'use client';

import { useState } from 'react';
import { useConversationStore } from '@/stores/conversation-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function WidgetCreationWizard() {
  const {
    currentStage,
    messages,
    isLoading,
    extractedIntent,
    inferredWidget,
    implementationDetails,
    selectedVisualization,
    generatedSchema,
    addMessage,
    setLoading,
    setStage,
    setExtractedIntent,
    setInferredWidget,
    updateImplementationDetails,
    setSelectedVisualization,
    setGeneratedSchema,
  } = useConversationStore();

  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message to chat
    addMessage('user', inputValue);
    setLoading(true);
    setError(null);

    try {
      // Call API
      const response = await fetch('/api/ai/widget-creation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputValue,
          currentStage,
          context: {
            extractedIntent,
            inferredWidget,
            implementationDetails,
            selectedVisualization,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Something went wrong');
        return;
      }

      const data = await response.json();

      // Add assistant response
      addMessage('assistant', data.message);

      // Update state based on stage
      if (data.extractedIntent) setExtractedIntent(data.extractedIntent);
      if (data.inferredWidget) setInferredWidget(data.inferredWidget);
      if (data.nextStage) setStage(data.nextStage);
      if (data.generatedSchema) setGeneratedSchema(data.generatedSchema);

      // Clear input
      setInputValue('');
    } catch (error) {
      console.error('Error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!generatedSchema) return;

    setLoading(true);

    try {
      const response = await fetch('/api/ai/widget-creation/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: generatedSchema,
          userIntent: extractedIntent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to deploy widget');
        return;
      }

      const data = await response.json();

      // Show success message
      addMessage('assistant', data.message);

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stage indicator */}
      <StageIndicator stage={currentStage} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {isLoading && <LoadingIndicator />}
        {error && <ErrorMessage message={error} />}
      </div>

      {/* Input area */}
      {currentStage !== 'deploy' ? (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your response..."
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t">
          <Button onClick={handleDeploy} disabled={isLoading} className="w-full">
            Deploy Widget
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Troubleshooting

### Issue: "ANTHROPIC_API_KEY is not configured"

**Symptoms:**
- API returns 401 error
- Error message: "ANTHROPIC_API_KEY is not configured"

**Cause:** Missing or invalid API key in environment variables

**Solution:**
```bash
# 1. Check if .env.local exists
ls -la .env.local

# 2. Add ANTHROPIC_API_KEY to .env.local
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." >> .env.local

# 3. Restart dev server
npm run dev

# 4. Verify API key is loaded
# In terminal where dev server is running, you should NOT see the warning:
# "⚠️  ANTHROPIC_API_KEY not found in environment variables."
```

---

### Issue: API returns "Rate limit exceeded"

**Symptoms:**
- 429 error after several requests
- Error message: "Rate limit exceeded. Please try again in 60 seconds."

**Cause:** Too many Claude API calls in short time

**Solution:**
```typescript
// Implement exponential backoff in client
const sendMessageWithRetry = async (message: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await sendMessage(message);
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        // Wait before retrying: 1s, 2s, 4s
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
```

**Alternative:** Check usage dashboard at https://console.anthropic.com/settings/usage

---

### Issue: Widget schema fails validation

**Symptoms:**
- Deploy endpoint returns 400 error
- Error message: "Invalid schema: missing required fields"

**Cause:** Generated schema is missing required fields

**Solution:**
```typescript
// Add schema validation before deployment
const validateSchema = (schema: any): boolean => {
  // Required fields
  if (!schema.metadata) return false;
  if (!schema.metadata.id) return false;
  if (!schema.metadata.provider) return false;

  if (!schema.dataSource) return false;
  if (!schema.dataSource.provider) return false;
  if (!schema.dataSource.endpoint) return false;

  if (!schema.fields) return false; // Can be empty array

  if (!schema.layout) return false;
  if (!schema.layout.type) return false;

  return true;
};

// Use before calling deploy endpoint
if (!validateSchema(generatedSchema)) {
  setError('Generated schema is invalid. Please try again.');
  return;
}
```

---

### Issue: Conversation state lost on page refresh

**Symptoms:**
- User refreshes page mid-conversation
- All state is reset (extractedIntent, messages, etc.)

**Cause:** Zustand store is in-memory only

**Solution:**
```typescript
// Option 1: Add localStorage persistence (simple)
import { persist } from 'zustand/middleware';

export const useConversationStore = create(
  persist<ConversationState>(
    (set) => ({ /* ... */ }),
    {
      name: 'widget-wizard-conversation',
      // Only persist important fields
      partialize: (state) => ({
        currentStage: state.currentStage,
        extractedIntent: state.extractedIntent,
        inferredWidget: state.inferredWidget,
        implementationDetails: state.implementationDetails,
      }),
    }
  )
);

// Option 2: Warn user before leaving page (prevent refresh)
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (currentStage !== 'problem_discovery') {
      e.preventDefault();
      e.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [currentStage]);
```

---

### Issue: Claude returns invalid JSON

**Symptoms:**
- JSON.parse() throws error
- Response is text instead of JSON

**Cause:** Claude sometimes returns markdown code blocks or plain text

**Solution:**
```typescript
// Robust JSON parsing helper
function parseClaudeJSON<T>(response: string): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim();

  // Remove ```json ... ``` wrapper
  if (cleaned.startsWith('```json') || cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json?\n?/, '').replace(/```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('Failed to parse Claude response:', cleaned);
    throw new Error('Claude returned invalid JSON. Please try again.');
  }
}
```

---

## Testing

### Manual Testing Checklist

**Stage 1: Problem Discovery**
- [ ] User describes problem in natural language
- [ ] API extracts intent correctly (problemSolved, painPoint, goal)
- [ ] API infers correct widget provider (GitHub for PRs, Jira for tasks, etc.)
- [ ] Response message is conversational and helpful

**Stage 2: Clarifying Questions**
- [ ] API generates relevant questions based on widget type
- [ ] Questions appear one at a time (not all at once)
- [ ] User can answer with text or select from options
- [ ] Transition to Stage 3 after all questions answered

**Stage 3: Visualization Selection**
- [ ] API confirms user's visualization choice
- [ ] Transition to Stage 4

**Stage 4: Preview**
- [ ] API generates valid widget schema
- [ ] Schema includes all user-specified details
- [ ] Preview is readable and correct

**Stage 5: Deploy**
- [ ] Widget deploys successfully to database
- [ ] DocumentableEvent logged with userIntent
- [ ] User redirected to dashboard
- [ ] Widget appears on dashboard

**Error Handling**
- [ ] Rate limit error shows countdown timer
- [ ] Network error shows retry button
- [ ] Invalid schema shows helpful error message
- [ ] Auth error redirects to login

---

### Automated Testing

```typescript
// __tests__/api/widget-creation-chat.test.ts
import { POST } from '@/app/api/ai/widget-creation/chat/route';
import { NextRequest } from 'next/server';

describe('Widget Creation Chat API', () => {
  it('extracts intent from problem description', async () => {
    const request = new NextRequest('http://localhost/api/ai/widget-creation/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'My team is losing track of pull requests across 3 repos.',
        currentStage: 'problem_discovery',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.stage).toBe('problem_discovery');
    expect(data.extractedIntent).toBeDefined();
    expect(data.extractedIntent.problemSolved).toContain('PR tracking');
    expect(data.inferredWidget.provider).toBe('github');
  });

  it('returns 401 if user not authenticated', async () => {
    // Mock getCurrentUserId to return null
    jest.mock('@/lib/auth/server', () => ({
      getCurrentUserId: jest.fn().mockResolvedValue(null),
    }));

    const request = new NextRequest('http://localhost/api/ai/widget-creation/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test',
        currentStage: 'problem_discovery',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns 400 if required fields missing', async () => {
    const request = new NextRequest('http://localhost/api/ai/widget-creation/chat', {
      method: 'POST',
      body: JSON.stringify({
        // Missing message and currentStage
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Missing required fields: message, currentStage',
    });
  });
});
```

---

## Environment Variables

### Required

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-api03-...  # Required for Claude API
```

### Optional

```bash
# Supabase (required for widget deployment)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Verification

```bash
# Test that environment variables are loaded
npx tsx -e "console.log('API Key:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING')"
```

---

## Next Steps

### After Week 18 Completion

1. **Week 19: Integration & Polish**
   - Complete all 5 wizard stages end-to-end
   - Add error recovery (go back, edit answers)
   - Polish UI (loading states, transitions)
   - Mobile responsive layout

2. **Week 20: Domain Expansion**
   - Add Stripe provider (payments)
   - Add Twilio provider (SMS)
   - Test payment → SMS automation

3. **Month 6: Advanced Features**
   - Multi-format Journalist (LinkedIn, blog, YouTube)
   - MCP server integration (optional)
   - AI-powered knowledge graph

---

**Last Updated:** December 7, 2025
**Status:** Ready for Implementation
**Contributors:** Agentic Dashboard Team

**Questions or Issues?**
- Implementation Guide: [MONTH_5_IMPLEMENTATION_GUIDE.md](MONTH_5_IMPLEMENTATION_GUIDE.md)
- Event Mesh V2: [EVENT_MESH_V2.md](EVENT_MESH_V2.md)
- Troubleshooting: See section above or [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
