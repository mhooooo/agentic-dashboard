# Claude API Client

Reusable client for Anthropic's Claude API with streaming support and structured outputs.

## Setup

1. Get your API key from: https://console.anthropic.com/settings/keys
2. Add to `.env.local`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
3. Import and use:
   ```typescript
   import { prompt, promptStream, promptStructured } from '@/lib/ai/claude-client';
   ```

## Usage Examples

### Basic Prompt (Non-Streaming)

```typescript
import { prompt } from '@/lib/ai/claude-client';

const response = await prompt('What is 2+2?', {
  maxTokens: 100,
  temperature: 0.5,
});

console.log(response.content); // "2+2 equals 4."
console.log(response.usage); // { inputTokens: 10, outputTokens: 8 }
```

### Streaming Prompt

```typescript
import { promptStream } from '@/lib/ai/claude-client';

const stream = await promptStream('Write a poem about code');

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
    process.stdout.write(chunk.delta.text); // Real-time streaming
  }
}
```

### Structured Output (JSON Schema)

```typescript
import { promptStructured } from '@/lib/ai/claude-client';

const result = await promptStructured<{
  name: string;
  age: number;
  occupation: string;
}>(
  'Extract info: John Doe, age 30, software engineer',
  {
    name: 'extract_person',
    description: 'Extract person details',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        occupation: { type: 'string' },
      },
      required: ['name', 'age', 'occupation'],
    },
  }
);

console.log(result); // { name: 'John Doe', age: 30, occupation: 'software engineer' }
```

### Multi-turn Conversation

```typescript
import { conversation, ClaudeMessage } from '@/lib/ai/claude-client';

const messages: ClaudeMessage[] = [
  { role: 'user', content: 'My name is Alice' },
  { role: 'assistant', content: 'Nice to meet you, Alice!' },
  { role: 'user', content: 'What is my name?' },
];

const response = await conversation(messages);
console.log(response.content); // "Your name is Alice."
```

## Error Handling

The client throws typed errors:

```typescript
import {
  prompt,
  ClaudeAPIKeyMissingError,
  ClaudeAPIError,
} from '@/lib/ai/claude-client';

try {
  const response = await prompt('Hello');
} catch (error) {
  if (error instanceof ClaudeAPIKeyMissingError) {
    console.error('API key not configured');
  } else if (error instanceof ClaudeAPIError) {
    console.error(`API error (${error.statusCode}): ${error.message}`);
  }
}
```

## Testing

Run the test suite to verify your API key works:

```bash
npx tsx lib/ai/test-claude-client.ts
```

Expected output:
- Without API key: 1 passed (error handling), 4 skipped
- With API key: 5 passed (all tests)

## API Reference

### `prompt(message, options?)`

Send a basic prompt to Claude.

**Parameters:**
- `message: string` - The user message
- `options?: object`
  - `systemPrompt?: string` - System instructions
  - `model?: string` - Model to use (default: `claude-sonnet-4-5-20250929`)
  - `maxTokens?: number` - Max response tokens (default: 1024)
  - `temperature?: number` - Randomness 0-1 (default: 1.0)

**Returns:** `Promise<ClaudeResponse>`
- `content: string` - Response text
- `model: string` - Model used
- `stopReason: string | null` - Why generation stopped
- `usage: { inputTokens, outputTokens }`

### `promptStream(message, options?)`

Send a prompt with streaming response.

**Parameters:** Same as `prompt()`

**Returns:** `Promise<AsyncIterable<ClaudeStreamChunk>>`
- Iterate with `for await (const chunk of stream)`
- Each chunk has `type` and optional `delta.text`

### `promptStructured<T>(message, tool, options?)`

Request structured JSON output matching a schema.

**Parameters:**
- `message: string` - The user message
- `tool: object`
  - `name: string` - Tool name
  - `description: string` - Tool description
  - `schema: object` - JSON schema for output
- `options?: object` - Same as `prompt()` options

**Returns:** `Promise<T>` - Parsed JSON matching your schema

### `conversation(messages, options?)`

Send multi-turn conversation history.

**Parameters:**
- `messages: ClaudeMessage[]` - Array of `{ role, content }`
- `options?: object` - Same as `prompt()` options

**Returns:** `Promise<ClaudeResponse>`

## Model Configuration

Default model: **Claude Sonnet 4.5** (`claude-sonnet-4-5-20250929`)

To use a different model:
```typescript
const response = await prompt('Hello', {
  model: 'claude-3-5-sonnet-20241022', // Previous generation
});
```

Available models:
- `claude-sonnet-4-5-20250929` - Latest Sonnet 4.5 (recommended)
- `claude-3-5-sonnet-20241022` - Sonnet 3.5
- `claude-3-opus-20240229` - Opus 3

## Architecture Notes

**Design Decisions:**
- **Validation on module load**: Warns immediately if API key missing (fail fast)
- **Graceful degradation**: Placeholder API key prevents SDK errors, but throws on actual use
- **TypeScript strict mode**: All functions fully typed with proper error handling
- **Streaming support**: Native async iterables (not callbacks) for better DX
- **Structured outputs**: Uses Anthropic's tool calling (not JSON mode) for schema validation

**Trade-offs:**
- **No retry logic**: Caller should implement retries if needed (simple client)
- **No request batching**: Each call is independent (optimal for real-time UX)
- **Dev mode works without API key**: Error handling test passes even without key

**When to revisit:**
- If need request queuing/batching (rate limit optimization)
- If need automatic retries with exponential backoff (production reliability)
- If need caching layer (cost optimization)
