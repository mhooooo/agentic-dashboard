# AI Agent Architecture for Conversational Widget Creation

**Created:** November 24, 2025
**Status:** Design Phase
**Goal:** Enable users to create widgets through natural language instead of manual configuration

---

## Executive Summary

This document defines the architecture for a conversational AI agent that transforms user intent ("I need a widget showing my GitHub PRs") into UniversalWidgetDefinition JSON schemas. The agent will use Claude API (Sonnet 4.5) with structured outputs to ensure reliable schema generation.

**What it enables:**
- Widget creation through conversation ("I need X") instead of manual JSON editing
- Guided multi-step flow with clarifying questions
- Validation and preview before deployment
- Foundation for future autonomous widget improvements

**What it defers:**
- Autonomous widget modification (Month 5+)
- Custom React code generation (security risk)
- Complex multi-widget orchestration (Month 6+)

---

## Core Design Decisions

### Decision 1: Start with Guided Wizard, Expand to Full NL

**Choice:** Build a **5-stage guided wizard** first, with conversational elements, then expand to full natural language understanding in Month 5.

**Reasoning:**

**Guided Wizard Advantages (Build First):**
- Lower risk of generating invalid schemas
- Easier to validate and test
- Users know exactly what questions will be asked
- Clear progress indicators (Stage 1/5, 2/5, etc.)
- Can collect structured examples for future full NL training
- Faster to ship and validate

**Full Natural Language Advantages (Add Later):**
- More "magical" user experience
- Aligns with product vision ("conversation is primary interface")
- Handles edge cases and user creativity better
- Works for power users who know what they want

**Hybrid Approach (Recommended):**
1. Month 4: Ship guided wizard with conversational tone
2. Month 4-5: Collect user conversations and patterns
3. Month 5: Add "Express Mode" that accepts freeform input
4. Month 6: Make Express Mode the default for returning users

**Validation Criteria:**
- If 80%+ of users complete the wizard without confusion → success
- If users ask "can I just tell you what I want?" → accelerate Express Mode
- If >20% of generated schemas fail validation → stick with wizard longer

---

### Decision 2: Claude API Integration Approach

**Technology Stack:**
- **Model:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Mode:** Structured outputs with strict tool use
- **API:** Anthropic Messages API with streaming
- **Headers:** `anthropic-beta: structured-outputs-2025-11-13`

**Why Claude Sonnet 4.5:**
- Native structured outputs (zero parsing errors)
- Function calling for multi-step workflows
- Streaming for conversational feel
- Context window: 200K tokens (plenty for widget schemas)
- Cost: ~$3 per 1M input tokens, ~$15 per 1M output tokens

**Integration Pattern:**

```typescript
// lib/ai-agent/claude-client.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface WidgetSchemaToolCall {
  metadata: {
    name: string;
    description: string;
    category: string;
    version: number;
  };
  dataSource: {
    provider: string;
    endpoint: string;
    method: 'GET' | 'POST';
    // ... rest of UniversalWidgetDefinition schema
  };
  // ... full schema
}

async function generateWidgetSchema(
  conversationHistory: Message[],
  userIntent: string
): Promise<WidgetSchemaToolCall> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    temperature: 0.3, // Lower for consistent schema generation
    messages: [
      ...conversationHistory,
      { role: 'user', content: userIntent },
    ],
    tools: [
      {
        name: 'generate_widget_schema',
        description: 'Generate a UniversalWidgetDefinition JSON schema',
        input_schema: WIDGET_SCHEMA_JSON, // See below
        strict: true, // Enable structured outputs
      },
    ],
    tool_choice: { type: 'tool', name: 'generate_widget_schema' },
    // Enable structured outputs beta
    extra_headers: {
      'anthropic-beta': 'structured-outputs-2025-11-13',
    },
  });

  // Extract tool call result (guaranteed to match schema)
  const toolCall = response.content.find((c) => c.type === 'tool_use');
  return toolCall.input as WidgetSchemaToolCall;
}
```

**Streaming for Conversational Feel:**

```typescript
// For conversational messages (not schema generation)
async function* streamAgentResponse(
  conversationHistory: Message[],
  userMessage: string
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [...conversationHistory, { role: 'user', content: userMessage }],
    system: AGENT_SYSTEM_PROMPT,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text;
    }
  }
}
```

---

## Conversation Flow: 5-Stage Wizard

### Stage 1: Intent Capture

**Goal:** Understand what the user wants to see.

**Agent Prompt:**
```
You are a helpful widget creation assistant. Your job is to help users create custom dashboard widgets.

A user wants to create a new widget. Ask them:
- What data do they want to see? (e.g., "my GitHub pull requests", "Slack messages", "calendar events")
- What is the primary purpose? (tracking, monitoring, quick reference)

Keep the tone friendly and conversational. Ask ONE question at a time.
```

**Example Interaction:**
```
Agent: "Hi! I'll help you create a custom widget. What data would you like to see on your dashboard?"

User: "I want to see my GitHub pull requests"

Agent: "Great! Are you looking to track all your PRs, or just specific repositories?"

User: "Just PRs for my team's frontend repo"

[Proceed to Stage 2]
```

**Extracted Data:**
```json
{
  "intent": {
    "dataType": "github-pull-requests",
    "scope": "specific-repository",
    "repository": "team/frontend"
  }
}
```

---

### Stage 2: Clarifying Questions

**Goal:** Gather configuration details (filters, sorting, refresh interval).

**Agent Prompt:**
```
The user wants to display: {dataType} from {provider}.

Ask clarifying questions to configure the widget:
- Filters: What states/statuses do they care about? (open, closed, all)
- Sorting: How should items be sorted? (newest first, by priority)
- Refresh: How often should data update? (real-time, every minute, manual)
- Fields: What information do they want to see for each item?

Ask 2-3 questions maximum. Suggest sensible defaults.
```

**Example Interaction:**
```
Agent: "Perfect! A few quick questions:
1. Do you want to see all PRs, or just open ones?
2. How should they be sorted? (I'd suggest newest first)
3. How often should I refresh the data? (every 60 seconds works well)"

User: "Just open PRs, newest first, and yeah 60 seconds is fine"

[Proceed to Stage 3]
```

**Extracted Data:**
```json
{
  "filters": {
    "state": "open"
  },
  "sorting": {
    "field": "created_at",
    "direction": "desc"
  },
  "refreshInterval": 60
}
```

---

### Stage 3: Visualization Selection

**Goal:** Choose layout type (list, table, cards, metric).

**Agent Prompt:**
```
The user wants to display: {dataType}.

Suggest the best visualization:
- List: Good for scanning items with title/subtitle/metadata
- Table: Good for comparing multiple fields across items
- Cards: Good for visual content (images, rich descriptions)
- Metric: Good for single numbers (count, total, average)

Explain why you're suggesting this layout, but let them choose.
```

**Example Interaction:**
```
Agent: "For pull requests, I'd recommend a **list view**. It's great for scanning titles, seeing status badges, and clicking to select items. You can also see metadata like author and created date.

Would you like:
1. List view (recommended)
2. Table view (for comparing multiple fields)
3. Cards view (more visual)"

User: "List view sounds good"

[Proceed to Stage 4]
```

**Extracted Data:**
```json
{
  "layout": {
    "type": "list",
    "fields": {
      "title": "title",
      "subtitle": "repository",
      "metadata": ["author", "created_at"],
      "badge": {
        "field": "state",
        "colorMap": {
          "open": "bg-green-100 text-green-800",
          "closed": "bg-gray-100 text-gray-800"
        }
      }
    }
  }
}
```

---

### Stage 4: Schema Generation & Preview

**Goal:** Generate UniversalWidgetDefinition JSON and show preview to user.

**Agent Action:**
1. Call `generate_widget_schema` tool with all collected data
2. Validate schema using `validateWidgetDefinition()`
3. Generate preview UI (show what fields will be displayed)
4. Ask user for approval

**Tool Call (Structured Output):**

```typescript
// Tool definition sent to Claude
const WIDGET_SCHEMA_TOOL = {
  name: 'generate_widget_schema',
  description: 'Generate a complete UniversalWidgetDefinition JSON schema',
  input_schema: {
    type: 'object',
    properties: {
      metadata: {
        type: 'object',
        required: ['name', 'description', 'category', 'version'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: {
            type: 'string',
            enum: ['development', 'project-management', 'communication', 'productivity']
          },
          version: { type: 'number', const: 1 },
        },
      },
      dataSource: {
        type: 'object',
        required: ['provider', 'endpoint', 'method'],
        properties: {
          provider: {
            type: 'string',
            enum: ['github', 'jira', 'linear', 'slack', 'calendar']
          },
          endpoint: { type: 'string' },
          method: { type: 'string', enum: ['GET', 'POST'] },
          params: { type: 'object' },
          pollInterval: { type: 'number' },
          dataPath: { type: 'string' },
        },
      },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'path', 'type'],
          properties: {
            name: { type: 'string' },
            path: { type: 'string' },
            type: {
              type: 'string',
              enum: ['string', 'number', 'boolean', 'date', 'url', 'enum']
            },
            label: { type: 'string' },
            format: { type: 'string' },
            enumLabels: { type: 'object' },
          },
        },
      },
      layout: {
        type: 'object',
        required: ['type'],
        properties: {
          type: {
            type: 'string',
            enum: ['list', 'table', 'cards', 'metric']
          },
          // ... rest of layout schema
        },
      },
      interactions: { type: 'object' },
      subscriptions: { type: 'array' },
      emptyMessage: { type: 'string' },
      errorMessage: { type: 'string' },
    },
    required: ['metadata', 'dataSource', 'fields', 'layout'],
  },
  strict: true, // Enable constrained decoding
};
```

**Example Preview:**

```
Agent: "Perfect! I've created your widget. Here's what it will look like:

**GitHub Pull Requests**
View open PRs from team/frontend repository

Display:
- Title (clickable)
- Repository name
- Author, Created date
- Status badge (Open/Closed)

Refreshes: Every 60 seconds

Would you like to:
1. ✅ Deploy this widget
2. ✏️ Make changes
3. ❌ Cancel"

[Wait for user approval]
```

---

### Stage 5: Deploy & Event Mesh Integration

**Goal:** Save widget to database and ask about Event Mesh connections.

**Agent Prompt:**
```
The widget is ready to deploy.

Ask if they want to connect it to other widgets via Event Mesh:
- "When you click a PR, should other widgets react?" (e.g., filter Jira issues)
- "Should this widget respond to events from other widgets?"

If yes, guide them through setting up interactions/subscriptions.
If no, deploy immediately.
```

**Example Interaction:**
```
Agent: "Your widget is ready! One more thing: would you like to connect it to other widgets?

For example, when you click a PR, I could automatically filter your Jira widget to show related issues.

Would you like to set up widget connections now, or skip for now?"

User: "Yes, filter Jira when I click a PR"

Agent: "Great! I'll set that up. When you click a PR, the system will look for a Jira ticket ID in the title (like PROJ-123), and automatically filter your Jira widget.

Deploying your widget now..."

[Save to database, navigate to dashboard]
```

**Generated Schema (Final):**

```json
{
  "metadata": {
    "name": "GitHub Pull Requests",
    "description": "View open PRs from team/frontend repository",
    "category": "development",
    "version": 1
  },
  "dataSource": {
    "provider": "github",
    "endpoint": "/repos/team/frontend/pulls",
    "method": "GET",
    "params": {
      "state": "open",
      "sort": "created",
      "direction": "desc"
    },
    "pollInterval": 60
  },
  "fields": [
    {
      "name": "number",
      "path": "$.number",
      "type": "number",
      "label": "PR Number"
    },
    {
      "name": "title",
      "path": "$.title",
      "type": "string",
      "label": "Title"
    },
    {
      "name": "author",
      "path": "$.user.login",
      "type": "string",
      "label": "Author"
    },
    {
      "name": "state",
      "path": "$.state",
      "type": "enum",
      "label": "State",
      "enumLabels": {
        "open": "Open",
        "closed": "Closed"
      }
    },
    {
      "name": "created_at",
      "path": "$.created_at",
      "type": "date",
      "label": "Created"
    },
    {
      "name": "jiraTicket",
      "path": "$.title",
      "type": "string",
      "label": "Jira Ticket"
    }
  ],
  "layout": {
    "type": "list",
    "fields": {
      "title": "title",
      "subtitle": "repository",
      "metadata": ["author", "created_at"],
      "badge": {
        "field": "state",
        "colorMap": {
          "open": "bg-green-100 text-green-800",
          "closed": "bg-gray-100 text-gray-800"
        }
      }
    },
    "searchable": true,
    "searchField": "title"
  },
  "interactions": {
    "onSelect": {
      "eventName": "github.pr.selected",
      "payload": {
        "number": "{{number}}",
        "title": "{{title}}",
        "jiraTicket": "{{jiraTicket}}"
      },
      "source": "github-prs-custom"
    }
  },
  "subscriptions": [],
  "emptyMessage": "No pull requests found",
  "errorMessage": "Please connect your GitHub account in Settings"
}
```

---

## Prompt Engineering: System Prompts & Examples

### System Prompt: Widget Creation Agent

```xml
<system_prompt>
You are a helpful widget creation assistant for an AI-powered dashboard. Your job is to guide users through creating custom widgets that display data from external services (GitHub, Jira, Linear, Slack, Google Calendar).

## Your Capabilities
- You can create widgets using a declarative JSON schema (UniversalWidgetDefinition)
- You support 5 layout types: list, table, cards, metric, chart
- You can connect widgets via Event Mesh (pub/sub pattern)
- You can access: GitHub, Jira, Linear, Slack, Google Calendar APIs

## Your Constraints
- You CANNOT generate custom React code (security risk)
- You CANNOT create custom visualizations beyond the 5 layout types
- You CANNOT execute arbitrary JavaScript
- All data transformations use JSONPath and template strings only

## Your Workflow (5 Stages)
1. **Intent Capture**: Ask what data they want to see
2. **Clarifying Questions**: Ask about filters, sorting, refresh interval (2-3 questions max)
3. **Visualization Selection**: Suggest best layout type, let them choose
4. **Schema Generation**: Use `generate_widget_schema` tool to create JSON
5. **Deploy & Connect**: Ask about Event Mesh connections, then deploy

## Tone & Style
- Friendly and conversational (like talking to a colleague)
- Concise (no walls of text)
- Ask ONE question at a time
- Suggest sensible defaults
- Explain technical terms in simple language

## Examples of Good Interactions

<example>
User: "I need a widget showing my GitHub PRs"

Agent: "Great! Are you looking to see PRs from all your repositories, or specific ones?"

User: "Just my team's frontend repo"

Agent: "Perfect! Do you want to see all PRs, or just open ones?"

User: "Just open"

Agent: "Got it. How should they be sorted? (I'd suggest newest first)"

User: "Yeah, newest first"

Agent: "And how often should I refresh the data? Every 60 seconds works well for most people."

User: "That's fine"

[Proceed to schema generation]
</example>

<example>
User: "Can I see my Jira tickets?"

Agent: "Absolutely! What project are you tracking? (e.g., PROJ, ENG, SCRUM)"

User: "SCRUM"

Agent: "Got it. Do you want to see:
1. All tickets in SCRUM
2. Just tickets assigned to you
3. Tickets with a specific status (e.g., In Progress)"

User: "Just mine"

Agent: "Perfect. I'll create a widget showing SCRUM tickets assigned to you. Would you like them sorted by priority or by last updated?"

[Continue...]
</example>

## Error Handling
- If user asks for something you cannot do, explain the limitation kindly
- If user provides unclear input, ask for clarification (don't guess)
- If schema generation fails validation, explain what went wrong and ask how to fix it

## Remember
- You are building trust, not just widgets
- Users may not know technical terms (JSONPath, Event Mesh) - explain when needed
- Celebrate small wins ("Great!", "Perfect!", "You're all set!")
</system_prompt>
```

### Few-Shot Examples for Schema Generation

```xml
<schema_generation_examples>
<example>
<user_intent>
Display open GitHub pull requests from team/frontend repository, sorted by newest first, refreshing every 60 seconds.
</user_intent>

<schema>
{
  "metadata": {
    "name": "GitHub Pull Requests",
    "description": "View open PRs from team/frontend repository",
    "category": "development",
    "version": 1
  },
  "dataSource": {
    "provider": "github",
    "endpoint": "/repos/team/frontend/pulls",
    "method": "GET",
    "params": {
      "state": "open",
      "sort": "created",
      "direction": "desc"
    },
    "pollInterval": 60
  },
  "fields": [
    {
      "name": "number",
      "path": "$.number",
      "type": "number"
    },
    {
      "name": "title",
      "path": "$.title",
      "type": "string"
    },
    {
      "name": "author",
      "path": "$.user.login",
      "type": "string"
    },
    {
      "name": "state",
      "path": "$.state",
      "type": "enum",
      "enumLabels": {
        "open": "Open",
        "closed": "Closed"
      }
    },
    {
      "name": "created_at",
      "path": "$.created_at",
      "type": "date"
    }
  ],
  "layout": {
    "type": "list",
    "fields": {
      "title": "title",
      "metadata": ["author", "created_at"],
      "badge": {
        "field": "state",
        "colorMap": {
          "open": "bg-green-100 text-green-800",
          "closed": "bg-gray-100 text-gray-800"
        }
      }
    }
  },
  "interactions": {
    "onSelect": {
      "eventName": "github.pr.selected",
      "payload": {
        "number": "{{number}}",
        "title": "{{title}}"
      },
      "source": "github-prs"
    }
  },
  "emptyMessage": "No pull requests found",
  "errorMessage": "Please connect your GitHub account in Settings"
}
</schema>
</example>

<example>
<user_intent>
Display Linear issues assigned to me, sorted by priority, with a table view showing identifier, title, status, and team.
</user_intent>

<schema>
{
  "metadata": {
    "name": "Linear Issues",
    "description": "View issues assigned to you",
    "category": "project-management",
    "version": 1
  },
  "dataSource": {
    "provider": "linear",
    "endpoint": "/graphql",
    "method": "POST",
    "body": {
      "query": "query { issues(filter: { assignee: { isMe: { eq: true } } }, orderBy: priority, first: 20) { nodes { id title identifier state { name } priority team { name key } } } }"
    },
    "pollInterval": 60,
    "dataPath": "$.issues.nodes"
  },
  "fields": [
    {
      "name": "identifier",
      "path": "$.identifier",
      "type": "string"
    },
    {
      "name": "title",
      "path": "$.title",
      "type": "string"
    },
    {
      "name": "state",
      "path": "$.state.name",
      "type": "string"
    },
    {
      "name": "team",
      "path": "$.team.name",
      "type": "string"
    }
  ],
  "layout": {
    "type": "table",
    "columns": [
      { "field": "identifier", "header": "ID", "width": "100px" },
      { "field": "title", "header": "Title", "width": "auto" },
      { "field": "state", "header": "Status", "width": "120px" },
      { "field": "team", "header": "Team", "width": "120px" }
    ]
  },
  "emptyMessage": "No issues assigned to you",
  "errorMessage": "Please connect your Linear account in Settings"
}
</schema>
</example>

<example>
<user_intent>
Display a count of open Jira issues in the SCRUM project as a single metric.
</user_intent>

<schema>
{
  "metadata": {
    "name": "Open SCRUM Issues",
    "description": "Count of open issues in SCRUM project",
    "category": "project-management",
    "version": 1
  },
  "dataSource": {
    "provider": "jira",
    "endpoint": "/rest/api/3/search",
    "method": "GET",
    "params": {
      "jql": "project = SCRUM AND status != Done",
      "fields": "summary"
    },
    "pollInterval": 300,
    "dataPath": "$.issues"
  },
  "fields": [
    {
      "name": "count",
      "path": "$.length",
      "type": "number"
    }
  ],
  "layout": {
    "type": "metric",
    "value": "count",
    "label": "Open Issues",
    "format": "number"
  },
  "emptyMessage": "No open issues",
  "errorMessage": "Please connect your Jira account in Settings"
}
</schema>
</example>
</schema_generation_examples>
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal:** Build core infrastructure for agent conversations.

**Tasks:**
1. Set up Claude API client with structured outputs
2. Create conversation state management (Zustand store)
3. Build chat UI component (message list, input, streaming)
4. Implement system prompt and few-shot examples
5. Add conversation history persistence

**Files:**
```
lib/ai-agent/
├── claude-client.ts       # Claude API wrapper
├── conversation-store.ts  # Zustand state management
├── schema-validator.ts    # Validate generated schemas
└── prompts/
    ├── system-prompt.ts   # Main system prompt
    └── examples.ts        # Few-shot examples

components/
├── WidgetCreationWizard.tsx   # Main wizard component
├── ChatInterface.tsx          # Chat UI with streaming
└── SchemaPreview.tsx          # Preview generated schema
```

**Validation:**
- Agent can maintain conversation state across 5 stages
- Streaming messages appear token-by-token
- Conversation history persists on page refresh

---

### Phase 2: Guided Wizard (Week 2)

**Goal:** Implement the 5-stage conversation flow.

**Tasks:**
1. Implement Stage 1: Intent Capture
2. Implement Stage 2: Clarifying Questions
3. Implement Stage 3: Visualization Selection
4. Implement Stage 4: Schema Generation with tool calling
5. Implement Stage 5: Deploy & Event Mesh setup

**Stage State Machine:**
```typescript
type WizardStage =
  | 'intent_capture'
  | 'clarifying_questions'
  | 'visualization_selection'
  | 'schema_generation'
  | 'deploy';

interface ConversationState {
  stage: WizardStage;
  collectedData: {
    intent?: {
      dataType: string;
      provider: string;
      scope?: string;
    };
    filters?: Record<string, any>;
    sorting?: { field: string; direction: 'asc' | 'desc' };
    refreshInterval?: number;
    layout?: { type: LayoutType };
  };
  generatedSchema?: UniversalWidgetDefinition;
  messages: Message[];
}
```

**Validation:**
- User can complete wizard end-to-end in <5 minutes
- Generated schemas pass `validateWidgetDefinition()`
- Deployed widgets appear on dashboard and fetch real data

---

### Phase 3: Schema Generation (Week 2)

**Goal:** Integrate Claude structured outputs for schema generation.

**Tasks:**
1. Define `generate_widget_schema` tool with full JSON schema
2. Implement schema generation with strict mode
3. Add validation and error handling
4. Build preview UI showing what widget will look like
5. Add "Edit" flow to modify generated schema

**Tool Definition:**
```typescript
// Full UniversalWidgetDefinition as JSON Schema
const WIDGET_SCHEMA_JSON = {
  type: 'object',
  properties: {
    metadata: { /* ... */ },
    dataSource: { /* ... */ },
    fields: { /* ... */ },
    layout: { /* ... */ },
    interactions: { /* ... */ },
    subscriptions: { /* ... */ },
  },
  required: ['metadata', 'dataSource', 'fields', 'layout'],
  additionalProperties: false,
};
```

**Validation:**
- 95%+ of generated schemas pass validation
- Errors provide actionable feedback ("Missing required field: metadata.name")
- Users can preview widget before deployment

---

### Phase 4: Event Mesh Integration (Week 3)

**Goal:** Help users set up widget connections via Event Mesh.

**Tasks:**
1. Detect potential connections (e.g., GitHub PR → Jira filter)
2. Suggest Event Mesh patterns conversationally
3. Generate `interactions.onSelect` and `subscriptions` config
4. Test end-to-end: create widget → set up connection → verify magic works

**Example Suggestions:**
```
Agent: "I noticed you have a Jira widget on your dashboard. When you click a GitHub PR, I could automatically filter your Jira widget to show related issues.

This works by looking for Jira ticket IDs (like PROJ-123) in PR titles.

Would you like me to set that up?"

[If yes, add to schema:]
"interactions": {
  "onSelect": {
    "eventName": "github.pr.selected",
    "payload": {
      "jiraTicket": "{{jiraTicket}}"
    },
    "source": "github-prs"
  }
}

[And update Jira widget with subscription:]
"subscriptions": [
  {
    "pattern": "github.pr.*",
    "action": {
      "filter": {
        "field": "key",
        "operator": "equals",
        "value": "{{event.jiraTicket}}"
      }
    }
  }
]
```

**Validation:**
- Agent detects 80%+ of common connection patterns
- Generated connections work without debugging
- Users understand what "Event Mesh" means after explanation

---

### Phase 5: Polish & Testing (Week 4)

**Goal:** User testing and refinement.

**Tasks:**
1. User testing with 5-10 users
2. Collect feedback on conversation flow
3. Measure completion rate and time-to-widget
4. Fix edge cases and improve prompts
5. Add error recovery (if schema generation fails)

**Success Metrics:**
- 80%+ completion rate (users finish wizard)
- <5 minutes average time to create widget
- <10% of schemas require manual editing
- Users rate experience 4+/5 stars

**Edge Cases to Handle:**
- User provides ambiguous input ("show me stuff")
- User requests unsupported visualization (3D chart)
- API credentials not connected yet
- Schema generation produces invalid JSON (retry with corrections)

---

## Future Enhancements (Month 5+)

### Express Mode (Full Natural Language)

**What:** Accept freeform input instead of guided wizard.

**Example:**
```
User: "Create a widget showing my open Linear issues sorted by priority in a table"

Agent: [Analyzes intent, skips wizard, generates schema directly]

Agent: "Done! I've created a Linear Issues widget with:
- Filter: Assigned to you, not Done
- Sort: By priority (high to low)
- Layout: Table view
- Columns: ID, Title, Status, Priority, Team

Deploying now..."
```

**Implementation:**
- Train agent to extract structured data from freeform text
- Use chain-of-thought prompting to show reasoning
- Fall back to wizard if intent is unclear

---

### Autonomous Widget Improvement

**What:** Agent proactively suggests improvements to existing widgets.

**Example:**
```
Agent: "I noticed your GitHub widget is slow because it's polling every 10 seconds. Would you like me to increase it to 60 seconds? This will reduce API calls and improve performance."

[If user approves, update widget config]
```

**Implementation:**
- Monitor widget performance metrics
- Detect common issues (slow polling, too many fields, inefficient filters)
- Suggest improvements conversationally

---

### Multi-Widget Orchestration

**What:** Create multiple connected widgets in one conversation.

**Example:**
```
User: "I want to see my GitHub PRs and Jira issues, connected"

Agent: "Great! I'll create two widgets:
1. GitHub PRs (list view, open only)
2. Jira Issues (table view, assigned to you)

When you click a PR, the Jira widget will automatically filter to show related issues.

Sound good?"

[Creates both widgets + Event Mesh connections]
```

---

## Cost Analysis

### Claude API Costs (Estimated)

**Model:** Claude Sonnet 4.5
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

**Average Widget Creation Session:**
- Input tokens: ~2,000 (conversation history + system prompt)
- Output tokens: ~1,500 (agent responses + schema)
- Cost per session: ~$0.03

**Monthly Costs (1000 widget creations):**
- Total: ~$30/month
- Negligible compared to infrastructure costs

**Cost Optimization:**
- Cache system prompt (reduces input tokens by 50%)
- Use shorter prompts for clarifying questions
- Only use structured outputs for schema generation (most expensive)

---

## Risk Mitigation

### Risk 1: Generated Schemas Fail Validation

**Mitigation:**
- Use strict structured outputs (guarantees valid JSON)
- Provide detailed error messages with retry logic
- Add schema examples to system prompt
- Fall back to manual editing if 2+ retries fail

### Risk 2: Users Don't Complete Wizard

**Mitigation:**
- Save conversation state on each stage
- Allow users to resume later
- Show progress indicator (Stage 2/5)
- Provide "Skip to manual config" escape hatch

### Risk 3: Agent Suggests Invalid API Configurations

**Mitigation:**
- Validate provider endpoints before deploying
- Test connection with provider adapter
- Show clear error messages if API call fails
- Suggest checking credentials in Settings

### Risk 4: Event Mesh Connections Break Dashboards

**Mitigation:**
- Explain Event Mesh in simple terms before enabling
- Provide preview of what will happen ("When you click X, Y will filter")
- Add "Disconnect widgets" button to undo
- Log all Event Mesh actions in debugger

---

## Monitoring & Analytics

### Metrics to Track

**Conversation Metrics:**
- Completion rate (% who finish wizard)
- Average time to widget creation
- Stage drop-off rates (where users abandon)
- Retry rate (schema generation failures)

**Quality Metrics:**
- Schema validation pass rate
- % of schemas requiring manual edits
- User satisfaction (post-creation survey)
- Widget usage after creation (do they keep it?)

**Technical Metrics:**
- API latency (Claude response time)
- Token usage per session
- Error rate (failed API calls, invalid schemas)
- Cache hit rate (system prompt caching)

### Logging

```typescript
// Log each stage completion
logger.info('wizard_stage_completed', {
  userId,
  stage: 'clarifying_questions',
  duration: 45000, // ms
  collectedData: { filters: { state: 'open' } },
});

// Log schema generation
logger.info('schema_generated', {
  userId,
  valid: true,
  provider: 'github',
  layoutType: 'list',
  tokens: { input: 2000, output: 1500 },
});

// Log deployment
logger.info('widget_deployed', {
  userId,
  widgetId: 'abc-123',
  fromAgent: true,
  hadEventMeshConnections: true,
});
```

---

## Appendix: File Structure

```
lib/ai-agent/
├── claude-client.ts               # Claude API wrapper
├── conversation-store.ts          # Zustand state for conversations
├── schema-generator.ts            # Tool calling for schema generation
├── schema-validator.ts            # Validate UniversalWidgetDefinition
├── event-mesh-suggester.ts       # Detect connection opportunities
└── prompts/
    ├── system-prompt.ts           # Main system prompt
    ├── stage-prompts.ts           # Prompts for each stage
    └── examples.ts                # Few-shot examples

components/
├── WidgetCreationWizard.tsx       # Main wizard modal
├── ChatInterface.tsx              # Chat UI with streaming
├── SchemaPreview.tsx              # Preview generated widget
├── StageIndicator.tsx             # Progress bar (Stage 2/5)
└── EventMeshSetup.tsx             # Configure widget connections

app/api/ai-agent/
├── chat/route.ts                  # Streaming chat endpoint
├── generate-schema/route.ts       # Schema generation endpoint
└── deploy-widget/route.ts         # Deploy widget to database

docs/
└── AI_AGENT_ARCHITECTURE.md       # This document
```

---

## Recommendation: Start with Guided Wizard

**Why:**
1. **Lower risk:** Validated schemas, predictable flow
2. **Faster to ship:** Less prompt engineering, easier testing
3. **Better data:** Collect structured examples for future full NL
4. **User confidence:** Clear progress, no ambiguity
5. **Foundation for Express Mode:** Can upgrade to full NL in Month 5

**When to Add Express Mode:**
- After 100+ successful wizard completions
- When users explicitly request freeform input
- After collecting enough conversation examples for training

**Timeline:**
- Week 1: Foundation (API client, chat UI)
- Week 2: Guided wizard (5 stages)
- Week 3: Event Mesh integration
- Week 4: User testing & polish
- Month 5: Add Express Mode based on learnings

---

**Last Updated:** November 24, 2025
**Next Review:** After user testing (Week 4)

---

## Sources & References

### Claude API & Structured Outputs
- [Structured outputs on the Claude Developer Platform](https://www.claude.com/blog/structured-outputs-on-the-claude-developer-platform)
- [Structured outputs - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/structured-outputs)
- [Claude API Structured Output: Complete Guide](https://thomas-wiegold.com/blog/claude-api-structured-output/)

### Prompt Engineering Best Practices
- [Prompting best practices - Claude Docs](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Best practices for prompt engineering](https://www.claude.com/blog/best-practices-for-prompt-engineering)
- [Prompt engineering techniques (AWS)](https://aws.amazon.com/blogs/machine-learning/prompt-engineering-techniques-and-best-practices-learn-by-doing-with-anthropics-claude-3-on-amazon-bedrock/)
