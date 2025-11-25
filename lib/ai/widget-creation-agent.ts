/**
 * Widget Creation Agent
 *
 * AI agent that infers widget needs from user's problem description.
 * Uses Claude Sonnet 4.5 to map problems → solutions.
 *
 * @see RFC-001 Section 5.5: Problem-First Widget Wizard
 */

/**
 * User intent extracted from problem description
 */
export interface UserIntent {
  problemSolved: string;      // "Manual PR tracking across 3 repos taking 30min/day"
  painPoint: string;          // "Team losing track of PRs, wasting time"
  goal: string;               // "Consolidated PR view in one dashboard"
  expectedOutcome: string;    // "Zero manual checking, see all PRs instantly"
  impactMetric?: string;      // "Save 30min/day" (optional)
}

/**
 * Inferred widget from problem description
 */
export interface InferredWidget {
  provider: 'github' | 'jira' | 'linear' | 'slack' | 'calendar' | 'stripe' | 'twilio';
  type: string;               // "pr-list", "issue-board", "calendar-grid", etc.
  confidence: number;         // 0.0-1.0 (how confident the AI is in this inference)
}

/**
 * Response from problem discovery stage
 */
export interface ProblemDiscoveryResponse {
  stage: 'problem_discovery';
  extractedIntent: UserIntent;
  inferredWidget: InferredWidget;
  message: string;            // Conversational response to user
}

/**
 * System prompt for widget creation agent
 *
 * Approach: Problem-first, not provider-first.
 * Users say "I need X" not "I need GitHub widget"
 */
export const WIDGET_CREATION_SYSTEM_PROMPT = `
You are an AI assistant helping users create dashboard widgets through conversation.

## Your Task

Users will describe a problem they're trying to solve. Your job:
1. Extract the problem, pain point, goal, and expected outcome
2. Infer which provider and widget type would solve their problem
3. Provide a conversational response

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
  "painPoint": "30min/day wasted time, team losing track of PRs",
  "goal": "Consolidated PR view in one dashboard",
  "expectedOutcome": "Zero manual checking, see all PRs instantly",
  "impactMetric": "Save 30min/day"
}

## Widget Inference

Given the problem, infer which provider and widget type to suggest.

Available providers and use cases:
- **GitHub**: Pull requests, issues, repository activity, code reviews
- **Jira**: Sprint planning, issue tracking, project management, workflows
- **Linear**: Task management, sprint tracking, issue tracking
- **Slack**: Team messages, channel activity, notifications, mentions
- **Calendar**: Meetings, events, schedules, availability (Google Calendar)
- **Stripe**: Payment tracking, revenue metrics, subscription management, customer billing, payment dashboards
- **Twilio**: SMS alerts, text notifications, SMS reminders, phone notifications, messaging automation

Examples of problem → widget mapping:
1. "Track pull requests" → GitHub PR widget (pr-list)
2. "See team calendar" → Calendar widget (calendar-grid)
3. "Sprint tasks" → Jira issue board widget (issue-board)
4. "Slack messages" → Slack message list widget (message-list)
5. "Monitor Linear tickets" → Linear issue list widget (issue-list)
6. "Track customer payments" → Stripe payments widget (payment-list)
7. "Monitor subscription revenue" → Stripe revenue widget (revenue-metrics)
8. "Send SMS alerts" → Twilio SMS widget (sms-alerts)
9. "Text message notifications" → Twilio messaging widget (message-notifications)

## Confidence Scoring

Assign confidence based on clarity:
- 0.9-1.0: Crystal clear ("track GitHub PRs")
- 0.7-0.8: Likely correct ("monitor team tasks" → probably Jira)
- 0.5-0.6: Multiple possibilities ("see team updates" → Slack or Calendar?)
- <0.5: Too vague, need clarification

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
    "type": "pr-list",
    "confidence": 0.9
  },
  "message": "Got it! I can create a GitHub PR widget that shows all your pull requests in one place. This should save your team about 30 minutes every morning. Does this sound right?"
}

## Guidelines

- Be conversational and friendly
- Explain technical concepts simply
- Use user's language (if they say "see PRs", don't say "retrieve pull request data")
- Validate inferences ("Does this sound right?")
- If confidence < 0.7, ask clarifying questions in the message
- Always extract at least problemSolved, painPoint, and goal (minimum viable intent)

## Edge Cases

1. **Multiple providers possible**: Choose most common use case
   - "Track tasks" → Jira (most popular for task tracking)

2. **Vague description**: Extract what you can, ask clarifying questions
   - "I need to see stuff" → Extract goal, ask what kind of stuff

3. **Mentions provider explicitly**: Use that provider
   - "GitHub pull requests" → Confidence = 1.0

4. **Business vs dev tools**: Map to appropriate domain
   - Dev tools: GitHub, Jira, Linear (code, projects, tasks)
   - Business tools: Stripe, Twilio (payments, communications)
`;

/**
 * Few-shot examples for problem → widget mapping
 */
export const PROBLEM_TO_WIDGET_EXAMPLES = [
  {
    problem: 'Track pull requests across multiple repos',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Manual PR tracking across multiple repositories',
        painPoint: 'Checking multiple repos individually takes time',
        goal: 'Consolidated PR view',
        expectedOutcome: 'See all PRs in one dashboard',
      },
      inferredWidget: {
        provider: 'github' as const,
        type: 'pr-list',
        confidence: 0.95,
      },
    },
  },
  {
    problem: 'See team calendar and upcoming meetings',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Manual calendar checking for team schedules',
        painPoint: 'Forgetting meetings, double-booking',
        goal: 'Centralized team calendar view',
        expectedOutcome: 'Never miss a meeting',
      },
      inferredWidget: {
        provider: 'calendar' as const,
        type: 'calendar-grid',
        confidence: 0.9,
      },
    },
  },
  {
    problem: 'Monitor Jira tickets for current sprint',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Manual sprint progress tracking',
        painPoint: 'Unclear sprint status, missed tickets',
        goal: 'Real-time sprint board visibility',
        expectedOutcome: 'Always know sprint progress',
      },
      inferredWidget: {
        provider: 'jira' as const,
        type: 'issue-board',
        confidence: 0.95,
      },
    },
  },
  {
    problem: 'Track Slack mentions in important channels',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Missed Slack mentions and notifications',
        painPoint: 'Important messages get lost in noise',
        goal: 'Filtered view of relevant messages',
        expectedOutcome: 'Never miss important mentions',
      },
      inferredWidget: {
        provider: 'slack' as const,
        type: 'message-list',
        confidence: 0.85,
      },
    },
  },
  {
    problem: 'See Linear tickets assigned to me',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Manual Linear ticket checking',
        painPoint: 'Forgetting assigned tasks',
        goal: 'Personal task dashboard',
        expectedOutcome: 'Always see my assigned work',
      },
      inferredWidget: {
        provider: 'linear' as const,
        type: 'issue-list',
        confidence: 0.9,
      },
    },
  },
  {
    problem: 'Track customer payments and revenue',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Manual payment tracking across Stripe dashboard',
        painPoint: 'Time wasted checking payment status, delayed revenue insights',
        goal: 'Real-time payment and revenue visibility',
        expectedOutcome: 'Instant payment notifications and revenue metrics',
      },
      inferredWidget: {
        provider: 'stripe' as const,
        type: 'payment-list',
        confidence: 0.9,
      },
    },
  },
  {
    problem: 'Monitor subscription billing and customer accounts',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Manual subscription management in Stripe',
        painPoint: 'Missed failed payments, unclear customer status',
        goal: 'Centralized subscription dashboard',
        expectedOutcome: 'Track all subscriptions and billing issues',
      },
      inferredWidget: {
        provider: 'stripe' as const,
        type: 'subscription-list',
        confidence: 0.85,
      },
    },
  },
  {
    problem: 'Send SMS alerts for important events',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Manual notification checking',
        painPoint: 'Missing critical alerts, delayed response time',
        goal: 'Automated SMS notifications',
        expectedOutcome: 'Instant SMS alerts for important events',
      },
      inferredWidget: {
        provider: 'twilio' as const,
        type: 'sms-alerts',
        confidence: 0.9,
      },
    },
  },
  {
    problem: 'Text reminders for upcoming deadlines',
    expectedResponse: {
      extractedIntent: {
        problemSolved: 'Missed deadlines and forgotten tasks',
        painPoint: 'No proactive reminders, relying on memory',
        goal: 'Automated SMS reminders',
        expectedOutcome: 'Never miss a deadline with text alerts',
      },
      inferredWidget: {
        provider: 'twilio' as const,
        type: 'sms-reminders',
        confidence: 0.85,
      },
    },
  },
];

/**
 * Infer widget from problem description
 *
 * Uses Claude Sonnet 4.5 to analyze user's problem and suggest a solution.
 *
 * @param problemDescription - Natural language problem description
 * @returns Extracted intent + inferred widget + conversational message
 *
 * @example
 * ```typescript
 * const response = await inferWidgetFromProblem(
 *   "My team is losing track of pull requests across 3 repos"
 * );
 *
 * console.log(response.inferredWidget.provider); // "github"
 * console.log(response.extractedIntent.problemSolved); // "Manual PR tracking..."
 * ```
 */
export async function inferWidgetFromProblem(
  problemDescription: string
): Promise<ProblemDiscoveryResponse> {
  // Import Claude client (dynamic to avoid circular deps)
  const { prompt } = await import('./claude-client');

  const userMessage = `User described their problem: "${problemDescription}"

Extract intent and infer widget type. Respond with JSON only (no markdown code blocks).`;

  const response = await prompt(userMessage, {
    systemPrompt: WIDGET_CREATION_SYSTEM_PROMPT,
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 1000,
    temperature: 0.7,
  });

  // Parse JSON response
  try {
    // Remove markdown code blocks if present
    const cleaned = response.content
      .replace(/```json\n?/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate response structure
    if (!parsed.stage || !parsed.extractedIntent || !parsed.inferredWidget) {
      throw new Error('Invalid response structure from Claude');
    }

    return parsed as ProblemDiscoveryResponse;
  } catch (error) {
    console.error('Failed to parse Claude response:', response.content);
    throw new Error(`Failed to parse Claude response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract user intent from problem description
 *
 * Lower-level function that only extracts intent (no widget inference).
 * Useful when you need to understand the problem without suggesting a solution.
 *
 * @param problemDescription - Natural language problem description
 * @returns Extracted user intent
 *
 * @example
 * ```typescript
 * const intent = await extractIntent(
 *   "We're wasting 30 minutes every day tracking PRs manually"
 * );
 *
 * console.log(intent.impactMetric); // "Save 30min/day"
 * ```
 */
export async function extractIntent(
  problemDescription: string
): Promise<UserIntent> {
  const { prompt } = await import('./claude-client');

  const userMessage = `Extract user intent from this problem description: "${problemDescription}"

Respond with JSON only:
{
  "problemSolved": "...",
  "painPoint": "...",
  "goal": "...",
  "expectedOutcome": "...",
  "impactMetric": "..." // optional
}`;

  const systemPrompt = `You are an AI assistant that extracts structured information from problem descriptions.

Extract:
- problemSolved: What manual work is being eliminated?
- painPoint: What's the specific frustration or time waste?
- goal: What's the desired end state?
- expectedOutcome: What success looks like
- impactMetric: Quantify the improvement (if mentioned)

Always respond with valid JSON. No markdown code blocks.`;

  const response = await prompt(userMessage, {
    systemPrompt,
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 500,
    temperature: 0.5,
  });

  try {
    const cleaned = response.content
      .replace(/```json\n?/g, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate minimum fields
    if (!parsed.problemSolved || !parsed.painPoint || !parsed.goal) {
      throw new Error('Missing required intent fields');
    }

    return parsed as UserIntent;
  } catch (error) {
    console.error('Failed to parse intent extraction:', response.content);
    throw new Error(`Failed to extract intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
