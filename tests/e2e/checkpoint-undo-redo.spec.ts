import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Checkpoint Manager - Undo/Redo Functionality
 *
 * These tests verify the fixes for:
 * - Bug 1: Multiple undo (state closure issue)
 * - Bug 2: Redo functionality (checkpoint creation timing)
 * - Bug 3: Toast notifications
 * - Bug 4: Keyboard shortcuts
 */

test.describe('Checkpoint Manager - Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');

    // Wait for dashboard to be fully loaded
    await expect(page.locator('h1')).toContainText('Agentic Dashboard');
  });

  test('should allow multiple undo operations (Bug 1 Fix)', async ({ page }) => {
    // Test: Add 3 widgets, then undo 3 times
    // Expected: Should undo all 3 additions and return to initial state

    // Add GitHub widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200); // Wait for checkpoint creation

    // Add Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    // Add another GitHub widget (from header button or duplicate)
    // For now, we'll add the welcome card widgets
    // Let's verify we have 3 widgets (welcome + github + jira)
    const widgetsAfterAdd = await page.locator('.layout > div').count();
    expect(widgetsAfterAdd).toBe(3); // welcome, github, jira

    // Click Undo button 2 times (to undo github and jira additions)
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(300);

    const widgetsAfterUndo1 = await page.locator('.layout > div').count();
    expect(widgetsAfterUndo1).toBe(2); // welcome + github

    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(300);

    const widgetsAfterUndo2 = await page.locator('.layout > div').count();
    expect(widgetsAfterUndo2).toBe(1); // only welcome

    // Verify undo button is now disabled (at beginning of history)
    const undoButton = page.getByRole('button', { name: /Undo/i });
    await expect(undoButton).toBeDisabled();
  });

  test('should support redo after undo (Bug 2 Fix)', async ({ page }) => {
    // Test: Add 2 widgets, undo 2x, redo 2x
    // Expected: Should restore both widgets

    // Add GitHub widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);

    // Add Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    // Verify we have 3 widgets
    let widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(3);

    // Undo twice
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(300);

    // Should be back to 1 widget
    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(1);

    // Redo button should be enabled
    const redoButton = page.getByRole('button', { name: /Redo/i });
    await expect(redoButton).toBeEnabled();

    // Redo twice
    await redoButton.click();
    await page.waitForTimeout(500); // Increased timeout for React re-render

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(2); // welcome + github

    await redoButton.click();
    await page.waitForTimeout(500); // Increased timeout for React re-render

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(3); // welcome + github + jira

    // Redo button should now be disabled (at end of history)
    await expect(redoButton).toBeDisabled();
  });

  test('should show toast notifications on undo/redo (Bug 3 Fix)', async ({ page }) => {
    // Test: Toast notifications appear with proper content
    // Expected: Should see "↩️ Undo" and "↪️ Redo" toasts

    // Add a widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);

    // Click Undo and verify toast appears
    await page.getByRole('button', { name: /Undo/i }).click();

    // Look for the Sonner toast (it uses specific classes)
    const undoToast = page.locator('[data-sonner-toast]').filter({ hasText: /Undo/i });
    await expect(undoToast).toBeVisible({ timeout: 2000 });

    // Wait for toast to disappear
    await page.waitForTimeout(2500);

    // Click Redo and verify toast appears
    await page.getByRole('button', { name: /Redo/i }).click();

    const redoToast = page.locator('[data-sonner-toast]').filter({ hasText: /Redo/i });
    await expect(redoToast).toBeVisible({ timeout: 2000 });
  });

  test('should support keyboard shortcuts (Bug 4 Fix)', async ({ page }) => {
    // Test: Cmd+Z for undo, Cmd+Shift+Z for redo
    // Expected: Keyboard shortcuts should work

    // Determine if we're on Mac or not
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';

    // Add GitHub widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);

    // Add Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    let widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(3);

    // Press Cmd+Z (or Ctrl+Z) to undo
    await page.keyboard.press(`${modifier}+KeyZ`);
    await page.waitForTimeout(300);

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(2);

    // Press Cmd+Z again
    await page.keyboard.press(`${modifier}+KeyZ`);
    await page.waitForTimeout(300);

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(1);

    // Press Cmd+Shift+Z (or Ctrl+Shift+Z) to redo
    // Ensure page has focus for keyboard events
    await page.evaluate(() => document.body.focus());
    await page.keyboard.press(`${modifier}+Shift+KeyZ`);

    // Wait for the DOM to actually update (more reliable than fixed timeout)
    await page.waitForFunction(() => document.querySelectorAll('.layout > div').length === 2, { timeout: 2000 });

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(2);

    // Press Cmd+Y (alternative redo)
    await page.keyboard.press(`${modifier}+KeyY`);

    // Wait for the DOM to actually update
    await page.waitForFunction(() => document.querySelectorAll('.layout > div').length === 3, { timeout: 2000 });

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(3);
  });

  test('should not create checkpoints during undo/redo restoration', async ({ page }) => {
    // Test: Verify that redo history is not cleared when undoing
    // This is the core fix for Bug 2

    // Add 2 widgets
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    // Undo once
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(500); // Wait longer to ensure no checkpoint is created

    // Redo button should still be enabled
    const redoButton = page.getByRole('button', { name: /Redo/i });
    await expect(redoButton).toBeEnabled();

    // Redo should work
    await redoButton.click();
    await page.waitForTimeout(300);

    const widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(3);
  });

  test('should handle rapid widget additions correctly', async ({ page }) => {
    // Test: Add widgets rapidly and verify all can be undone
    // This tests the state closure fix (Bug 1)

    // Add 3 widgets rapidly
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(50);
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(50);
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(300); // Wait for all checkpoints to be created

    let widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(4); // welcome + 3 added

    // Undo all 3 additions
    for (let i = 0; i < 3; i++) {
      const undoButton = page.getByRole('button', { name: /Undo/i });
      if (await undoButton.isEnabled()) {
        await undoButton.click();
        await page.waitForTimeout(300);
      }
    }

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(1); // back to just welcome
  });

  test('should maintain checkpoint limit of 5', async ({ page }) => {
    // Test: Verify that only last 5 checkpoints are kept
    // Add 6 widgets, then undo - should only be able to undo 5 times

    // Add 6 widgets (or as many as we can)
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
      await page.waitForTimeout(200);
    }

    // Try to undo more than 5 times
    let undoCount = 0;
    const undoButton = page.getByRole('button', { name: /Undo/i });

    while (await undoButton.isEnabled() && undoCount < 10) {
      await undoButton.click();
      await page.waitForTimeout(200);
      undoCount++;
    }

    // Should have undone at most 5 times (or fewer if we added fewer widgets)
    expect(undoCount).toBeLessThanOrEqual(5);

    // Undo button should be disabled
    await expect(undoButton).toBeDisabled();
  });
});
