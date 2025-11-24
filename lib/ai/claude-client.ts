/**
 * Claude API Client
 *
 * Reusable client for Anthropic's Claude API with support for:
 * - Basic prompts with streaming
 * - Structured outputs (beta feature)
 * - Proper error handling
 * - TypeScript types
 */

import Anthropic from '@anthropic-ai/sdk';

// Validate API key at module load
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn(
    '⚠️  ANTHROPIC_API_KEY not found in environment variables.\n' +
    '   Add it to .env.local to use Claude API features.\n' +
    '   Get your API key from: https://console.anthropic.com/settings/keys'
  );
}

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: apiKey || 'placeholder', // Provide placeholder to avoid SDK error
});

// Default model for all API calls
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

/**
 * Basic Types
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: string;
  model: string;
  stopReason: string | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ClaudeStreamChunk {
  type: 'content_block_delta' | 'message_stop' | 'message_start';
  delta?: {
    text: string;
  };
}

/**
 * Error Types
 */
export class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

export class ClaudeAPIKeyMissingError extends ClaudeAPIError {
  constructor() {
    super(
      'ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.',
      401
    );
    this.name = 'ClaudeAPIKeyMissingError';
  }
}

/**
 * Validates that API key is configured
 */
function validateAPIKey(): void {
  if (!apiKey) {
    throw new ClaudeAPIKeyMissingError();
  }
}

/**
 * Basic Prompt (Non-Streaming)
 *
 * Send a simple prompt to Claude and get the full response.
 *
 * @example
 * ```typescript
 * const response = await prompt('What is 2+2?');
 * console.log(response.content); // "2+2 equals 4"
 * ```
 */
export async function prompt(
  userMessage: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ClaudeResponse> {
  validateAPIKey();

  try {
    const message = await anthropic.messages.create({
      model: options?.model || DEFAULT_MODEL,
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? 1.0,
      system: options?.systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text content from response
    const textContent = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    return {
      content: textContent,
      model: message.model,
      stopReason: message.stop_reason,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        `Claude API error: ${error.message}`,
        error.status,
        error
      );
    }
    throw new ClaudeAPIError(
      'Unexpected error calling Claude API',
      undefined,
      error
    );
  }
}

/**
 * Streaming Prompt
 *
 * Send a prompt to Claude and receive response as a stream.
 * Useful for real-time UI updates (think ChatGPT streaming).
 *
 * @example
 * ```typescript
 * const stream = await promptStream('Write a poem about code');
 *
 * for await (const chunk of stream) {
 *   if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
 *     process.stdout.write(chunk.delta.text);
 *   }
 * }
 * ```
 */
export async function promptStream(
  userMessage: string,
  options?: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<AsyncIterable<ClaudeStreamChunk>> {
  validateAPIKey();

  try {
    const stream = await anthropic.messages.stream({
      model: options?.model || DEFAULT_MODEL,
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? 1.0,
      system: options?.systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Return async iterable for streaming chunks
    return {
      [Symbol.asyncIterator]: async function* () {
        for await (const event of stream) {
          // Type guard for content delta events
          if (
            event.type === 'content_block_delta' &&
            'delta' in event &&
            event.delta &&
            typeof event.delta === 'object' &&
            'type' in event.delta &&
            event.delta.type === 'text_delta' &&
            'text' in event.delta
          ) {
            yield {
              type: 'content_block_delta',
              delta: {
                text: event.delta.text as string,
              },
            } as ClaudeStreamChunk;
          } else if (event.type === 'message_stop') {
            yield {
              type: 'message_stop',
            } as ClaudeStreamChunk;
          } else if (event.type === 'message_start') {
            yield {
              type: 'message_start',
            } as ClaudeStreamChunk;
          }
        }
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        `Claude API error: ${error.message}`,
        error.status,
        error
      );
    }
    throw new ClaudeAPIError(
      'Unexpected error calling Claude API',
      undefined,
      error
    );
  }
}

/**
 * Structured Output (Beta Feature)
 *
 * Request Claude to respond in a specific JSON format.
 * Uses Anthropic's tool calling with JSON schema validation.
 *
 * @example
 * ```typescript
 * const result = await promptStructured(
 *   'Extract info: John Doe, age 30, software engineer',
 *   {
 *     name: 'extract_person',
 *     description: 'Extract person details',
 *     schema: {
 *       type: 'object',
 *       properties: {
 *         name: { type: 'string' },
 *         age: { type: 'number' },
 *         occupation: { type: 'string' }
 *       },
 *       required: ['name', 'age', 'occupation']
 *     }
 *   }
 * );
 *
 * console.log(result); // { name: 'John Doe', age: 30, occupation: 'software engineer' }
 * ```
 */
export async function promptStructured<T = Record<string, unknown>>(
  userMessage: string,
  tool: {
    name: string;
    description: string;
    schema: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  },
  options?: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
  }
): Promise<T> {
  validateAPIKey();

  try {
    const message = await anthropic.messages.create({
      model: options?.model || DEFAULT_MODEL,
      max_tokens: options?.maxTokens || 1024,
      system: options?.systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      tools: [
        {
          name: tool.name,
          description: tool.description,
          input_schema: tool.schema,
        },
      ],
      tool_choice: {
        type: 'tool',
        name: tool.name,
      },
    });

    // Extract tool use result
    const toolUseBlock = message.content.find(
      (block) => block.type === 'tool_use'
    );

    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      throw new ClaudeAPIError('No tool use block found in response');
    }

    return toolUseBlock.input as T;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        `Claude API error: ${error.message}`,
        error.status,
        error
      );
    }
    throw new ClaudeAPIError(
      'Unexpected error calling Claude API',
      undefined,
      error
    );
  }
}

/**
 * Multi-turn Conversation
 *
 * Send a conversation history to Claude for context-aware responses.
 *
 * @example
 * ```typescript
 * const messages: ClaudeMessage[] = [
 *   { role: 'user', content: 'My name is Alice' },
 *   { role: 'assistant', content: 'Nice to meet you, Alice!' },
 *   { role: 'user', content: 'What is my name?' }
 * ];
 *
 * const response = await conversation(messages);
 * console.log(response.content); // "Your name is Alice."
 * ```
 */
export async function conversation(
  messages: ClaudeMessage[],
  options?: {
    systemPrompt?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  }
): Promise<ClaudeResponse> {
  validateAPIKey();

  try {
    const message = await anthropic.messages.create({
      model: options?.model || DEFAULT_MODEL,
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature ?? 1.0,
      system: options?.systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Extract text content from response
    const textContent = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    return {
      content: textContent,
      model: message.model,
      stopReason: message.stop_reason,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        `Claude API error: ${error.message}`,
        error.status,
        error
      );
    }
    throw new ClaudeAPIError(
      'Unexpected error calling Claude API',
      undefined,
      error
    );
  }
}
