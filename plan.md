# Agentic Dashboard: Implementation Plan

## 📍 Current Phase: Month 5 Complete - Ready for Month 6

**Goal:** Month 5 Universal Orchestration Layer complete. Ready for user testing and Month 6 features.

### Month 5 Summary ✅

**All core features complete:**
- Problem-first wizard (100% AI accuracy, 7 providers)
- 5-stage flow (Problem → Clarifying → Visualization → Preview → Deploy)
- Mobile responsive UI (375px to 1024px+)
- Real-time streaming AI responses
- Event Mesh V2 with DocumentableEvent

### Completed Task List (Week 20-21) ✅

- [x] Stage 5 deploy success UX with confetti + dashboard navigation
- [x] Back navigation preserves wizard state (header button, state preservation)
- [x] Retry mechanism for failed deploys with error display
- [x] Register Stripe + Twilio in provider registry
- [x] Add Stripe + Twilio to wizard AI prompt examples
- [x] Mobile responsive wizard UI (real components, responsive grids, touch targets)
- [ ] User testing: end-to-end with real users - deferred to Month 6

### Recently Completed (Week 17-19) ✅

- [x] Claude API client (streaming, structured outputs)
- [x] Event Mesh V2 (graph traversal, userIntent, persistence)
- [x] Problem-first wizard (100% accuracy, 96% avg confidence)
- [x] 5-stage wizard UI (Problem → Clarifying → Visualization → Preview → Deploy)
- [x] Stripe + Twilio adapters (code complete, pending integration)

---

## 🏗 Architecture Reference

### Tech Stack
- **Framework:** Next.js 16.0.3 (App Router), deployed on Vercel
- **UI:** shadcn/ui + Radix UI + Tailwind CSS + react-grid-layout
- **State & Event Mesh:** Zustand (pub/sub pattern)
- **Database & Auth:** Supabase (PostgreSQL + Vault + RLS)
- **AI:** Claude API (@anthropic-ai/sdk ^0.68.0)

### Key Components

**Event Mesh** - Zustand pub/sub for widget interconnection (THE DIFFERENTIATOR)
```typescript
publish('github.pr.selected', {jiraTicket: 'SCRUM-5'}, 'github-widget');
useEventSubscription('github.pr.*', (data) => setFilter(data.jiraTicket));
```

**Problem-First Wizard** - AI-powered widget creation
```
Stage 1: "What problem are you solving?" → AI infers provider
Stage 2: Clarifying questions → refine config
Stage 3: Visualization selection → list/table/cards/metric/chart
Stage 4: Preview → live widget render
Stage 5: Deploy → create widget instance
```

**Provider Adapters** - 7 total (GitHub, Jira, Linear, Slack, Calendar, Stripe, Twilio)
- REST + GraphQL support
- OAuth 2.0 + PAT fallback
- Automatic token refresh (15 min before expiry)

---

## 📅 Roadmap

### Month 5: Universal Orchestration Layer ✅ COMPLETE

**Achievements:**
- Problem-first wizard with 100% AI accuracy
- 7 providers: GitHub, Jira, Linear, Slack, Calendar, Stripe, Twilio
- Mobile responsive wizard (375px to 1024px+)
- Real components: VisualizationSelector, WidgetPreview with schema editing

**Pending Decision (Month 6):** Action Confirmation UX for Stripe/Twilio actions
- Per-action confirmation? (safer, more clicks)
- One-time workflow approval? (faster, requires trust)
- **Lean:** Per-action until user trust is established

### Month 6-7: Reliable Platform
- [ ] Collaboration & sharing (B2B features)
- [ ] Widget marketplace
- [ ] Real-time Supabase subscriptions at scale
- [ ] Full observability dashboard (dogfood our own tool)

### Foundation (Completed)

**Month 1-2:** Magic POC + Safety Net ✅
- Event Mesh (Zustand pub/sub), Checkpoint Manager (Cmd+Z), Event Flow Debugger
- Demo: Click PR #1 → Jira auto-filters to SCRUM-5

**Month 3:** The Factory ✅
- Backend API Proxy (5 providers in 75 min), OAuth 2.0, UniversalDataWidget
- Achievement: 10-15 min per widget (goal was <2 hours)

**Month 4:** AI Agent Design & Hardening ✅
- Token Expiry Warning System, Production docs (6,800+ lines), Supabase Auth
- Decision: Guided wizard approach (implemented in Month 5)

**Month 5 Weeks 17-19:** Universal Orchestration Foundation ✅
- Claude API client, Event Mesh V2, Problem-first wizard (100% accuracy)
- Stripe + Twilio adapters (code complete)

---

## 📝 Implementation Notes

### Provider Adapter Pattern (for Stripe/Twilio integration)
```typescript
// lib/providers/registry.ts - add new providers
import { StripeAdapter } from './stripe';
import { TwilioAdapter } from './twilio';

export const providers = {
  github: new GitHubAdapter(),
  stripe: new StripeAdapter(),
  twilio: new TwilioAdapter(),
  // ...
};
```

### AI Prompt Update (for Stripe/Twilio recognition)
```typescript
// Update widget-creation-agent.ts examples to include:
// - "track payments" → stripe
// - "send SMS alerts" → twilio
```

### OAuth Token Lifespans
```
GitHub:     No expiration
Jira/Google: 1 hour → Refresh required
Linear:     24 hours → Refresh required
Slack:      No expiration
Stripe:     API keys (no expiration)
Twilio:     Auth tokens (no expiration)
```

---

## 📊 Success Metrics (Week 20)

- **Deploy Flow:** User completes wizard → widget appears on dashboard in <3 clicks
- **Error Recovery:** User can go back and edit any previous answer
- **Domain Expansion:** Stripe + Twilio appear in AI suggestions for relevant problems
- **Mobile:** Wizard usable on tablet (768px+)

---

## 🎯 Next 3 Steps

1. **User Testing** - End-to-end testing with real users, collect feedback on wizard UX
2. **Production Deployment** - Deploy Month 5 features, monitor usage and performance
3. **Month 6 Planning** - Collaboration & sharing features, widget marketplace exploration

**Blocked on:** None

---

**Last Updated:** November 25, 2025 (Month 5 complete, mobile responsive sprint done)
