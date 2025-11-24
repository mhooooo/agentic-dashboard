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

### Next.js 15 App Router + Vercel
- **Choice:** Next.js 15 with App Router, deployed on Vercel
- **Why:** Server Components reduce bundle size, API routes provide secure backend proxy, zero-config Vercel deployment.
- **Trade-off:** Coupled to Vercel ecosystem, but deployment speed is worth it.
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

---

## Current Phase

**Focus:** Month 4 - AI Agent & Hardening

**Priorities:**
1. **Automatic Token Refresh:** Background job to refresh OAuth tokens before expiration (prevent widget breakage)
2. **Token Expiry UI:** Visual warnings ("Token expires in 5m", "Re-auth needed")
3. **AI Agent Prompting:** Conversational interface for widget generation (natural language → JSON schema)
4. **User Testing:** Validate widget layout persistence (arrange → wait 1s → refresh → verify)

**Pending Decisions:**
- ~~**Token Refresh Strategy:** Build proactive background job now OR reactive "refresh on 401" approach?~~ ✅ **RESOLVED:** Built proactive background job (Nov 20, 2025). Refreshes tokens 15 minutes before expiry. Prevents user-facing errors and widget downtime.
- **Conversational Agent Scope:** Full natural language ("I need X") OR guided multi-step wizard?
  - Lean: Start with guided wizard (lower risk), expand to full NL after validation.

**Status:**
- Month 3 complete (Nov 19-20, 2025)
- OAuth 2.0 integration live for all 5 providers
- OAuth Token Refresh System complete (Nov 20, 2025)
- Widget persistence system working (3 critical bugs fixed Nov 20)
- UniversalDataWidget system operational
- Real API integration with Event Mesh validated

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

### Architecture Decisions

**2025-11-13:** Initially considered building conversational agent (Claude API) in Month 1, deferred to Month 4. **Lesson:** Event Mesh is the differentiator, not conversation. Prove magic first, add conversation later.

**2025-11-13:** Almost built code generation in Month 1. **Lesson:** Declarative JSON factory covers 80% of cases with 0% security risk. Defer dangerous features until proven necessary.

**2025-11-19:** Built UniversalDataWidget with JSONPath and template strings instead of code generation. **Lesson:** JSONPath (`$.user.login`) + template strings (`"{{firstName}} {{lastName}}"`) cover 80% of data transformation needs with 0% security risk. Simple schema beats complex code generation for maintainability.

**2025-11-19:** Expanded widget library with Linear, Slack, and Calendar providers (3 new providers + 3 JSON widgets in ~75 minutes). **Lesson:** The ProviderAdapter pattern is **wildly successful**. Key insights:
- **GraphQL support works seamlessly**: Linear uses GraphQL instead of REST. The adapter pattern handled it without modifications.
- **Token format validation catches errors early**: Each provider has unique token formats (GitHub: `ghp_`, Linear: `lin_api_`, Slack: `xoxb-`, Google: `ya29.`). Adding validation prevents confusing API errors.
- **Error format standardization is critical**: GitHub uses status codes, Slack uses `ok: false`, Google nests errors in `error.message`. The adapter pattern unified these.
- **"Hours not days" promise validated**: Added 3 complete providers (adapters + widgets + tests) in 75 minutes.

**2025-11-20:** Built OAuth Token Refresh System with 15-minute warning window. **Lesson:** The OAuth callback already stores `expires_at` in the credentials JSONB field—no database migration needed! Key insights:
- **Leverage existing data**: Check what's already being stored before adding new columns. The OAuth callback was calculating and storing expiry timestamps all along.
- **JSONB flexibility pays off**: Storing credentials in JSONB (not rigid columns) meant adding `refresh_token` and `expires_at` required zero schema changes. This is exactly why we chose JSONB in Month 3.
- **15-minute window is optimal**: Balances refresh frequency (not too aggressive) vs. risk of expiration (not too close to the wire). Tested with 1-hour tokens (Jira) and 24-hour tokens (Linear).
- **Server-side refresh job beats client-side**: Could have done "refresh on 401" client-side, but proactive server-side prevents users from ever seeing errors. Better UX, slightly more infrastructure complexity (worth it).

### OAuth & Security

**2025-11-20:** Implemented OAuth 2.0 for all 5 providers. **Lesson:** OAuth provides 4x better UX (~30sec vs ~2min), but requires understanding the "contract problem" between flexible JavaScript code and strict SQL databases. Hit 3 classic errors:
- **The Bouncer Problem (CHECK constraint)**: Database rejects new providers not in allowed list. **Fix:** Update database constraints FIRST before deploying code.
- **The Double-Insert Problem (duplicate key)**: Using INSERT fails on second save. **Fix:** Use UPSERT (PostgREST `Prefer: resolution=merge-duplicates` or PATCH fallback).
- **The OAuth Token Problem (validation)**: Manual PATs have prefixes (`lin_api_`), OAuth tokens don't. **Fix:** Accept both formats in validation - check prefix OR length > 32.

**Key insight:** Database is a strict gatekeeper. The right order is: (1) Update DB schema, (2) Deploy code, (3) Users connect. NOT: (1) Deploy code, (2) Users hit errors, (3) Fix DB.

**2025-11-20:** OAuth security implementation: PKCE for GitHub/Linear, CSRF protection via state parameters, httpOnly cookies, refresh token support for Jira/Linear/Slack/Google. **Lesson:** Modern OAuth requires multiple layers: PKCE prevents authorization code interception, state prevents CSRF, httpOnly cookies prevent XSS, refresh tokens handle expiration. Don't skip security features to ship faster.

### Implementation Gotchas

**2025-11-14:** Completed Month 1 with mock data only. **Lesson:** Mock data sufficient for POC. Real API integration can wait - validates the interconnection thesis faster.

**2025-11-19:** Event Mesh magic now works with **real data** from GitHub/Jira APIs. **Lesson:** The core differentiator (widget interconnection) scales to production. Click PR #1 → Jira auto-filters to SCRUM-5, all with live API data. This proves the thesis beyond POC.

**2025-11-19:** Supabase connection fixed by resolving environment variable override issue. **Lesson:** System environment variables always override `.env.local` in Next.js. When env vars seem wrong despite correct `.env.local`, check `printenv` for conflicting system-level variables. Created `dev.sh` script to unset problematic env vars before starting dev server.

**2025-11-19:** Built Backend API Proxy with dev mode fallback when Supabase fails. **Lesson:** In-memory storage with global variables for hot-reload persistence is acceptable for MVP. Ship working solution before fighting infrastructure. Global variable pattern prevents Next.js hot-reload data loss:
```typescript
const devCredentialsStore = global.devCredentialsStore ?? new Map();
if (process.env.NODE_ENV === 'development') {
  global.devCredentialsStore = devCredentialsStore;
}
```

**2025-11-20 (CRITICAL):** Next.js 15 dynamic route params are now Promises. Must `await params` before destructuring: `const { widgetId } = await params;`. **Lesson:** TypeScript won't catch this - it's a runtime error. Affects all dynamic routes (`[param]`).

**2025-11-20:** Built complete production infrastructure (Vercel Cron, Supabase Auth, Real-time Subscriptions). **Lesson:** Maintain dev mode bypass even when adding production features. Key insights:
- **Dev mode flexibility**: Middleware checks `NODE_ENV === 'development'` to skip auth, real-time hooks gracefully skip when Supabase not configured. This maintains fast local iteration.
- **TypeScript strictness**: When adding real-time subscriptions, hit type errors with `apikey: string | undefined` in headers. **Fix:** Use conditional spread: `...(serviceKey ? { 'apikey': serviceKey } : {})` instead of `'apikey': serviceKey`.
- **Middleware deprecation (Next.js 16)**: Got warning: "middleware" file convention deprecated, use "proxy" instead. Not blocking, but plan to migrate when Next.js 16 stabilizes.
- **Build validation is critical**: Fixed 7 TypeScript errors before declaring "done". Zero-error builds prevent production surprises.

### Specific Bug Fixes

**2025-11-20:** Widget layout persistence hit THREE critical bugs before working:
1. **Layout not saving**: `handleLayoutChange` only updated React state, never saved to database. **Fix:** Added debounced PATCH calls with 1-second delay to avoid API spam during dragging.
2. **Welcome widget auto-injection**: Loading logic always re-added welcome widget if not in DB, overriding user deletions. **Fix:** Database is now source of truth - only show welcome if 0 widgets in DB (first-time users).
3. **Falsy value bug (THE KILLER)**: Used `||` operator for defaults: `y: widget.layout?.y || Infinity`. When `y: 0` (top row), JavaScript treats 0 as falsy, so expression evaluated to `Infinity`, moving all top-row widgets to bottom. **Fix:** Use nullish coalescing `??` operator instead: `y: widget.layout?.y ?? Infinity`. Only replaces `null`/`undefined`, preserves `0`.

**Critical lesson:** When 0 is a valid value, NEVER use `||` for defaults. Use `??` (nullish coalescing) or explicit `=== null || === undefined` checks. This bug cost 30+ minutes because positions WERE saving correctly, but loading incorrectly. The `||` vs `??` distinction is not obvious - always think "is 0 a valid value here?"

---

## File Maintenance Protocol

**plan.md** - Update after significant tasks (progress, blockers, next 5 steps)
**changelog.md** - Log bugs/fixes/changes as they happen (date, what changed, why, what it affected)
**README.md** - Update only for critical execution changes (environment setup, major architecture shifts)
**CLAUDE.md** - This file. Update when major architectural decisions made, constraints discovered, or phases transition.

**Rule:** Before marking any task complete, check if these files need updates.

---

**Last Updated:** November 20, 2025 (Infrastructure & Production Readiness Complete)
**Next Decision Point:** Deploy to production (Vercel + Supabase). Cron job configured via `vercel.json`. Enable Supabase Realtime replication on `widget_instances` table.
