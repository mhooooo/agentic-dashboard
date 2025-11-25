/**
 * Widget Creation Chat API
 *
 * Handles conversational widget creation through 5 stages:
 * 1. Problem Discovery - Extract intent and infer widget
 * 2. Clarifying Questions - Gather implementation details
 * 3. Visualization - Choose data display format
 * 4. Preview - Show generated widget schema
 * 5. Deploy - Create widget and add to dashboard
 *
 * Uses Server-Sent Events (SSE) for streaming AI responses.
 */

import { NextRequest } from 'next/server';
import { inferWidgetFromProblem } from '@/lib/ai/widget-creation-agent';
import { promptStream } from '@/lib/ai/claude-client';

/**
 * Request body structure
 */
interface ChatRequest {
  message: string;
  stage: 'problem_discovery' | 'clarifying_questions' | 'visualization' | 'preview' | 'deploy';
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  extractedIntent?: {
    problemSolved: string;
    painPoint: string;
    goal: string;
    expectedOutcome: string;
    impactMetric?: string;
  };
  inferredWidget?: {
    provider: string;
    type: string;
    confidence: number;
  };
}

/**
 * POST /api/ai/widget-creation/chat
 *
 * Processes user message and returns AI response with streaming support.
 *
 * @param request - Next.js request with ChatRequest body
 * @returns Streaming response with AI-generated content
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, stage, conversationHistory = [], extractedIntent, inferredWidget } = body;

    // Validate inputs
    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!stage) {
      return new Response(JSON.stringify({ error: 'Stage is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle different stages
    if (stage === 'problem_discovery') {
      return handleProblemDiscovery(message);
    } else if (stage === 'clarifying_questions') {
      return handleClarifyingQuestions(message, conversationHistory, extractedIntent, inferredWidget);
    } else if (stage === 'visualization') {
      return handleVisualization(message, conversationHistory, inferredWidget);
    } else if (stage === 'preview') {
      return handlePreview(message, conversationHistory, extractedIntent, inferredWidget);
    } else if (stage === 'deploy') {
      return handleDeploy(message, conversationHistory, extractedIntent, inferredWidget);
    }

    return new Response(JSON.stringify({ error: 'Invalid stage' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in widget creation chat:', error);

    // Handle API key missing error
    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      return new Response(
        JSON.stringify({
          error: 'Claude API not configured. Please add ANTHROPIC_API_KEY to your environment.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to process message. Please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Stage 1: Problem Discovery
 *
 * Extract user intent and infer which widget would solve their problem.
 */
async function handleProblemDiscovery(message: string) {
  try {
    const response = await inferWidgetFromProblem(message);

    // Return structured JSON response (not streaming for Stage 1)
    return new Response(
      JSON.stringify({
        message: response.message,
        extractedIntent: response.extractedIntent,
        inferredWidget: response.inferredWidget,
        nextStage: 'clarifying_questions',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in problem discovery:', error);
    throw error;
  }
}

/**
 * Stage 2: Clarifying Questions
 *
 * Ask follow-up questions based on inferred widget type.
 * Streams response for natural conversation feel.
 */
async function handleClarifyingQuestions(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  extractedIntent: any,
  inferredWidget: any
) {
  const systemPrompt = `You are helping the user configure a ${inferredWidget?.provider || 'dashboard'} widget.

The user wants to solve: "${extractedIntent?.problemSolved || 'a problem'}"

Ask clarifying questions to understand:
1. What specific data to show (e.g., which repos, which projects, date range)
2. Any filters or customizations needed
3. Update frequency (real-time vs hourly vs daily)

Be conversational and friendly. Ask one question at a time. Keep questions simple.

When the user has answered enough questions to configure the widget, say "Great! I have everything I need. Let's move to visualization."`;

  return createStreamingResponse(message, systemPrompt, conversationHistory);
}

/**
 * Stage 3: Visualization
 *
 * Help user choose how to display their data.
 */
async function handleVisualization(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  inferredWidget: any
) {
  const systemPrompt = `You are helping the user choose how to visualize their ${inferredWidget?.provider || 'dashboard'} data.

Available visualization types:
- **List**: Simple list of items (like an inbox)
- **Table**: Sortable columns with detailed data
- **Cards**: Visual cards with key information
- **Metric**: Single number or statistic

Ask the user which format they prefer, or suggest one based on their use case.

When they've chosen, say "Perfect! Let me generate a preview of your widget."`;

  return createStreamingResponse(message, systemPrompt, conversationHistory);
}

/**
 * Stage 4: Preview
 *
 * Show generated widget schema and confirm with user.
 */
async function handlePreview(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  extractedIntent: any,
  inferredWidget: any
) {
  const systemPrompt = `You are showing the user a preview of their widget configuration.

Widget details:
- Provider: ${inferredWidget?.provider || 'unknown'}
- Type: ${inferredWidget?.type || 'unknown'}
- Purpose: ${extractedIntent?.problemSolved || 'solving a problem'}

Ask if they want to:
1. Deploy the widget now
2. Make changes to the configuration
3. Start over

Be encouraging and helpful.`;

  return createStreamingResponse(message, systemPrompt, conversationHistory);
}

/**
 * Stage 5: Deploy
 *
 * Confirm deployment and provide next steps.
 */
async function handleDeploy(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  extractedIntent: any,
  inferredWidget: any
) {
  const systemPrompt = `You are confirming the widget deployment.

The widget has been created and added to their dashboard.

Tell them:
1. The widget is live on their dashboard
2. How to find it (look for the new widget on the main dashboard)
3. They can customize it anytime by clicking the settings icon

Be enthusiastic and helpful!`;

  return createStreamingResponse(message, systemPrompt, conversationHistory);
}

/**
 * Create streaming SSE response
 *
 * Streams AI response chunk by chunk using Server-Sent Events.
 */
async function createStreamingResponse(
  userMessage: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  // Create ReadableStream for SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Get streaming response from Claude
        const claudeStream = await promptStream(userMessage, {
          systemPrompt,
          maxTokens: 1024,
          temperature: 0.7,
        });

        // Stream chunks to client
        for await (const chunk of claudeStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            // Send SSE event
            const sseData = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        }

        // Send completion event
        const doneData = `data: ${JSON.stringify({ done: true })}\n\n`;
        controller.enqueue(encoder.encode(doneData));

        controller.close();
      } catch (error) {
        console.error('Error in streaming response:', error);

        // Send error event
        const errorData = `data: ${JSON.stringify({
          error: 'Failed to generate response. Please try again.',
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
