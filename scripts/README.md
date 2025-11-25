# Test Scripts

This directory contains test scripts for validating the Agentic Dashboard functionality.

---

## End-to-End Widget Creation Test

**File:** `test-widget-creation-e2e.ts`
**Purpose:** Validates the full widget creation wizard flow from problem description to deployment
**Status:** ✅ All tests passing (100% accuracy)

### Quick Start

```bash
# Ensure ANTHROPIC_API_KEY is set
export ANTHROPIC_API_KEY=sk-ant-...

# Run the test suite
npx tsx scripts/test-widget-creation-e2e.ts
```

### What It Tests

1. **Problem → Widget Inference**
   - GitHub PR tracking
   - Jira ticket tracking
   - Calendar event tracking
   - Slack mentions tracking
   - Linear issue tracking

2. **Error Handling**
   - Unknown providers (e.g., Stripe not yet implemented)
   - Vague problem descriptions
   - Empty input

3. **Validation Criteria**
   - Provider inference accuracy (target: 80%+)
   - Widget type accuracy
   - AI confidence scores (target: 70%+)
   - Response time (target: <5 seconds)

### Test Output

```
================================================================================
🧪 WIDGET CREATION E2E TEST SUITE
================================================================================

Test 1: GitHub PR tracking (explicit provider mention)
================================================================================
Problem: "I need to track GitHub pull requests"

📝 Extracted Intent:
  Problem Solved: Manual tracking of GitHub pull requests
  Pain Point: No centralized view of pull requests
  Goal: Consolidated dashboard view of all GitHub pull requests
  Expected Outcome: See all PRs at a glance without navigating to GitHub

🤖 AI Inference:
  Provider: github
  Type: pr-list
  Confidence: 100%

✅ PASSED

...

================================================================================
TEST SUMMARY
================================================================================

📊 Results:
   Total Tests: 5
   Passed: 5
   Failed: 0
   Accuracy: 100.0% ✅

📈 Metrics:
   Average Confidence: 96.0%
   Average Duration: 5437ms

🎯 Target Validation:
   ✅ Target met! Accuracy 100.0% >= 80%
```

### Exit Codes

- `0` - All tests passed (accuracy >= 80%)
- `1` - Tests failed (accuracy < 80% or errors)

---

## Test Results

Detailed test results are documented in:
- **`TEST_RESULTS_E2E.md`** - Full test report with analysis
- **`KNOWN_ISSUES.md`** - Issues discovered during testing

---

## Environment Setup

### Required Environment Variables

```bash
# Claude API key (required)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Get your API key from:
# https://console.anthropic.com/settings/keys
```

### Optional: Load from .env.local

The test scripts will automatically load environment variables from `.env.local` if present:

```bash
# Create .env.local file
cat > .env.local << EOF
ANTHROPIC_API_KEY=sk-ant-api03-...
EOF

# Run tests (will auto-load from .env.local)
npx tsx scripts/test-widget-creation-e2e.ts
```

---

## Troubleshooting

### "ANTHROPIC_API_KEY not found"

**Problem:** Environment variable not set

**Solution:**
```bash
# Option 1: Export environment variable
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx scripts/test-widget-creation-e2e.ts

# Option 2: Inline environment variable
ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-widget-creation-e2e.ts

# Option 3: Add to .env.local (persistent)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local
npx tsx scripts/test-widget-creation-e2e.ts
```

### "Rate limit exceeded"

**Problem:** Too many API calls in short time

**Solution:**
```bash
# Wait 60 seconds and retry
sleep 60
npx tsx scripts/test-widget-creation-e2e.ts
```

The test suite includes automatic delays between tests to avoid rate limits.

### "Accuracy 60% < 80%"

**Problem:** Tests are failing due to incorrect expectations

**Solution:**

1. Check if system prompt changed:
   ```bash
   git diff lib/ai/widget-creation-agent.ts
   ```

2. Review failed tests in output:
   ```
   ❌ Test 3: Calendar event tracking
      Provider: ✗ (expected: calendar, got: google-calendar)
   ```

3. Update test expectations if AI behavior changed intentionally:
   ```typescript
   // scripts/test-widget-creation-e2e.ts
   {
     problem: 'I want to see my calendar events',
     expectedProvider: 'google-calendar', // Updated expectation
     ...
   }
   ```

4. Or fix system prompt if AI behavior is wrong:
   ```typescript
   // lib/ai/widget-creation-agent.ts
   - **Google Calendar**: ...  // ❌ AI infers "google-calendar"
   + **Calendar**: ...          // ✅ AI infers "calendar"
   ```

### Response Time Too Slow (>10s)

**Problem:** Claude API taking too long

**Possible Causes:**
1. Network latency (check internet connection)
2. Claude API under heavy load (check status.anthropic.com)
3. `max_tokens` set too high

**Solution:**
```typescript
// lib/ai/widget-creation-agent.ts
const response = await prompt(userMessage, {
  maxTokens: 500, // Reduce from 1000
  ...
});
```

---

## Adding New Tests

### Test Case Structure

```typescript
{
  id: 6,
  problem: 'Your problem description here',
  expectedProvider: 'provider-name',
  expectedType: 'widget-type', // or undefined for any type
  description: 'Human-readable test name',
}
```

### Example: Adding Stripe Test

```typescript
// Add to TEST_CASES array in test-widget-creation-e2e.ts
{
  id: 6,
  problem: 'I need to track Stripe payments',
  expectedProvider: 'stripe',
  expectedType: 'payment-list',
  description: 'Stripe payment tracking',
},
```

### Example: Adding Error Test

```typescript
// Add to ERROR_TEST_CASES array
{
  problem: 'Help me with everything',
  description: 'Overly broad request',
  expectedBehavior: 'Asks clarifying questions',
},
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Widget Creation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npx tsx scripts/test-widget-creation-e2e.ts

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: scripts/TEST_RESULTS_E2E.md
```

### Required Secrets

Add to GitHub repository settings:
- `ANTHROPIC_API_KEY` - Your Claude API key

---

## Performance Benchmarks

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Accuracy | 80% | 100% | ✅ |
| Average Confidence | 70% | 96% | ✅ |
| Response Time | <5s | 5.4s | ⚠️ |
| Test Suite Duration | <60s | ~30s | ✅ |

---

## Related Documentation

- **Implementation Guide:** `docs/MONTH_5_IMPLEMENTATION_GUIDE.md`
- **Widget Agent:** `lib/ai/widget-creation-agent.ts`
- **Conversation Store:** `stores/conversation-store.ts`
- **Test Results:** `scripts/TEST_RESULTS_E2E.md`
- **Known Issues:** `scripts/KNOWN_ISSUES.md`

---

**Last Updated:** December 7, 2025
**Maintained By:** Agentic Dashboard Team
