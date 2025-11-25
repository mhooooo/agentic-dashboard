# Widget Creation Chat API

**Endpoint:** `POST /api/ai/widget-creation/chat`

**Purpose:** Main AI chat endpoint for the widget creation wizard. Handles conversational widget creation through 5 stages with streaming support for real-time typing effects.

---

## Request Format

```typescript
POST /api/ai/widget-creation/chat
Content-Type: application/json

{
  message: string;              // User's message
  stage: WizardStage;           // Current wizard stage
  conversationHistory?: Array<{ // Optional conversation context
    role: 'user' | 'assistant';
    content: string;
  }>;
  extractedIntent?: {           // User intent (from Stage 1)
    problemSolved: string;
    painPoint: string;
    goal: string;
    expectedOutcome: string;
    impactMetric?: string;
  };
  inferredWidget?: {           // Inferred widget (from Stage 1)
    provider: string;
    type: string;
    confidence: number;
  };
}
```

### Wizard Stages

- `problem_discovery` - Extract user intent and infer widget type
- `clarifying_questions` - Gather implementation details
- `visualization` - Choose data display format
- `preview` - Show generated widget schema
- `deploy` - Create widget and add to dashboard

---

## Response Format

### Stage 1: Problem Discovery (JSON Response)

Returns structured JSON (not streaming):

```typescript
{
  message: string;              // Conversational response
  extractedIntent: {            // Extracted user intent
    problemSolved: string;
    painPoint: string;
    goal: string;
    expectedOutcome: string;
    impactMetric?: string;
  };
  inferredWidget: {            // Inferred widget recommendation
    provider: string;
    type: string;
    confidence: number;
  };
  nextStage: 'clarifying_questions';
}
```

### Stages 2-5: Streaming Responses (SSE)

Returns Server-Sent Events stream:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"text": "Let"}
data: {"text": "'s"}
data: {"text": " configure"}
...
data: {"done": true}
```

**Event Format:**

- `{"text": "..."}` - Text chunk to append to response
- `{"done": true}` - Marks end of stream
- `{"error": "..."}` - Error during streaming

---

## Stage-Specific Behavior

### Stage 1: Problem Discovery

**Input:** User's problem description

**Process:**
1. Extract user intent (problemSolved, painPoint, goal, expectedOutcome, impactMetric)
2. Infer which widget/provider would solve the problem
3. Return confidence score (0-1)

**Example:**

```bash
curl -X POST http://localhost:3000/api/ai/widget-creation/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My team is losing track of pull requests across 3 repos",
    "stage": "problem_discovery"
  }'
```

**Response:**

```json
{
  "message": "Got it! I can create a GitHub PR widget that shows all your pull requests in one place. Does this sound right?",
  "extractedIntent": {
    "problemSolved": "Manual PR tracking across multiple repositories",
    "painPoint": "Team losing track of PRs, wasting time",
    "goal": "Consolidated PR view",
    "expectedOutcome": "See all PRs in one dashboard",
    "impactMetric": "Save time checking multiple repos"
  },
  "inferredWidget": {
    "provider": "github",
    "type": "pr-list",
    "confidence": 0.95
  },
  "nextStage": "clarifying_questions"
}
```

### Stage 2: Clarifying Questions

**Input:** User's answers to configuration questions

**Process:**
1. Ask 1-2 clarifying questions about implementation details
2. Stream response for natural conversation feel
3. When enough information gathered, suggest moving to visualization

**System Prompt Context:**
- User's extracted intent
- Inferred widget type
- Conversation history

**Example Questions:**
- "Which GitHub repositories should we monitor?"
- "What time range should we show?"
- "Do you want to see all PRs or just open ones?"

### Stage 3: Visualization

**Input:** User's visualization preferences

**Process:**
1. Suggest visualization options (list, table, cards, metrics)
2. Explain trade-offs for each option
3. Stream conversational response

**Available Visualizations:**
- **List:** Simple list of items (like an inbox)
- **Table:** Sortable columns with detailed data
- **Cards:** Visual cards with key information
- **Metric:** Single number or statistic

### Stage 4: Preview

**Input:** User's feedback on generated widget

**Process:**
1. Summarize widget configuration
2. Highlight key features
3. Ask for confirmation or changes
4. Stream conversational response

**Output:** Confirmation message with:
- Widget summary
- Key features
- Options: deploy, modify, or restart

### Stage 5: Deploy

**Input:** Deployment confirmation

**Process:**
1. Confirm widget is being deployed
2. Provide next steps
3. Stream enthusiastic confirmation

**Note:** Actual widget creation happens in a separate endpoint. This stage provides conversational confirmation.

---

## Error Handling

### HTTP Status Codes

- `200` - Success
- `400` - Invalid request (missing fields, invalid stage)
- `429` - Rate limit exceeded (includes `Retry-After` header)
- `500` - Internal server error
- `503` - Service unavailable (API key not configured)

### Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

### Handled Error Cases

1. **Missing Message**
   ```json
   { "error": "Message is required" }
   ```

2. **Missing Stage**
   ```json
   { "error": "Stage is required" }
   ```

3. **Invalid Stage**
   ```json
   { "error": "Invalid stage" }
   ```

4. **API Key Not Configured**
   ```json
   {
     "error": "Claude API not configured. Please add ANTHROPIC_API_KEY to your environment."
   }
   ```

5. **Rate Limit Exceeded**
   - Status: `429`
   - Header: `Retry-After: 60`
   - Body: `{ "error": "Rate limit exceeded. Please try again later." }`

6. **Streaming Error**
   - SSE Event: `data: {"error": "Failed to generate response. Please try again."}`

---

## Client-Side Usage

### JavaScript Fetch API

```typescript
// Stage 1: Problem Discovery (JSON response)
const response = await fetch('/api/ai/widget-creation/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "I need to track GitHub PRs",
    stage: 'problem_discovery',
  }),
});

const data = await response.json();
console.log(data.inferredWidget); // { provider: 'github', type: 'pr-list', ... }

// Stages 2-5: Streaming response
const streamResponse = await fetch('/api/ai/widget-creation/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "We use 3 repos: frontend, backend, mobile",
    stage: 'clarifying_questions',
    conversationHistory: [...],
    extractedIntent: {...},
    inferredWidget: {...},
  }),
});

// Parse SSE stream
const reader = streamResponse.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));

      if (data.text) {
        // Append text to UI
        appendText(data.text);
      } else if (data.done) {
        // Stream complete
        markComplete();
      } else if (data.error) {
        // Handle error
        showError(data.error);
      }
    }
  }
}
```

### React Hook Example

```typescript
function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  const sendMessage = async (message: string, stage: WizardStage) => {
    setIsStreaming(true);
    setCurrentMessage('');

    const response = await fetch('/api/ai/widget-creation/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stage }),
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.text) {
            setCurrentMessage(prev => prev + data.text);
          } else if (data.done) {
            setIsStreaming(false);
          }
        }
      }
    }
  };

  return { sendMessage, currentMessage, isStreaming };
}
```

---

## Testing

### Manual Testing

**Prerequisites:**
1. Start dev server: `npm run dev`
2. Set environment variable: `ANTHROPIC_API_KEY=sk-ant-...`

**Run test script:**

```bash
ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-chat-api.ts
```

**Test with curl:**

```bash
# Test Stage 1 (JSON response)
curl -X POST http://localhost:3000/api/ai/widget-creation/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Track GitHub pull requests",
    "stage": "problem_discovery"
  }'

# Test Stage 2 (Streaming response)
curl -X POST http://localhost:3000/api/ai/widget-creation/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "We use frontend and backend repos",
    "stage": "clarifying_questions",
    "conversationHistory": [],
    "extractedIntent": {
      "problemSolved": "Manual PR tracking",
      "painPoint": "Time waste",
      "goal": "Consolidated view",
      "expectedOutcome": "See all PRs"
    },
    "inferredWidget": {
      "provider": "github",
      "type": "pr-list",
      "confidence": 0.95
    }
  }'
```

### Integration Testing

See `scripts/test-chat-api.ts` for comprehensive test suite covering:
- ✅ Stage 1: Problem discovery
- ✅ Stage 2: Clarifying questions (streaming)
- ✅ Stage 3: Visualization (streaming)
- ✅ Error handling (missing fields, invalid stage)

---

## Implementation Notes

### Streaming vs JSON Responses

- **Stage 1 (Problem Discovery):** Returns JSON (not streaming) because we need to parse and validate the structured response (extractedIntent, inferredWidget)
- **Stages 2-5:** Use streaming for conversational feel and better UX (user sees response appear in real-time)

### System Prompts

Each stage has a specialized system prompt that:
1. Defines the agent's role
2. Provides context (user intent, inferred widget)
3. Sets behavior guidelines
4. Specifies when to progress to next stage

### Conversation History

Client should maintain full conversation history and send it with each request. This provides context for the AI to:
- Reference previous answers
- Avoid repeating questions
- Build coherent multi-turn conversation

### Rate Limiting

Claude API has rate limits. The endpoint handles rate limit errors (429) and returns:
- Status: 429
- Header: `Retry-After: 60` (seconds to wait)
- Body: Error message

Client should implement exponential backoff.

---

## Related Files

- **Implementation:** `/app/api/ai/widget-creation/chat/route.ts`
- **Agent Logic:** `/lib/ai/widget-creation-agent.ts`
- **Claude Client:** `/lib/ai/claude-client.ts`
- **Conversation Store:** `/stores/conversation-store.ts`
- **Test Script:** `/scripts/test-chat-api.ts`

---

## Next Steps

1. **Deploy Endpoint:** Create `POST /api/ai/widget-creation/deploy` to handle actual widget creation
2. **UI Integration:** Connect wizard UI (`/test-wizard`) to this API
3. **Error Monitoring:** Add error tracking (Sentry, LogRocket) for production
4. **Rate Limit Handling:** Implement client-side retry logic with exponential backoff

---

**Last Updated:** December 7, 2025
**Status:** Ready for Integration
