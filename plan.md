# Agentic Dashboard: Implementation Plan

## 📍 Current Phase: Month 4 - AI Agent & Hardening

**Goal:** Add conversational widget creation and production-grade token management to enable autonomous dashboard evolution.

### Active Priorities

1. **Production Deployment** - Deploy to Vercel with full Supabase configuration and environment variables
2. **Token Expiry UI** - Visual warnings ("Token expires in 5m", "Re-auth needed") before widgets break
3. **AI Agent Prompting** - Design Claude API integration for natural language widget generation

### Immediate Task List

- [x] Implement background token refresh job (cron or polling) ✅
- [x] Add token expiry timestamp tracking to credentials table ✅
- [x] Configure Vercel Cron to trigger `/api/auth/refresh-tokens` every 5 minutes ✅
- [x] Implement Supabase Authentication (login/signup/logout/middleware) ✅
- [x] Implement Real-time Supabase Subscriptions for live widget updates ✅
- [ ] Deploy to production (Vercel + Supabase)
- [ ] Build expiry warning UI component (show in widget header or settings page)
- [x] User test: Widget persistence verification (manual, 5 min) ✅
- [ ] Design AI agent prompt chain (natural language → JSON schema validation → preview → deploy)
- [ ] Decide: Full NL ("I need X") OR guided wizard first?

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

### Month 4: AI Agent & Hardening (CURRENT)
**Week 13-14:** Token refresh automation + expiry warnings
**Week 15-16:** AI agent prompt engineering + JSON generation pipeline
**Decision Point:** Full NL ("I need X") OR guided multi-step wizard first? (Lean: Wizard)

### Month 5-6: Reliable Platform
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

**Month 4 (Part 1): Infrastructure & Production Readiness** ✅
- Vercel Cron job setup (`vercel.json`) for automatic token refresh every 5 minutes
- Supabase Authentication (email/password login, signup, logout, middleware)
- Real-time Supabase Subscriptions (live widget updates across browser tabs/sessions)
- Connection status indicator (online/offline/connecting)
- Fixed 7 TypeScript compilation errors (build passes with 0 errors)
- Updated documentation (README.md, changelog.md)
- **Achievement:** Full production-ready backend infrastructure

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

1. **Production Deployment** - Deploy to Vercel with environment variables, configure Supabase project, enable real-time replication
2. **Token Expiry UI** - Add visual warnings to credentials page + widget headers when tokens expiring soon
3. **AI Agent Design** - Create prompt chain for Claude API (natural language → JSON schema → validation → preview)

**Blocked on:** None

---

**Last Updated:** November 20, 2025 (Infrastructure & Production Readiness Complete)
