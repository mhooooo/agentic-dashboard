# Agentic Dashboard: Implementation Plan

## 📍 Current Phase: Month 5 - Universal Orchestration Layer

**Goal:** Transform from interconnected dashboard to universal workflow orchestration with self-documentation.

### Active Priorities

1. **Week 18 Backend Integration** - Connect wizard UI to Claude API, implement streaming responses
2. **Week 19 Visualization UI** - Build Stage 3 visualization selection, Stage 4 preview with live rendering
3. **Week 20 Domain Expansion** - Add Stripe + Twilio providers, prove universal orchestration beyond dev tools

### Immediate Task List (Week 18: Dec 8-14)

- [x] Claude API Client Setup ✅
- [x] Event Persistence Layer (Event Mesh V2) ✅
- [x] Problem-First Wizard System Prompt ✅
- [x] Conversation State Management (Zustand store) ✅
- [x] Wizard UI Foundation (chat interface) ✅
- [ ] API Route: POST /api/ai/widget-creation/chat (streaming)
- [ ] Wire wizard UI to Claude API client
- [ ] Test end-to-end: problem → AI inference → widget creation
- [ ] Validate 80%+ accuracy on widget inference
- [ ] Deploy Week 17 foundation to production

---

## 🏗 Architecture Reference

### Tech Stack
- **Framework:** Next.js 15 (App Router), deployed on Vercel
- **UI:** shadcn/ui + Radix UI + Tailwind CSS + react-grid-layout
- **State & Event Mesh:** Zustand (pub/sub pattern)
- **Database & Auth:** Supabase (PostgreSQL + Vault + RLS)
- **AI:** Claude API (planned for Month 4+)

### Key Components

**Event Mesh** - Zustand pub/sub for widget interconnection (THE DIFFERENTIATOR)
```typescript
publish('github.pr.selected', {jiraTicket: 'SCRUM-5'}, 'github-widget');
useEventSubscription('github.pr.*', (data) => setFilter(data.jiraTicket));
```

**UniversalDataWidget** - JSON-based widget factory (10-15 min per widget vs days for hardcoded)
```json
{
  "dataSource": {"provider": "github", "endpoint": "/repos/..."},
  "fields": [{"name": "title", "path": "$.title", "type": "string"}],
  "layout": {"type": "list", "fields": {...}},
  "interactions": {"onSelect": {"eventName": "github.pr.selected"}}
}
```

**Backend API Proxy** - Secure credential isolation (Next.js API routes → external APIs)
- Provider adapters: GitHub, Jira, Linear, Slack, Calendar
- OAuth 2.0 + manual PAT support
- In-memory dev mode fallback (global variable pattern for hot-reload persistence)

**Safety Net** - Checkpoint Manager (Cmd+Z undo/redo), Safe Mode toggle, Event Flow Debugger

### Database Schema (Core Tables)

```sql
-- users (Supabase Auth)
-- widget_templates: Catalog of available widgets
-- widget_instances: User's widgets (user_id, template_id, position, config)
-- user_credentials: Encrypted API keys/OAuth tokens (Supabase Vault)
-- conversation_history: Agent memory (planned Month 4+)
```

---

## 📅 Roadmap

### Month 5: Universal Orchestration Layer (CURRENT - Dec 1-28, 2025)

**RFC:** [RFC-001](docs/rfcs/RFC-001-MONTH-5-UNIVERSAL-ORCHESTRATION.md)

**Vision:** Transform from interconnected dashboard to universal workflow orchestration with self-documentation

**Goal:** Ship problem-first wizard + Glass Factory MVP (Twitter threads)

**Week 17-19 (70% effort): Problem-First Widget Wizard**
- Stage 1: "What problem are you solving?" (Trojan Horse question)
- AI inference: Problem → widget suggestion
- Intent extraction: problemSolved, painPoint, goal, impactMetric
- 5-stage conversation: Problem → Clarifying → Visualization → Preview → Deploy

**Week 17-19 (30% effort): Glass Factory Foundation**
- DocumentableEvent schema with userIntent field
- Event persistence (event_history table)
- Knowledge graph builder (simple ID matching)
- Journalist Agent (Twitter threads only)
- "Build feature → 5 min later → shareable content"

**Week 20: Domain Expansion**
- Stripe provider (payments)
- Twilio provider (SMS notifications)
- Example automation: payment.received → SMS notification
- Proves: Universal Orchestration works beyond dev tools

**Deliverables:**
1. Problem-first wizard (conversational, captures intent)
2. Glass Factory MVP (Twitter threads with knowledge graph)
3. Self-documentation magic (build → 5 min → shareable content)
4. Domain flexibility proof (Stripe + Twilio)

**Success Metrics:**
- Widget creation: <5 min (vs 15 min manual)
- Intent capture: 100% automatic (no separate form)
- Glass Factory: User generates + shares Twitter thread
- Domain flexibility: Stripe + Twilio working end-to-end

**Timeline:** 4 weeks (Dec 1-28, 2025)
**Complexity:** Medium (2 AI agents, database schema, 2 new providers)
**Differentiator:** System explains itself while you build it

### Month 6-7: Reliable Platform
- [ ] Collaboration & sharing (B2B features)
- [ ] Widget marketplace
- [ ] Real-time Supabase subscriptions
- [ ] Full observability dashboard (dogfood our own tool)
- [ ] Production deployment & scaling

### Foundation (Completed)

**Month 1: Magic POC** ✅
- Event Mesh implementation (Zustand pub/sub)
- GitHub + Jira hardcoded widgets with mock data
- Dashboard with drag-and-drop layout
- Safe Mode toggle
- Demo: Click PR #1 → Jira auto-filters to SCRUM-5

**Month 2: Safety Net** ✅
- Checkpoint Manager (last 5 snapshots, Cmd+Z/Cmd+Shift+Z)
- Event Flow Debugger (real-time event log + subscriptions)
- Widget versioning system (auto-upgrade migrations)
- E2E test suite (Playwright, 22/22 tests passing)

**Month 3: The Factory** ✅ (Exceeded expectations!)
- Backend API Proxy (5 provider adapters in 75 min)
- OAuth 2.0 for all providers (PKCE, CSRF, refresh tokens)
- OAuth Token Refresh System (automatic background refresh 15 min before expiry)
- UniversalDataWidget system (~900 LOC)
- Real API integration (Event Mesh works with live data)
- Widget persistence (3 critical bugs fixed Nov 20)
- **Achievement:** 10-15 min per widget (goal was <2 hours)
- **Validation:** GraphQL support works seamlessly (Linear provider)

**Month 4: AI Agent & Hardening** ✅ (Production Launch Ready!)
- Token Expiry Warning System (real-time countdown badges, warning cards, global banner)
- AI Agent Architecture Design (complete design doc, 5-stage guided wizard approach)
- Production Documentation (6,800+ lines: deployment guide, known issues, OAuth troubleshooting)
- OAuth E2E Testing Plan (5 test suites, 40+ verification items)
- Build fixes (resolved TypeScript errors, 0 errors in build)
- Vercel Cron job setup (`vercel.json`) for automatic token refresh every 5 minutes
- Supabase Authentication (email/password login, signup, logout, middleware)
- Real-time Supabase Subscriptions (live widget updates across browser tabs/sessions)
- Connection status indicator (online/offline/connecting)
- **Achievement:** Production-ready infrastructure + comprehensive documentation + UX enhancements
- **Decision:** Guided wizard approach for AI agent (Month 5 implementation)

---

## 📝 Implementation Notes

### OAuth Token Lifespans (Critical for Month 4)
```
GitHub:     No expiration (until revoked)
Jira:       3600 seconds (1 hour) → Refresh required
Linear:     86400 seconds (24 hours) → Refresh required
Slack:      No expiration (until revoked)
Google:     3600 seconds (1 hour) → Refresh required
```

**Action:** Build proactive refresh (15 min before expiry) to prevent widget breakage.

### Next.js 15 Gotchas
```typescript
// Dynamic route params are now Promises
export async function DELETE(request: Request, { params }: { params: Promise<{widgetId: string}> }) {
  const { widgetId } = await params; // MUST await
}
```

### JavaScript Falsy Values (Critical Bug Nov 20)
```typescript
// WRONG (0 is falsy → evaluates to Infinity)
y: widget.layout?.y || Infinity

// CORRECT (only null/undefined replaced)
y: widget.layout?.y ?? Infinity
```

### Provider Adapter Pattern (for new providers)
```typescript
export const newProviderAdapter: ProviderAdapter = {
  validateCredentials: async (token) => { /* validate format + test API call */ },
  makeRequest: async (endpoint, method, headers, body) => { /* add auth, transform response */ },
  // Token format validation (e.g., 'ghp_' prefix for GitHub)
  // Error standardization (status codes → ApiError objects)
};
```

---

## 📊 Success Metrics (Month 4)

- **Token Refresh:** <1% of users experience widget breakage from expired tokens
- **AI Agent Accuracy:** >80% of generated JSON widgets pass validation on first attempt
- **User Testing:** Widget persistence works for 100% of testers (0 position loss bugs)

---

## 🎯 Next 3 Steps

1. **Production Deployment** - Deploy to Vercel with environment variables, configure Supabase project, update OAuth callback URLs
2. **Post-Deploy Verification** - Run OAuth smoke tests (Test Suite A), monitor Vercel cron logs, validate token refresh
3. **Month 5 Kickoff** - Begin AI agent guided wizard implementation (Claude API client + conversation state)

**Blocked on:** None

---

**Last Updated:** November 24, 2025 (Month 5 Documentation Complete)
