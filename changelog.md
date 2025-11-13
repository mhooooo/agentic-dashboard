# Changelog

All notable changes, bugs, and fixes to the Agentic Dashboard project.

---

## 2025-11-14 - Widget Removal Button Fix

### Bug: Widget Removal Button Not Working
**What changed:** Fixed remove button (✕) not working when clicked inside react-grid-layout drag handle

**Why:** react-grid-layout listens to `mousedown` events to initiate dragging. When the remove button was clicked, both the onClick AND mousedown events were being captured by the drag handle before reaching the button handler.

**The fix:**
```tsx
<button
  onClick={(e) => {
    e.preventDefault();       // NEW: Prevent default button behavior
    e.stopPropagation();      // Prevent event bubbling to drag-handle
    removeWidget(widget.id);
  }}
  onMouseDown={(e) => {       // NEW: Critical for react-grid-layout
    e.stopPropagation();      // Stop mousedown from starting drag
  }}
  className="... z-10 relative"  // NEW: z-index to ensure button is on top
>
  ✕
</button>
```

**What it affected:**
- `components/Dashboard.tsx:341-352` - Added preventDefault(), stopPropagation() on both onClick and onMouseDown
- Widget removal now works in both manual testing and E2E tests
- 8/8 widget versioning tests now passing (was 7/8 before fix)

**Root cause:**
- `stopPropagation()` alone wasn't enough - needed on BOTH onClick and onMouseDown
- react-grid-layout uses mousedown (not click) to detect drag start
- Without onMouseDown handler, the drag operation would start before onClick fired

**Test evidence:**
- Created debug tests that confirmed button was found but handler wasn't firing
- After fix, widget count drops to 0 after clicking remove button
- All tests pass consistently

---

## 2025-11-14 - Widget Versioning System (Month 2)

### Feature: Widget Versioning & Backward Compatibility
**What changed:** Implemented comprehensive widget versioning system to ensure safe widget evolution and backward compatibility

**Why:** Part of Month 2 "Safety Net" - enables widgets to evolve over time without breaking old checkpoints or saved dashboards. Users can confidently undo/redo without losing data when widgets are updated.

**What was added:**
- `lib/widgets/registry.ts` - Central registry of all widget types with version metadata
- `lib/widgets/migrations.ts` - Migration system to upgrade old widget configs
- `lib/widgets/versioning.ts` - Utilities for version management and auto-upgrade
- `lib/widgets/index.ts` - Centralized exports for widget system
- `lib/widgets/README.md` - Comprehensive documentation (90+ lines)
- `tests/e2e/widget-versioning.spec.ts` - E2E tests for versioning

**Architecture:**
- Each widget type has a version number in registry
- Widget instances track version when created
- Migrations define transformations between versions (v1→v2→v3)
- Auto-upgrade: Old widgets automatically upgrade when loaded from checkpoints
- Backward compatible: Handles widgets created before versioning was added (assumes v1)

**What it affected:**
- `components/Dashboard.tsx:24-28` - Import widget versioning utilities
- `components/Dashboard.tsx:43` - Added version field to welcome widget
- `components/Dashboard.tsx:93,119` - Normalize widgets when restoring from undo/redo
- `components/Dashboard.tsx:163` - Use `createWidgetInstance` when adding widgets
- All widgets now include version tracking

**Migration patterns supported:**
- Add new fields with defaults
- Rename fields
- Remove deprecated fields
- Transform data structures (e.g., array → object)

**User experience:**
- Widgets are created with current version automatically
- Old checkpoints restore perfectly, auto-upgrading widgets
- No breaking changes when widgets are updated
- Console logs show version migrations for debugging
- Zero user action required - everything automatic

**Testing:**
- 7/8 E2E tests passing (1 test has minor UI interaction issue, not versioning)
- Tests verify: widget creation, undo/redo preservation, multiple widgets, backward compatibility
- Manual testing guide included in test file

**Next steps:**
- Add schema validation for widget configs
- Consider rollback support (downgrade v2→v1 if needed)
- Track migration analytics

---

## 2025-11-14 - Event Flow Debugger Implementation (Month 2)

### Feature: Event Flow Debugger
**What changed:** Implemented comprehensive Event Flow Debugger to visualize event propagation through the Event Mesh

**Why:** Part of Month 2 "Safety Net" - helps users understand widget interconnections and debug broken states. Provides transparency into the "magic" of the Event Mesh.

**What was added:**
- `components/EventFlowDebugger.tsx` - Complete debugger UI component
- Toggle button in Dashboard header ("🐛 Debugger")
- Two-tab interface:
  - **Events tab**: Real-time event log with timestamps, sources, payloads, and subscriber tracking
  - **Subscriptions tab**: Shows active widget subscriptions grouped by widget ID
- Features:
  - Auto-scroll to latest events (toggleable)
  - Event filtering by name or source
  - Clear log functionality
  - Expandable payload viewer with JSON formatting
  - Visual flow indicators (arrows showing which widgets receive events)
  - Safe Mode status indicator
  - Pattern matching reference guide

**What it affected:**
- `components/Dashboard.tsx:21` - Added EventFlowDebugger import
- `components/Dashboard.tsx:55` - Added `debuggerOpen` state
- `components/Dashboard.tsx:278-288` - Added Debugger toggle button in header
- `components/Dashboard.tsx:363-366` - Rendered EventFlowDebugger component
- Existing Event Mesh already had event logging built-in (`lib/event-mesh/mesh.ts:29-34` and `:120-133`)

**User experience:**
- Users can now see exactly which events are being published
- Clear visualization of which widgets are listening to which event patterns
- Full event payload inspection for debugging
- Helps users understand the "magic" of widget interconnections
- No breaking changes - all existing functionality preserved

**Testing:**
- Manually tested with GitHub and Jira widgets
- Confirmed event capture and display
- Verified subscription tracking
- Screenshot saved: `.playwright-mcp/event-flow-debugger-working.png`

---

## 2025-11-14 - Checkpoint Manager Bug Fixes

### Bug 1: Multiple Undo Operations Not Working
**What changed:** Removed checkpoint creation from `handleLayoutChange` in `components/Dashboard.tsx`

**Why:** When adding widgets, two checkpoints were being created: one from `addWidget` ("Added widget") and one from `handleLayoutChange` ("Layout changed"). This caused the undo history to skip widgets because it was undoing layout changes instead of widget additions.

**What it affected:**
- `components/Dashboard.tsx:148-154` - Removed checkpoint creation, added TODO comment
- User could only undo once when multiple widgets were added
- Undo history was corrupted with duplicate/unnecessary checkpoints

**Evidence:** User-provided console logs showed:
```
[CheckpointManager] Created checkpoint: {description: 'Added github widget'}
[CheckpointManager] Created checkpoint: {description: 'Layout changed'}  // ← Unwanted
[CheckpointManager] Created checkpoint: {description: 'Added jira widget'}
```

---

### Bug 2: Redo Functionality Not Working
**What changed:** Added `isRestoringRef` flag to prevent checkpoint creation during undo/redo restoration in `components/Dashboard.tsx`

**Why:** When undoing, the state changes triggered `addWidget`/`removeWidget` effects that created new checkpoints, clearing the redo history. The flag prevents any checkpoint creation while restoring from history.

**What it affected:**
- `components/Dashboard.tsx:48` - Added `isRestoringRef` ref
- `components/Dashboard.tsx:84-102` - Set flag in `handleUndo` before calling undo
- `components/Dashboard.tsx:107-125` - Set flag in `handleRedo` before calling redo
- Users could not redo after undoing because redo history was immediately cleared

**Fix details:**
- Set `isRestoringRef.current = true` BEFORE calling undo/redo
- Clear flag after 200ms timeout to allow state updates to settle
- If undo/redo returns null, clear flag immediately

---

### Bug 3: Toast Notifications Not Appearing
**What changed:** Replaced custom toast implementation with Sonner library

**Why:** Custom toast used Tailwind v4 animation classes (`animate-in fade-in slide-in-from-bottom-2`) that weren't working. Sonner is a production-ready toast library that works reliably.

**What it affected:**
- `package.json` - Added `sonner: ^2.0.7` dependency
- `components/Dashboard.tsx:14` - Added Sonner imports
- `components/Dashboard.tsx:92` - Changed to `sonnerToast.success('↩️ Undo')`
- `components/Dashboard.tsx:115` - Changed to `sonnerToast.success('↪️ Redo')`
- `components/Dashboard.tsx:343` - Added `<Toaster position="bottom-center" richColors />`
- Removed custom toast state and JSX rendering
- Users could not see visual feedback when undoing/redoing

---

### Bug 4: Keyboard Shortcuts Not Working for Redo
**What changed:** Fixed case sensitivity in keyboard event handler in `lib/checkpoint/manager.ts`

**Why:** Keyboard handler checked `e.key === 'z'`, but pressing Shift+Z produces uppercase 'Z'. Changed to `e.key.toLowerCase() === 'z'` to handle both cases.

**What it affected:**
- `lib/checkpoint/manager.ts:185` - Changed to `e.key.toLowerCase() === 'z'` for undo
- `lib/checkpoint/manager.ts:191` - Changed to `e.key.toLowerCase() === 'z'` for redo
- Cmd+Shift+Z (or Ctrl+Shift+Z) redo shortcut didn't work
- Only Cmd+Y alternative redo worked

**Test evidence:** Playwright test for keyboard shortcuts initially timed out waiting for DOM update after redo, but after fix all tests passed immediately.

---

## 2025-11-14 - Additional Fixes

### State Closure Issue in Checkpoint Creation
**What changed:** Modified `saveCheckpoint` to accept state as parameters instead of relying on closure

**Why:** Original implementation used `setTimeout(() => saveCheckpoint())` which captured stale state values from closure. Passing state directly ensures correct values are checkpointed.

**What it affected:**
- `components/Dashboard.tsx:68-79` - Changed `saveCheckpoint` signature to accept `currentLayout`, `currentWidgets`, and `description` parameters
- `components/Dashboard.tsx:186` - Pass state directly: `saveCheckpoint(updatedLayout, updatedWidgets, 'Added widget')`
- `components/Dashboard.tsx:204` - Pass state directly: `saveCheckpoint(updatedLayout, updatedWidgets, 'Removed widget')`

---

### React Import Location
**What changed:** Moved React import from bottom to top of `lib/checkpoint/manager.ts`

**Why:** Import was incorrectly placed at line 207 (end of file), causing compilation errors.

**What it affected:**
- `lib/checkpoint/manager.ts:10` - Moved import to top with other imports
- TypeScript compilation

---

## 2025-11-14 - Test Suite Improvements

### Playwright MCP Server Setup
**What changed:** Installed Playwright and configured E2E test infrastructure

**What it affected:**
- `package.json` - Added `@playwright/test: ^1.56.1` devDependency
- `playwright.config.ts` - Created complete Playwright configuration
- `tests/e2e/checkpoint-undo-redo.spec.ts` - Created 7 comprehensive tests
- `tests/e2e/event-mesh.spec.ts` - Created 7 event mesh tests
- Added npm scripts: `test`, `test:ui`, `test:headed`, `test:debug`

**Test Results:** 13/14 tests passing (1 skipped due to known issue)

---

### Fixed Flaky Test Selectors
**What changed:** Replaced unreliable text-based selectors with specific class-based selectors

**Why:** `page.locator('text=github')` matched multiple elements (button text, list items, span elements), causing "strict mode violation" errors. Changed to `.drag-handle:has-text("github")` to target only widget headers.

**What it affected:**
- `tests/e2e/event-mesh.spec.ts:35-36` - Magic moment test
- `tests/e2e/event-mesh.spec.ts:49-50` - Magic moment verification
- `tests/e2e/event-mesh.spec.ts:79-80` - Safe Mode toggle test
- `tests/e2e/event-mesh.spec.ts:112` - Widget removal verification
- `tests/e2e/event-mesh.spec.ts:171-172` - Rapid event publishing test
- `tests/e2e/event-mesh.spec.ts:212` - Undo/redo integration test

**Pattern used:**
```typescript
// BEFORE (flaky - matches 3+ elements)
await expect(page.locator('text=github')).toBeVisible();

// AFTER (reliable - specific selector)
await expect(page.locator('.drag-handle').filter({ hasText: /github/i })).toBeVisible();
```

---

### Fixed Safe Mode Button References
**What changed:** Updated Safe Mode toggle test to get fresh button references after state changes

**Why:** Button text changes from "Mesh Enabled" to "Safe Mode", so locator needs to be refreshed after clicks. Original code held stale reference.

**What it affected:**
- `tests/e2e/event-mesh.spec.ts:226-232` - Get fresh reference after first toggle
- `tests/e2e/event-mesh.spec.ts:243-251` - Get fresh references after undo/redo and second toggle
- Used flexible locator: `page.getByRole('button', { name: /Safe Mode|Mesh Enabled/i })`

---


## Summary of Changes

**Files Modified:** 5
- `components/Dashboard.tsx` (major refactor)
- `lib/checkpoint/manager.ts` (import + keyboard fix)
- `tests/e2e/checkpoint-undo-redo.spec.ts` (created)
- `tests/e2e/event-mesh.spec.ts` (created + selector fixes)
- `playwright.config.ts` (created)

**Files Added:** 4
- `playwright.config.ts`
- `tests/e2e/checkpoint-undo-redo.spec.ts`
- `tests/e2e/event-mesh.spec.ts`
- `changelog.md` (this file)

**Bugs Fixed:** 4
1. Multiple undo operations
2. Redo functionality
3. Toast notifications
4. Keyboard shortcuts

**Tests:** 13 passing, 1 skipped

**Known Issues:** 1 (widget removal button)

---

**Last Updated:** November 14, 2025
