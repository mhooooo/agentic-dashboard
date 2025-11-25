# Widget Creation Wizard - Integration Test Guide

**Date:** November 25, 2025
**Status:** Ready for Testing
**Week 18:** Backend Integration Complete

---

## Overview

The WidgetCreationWizard has been successfully wired to real API routes with streaming support. This guide provides manual testing steps to validate the integration.

---

## Test Environment Setup

### 1. Start Development Server

```bash
npm run dev
```

### 2. Verify Environment Variables

Ensure `.env.local` contains:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Note:** If missing, wizard will show error: "Claude API not configured"

### 3. Open Test Page

Navigate to: `http://localhost:3000/test-wizard`

---

## Test Cases

### Test 1: Problem Discovery (Stage 1)

**Objective:** Verify AI extracts intent and infers widget from problem description

**Steps:**
1. Open wizard at `/test-wizard`
2. Enter: "My team is losing track of pull requests across 3 repos"
3. Click "Send"

**Expected Results:**
- ✅ Loading indicator shows: "Understanding your problem..."
- ✅ AI responds with structured message (non-streaming)
- ✅ Response suggests GitHub PR widget
- ✅ Stage indicator advances to "Details" (clarifying_questions)
- ✅ No console errors

**Sample Response:**
```
"Got it! I can create a GitHub PR widget that shows all your pull requests
in one place. This should save your team time every morning. Does this sound right?"
```

---

### Test 2: Streaming Response (Stages 2-5)

**Objective:** Verify streaming works for conversational stages

**Steps:**
1. Complete Test 1 (reach Stage 2: Clarifying Questions)
2. Enter: "Yes, that sounds perfect"
3. Click "Send"

**Expected Results:**
- ✅ Loading indicator shows: "Thinking of questions..."
- ✅ AI response streams word-by-word (typewriter effect)
- ✅ Message updates in real-time as tokens arrive
- ✅ No "chunking" or full-message flashes
- ✅ No console errors

**Sample Streaming Behavior:**
```
What... specific... repos... do... you... want... to... track?
```
(Should appear smoothly, not all at once)

---

### Test 3: Error Handling - Rate Limit

**Objective:** Verify graceful error handling for API failures

**Steps:**
1. Simulate rate limit by making 10+ rapid requests
2. Observe error display

**Expected Results:**
- ✅ Error banner appears above input
- ✅ Error message: "Rate limit exceeded. Please wait a moment and try again."
- ✅ "Retry" button displayed
- ✅ Input remains functional
- ✅ No crash or blank screen

---

### Test 4: Error Handling - Network Failure

**Objective:** Verify handling of network errors

**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Send a message
4. Observe error

**Expected Results:**
- ✅ Error banner shows: "Something went wrong. Please try again."
- ✅ "Retry" button available
- ✅ No infinite loading state
- ✅ User can retry after reconnecting

---

### Test 5: Abort on Unmount

**Objective:** Verify pending requests are cancelled on wizard close

**Steps:**
1. Send a message (start long AI response)
2. Immediately click "Close" button
3. Check browser console

**Expected Results:**
- ✅ Console shows: "Request cancelled by user"
- ✅ No errors in console
- ✅ No memory leaks
- ✅ Stream properly terminated

---

### Test 6: Retry Logic

**Objective:** Verify retry button re-sends last message

**Steps:**
1. Send message that causes error (e.g., invalid API key)
2. Click "Retry" button
3. Observe retry counter

**Expected Results:**
- ✅ Last message is re-sent automatically
- ✅ Retry counter shows: "Retry (1)", "Retry (2)", etc.
- ✅ Input field is cleared after retry
- ✅ Loading state activates

---

### Test 7: Stage Progression

**Objective:** Verify wizard progresses through all 5 stages

**Steps:**
1. Complete Problem Discovery (Stage 1)
2. Answer clarifying questions (Stage 2)
3. Select visualization (Stage 3)
4. Confirm preview (Stage 4)
5. Deploy widget (Stage 5)

**Expected Results:**
- ✅ Stage indicator updates at each step
- ✅ Progress bar fills left-to-right
- ✅ Active stage highlighted in primary color
- ✅ Completed stages remain highlighted
- ✅ No stage skipping or regression

---

### Test 8: Conversation History

**Objective:** Verify messages persist across stages

**Steps:**
1. Complete Stages 1-3
2. Scroll up to view earlier messages
3. Send new message in Stage 3

**Expected Results:**
- ✅ All previous messages visible
- ✅ Messages display user/assistant correctly
- ✅ Timestamps show "Just now" / "5m ago"
- ✅ Auto-scroll to bottom after new message

---

### Test 9: Loading States

**Objective:** Verify loading indicators match current stage

**Steps:**
1. Send message in each stage (1-5)
2. Observe loading text

**Expected Loading Messages:**
- Stage 1: "Understanding your problem..."
- Stage 2: "Thinking of questions..."
- Stage 3: "Generating options..."
- Stage 4: "Creating preview..."
- Stage 5: "Processing..."

**Expected Results:**
- ✅ Loading text matches current stage
- ✅ Bouncing dots animation smooth
- ✅ Input disabled during loading
- ✅ Send button disabled

---

### Test 10: Dev Mode Fallback

**Objective:** Verify wizard works without Claude API key

**Steps:**
1. Remove `ANTHROPIC_API_KEY` from `.env.local`
2. Restart dev server
3. Open wizard
4. Send message

**Expected Results:**
- ✅ Error shows: "Claude API not configured"
- ✅ Helpful message with setup instructions
- ✅ No crash or infinite loading
- ✅ User can still close wizard

---

## Performance Benchmarks

### Streaming Latency

**Target:** <200ms time-to-first-token

**Measurement:**
1. Open DevTools → Network tab
2. Send message in Stage 2+ (streaming stages)
3. Measure time from request → first SSE event

**Expected:**
- ✅ First token arrives within 200ms
- ✅ Subsequent tokens stream smoothly (10-50ms intervals)
- ✅ Total response completes in <5 seconds

### Problem Discovery Accuracy

**Target:** >80% correct widget inference

**Test Cases:**
- "Track GitHub PRs" → GitHub widget (✅ expected)
- "See team calendar" → Calendar widget (✅ expected)
- "Monitor Jira sprint" → Jira widget (✅ expected)
- "Slack mentions" → Slack widget (✅ expected)
- "Linear tickets" → Linear widget (✅ expected)

**Expected Results:**
- ✅ 4/5 or 5/5 correct inferences
- ✅ Confidence scores >70% for correct matches
- ✅ Reasoning provided in response

---

## Known Issues & Limitations

### 1. No Conversation Persistence

**Issue:** Refreshing page clears conversation history
**Status:** Expected behavior (Zustand in-memory store)
**Workaround:** Complete wizard in one session
**Future:** Add conversation persistence to database (Month 6)

### 2. Stage 2-5 AI Logic Not Implemented

**Issue:** Clarifying Questions, Visualization, Preview stages use placeholder prompts
**Status:** Week 18 focused on infrastructure, not content
**Next:** Week 19 will implement stage-specific AI logic
**Current Behavior:** AI asks generic questions (not widget-specific)

### 3. Deploy Route Exists But Not Wired

**Issue:** Stage 5 doesn't actually deploy widget yet
**Status:** Deploy API exists (`/api/ai/widget-creation/deploy`) but wizard doesn't call it
**Next:** Wire deploy button in Week 19
**Current Behavior:** Wizard ends at Stage 5 with confirmation message

---

## Integration Checklist

- ✅ API route `/api/ai/widget-creation/chat` created
- ✅ API route `/api/ai/widget-creation/deploy` created (already existed)
- ✅ WidgetCreationWizard.tsx wired to API routes
- ✅ Streaming SSE responses implemented
- ✅ Error handling with retry logic
- ✅ Loading states per stage
- ✅ Abort controller for request cancellation
- ✅ TypeScript build passes (0 errors)
- ✅ All routes registered in Next.js build
- ⏳ Manual testing (pending user validation)

---

## Next Steps (Week 19)

1. **Stage 2-5 AI Logic:** Implement widget-specific prompts for each stage
2. **Deploy Integration:** Wire Stage 5 to `/api/ai/widget-creation/deploy`
3. **Visualization Selector:** Add UI for choosing list/table/cards/metric
4. **Schema Preview:** Show generated widget JSON in Stage 4
5. **End-to-End Flow:** Test complete Problem → Deploy in <5 minutes

---

## Troubleshooting

### Error: "Claude API not configured"

**Cause:** Missing `ANTHROPIC_API_KEY` in `.env.local`
**Fix:**
1. Get API key from https://console.anthropic.com/settings/keys
2. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-api03-...`
3. Restart dev server: `npm run dev`

### Error: "API error: 500"

**Cause:** Server-side error (check terminal logs)
**Fix:**
1. Check terminal for error details
2. Verify Claude client initialization
3. Check `widget-creation-agent.ts` for bugs

### Streaming Not Working

**Symptom:** Full message appears at once (no typewriter effect)
**Cause:** Browser doesn't support SSE or response not streaming
**Fix:**
1. Check API route returns `text/event-stream` header
2. Verify `ReadableStream` is available
3. Test in Chrome/Firefox (Safari can be buggy)

### Messages Not Updating During Stream

**Symptom:** Empty message until stream completes
**Cause:** Zustand store not triggering re-renders
**Fix:**
1. Check `useConversationStore.setState()` call in streaming logic
2. Verify message index is correct
3. Add console.log to debug accumulated text

---

**Last Updated:** November 25, 2025
**Test Status:** Ready for Manual Validation
**Next Review:** Week 19 (Dec 8-14, 2025)
