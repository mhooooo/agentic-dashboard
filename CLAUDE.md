# Agentic Dashboard

*An AI-powered dashboard where widgets interconnect through real-time Event Mesh, creating a "magical" 10x experience that static builders cannot replicate.*

---

## Why This Exists

**The problem:** Traditional dashboard builders (Retool, Grafana) create isolated widgets. Users manually configure connections, creating friction and limiting the "smart" experience.

**This approach:** Widgets communicate through a **real-time Event Mesh** (pub/sub pattern). Click a GitHub PR → Jira widget auto-filters instantly. AI agent manages complexity. Interface is conversational-first.

**Not this approach:**
- Not drag-and-drop UI builders (conversation is primary interface)
- Not isolated widgets (everything connects via Event Mesh)
- Not static configuration (system learns behavior)
- Not infrastructure-first (ship the "magic" before heavy backend)

---

## Architecture Decisions

### Event Mesh as Core Differentiator
- **Choice:** Zustand-based pub/sub where widgets publish events (`github.pr.selected`) and subscribe to patterns (`github.*`)
- **Why:** This IS our 10x differentiator. Static dashboards cannot replicate real-time, zero-config interconnection. It's the "magical moment" that proves our thesis.
- **Trade-off:** Debugging complexity and potential broken states. Accepted by building Safe Mode toggle + Checkpoint Manager (Cmd+Z undo).
- **When to revisit:** If event propagation becomes performance bottleneck at >100 widgets, or debugging is too complex for users.

### Declarative JSON Factory Over Code Generation
- **Choice:** UniversalDataWidget system using JSON schemas (`WidgetDefinition`) with JSONPath data transformation
- **Why:** Covers 80% of widget use cases with zero security risk. Takes 10-15 min per widget vs days for hardcoded components. GraphQL and REST APIs both supported seamlessly.
- **Trade-off:** Cannot support highly custom visualizations (3D charts, WebGL). Acceptable for first 6-12 months.
- **When to revisit:** When users consistently request visualizations JSON cannot express, or when we have capacity to build secure sandbox (Month 7+).
- **Validation:** Built 5 diverse providers (GitHub, Jira, Linear, Slack, Calendar) in 75 minutes. Promise validated: "hours not days."

### Supabase Backend (PostgreSQL + Vault + Auth)
- **Choice:** Supabase over Firebase/AWS/custom
- **Why:** Built-in RLS (user isolation), Vault for API key encryption, real-time subscriptions, open-source PostgreSQL.
- **Trade-off:** Less flexibility than custom backend, but 90% faster to ship. Dev mode uses in-memory storage with global variable pattern for hot-reload persistence.
- **When to revisit:** If need custom features Supabase doesn't support, or pricing becomes prohibitive at scale.

### Next.js 16 App Router + Vercel
- **Choice:** Next.js 16 with App Router, deployed on Vercel
- **Why:** Server Components reduce bundle size, API routes provide secure backend proxy, zero-config Vercel deployment.
- **Trade-off:** Coupled to Vercel ecosystem, but deployment speed is worth it. Turbopack bundling is aggressive - code must be defensive about browser/Node.js differences.
- **When to revisit:** If need more infrastructure control or costs exceed self-hosted alternatives.

### OAuth 2.0 as Primary Auth (Nov 20, 2025)
- **Choice:** OAuth 2.0 flows for all 5 providers (GitHub, Jira, Linear, Slack, Google Calendar) with fallback to manual PATs
- **Why:** 4x better UX (~30sec vs ~2min), automatic token refresh prevents widget breakage, industry-standard security (PKCE, CSRF protection).
- **Trade-off:** Complex setup (each provider requires app registration, callback URLs, scopes). Worth it for production UX.
- **When to revisit:** If OAuth setup friction becomes #1 user complaint, or if manual PATs prove more reliable.

---

## Development Constraints

**Differentiator-First Methodology**
- Ship the "magic" (Event Mesh interconnection) before infrastructure
- Validate core thesis with users before investing in scale/security features
- Build safety nets (undo, safe mode) to enable experimentation, not restrictions

**Security Isolation**
- Widget secrets never reach client
- All external API calls through Next.js backend proxy
- Supabase Vault encrypts secrets at rest (when available; dev mode uses in-memory)
- RLS enforces user isolation

**Conversational Interface Priority**
- Primary creation interface is conversation, not UI forms
- Users say "I need X" rather than clicking through wizards
- Agent guides users through setup step-by-step

**Progressive Disclosure**
- Start simple (2-3 widgets), grow organically
- Don't overwhelm with 50 widget options day one
- Agent suggests widgets based on observed behavior (future)

---

## Success Metrics

### Foundation (Completed Phases)

**Month 1: Magic POC** ✅
- ✅ Magic Moment: <5min landing → first interconnection
- ✅ Interconnection: >60% connect 2+ widgets
- ✅ Qualitative: "Wait, it just filtered automatically?!"

**Month 2: Safety Net** ✅
- ✅ Broken state: <5% users encounter broken dashboard
- ✅ Recovery: <30s to recover from broken state (Cmd+Z)
- ✅ Understanding: Event debugger helps users understand interconnections

**Month 3: The Factory** ✅ (Exceeded expectations)
- ✅ Development: <2 hours per widget (actual: 10-15 min per widget!)
- ✅ Adoption: 5 providers using declarative factory (GitHub, Jira, Linear, Slack, Calendar)
- ✅ Security: Zero incidents from generated widgets
- ✅ GraphQL support: Works without modifications (Linear provider validated)

**Month 4: AI Agent & Hardening** ✅
- ✅ Token Expiry Warning System (real-time countdown badges, warning cards)
- ✅ Production Documentation (6,800+ lines)
- ✅ OAuth E2E Testing Plan (5 test suites, 40+ verification items)
- ✅ Supabase Authentication + Real-time Subscriptions
- ✅ Decision: Guided wizard approach for AI agent

**Month 5 Weeks 17-19: Universal Orchestration Foundation** ✅
- ✅ Claude API client: 5/5 tests passing (streaming, structured outputs)
- ✅ Event Mesh V2: 6/6 tests passing (graph traversal, userIntent capture)
- ✅ Problem-first wizard: 100% accuracy (5/5 providers, 96% avg confidence)
- ✅ Visualization UI: Stage 3-4 components (~4,110 lines)
- ✅ Build passes with 0 TypeScript errors

---

## Current Phase

**Focus:** Month 5 - Universal Orchestration Layer

**Vision Evolution:**
- From: Interconnected dashboard with Event Mesh
- To: Universal workflow orchestration with self-documentation
- Key insight: "The system explains itself while you build it"

This month marks a fundamental shift in positioning. We're no longer building just a "dashboard" — we're building a **Universal Orchestration Layer** for SaaS APIs. The goal: enable non-technical users to orchestrate complex multi-service workflows ("When payment succeeds in Stripe → create Jira ticket → send Slack notification → update Google Sheet") through conversational interface, with Event Mesh handling real-time propagation.

**Why This Matters:**
- **Current state:** Users connect services manually (Zapier, IFTTT) with rigid "if-this-then-that" logic. Configuration is complex, debugging is painful, and each workflow is isolated.
- **Our approach:** Conversational problem description → AI generates workflow → Event Mesh executes in real-time → Visual feedback shows what happened. The "glass factory" pattern: simple output interface, sophisticated backend intelligence.
- **Key insight:** Dashboards are just one visualization of the orchestration layer. The real power is the Event Mesh + AI agent combination, which can drive any output (dashboards, webhooks, automations, alerts).

**Architecture Decision: Problem-First Wizard (Nov 24, 2025)**
- **Choice:** Stage 1 asks "What problem are you solving?" not "What provider?" Captures user intent naturally (problemSolved, painPoint, goal, impactMetric). Gives Journalist Agent rich material for storytelling.
- **Why:** Technical-first approach ("Choose a widget...") creates decision paralysis. Problem-first approach ("I need to track late payments") lets AI suggest optimal solution.
- **Trade-off:** AI inference may be inaccurate (70-80% expected). Mitigated by clarifying questions and user overrides. Requires sophisticated AI prompt engineering to map problems → technical implementations. Acceptable because it's our core differentiator.
- **When to revisit:** If <60% accuracy in problem → widget mapping, or if AI accuracy <70% on problem → solution mapping, or if users prefer browsing widget catalog.
- **Validation:** See RFC-001 (2,500 lines) for complete design rationale and user testing plan.

**Architecture Decision: Glass Factory Pattern (Nov 24, 2025)**
- **Choice:** Simple user-facing interface ("When X happens, do Y") backed by sophisticated Event Mesh orchestration
- **Why:** Users want outcomes, not configuration. The complexity should be invisible. Like a glass factory: you see beautiful output, not the furnace complexity behind the scenes.
- **Trade-off:** Requires building intelligent agent that understands user intent and translates to event subscriptions, API calls, and data transformations. Significant AI investment up-front.
- **When to revisit:** If maintaining the abstraction layer becomes more complex than exposing raw controls to users.
- **Implementation:** See `docs/MONTH_5_IMPLEMENTATION_GUIDE.md` for technical architecture.

**Architecture Decision: Glass Factory with Simple Output (Nov 24, 2025)**
- **Choice:** Twitter threads only (simple output) with knowledge graph backend (sophisticated)
- **Why:** Ship fast, prove concept, iterate on quality. "You build features → 5 minutes later → shareable content explaining it."
- **Trade-off:** Users may want LinkedIn/blog immediately. Acceptable for MVP, deferred to Month 6.
- **When to revisit:** When 10+ users request multi-format generation.

**Architecture Decision: DocumentableEvent with userIntent (Nov 24, 2025)**
- **Choice:** Extend Event Mesh with userIntent field (problemSolved, painPoint, goal, expectedOutcome, impactMetric)
- **Why:** System knows "what" but not "why." Without motivation, Journalist Agent can't tell compelling stories.
- **Trade-off:** Requires capturing intent during widget creation. Zero added friction via "Trojan Horse" question.
- **When to revisit:** If userIntent extraction quality <80%.

**Key Deliverables:**
1. **Problem-First Widget Wizard** - Conversational interface that discovers user's problem before suggesting solutions. 5-stage flow: (1) Problem discovery, (2) Clarifying questions, (3) Visualization, (4) Preview, (5) Deploy. Uses Claude Sonnet 4.5 for natural language understanding.

2. **Glass Factory MVP** - Two "showcase" orchestrations that demonstrate zero-config magic:
   - **Stripe → Jira → Slack:** "When payment succeeds, create Jira ticket and notify #sales" (demonstrates B2B SaaS workflow)
   - **Calendar → SMS → Dashboard:** "Remind me 10min before meetings via SMS" (demonstrates personal productivity workflow)
   - Both implemented as declarative JSON with `DocumentableEvent` schema for debugging

3. **Stripe + Twilio Integration** - Expand beyond "read-only" APIs to "action-taking" APIs. Enables workflows that DO things (send SMS, charge cards) not just display data. Security-critical: require explicit user confirmation before executing actions.

4. **DocumentableEvent Schema** - Standardized event format for Event Mesh that makes debugging trivial. Every event carries: `eventName`, `source`, `timestamp`, `payload`, `relatedEvents`. Enables "explain this workflow" feature in Event Debugger.

5. **Self-Documentation Magic** - "Build feature → 5 min later → shareable content." Twitter threads only for MVP. Knowledge graph builder with simple ID matching. Journalist Agent converts event history to narrative.

**Pending Decisions:**
- **Action Confirmation UX:** For workflows that take actions (charge Stripe, send SMS), require per-action confirmation OR one-time workflow approval? Lean toward per-action until we build user trust. (Relevant for Week 20 Stripe/Twilio integration)
- **Event Mesh Scaling:** Current Zustand pub/sub is in-memory (lost on page refresh). Need persistent event log for "explain what happened" debugging. Use Supabase real-time OR build custom event store? Defer until Month 6 unless becomes blocking.

**Resolved Decisions (archived):**
- ✅ Token Refresh: Proactive background job (15 min before expiry) - Nov 20
- ✅ Conversational Agent: Problem-first guided wizard - Nov 24

**Status: Week 20 Active (Dec 22-28, 2025)**
- Week 17-19 complete ✅ - Foundation + Backend + Visualization UI all shipped
- Problem-first wizard: 100% accuracy (5/5 providers, 96% avg confidence)
- All tests passing, 0 TypeScript errors
- Ready for Week 20 polish and domain expansion

**Week 20 Priorities:**
1. **Stage 5 Polish** - Deploy flow completion, success state, dashboard navigation
2. **Error Recovery** - Back navigation preserves state, edit previous answers, retry mechanisms
3. **Mobile Responsive** - Wizard UI polish for tablet/mobile
4. **Domain Expansion** - Stripe + Twilio providers (proves universal orchestration)
5. **User Testing** - End-to-end testing with real users

**Reference Documents:**
- **RFC-001:** `/docs/rfcs/RFC-001-MONTH-5-UNIVERSAL-ORCHESTRATION.md` (complete design)
- **Implementation Guide:** `/docs/MONTH_5_IMPLEMENTATION_GUIDE.md` (step-by-step)
- **Event Mesh V2:** `/docs/EVENT_MESH_V2.md` (DocumentableEvent architecture)
- **Stripe Integration:** `/docs/STRIPE_INTEGRATION.md` (OAuth + webhooks)
- **Twilio Integration:** `/docs/TWILIO_INTEGRATION.md` (SMS + calls)

---

## Known Tensions

### Speed vs. Security
- **Pressure A:** Ship fast to validate thesis
- **Pressure B:** Secure API keys, prevent XSS/injection
- **Resolution:** Backend proxy + Supabase Vault (with dev mode fallback), defer code generation. Ship fast with security boundaries in place.

### Flexibility vs. Simplicity
- **Pressure A:** Support any widget users imagine (custom code, 3D charts)
- **Pressure B:** Keep system simple, debuggable, safe
- **Resolution:** Declarative JSON for 80% of cases. Defer code generation for edge cases. Prioritize simplicity until users demand more.

### Event Mesh Power vs. Broken States
- **Pressure A:** Let widgets freely publish/subscribe to enable "magic"
- **Pressure B:** Prevent cascading failures, infinite loops, broken dashboards
- **Resolution:** Safe Mode toggle, Checkpoint Manager (Cmd+Z), Event Flow Debugger. Give users power + undo, not restrictions.

### OAuth Setup Complexity vs. UX
- **Pressure A:** OAuth provides 4x faster connection (~30sec vs ~2min)
- **Pressure B:** Each provider requires app registration, callback URLs, environment variables
- **Resolution:** Comprehensive setup guides (`OAUTH_SETUP.md`, `ADDING_NEW_PROVIDERS.md`). Fallback to manual PATs for power users. Accept setup complexity for long-term UX wins.

---

## Anti-Patterns & Lessons

### Architecture & Design Patterns

**Defer complexity, prove magic first:**
- (Nov 13) Deferred conversational agent to Month 4, code generation indefinitely. Event Mesh is the differentiator, not conversation. Declarative JSON covers 80% of cases with 0% security risk.
- (Nov 19) JSONPath (`$.user.login`) + template strings (`"{{firstName}} {{lastName}}"`) beat code generation. Simple schema wins for maintainability.

**ProviderAdapter pattern is wildly successful:**
- (Nov 19) Added 3 providers (Linear, Slack, Calendar) in 75 minutes. GraphQL works seamlessly. Token format validation (`ghp_`, `lin_api_`, `xoxb-`, `ya29.`) catches errors early. Error format standardization across different API styles (status codes vs `ok: false` vs nested errors).

**Problem-first AI validated:**
- (Dec 7-21) AI achieved 100% accuracy (5/5 providers, 96% avg confidence) mapping problems → widgets. Confidence scoring enables asking clarifying questions when uncertain (30% confidence) instead of guessing wrong.

### OAuth & Security

**Database is a strict gatekeeper (Nov 20):**
- **The Bouncer Problem**: CHECK constraints reject unknown providers. **Fix:** Update DB schema FIRST.
- **The Double-Insert Problem**: INSERT fails on second save. **Fix:** Use UPSERT.
- **The OAuth Token Problem**: Manual PATs have prefixes, OAuth tokens don't. **Fix:** Accept both formats.
- **Order matters:** (1) Update DB schema → (2) Deploy code → (3) Users connect.

**Modern OAuth requires layers (Nov 20):** PKCE prevents code interception, state prevents CSRF, httpOnly cookies prevent XSS, refresh tokens handle expiration. Don't skip security to ship faster. Server-side proactive refresh (15 min before expiry) beats client-side "refresh on 401."

### JavaScript/TypeScript Gotchas

**The `||` vs `??` bug (CRITICAL - Nov 20):**
```typescript
// WRONG: 0 is falsy → evaluates to Infinity
y: widget.layout?.y || Infinity

// CORRECT: only null/undefined replaced
y: widget.layout?.y ?? Infinity
```
When 0 is valid, NEVER use `||`. This cost 30+ minutes - positions saved correctly but loaded wrong.

**`global` vs `globalThis` (Dec 21):** `global` is Node.js-only, crashes browser with "global is not defined." Always use `globalThis` for cross-environment code. Turbopack bundles lib/ files for client even if only server imports them.

**Next.js 15+ params are Promises (Nov 20):**
```typescript
// Must await params in dynamic routes
const { widgetId } = await params;
```
TypeScript won't catch this - it's a runtime error.

### Environment & Build

**Env var loading (Nov 19, Dec 7):**
- System env vars override `.env.local`. Check `printenv` for conflicts.
- Node.js scripts don't auto-load `.env.local`. Use: `ANTHROPIC_API_KEY=... npx tsx test.ts`

**Dev mode fallback pattern (Nov 19):**
```typescript
const devCredentialsStore = globalThis.devCredentialsStore ?? new Map();
if (process.env.NODE_ENV === 'development') {
  globalThis.devCredentialsStore = devCredentialsStore;
}
```
Global variable pattern prevents hot-reload data loss.

**Build validation is non-negotiable:** Fix all TypeScript errors BEFORE deployment. Zero-error builds prevent production surprises.

### AI Integration Patterns (Dec 14-21)

**SSE streaming for chat:** JSON response for Stage 1 (needs parsing), SSE streaming for Stages 2-5 (typewriter effect). Pattern: `data: {"text": "chunk"}\n\n` with `data: {"done": true}\n\n`.

**Provider name consistency:** AI prompt examples MUST match database enum values exactly. "Google Calendar" in prompt vs "calendar" in DB = broken. Test E2E before deployment.

**Streaming in React:** `ReadableStream.getReader()` + `TextDecoder`. Buffer partial lines until `\n\n`. Always include `AbortController` for cleanup.

### Sub-Agent Orchestration (Nov 24 - Dec 21)

**Pattern validated across 4 sprints:** Delegate tasks to isolated sub-agents instead of linear execution. All tasks explore simultaneously. Main agent stays clean.

**Test-driven validation:** All sub-agents include test suites. Tests validate correctness before integration.

**Production docs are non-negotiable:** 6,800+ lines prevents "tribal knowledge" problem.

---

## File Maintenance Protocol

**plan.md** - Update after significant tasks (progress, blockers, next 5 steps)
**changelog.md** - Log bugs/fixes/changes as they happen (date, what changed, why, what it affected)
**README.md** - Update only for critical execution changes (environment setup, major architecture shifts)
**CLAUDE.md** - This file. Update when major architectural decisions made, constraints discovered, or phases transition.

**Rule:** Before marking any task complete, check if these files need updates.

---

**Last Updated:** November 25, 2025 (ContextKeeper grooming - Week 20 active)
**Next Decision Point:** Week 20 (Dec 22-28) - Action Confirmation UX decision needed before Stripe/Twilio integration.
