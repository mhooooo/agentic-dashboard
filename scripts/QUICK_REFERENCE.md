# E2E Testing - Quick Reference Card

**Last Updated:** December 7, 2025

---

## Run Tests

```bash
# Basic usage
ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/test-widget-creation-e2e.ts

# With .env.local file
npx tsx scripts/test-widget-creation-e2e.ts
```

---

## Current Status

✅ **5/5 tests passing** (100% accuracy)
✅ **Build passing** (0 TypeScript errors)
⚠️ **2 known issues** (documented in KNOWN_ISSUES.md)

---

## Test Coverage

### Core Providers (5)
- ✅ GitHub (100% confidence)
- ✅ Jira (95% confidence)
- ✅ Calendar (95% confidence)
- ✅ Slack (95% confidence)
- ✅ Linear (95% confidence)

### Error Handling (3)
- ✅ Unknown providers
- ✅ Vague descriptions
- ✅ Empty input

---

## Known Issues

### Issue #1: Calendar Provider Name 🔴 HIGH PRIORITY

**Problem:** AI returns `google-calendar`, system expects `calendar`

**Fix:**
```typescript
// lib/ai/widget-creation-agent.ts:86
- **Google Calendar**: Meetings, events...
+ **Calendar**: Meetings, events... (Google Calendar)
```

**Time:** 10 minutes
**Blocks:** Week 18 deployment

---

### Issue #2: Response Time 🟡 LOW PRIORITY

**Problem:** 5.4s average (target: <5s)

**Fix:**
```typescript
// lib/ai/widget-creation-agent.ts
maxTokens: 500, // Reduce from 1000
```

**Time:** 5 minutes
**Impact:** 1-2s faster

---

## File Locations

```
scripts/
├── test-widget-creation-e2e.ts     # Test script
├── TEST_RESULTS_E2E.md             # Detailed results
├── KNOWN_ISSUES.md                 # Issues + fixes
├── README.md                       # Full documentation
└── QUICK_REFERENCE.md              # This file
```

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key not found" | Export `ANTHROPIC_API_KEY` |
| "Rate limit" | Wait 60s and retry |
| "Accuracy < 80%" | Check KNOWN_ISSUES.md |
| "Response timeout" | Check internet connection |

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Accuracy | 80% | **100%** ✅ |
| Confidence | 70% | **96%** ✅ |
| Response Time | <5s | **5.4s** ⚠️ |

---

## Next Steps

1. ⚠️ Fix calendar provider name (10 min)
2. ✅ Create API routes (Week 18)
3. ✅ Wire wizard to API (Week 18)
4. 💡 Optimize response time (Week 19)

---

## Contact

Issues? Questions?
- See: `scripts/README.md` (full docs)
- See: `scripts/KNOWN_ISSUES.md` (known bugs)
- See: `scripts/TEST_RESULTS_E2E.md` (test analysis)
