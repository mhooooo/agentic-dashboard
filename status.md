# Project Status

## Current Phase: Month 3 - The Factory

## Active Tasks

### Month 3 Deliverables
- [x] Backend API Proxy Architecture
- [x] Provider adapter system (GitHub, Jira, Linear, Slack, Calendar)
- [x] Credential management UI
- [x] Real API integration with widgets
- [x] Event Mesh with real data
- [x] Supabase connection for credential storage
- [x] UniversalDataWidget component
- [x] JSON schema for declarative widgets
- [x] OAuth 2.0 integration for all 5 providers (completed Nov 20, 2025)
- [x] Widget library expansion: Linear, Slack, Calendar (completed Nov 19, 2025)
- [x] Widget persistence across page refreshes (completed Nov 20, 2025)
- [ ] Claude integration for JSON generation (deferred to Month 4+)
- [ ] Preview & Confirm modal (deferred to Month 4+)
- [ ] Automatic token refresh for OAuth providers (Month 4+)

## Completed Tasks

### Nov 20, 2025
- [x] Widget Persistence Fix - Widgets now persist across page refreshes (database integration + schema alignment)
- [x] Widget Layout Positions Fix - Fixed critical bug where widget positions were lost on refresh (falsy value bug with || operator)
- [x] Welcome Widget Auto-Injection Fix - Removed logic that re-added deleted welcome widget on every refresh
- [x] Next.js 15 Dynamic Route Params Fix - Fixed async params handling in DELETE/PATCH endpoints
- [x] Hardcoded Widget Error Handling - Skip database deletion for hardcoded widgets to prevent console errors
- [x] Date Rendering Fix - Added formatValue() helper to handle Date objects in UniversalDataWidget
- [x] OAuth 2.0 Integration for all 5 providers (GitHub, Jira, Linear, Slack, Google Calendar)
- [x] CSRF protection (state parameter + httpOnly cookies)
- [x] PKCE implementation (GitHub, Linear)
- [x] Database migration system for new providers
- [x] UPSERT logic fixes (no duplicate key errors)
- [x] Flexible token validation (manual PATs + OAuth tokens)
- [x] OAuth documentation (OAUTH_SETUP.md, ADDING_NEW_PROVIDERS.md)

### Nov 19, 2025
- [x] Backend API Proxy Architecture (completed Nov 19, 2025)
- [x] Real API integration (GitHub, Jira, Linear, Slack, Calendar)
- [x] Event Mesh working with live data
- [x] Supabase connection fixed (environment variable override issue)
- [x] Jira widget display working with real data
- [x] UniversalDataWidget System (completed Nov 19, 2025)
- [x] Widget library expansion: Linear, Slack, Calendar (75 minutes total)

## Activity Log

- [2025-11-20 11:10] ✅ Completed: Widget Layout Persistence Complete - Fixed 3 critical bugs preventing widget positions from persisting (layout saving, welcome widget auto-injection, falsy value bug). Total ~150 LOC changes.
- [2025-11-20 10:09] ✅ Completed: Widget Persistence Fix - Widgets persist across refreshes, Date rendering fixed, database schema aligned (~280 LOC)
- [2025-11-20 02:35] ✅ Completed: OAuth 2.0 Integration (~930 LOC) - All 5 providers, CSRF protection, PKCE, refresh tokens, comprehensive docs
- [2025-11-20 02:35] ✅ Completed: Database migration 004 - Added linear and calendar to allowed providers
- [2025-11-20 02:35] ✅ Completed: UPSERT logic in supabase-rest.ts - Fixed duplicate key errors
- [2025-11-20 02:35] ✅ Completed: Linear provider token validation - Accept both manual PATs and OAuth tokens
- [2025-11-19 17:30] ✅ Completed: UniversalDataWidget System (~900 LOC) - JSON schema, transformers, renderer, examples, docs
- [2025-11-19 08:30] ✅ Completed: Fix Supabase connection for production credential storage
- [2025-11-19 08:30] ✅ Completed: Resolve environment variable override issue (system env vars → .env.local)
- [2025-11-19 08:30] ✅ Completed: Fix dev user UUID format for database compatibility
- [2025-11-19 08:30] ✅ Completed: Jira widget display working with real API data

## Blockers

None currently.

## Next 3 Steps

1. **Implement Automatic Token Refresh** - Background job to refresh expiring OAuth tokens before they expire (Jira, Linear, Slack, Google Calendar)
2. **Add Token Expiry UI** - Show users when tokens expire, with warnings/prompts to reconnect
3. **Test Widgets with OAuth Data** - Verify all 5 providers work end-to-end with OAuth credentials (GitHub PRs, Jira issues, Linear issues, Slack channels, Calendar events)
4. **Decision: Conversational Agent OR Enhanced Event Mesh?**
   - Option A: Build Claude-powered agent to generate widget JSON from natural language
   - Option B: Enhance Event Mesh with AI-powered suggestions, smart filtering, cross-widget intelligence
