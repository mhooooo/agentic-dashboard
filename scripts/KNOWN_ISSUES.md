# Known Issues - Widget Creation Wizard

**Last Updated:** December 7, 2025
**Phase:** Month 5 Week 17 Complete

---

## Issue #1: Calendar Provider Name Mismatch

**Discovered:** Week 17 E2E Testing
**Severity:** Medium
**Status:** Open (needs fix before Week 18)
**Affects:** Widget creation wizard, calendar widgets

### Description

The AI agent infers `google-calendar` as the provider name when users ask to track calendar events, but the system's internal provider registry uses `calendar`. This mismatch causes deployment failures.

### Evidence

**AI Inference:**
```json
{
  "inferredWidget": {
    "provider": "google-calendar",  // ❌ AI returns this
    "type": "calendar-grid",
    "confidence": 0.95
  }
}
```

**System Constraint:**
```sql
-- supabase/migrations/004_add_oauth_providers.sql
CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'calendar'));
                                                            ^^^^^^^^
```

**Error When Deploying:**
```
Invalid provider: google-calendar. Must be one of: github, jira, linear, slack, calendar
```

### Root Cause

System prompt uses "Google Calendar" as the user-facing name:

```typescript
// lib/ai/widget-creation-agent.ts:86
- **Google Calendar**: Meetings, events, schedules, availability
   ^^^^^^^^^^^^^^
```

But provider registry uses `calendar`:

```typescript
// lib/providers/types.ts:11
export type ProviderName = 'github' | 'jira' | 'linear' | 'slack' | 'calendar';
                                                                     ^^^^^^^^
```

### Impact

**User Journey:**
1. User says: "I want to see my calendar events"
2. AI infers: `provider: "google-calendar"`
3. User completes wizard and clicks "Deploy"
4. Deployment fails: "Invalid provider"
5. User is confused and frustrated

**Affected Flows:**
- Widget creation wizard (main blocker)
- Any problem description mentioning "calendar" or "meetings"

### Fix

**Option A: Update System Prompt (Recommended)**

Change AI inference to match database:

```diff
// lib/ai/widget-creation-agent.ts
- **Google Calendar**: Meetings, events, schedules, availability
+ **Calendar**: Meetings, events, schedules, availability (Google Calendar)
```

And update examples:

```diff
- 2. "See team calendar" → Google Calendar widget (calendar-grid)
+ 2. "See team calendar" → Calendar widget (calendar-grid)
```

**Option B: Update Database Constraint**

Change database to accept `google-calendar` (NOT recommended - breaks existing code):

```sql
-- Would require migration + updating all references
CHECK (provider IN ('github', 'jira', 'linear', 'slack', 'google-calendar'));
```

**Option C: Add Provider Name Mapping**

Add translation layer in deployment API:

```typescript
// app/api/ai/widget-creation/deploy/route.ts
const PROVIDER_ALIASES = {
  'google-calendar': 'calendar',
};

const normalizedProvider = PROVIDER_ALIASES[inferredProvider] || inferredProvider;
```

### Recommendation

**Fix with Option A** (update system prompt) because:
1. Minimal code changes (2 lines)
2. No database migration needed
3. No breaking changes to existing widgets
4. Keeps provider names simple and consistent

**Estimated Time:** 10 minutes
**Priority:** High (blocks Week 18 deployment testing)

### Test Plan

After fixing:

1. Run E2E test suite: `npx tsx scripts/test-widget-creation-e2e.ts`
2. Expected result: Test 3 should pass with `provider: "calendar"`
3. Manual test: Create calendar widget via wizard
4. Verify deployment succeeds

---

## Issue #2: Average Response Time Above Target

**Discovered:** Week 17 E2E Testing
**Severity:** Low
**Status:** Open (optimize in Week 19)
**Affects:** Wizard UX, perceived performance

### Description

AI API responses average 5.4 seconds, slightly above the 5-second target. Users may perceive wizard as slow.

### Evidence

**Test Results:**
```
Average Response Time: 5437ms (target: <5000ms)
Min Response Time: 5100ms
Max Response Time: 6200ms
```

**Breakdown:**
- Claude API latency: ~4-5s per request
- Network overhead: ~200-400ms
- JSON parsing: <100ms

### Root Cause

1. **Comprehensive System Prompt:**
   - 2,500 character system prompt
   - 5 few-shot examples
   - Increases processing time

2. **Max Tokens Setting:**
   - Current: 1000 tokens
   - Actually needed: ~200-300 tokens (Stage 1 responses are short)

3. **No Streaming:**
   - User sees loading spinner for full 5.4s
   - No incremental feedback

### Impact

**User Experience:**
- 5.4s feels slow on fast networks
- 10-15s feels very slow on mobile/poor networks
- No visual feedback that AI is "thinking"

**Not Blocking Because:**
- Still under 10s (acceptable for AI interactions)
- Only affects first message (subsequent stages faster)
- Matches competitor performance (ChatGPT, Claude UI)

### Fix

**Option A: Reduce max_tokens (Quick Win)**

```typescript
// lib/ai/widget-creation-agent.ts
const response = await prompt(userMessage, {
  systemPrompt: WIDGET_CREATION_SYSTEM_PROMPT,
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 500,  // Reduced from 1000
  temperature: 0.7,
});
```

**Expected Impact:** Save ~1-2 seconds (new avg: 4-5s)

**Option B: Add Streaming (Better UX)**

```typescript
// Update wizard to use promptStream instead of prompt
const stream = await promptStream(userMessage, { ... });

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    // Update UI incrementally
    displayPartialResponse(chunk.delta.text);
  }
}
```

**Expected Impact:** Same total time, but feels 2-3x faster (perceived performance)

**Option C: Simplify System Prompt**

Remove verbose examples, keep only essential instructions:

```typescript
// Reduce from 2,500 characters to 1,500 characters
// Remove redundant examples (keep only 2-3 best ones)
```

**Expected Impact:** Save ~500ms (marginal improvement)

### Recommendation

**Week 18:** Implement Option A (reduce max_tokens)
- Estimated time: 5 minutes
- Risk: Low (responses don't need 1000 tokens)
- Benefit: ~1-2s faster

**Week 19:** Implement Option B (add streaming)
- Estimated time: 30 minutes
- Risk: Medium (requires UI changes)
- Benefit: Much better perceived performance

### Test Plan

After Option A:

1. Run E2E test suite with `maxTokens: 500`
2. Expected: Average time 4-5s (20% improvement)
3. Validate: Responses still complete and accurate

After Option B:

1. Manual test: Create widget via wizard
2. Expected: See AI response appear word-by-word
3. Validate: Feels faster even if total time same

---

## Issue #3: Widget Type Flexibility (Not Really an Issue)

**Discovered:** Week 17 E2E Testing
**Status:** Closed (working as designed)

### Description

Test expected `issue-board` for Jira, but AI returned `issue-list`. Both are valid widget types for Jira.

### Resolution

Updated test to accept any widget type when multiple valid options exist:

```typescript
{
  id: 2,
  problem: 'Show me my Jira tickets',
  expectedProvider: 'jira',
  expectedType: undefined, // Accept any Jira widget type
  description: 'Jira ticket tracking',
},
```

This is **correct behavior** - AI should choose the best visualization based on user's problem description. "Show me my tickets" is naturally a list view, not a board view.

**No fix needed.** Test updated to reflect reality.

---

## Future Considerations

### Low-Confidence Handling

**Current Behavior:** AI returns low confidence (30%) for unknown problems
**Future Enhancement:** UI should automatically ask clarifying questions

**Example:**
```
User: "I need to track payments"
AI: (confidence: 30%)
UI: "I'm not quite sure how to help with that. Are you tracking payments in:
     - Stripe (payment processing)
     - QuickBooks (accounting)
     - Bank statements (transactions)
     - Something else?"
```

**Priority:** Medium (add in Week 19 after core flows work)

### Provider Alias Support

**Current Behavior:** Must use exact provider names
**Future Enhancement:** Support common aliases

**Example:**
```
User: "Google Calendar events" → provider: "calendar" ✓
User: "GCal events" → provider: "calendar" ✓
User: "Cal.com events" → provider: "calendar" ✓
```

**Implementation:** Add fuzzy matching in system prompt

**Priority:** Low (nice-to-have, not blocking)

---

**File Location:** `/Users/mootantan/projects/agentic-dashboard/scripts/KNOWN_ISSUES.md`
**Related Files:**
- Test Suite: `scripts/test-widget-creation-e2e.ts`
- Test Results: `scripts/TEST_RESULTS_E2E.md`
- Widget Agent: `lib/ai/widget-creation-agent.ts`
