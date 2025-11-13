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

### Hardcoded Widgets First, Factory Later
- **Choice:** Month 1-2 use hardcoded React components. Month 3+ use declarative JSON factory (UniversalDataWidget).
- **Why:** Hardcoded proves Event Mesh magic quickly with zero security risk. Defer complex declarative system until demand validated.
- **Trade-off:** Slower widget creation (days vs hours), but faster time-to-magic-demo.
- **When to revisit:** When widget creation time becomes #1 complaint or 10+ requests in backlog.
- **Lesson learned:** Almost built code generation Month 1, realized security risk. Declarative JSON covers 80% of cases with 0% risk.

### Supabase Backend (PostgreSQL + Vault + Auth)
- **Choice:** Supabase over Firebase/AWS/custom
- **Why:** Built-in RLS (user isolation), Vault for API key encryption, real-time subscriptions, open-source PostgreSQL.
- **Trade-off:** Less flexibility than custom backend, but 90% faster to ship.
- **When to revisit:** If need custom features Supabase doesn't support, or pricing becomes prohibitive at scale.
- **Lesson learned:** Considered Firebase but Supabase Vault solves API key security without custom crypto.

### Next.js 15 App Router + Vercel
- **Choice:** Next.js 15 with App Router, deployed on Vercel
- **Why:** Server Components reduce bundle size, API routes provide secure backend proxy, zero-config Vercel deployment.
- **Trade-off:** Coupled to Vercel ecosystem, but deployment speed is worth it.
- **When to revisit:** If need more infrastructure control or costs exceed self-hosted alternatives.

### Defer Code Generation (Sandbox Execution)
- **Choice:** Use declarative JSON factory (Month 3+) instead of AI-generated React code
- **Why:** Security risk too high for Month 1-6. Generated code requires E2B sandbox, AST analysis, extensive testing. Declarative JSON covers 80% of use cases with minimal risk.
- **Trade-off:** Cannot support highly custom visualizations (3D charts, WebGL). Acceptable for first 6 months.
- **When to revisit:** When users consistently request visualizations JSON cannot express, or when we have capacity to build secure sandbox (Month 7+).

---

## Development Constraints

**Differentiator-First Methodology**
- Ship the "magic" (Event Mesh interconnection) before infrastructure
- Validate core thesis with users before investing in scale/security features
- Build safety nets (undo, safe mode) to enable experimentation, not restrictions

**Security Isolation**
- Widget secrets never reach client
- All external API calls through Next.js backend proxy
- Supabase Vault encrypts secrets at rest
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

### Month 1: Magic POC (✅ COMPLETE)
- Magic Moment: <5min landing → first interconnection
- Interconnection: >60% connect 2+ widgets
- Qualitative: "Wait, it just filtered automatically?!"

### Month 2: Safety Net (🚧 IN PROGRESS)
- Broken state: <5% users encounter broken dashboard
- Recovery: <30s to recover from broken state
- Understanding: Event debugger helps users understand interconnections

### Month 3: Factory
- Development: <2 days per widget (vs weeks)
- Adoption: >50% new widgets use declarative factory
- Security: Zero incidents from generated widgets

---

## Current Phase

**Now:** Month 2 - The Safety Net

**Status:**
- ✅ Checkpoint Manager (Cmd+Z undo, stores 5 snapshots)
- ✅ Keyboard shortcuts working
- ✅ Event Flow Debugger (completed Nov 14, 2025)
- ✅ Widget versioning (completed Nov 14, 2025)

**Event Flow Debugger Features:**
- Real-time event log with timestamps and sources
- Subscription tracking (shows which widgets listen to which patterns)
- Event payload inspection with JSON formatting
- Visual flow indicators (arrows showing event propagation)
- Filter, clear, and auto-scroll controls
- Integrates seamlessly with existing Event Mesh

**Widget Versioning Features:**
- Registry-based version tracking for all widget types
- Auto-upgrade old widgets when restored from checkpoints
- Migration system for safe schema evolution (v1→v2→v3)
- Backward compatible (handles widgets created before versioning)
- Zero user action required - migrations run automatically
- 7/8 E2E tests passing

**Next 3 steps:**
1. Test Month 2 metrics with users (broken state rate, recovery time, debugger usefulness)
2. Evaluate if Month 2 goals met (safety net sufficient for user confidence)
3. Begin planning Month 3 (Declarative Widget Factory)

**Blocked on:** None

---

## Known Tensions

### Speed vs. Security
- **Pressure A:** Ship fast to validate thesis
- **Pressure B:** Secure API keys, prevent XSS/injection
- **Resolution:** Backend proxy + Supabase Vault, defer code generation. Ship fast with security boundaries in place.

### Flexibility vs. Simplicity
- **Pressure A:** Support any widget users imagine (custom code, 3D charts)
- **Pressure B:** Keep system simple, debuggable, safe
- **Resolution:** Declarative JSON for 80% of cases. Defer code generation for edge cases. Prioritize simplicity until users demand more.

### Event Mesh Power vs. Broken States
- **Pressure A:** Let widgets freely publish/subscribe to enable "magic"
- **Pressure B:** Prevent cascading failures, infinite loops, broken dashboards
- **Resolution:** Safe Mode toggle, Checkpoint Manager (Cmd+Z), Event Flow Debugger. Give users power + undo, not restrictions.

---

## File Maintenance Protocol

**plan.md** - Update after significant tasks (progress, blockers, next 3 steps)
**changelog.md** - Create if doesn't exist. Log bugs/fixes/changes as they happen (date, what changed, why, what it affected)
**README.md** - Create initially with setup/run instructions. Update only for critical execution changes (environment setup, major architecture shifts)
**CLAUDE.md** - This file. Update when major architectural decisions made, constraints discovered, or phases transition.

**Rule:** Before marking any task complete, check if these files need updates.

---

## Anti-Patterns & Lessons

**2025-11-13:** Initially considered building conversational agent (Claude API) in Month 1, deferred to Month 3. **Lesson:** Event Mesh is the differentiator, not conversation. Prove magic first, add conversation later.

**2025-11-13:** Almost built code generation in Month 1. **Lesson:** Declarative JSON factory covers 80% of cases with 0% security risk. Defer dangerous features until proven necessary.

**2025-11-14:** Completed Month 1 with mock data only. **Lesson:** Mock data sufficient for POC. Real API integration can wait - validates the interconnection thesis faster.

---

**Last Updated:** November 14, 2025 (Month 2 - Safety Net complete)
**Next Decision Point:** End of Month 2 - Did users feel safe experimenting? Was undo/event debugger/versioning sufficient to build trust?