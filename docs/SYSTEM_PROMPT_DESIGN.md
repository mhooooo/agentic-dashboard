# System Prompt Design: Problem-First Widget Creation

**Author:** Agentic Dashboard Team
**Created:** November 24, 2025
**Model:** Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

---

## Overview

The Problem-First Widget Wizard uses a carefully designed system prompt to transform natural language problem descriptions into structured widget configurations.

**Design Philosophy:** Users say "I need X" not "I need GitHub widget"

**Key Innovation:** Captures user intent (why) alongside technical specs (what)

---

## System Prompt Architecture

### Full System Prompt

```
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
- **Google Calendar**: Meetings, events, schedules, availability

Examples of problem → widget mapping:
1. "Track pull requests" → GitHub PR widget (pr-list)
2. "See team calendar" → Google Calendar widget (calendar-grid)
3. "Sprint tasks" → Jira issue board widget (issue-board)
4. "Slack messages" → Slack message list widget (message-list)
5. "Monitor Linear tickets" → Linear issue list widget (issue-list)

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

4. **Business vs dev tools**: Default to dev tools (current providers)
   - Future: will support Stripe, Twilio for business workflows
```

---

## Design Rationale

### 1. Problem Extraction (5 Fields)

**Why 5 fields?**
- **problemSolved**: Technical context for widget configuration
- **painPoint**: Emotional context for storytelling (Journalist Agent)
- **goal**: Desired end state (validates solution fit)
- **expectedOutcome**: Success criteria (validates impact)
- **impactMetric**: Quantifiable benefit (powers ROI calculation)

**Alternative considered:** 3 fields (problem, solution, impact)
**Rejected because:** Insufficient emotional context for Journalist Agent

### 2. Confidence Scoring (0.0-1.0)

**Why confidence scores?**
- Enables system to ask clarifying questions when uncertain
- Prevents wrong suggestions from low-confidence inferences
- Provides transparency to user ("I'm 90% sure this is right")

**Thresholds:**
- >0.7: Proceed with suggestion
- 0.5-0.7: Ask clarifying questions
- <0.5: Request more details

**Alternative considered:** Binary (yes/no)
**Rejected because:** Doesn't capture degrees of uncertainty

### 3. Few-Shot Examples (5 Examples)

**Why 5 examples?**
- Covers all current providers (GitHub, Jira, Linear, Slack, Calendar)
- Demonstrates range of problems (dev tools, communication, productivity)
- Guides output format without training

**Coverage Matrix:**

| Provider | Use Case | Example Problem |
|----------|----------|-----------------|
| GitHub | Code review | "Track pull requests" |
| Jira | Sprint planning | "Sprint tasks" |
| Linear | Task management | "Monitor Linear tickets" |
| Slack | Communication | "Slack messages" |
| Calendar | Scheduling | "See team calendar" |

**Why not more?**
- Diminishing returns beyond 5-7 examples
- Token limit considerations (longer prompts = higher cost)
- Current provider coverage is complete

### 4. JSON Response Format

**Why structured JSON?**
- Enables UI integration (no text parsing needed)
- Type-safe in TypeScript
- Validates required fields programmatically

**Alternative considered:** Plain text response
**Rejected because:** Too brittle, hard to extract structured data

**JSON Schema:**
```typescript
{
  stage: 'problem_discovery',
  extractedIntent: {
    problemSolved: string,
    painPoint: string,
    goal: string,
    expectedOutcome: string,
    impactMetric?: string
  },
  inferredWidget: {
    provider: 'github' | 'jira' | 'linear' | 'slack' | 'calendar',
    type: string,
    confidence: number
  },
  message: string
}
```

### 5. Conversational Guidelines

**Why "friendly and conversational"?**
- Users are solving problems, not configuring systems
- Natural language reduces friction
- Validates inference with "Does this sound right?"

**Tone Examples:**

❌ **Too technical:**
> "Initializing GitHub pull request retrieval module with multi-repository query parameters."

✅ **Conversational:**
> "Got it! I can create a GitHub PR widget that shows all your pull requests in one place. This should save your team about 30 minutes every morning. Does this sound right?"

---

## Prompt Engineering Techniques Used

### 1. Role Definition
```
You are an AI assistant helping users create dashboard widgets through conversation.
```
**Purpose:** Sets context and behavior

### 2. Task Decomposition
```
Your job:
1. Extract the problem, pain point, goal, and expected outcome
2. Infer which provider and widget type would solve their problem
3. Provide a conversational response
```
**Purpose:** Breaks complex task into steps

### 3. Few-Shot Learning
```
Examples of problem → widget mapping:
1. "Track pull requests" → GitHub PR widget (pr-list)
2. "See team calendar" → Google Calendar widget (calendar-grid)
...
```
**Purpose:** Guides model to correct output format

### 4. Output Format Specification
```
Always respond with valid JSON in this format:
{
  "stage": "problem_discovery",
  ...
}
```
**Purpose:** Ensures structured, parseable output

### 5. Edge Case Handling
```
1. **Multiple providers possible**: Choose most common use case
2. **Vague description**: Extract what you can, ask clarifying questions
...
```
**Purpose:** Defines behavior for ambiguous inputs

### 6. Validation Instructions
```
- Validate inferences ("Does this sound right?")
- If confidence < 0.7, ask clarifying questions
```
**Purpose:** Builds trust through transparency

---

## Testing Strategy

### Test Coverage

**5 Sample Problems:**
1. Late payments (Stripe) - Business workflow
2. Jira blocked tickets (Jira) - Dev tool
3. Upcoming meetings (Calendar) - Productivity
4. GitHub PR review times (GitHub) - Code review
5. Slack mentions (Slack) - Communication

**Coverage Matrix:**

| Category | Provider | Expected Accuracy |
|----------|----------|-------------------|
| Dev Tools | GitHub, Jira, Linear | 90-100% |
| Communication | Slack | 80-90% |
| Productivity | Calendar | 80-90% |
| Business (future) | Stripe, Twilio | 70-80% |

### Success Metrics

**Primary:** 70%+ accuracy (4 out of 5 correct)
- Validates system prompt quality
- Proves problem-first approach works

**Secondary:** All 5 intent fields extracted
- Ensures Glass Factory has material for storytelling
- Validates extraction logic

**Tertiary:** Confidence scores align with clarity
- Crystal clear problems → confidence >0.9
- Ambiguous problems → confidence <0.7

---

## Iteration History

### Version 1.0 (November 24, 2025)

**Initial design** with 5 providers:
- GitHub, Jira, Linear, Slack, Calendar
- 5 few-shot examples
- Confidence scoring (0.0-1.0)

**Testing:** Pending API key configuration

### Future Improvements (Month 6+)

**Version 2.0 (Month 6):**
- Add Stripe, Twilio examples (business workflows)
- Dynamic provider registry (auto-generate examples)
- Multi-language support (Spanish, French)

**Version 3.0 (Month 7):**
- Fine-tuning on actual user conversations
- Target: 90%+ accuracy (vs 70% baseline)
- Reduced token usage (shorter prompts)

---

## API Configuration

### Model Selection

**Chosen:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)

**Why Sonnet?**
- Balanced: Fast + accurate
- Cost-effective: $3 per 1M input tokens, $15 per 1M output tokens
- Structured output support (JSON mode)

**Alternatives considered:**
- **Haiku:** Too fast, less accurate (50-60% expected)
- **Opus:** Too expensive ($15/$75 per 1M tokens), overkill for this task

### Parameters

```typescript
{
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 1000,
  temperature: 0.7,
  systemPrompt: WIDGET_CREATION_SYSTEM_PROMPT
}
```

**Temperature = 0.7:**
- Balance between creativity (0.8-1.0) and determinism (0.0-0.5)
- Allows natural conversational responses
- Maintains accuracy in structured output

**Max Tokens = 1000:**
- Average response: 500-700 tokens
- Buffer for long messages
- Cost: ~$0.06 per widget creation

---

## Cost Analysis

### Per-Widget Cost

**Input tokens:** ~500 (system prompt + user message)
**Output tokens:** ~300 (JSON response + message)
**Total:** ~800 tokens

**Cost:** $0.06 per widget creation
- Input: 500 × $3/1M = $0.0015
- Output: 300 × $15/1M = $0.0045
- Total: ~$0.006 per widget

**Acceptable?** Yes, <$1 per user per month (target)

### Monthly Budget

**Assumptions:**
- 100 users
- 10 widgets per user per month
- Total: 1,000 widget creations/month

**Total cost:** 1,000 × $0.06 = $60/month

**Comparison:**
- Zapier: $20-50/user/month (>$2,000/month for 100 users)
- IFTTT: $5-10/user/month (~$500-1,000/month)
- Our cost: $60/month ✅

---

## Integration with Month 5 Architecture

### Stage 1: Problem Discovery (This Implementation)
```
User → Problem Description
↓
Claude API (inferWidgetFromProblem)
↓
Extracted Intent + Inferred Widget + Message
↓
Conversation State Store
```

### Stage 2: Clarifying Questions (Week 18)
```
Inferred Widget → Provider-Specific Questions
↓
User Answers
↓
Implementation Details Store
```

### Stage 5: Deploy & Event Logging (Week 19)
```
Implementation Details → Widget Schema
↓
Deploy to Dashboard
↓
Log DocumentableEvent with UserIntent ← Captured in Stage 1!
↓
Glass Factory (Journalist Agent can tell story)
```

---

## Conclusion

The Problem-First Widget Wizard system prompt is designed to:

1. **Extract user intent naturally** (5 fields: problem, pain point, goal, outcome, impact)
2. **Infer correct provider** (70%+ accuracy target with confidence scoring)
3. **Enable storytelling** (Glass Factory uses userIntent for Twitter threads)
4. **Maintain conversational tone** (friendly, validates inferences)
5. **Handle edge cases** (vague descriptions, multiple providers, explicit mentions)

**Status:** ✅ Ready for testing (pending Anthropic API key)

**Next Steps:**
1. Add API key to `.env.local`
2. Run test suite: `npx tsx lib/ai/test-widget-creation-agent.ts`
3. Validate 70%+ accuracy
4. Proceed to Week 18 (Core Implementation)

---

**End of System Prompt Design Document**
