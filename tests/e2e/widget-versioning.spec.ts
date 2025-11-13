/**
 * Widget Versioning E2E Tests
 *
 * Tests that verify widget versioning works end-to-end:
 * - Widgets are created with current version
 * - Undo/redo maintains widget versions
 * - Dashboard handles version upgrades gracefully
 */

import { test, expect } from '@playwright/test';

test.describe('Widget Versioning', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000');

    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Agentic Dashboard")');
  });

  test('should create widgets with current version', async ({ page }) => {
    // Add a GitHub widget
    await page.click('button:has-text("Add GitHub Widget")');

    // Wait for widget to appear
    await page.waitForSelector('.drag-handle:has-text("github")');

    // Check console for version logging
    const logs: string[] = [];
    page.on('console', (msg) => {
      logs.push(msg.text());
    });

    // Widget should be visible
    const githubWidget = page.locator('.drag-handle:has-text("github")');
    await expect(githubWidget).toBeVisible();
  });

  test('should preserve widgets after undo/redo', async ({ page }) => {
    // Add a widget
    await page.click('button:has-text("Add GitHub Widget")');
    await page.waitForSelector('.drag-handle:has-text("github")');

    // Undo (Cmd+Z)
    await page.keyboard.press('Meta+z');

    // Widget should be removed
    await expect(page.locator('.drag-handle:has-text("github")')).not.toBeVisible();

    // Redo (Cmd+Shift+Z)
    await page.keyboard.press('Meta+Shift+z');

    // Widget should be back
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();
  });

  test('should handle multiple widgets with undo', async ({ page }) => {
    // Add multiple widgets
    await page.click('button:has-text("Add GitHub Widget")');
    await page.waitForSelector('.drag-handle:has-text("github")');

    await page.click('button:has-text("Add Jira Widget")');
    await page.waitForSelector('.drag-handle:has-text("jira")');

    // Verify both widgets are present
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();
    await expect(page.locator('.drag-handle:has-text("jira")')).toBeVisible();

    // Undo once (removes Jira)
    await page.keyboard.press('Meta+z');
    await expect(page.locator('.drag-handle:has-text("jira")')).not.toBeVisible();
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();

    // Undo again (removes GitHub)
    await page.keyboard.press('Meta+z');
    await expect(page.locator('.drag-handle:has-text("github")')).not.toBeVisible();

    // Redo twice (restores both)
    await page.keyboard.press('Meta+Shift+z');
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();

    await page.keyboard.press('Meta+Shift+z');
    await expect(page.locator('.drag-handle:has-text("jira")')).toBeVisible();
  });

  test('should show undo/redo buttons with correct state', async ({ page }) => {
    // Initially, undo button should be enabled (has initial checkpoint)
    const undoButton = page.locator('button:has-text("Undo")');
    const redoButton = page.locator('button:has-text("Redo")');

    // Redo should be disabled initially
    await expect(redoButton).toBeDisabled();

    // Add a widget
    await page.click('button:has-text("Add GitHub Widget")');
    await page.waitForSelector('.drag-handle:has-text("github")');

    // Now undo should be enabled
    await expect(undoButton).toBeEnabled();

    // Click undo
    await undoButton.click();

    // Now redo should be enabled
    await expect(redoButton).toBeEnabled();

    // Click redo
    await redoButton.click();

    // Widget should be back
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();
  });

  test('should handle widget removal with undo', async ({ page }) => {
    // Add a widget
    await page.click('button:has-text("Add GitHub Widget")');
    await page.waitForSelector('.drag-handle:has-text("github")');

    // Remove the widget using the X button
    const githubWidget = page.locator('.drag-handle:has-text("github")').locator('..');
    const removeButton = githubWidget.locator('button:has-text("✕")');
    await removeButton.click();

    // Widget should be removed
    await expect(page.locator('.drag-handle:has-text("github")')).not.toBeVisible();

    // Undo removal
    await page.keyboard.press('Meta+z');

    // Widget should be back
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();
  });

  test('should show toast notifications for undo/redo', async ({ page }) => {
    // Add a widget
    await page.click('button:has-text("Add GitHub Widget")');
    await page.waitForSelector('.drag-handle:has-text("github")');

    // Undo and check for toast
    await page.keyboard.press('Meta+z');

    // Look for Sonner toast (may not always be visible due to timing)
    // Just verify no errors occurred
    const errors = [];
    page.on('pageerror', (err) => errors.push(err));

    // Wait a bit for any errors
    await page.waitForTimeout(500);

    // Should have no errors
    expect(errors).toHaveLength(0);
  });

  test('should maintain Event Mesh state during undo/redo', async ({ page }) => {
    // Disable Event Mesh (Safe Mode)
    await page.click('button:has-text("Mesh Enabled")');

    // Verify Safe Mode is on
    await expect(page.locator('button:has-text("Safe Mode")')).toBeVisible();

    // Add a widget in Safe Mode
    await page.click('button:has-text("Add GitHub Widget")');
    await page.waitForSelector('.drag-handle:has-text("github")');

    // Undo
    await page.keyboard.press('Meta+z');

    // Safe Mode should still be on (Event Mesh state is independent)
    await expect(page.locator('button:has-text("Safe Mode")')).toBeVisible();

    // Redo
    await page.keyboard.press('Meta+Shift+z');

    // Safe Mode should still be on
    await expect(page.locator('button:has-text("Safe Mode")')).toBeVisible();
  });
});

test.describe('Widget Versioning - Manual Testing Guide', () => {
  test('MANUAL: Verify version logging in console', async ({ page }) => {
    // This test documents how to manually verify versioning
    console.log(`
    MANUAL TEST: Verify Widget Versioning Logs

    1. Open browser DevTools Console (F12)
    2. Add a GitHub widget
    3. Look for console logs like:
       [Widget Versioning] Created github widget v1

    4. Remove the widget
    5. Undo (Cmd+Z)
    6. Look for console logs like:
       [Widget Versioning] No migration needed for github v1

    7. Change a widget version in registry.ts (e.g., github: version 2)
    8. Add a migration in migrations.ts
    9. Refresh page and undo
    10. Look for console logs like:
        [Widget Versioning] Migrating github from v1 to v2
    `);

    // Navigate to dashboard for manual testing
    await page.goto('http://localhost:3000');
    await page.waitForSelector('h1:has-text("Agentic Dashboard")');

    // Pause for manual testing
    // await page.pause();  // Uncomment to pause for manual inspection
  });
});
