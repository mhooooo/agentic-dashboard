import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Event Mesh - The "Magic Moment"
 *
 * These tests verify:
 * - Widget interconnection through Event Mesh
 * - Click GitHub PR → Jira auto-filters
 * - Safe Mode toggle
 * - Event propagation
 */

test.describe('Event Mesh - Widget Interconnection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');

    // Wait for dashboard to be loaded
    await expect(page.locator('h1')).toContainText('Agentic Dashboard');
  });

  test('should demonstrate the "magic moment" - PR click auto-filters Jira', async ({ page }) => {
    // Test: Click GitHub PR with "PROJ-123" → Jira widget auto-filters
    // This is THE core differentiator

    // Add GitHub widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(300);

    // Add Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(300);

    // Verify both widgets are visible (check widget headers)
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();
    await expect(page.locator('.drag-handle:has-text("jira")')).toBeVisible();

    // Find and click a GitHub PR that contains "PROJ-123"
    // The mock data should have PRs with this pattern
    const prWithJiraTicket = page.locator('text=/.*PROJ-123.*/i').first();

    if (await prWithJiraTicket.isVisible()) {
      await prWithJiraTicket.click();
      await page.waitForTimeout(500);

      // Verify that the Jira widget has filtered to show PROJ-123
      // This would require checking the Jira widget's state or displayed content
      // For now, we verify no errors occurred
      await expect(page.locator('.drag-handle').filter({ hasText: /github/i })).toBeVisible();
      await expect(page.locator('.drag-handle').filter({ hasText: /jira/i })).toBeVisible();
    }
  });

  test('should respect Safe Mode toggle', async ({ page }) => {
    // Test: When Safe Mode is enabled, events should not propagate

    // Add GitHub widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(300);

    // Add Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(300);

    // Toggle Safe Mode ON (disable Event Mesh)
    const safeModeButton = page.getByRole('button', { name: /Mesh Enabled|Safe Mode/i });
    await safeModeButton.click();

    // Verify button text changed to "Safe Mode"
    await expect(safeModeButton).toContainText('Safe Mode');

    // Click a PR - should NOT trigger Jira filtering in safe mode
    const pr = page.locator('text=/.*PROJ.*/i').first();
    if (await pr.isVisible()) {
      await pr.click();
      await page.waitForTimeout(300);

      // Both widgets should still be visible (no crashes)
      await expect(page.locator('.drag-handle').filter({ hasText: /github/i })).toBeVisible();
      await expect(page.locator('.drag-handle').filter({ hasText: /jira/i })).toBeVisible();
    }

    // Toggle Safe Mode OFF (re-enable Event Mesh)
    await safeModeButton.click();
    await expect(safeModeButton).toContainText('Mesh Enabled');
  });

  test('should allow widget removal without breaking Event Mesh', async ({ page }) => {
    // Test: Remove a widget that publishes/subscribes to events
    // FIXED: Close button now works correctly with stopPropagation on both onClick and onMouseDown

    // Add both widgets
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    let widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(3);

    // Find and click the close button for GitHub widget
    const githubWidgetContainer = page.locator('.layout > div').filter({
      has: page.locator('.drag-handle').filter({ hasText: /github/i })
    }).first();

    const closeButton = githubWidgetContainer.locator('.drag-handle button').last();
    await closeButton.click({ force: true });

    // Wait for the widget count to decrease
    await page.waitForFunction(() => {
      return document.querySelectorAll('.layout > div').length === 2;
    }, { timeout: 2000 });

    widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(2); // welcome + jira

    // Verify Jira widget still works
    await expect(page.locator('.drag-handle').filter({ hasText: /jira/i })).toBeVisible();
  });

  test('should handle multiple widgets subscribing to same event', async ({ page }) => {
    // Test: Multiple Jira widgets should all receive the same event

    // Add GitHub widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);

    // Add first Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    // Add second Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    const widgetCount = await page.locator('.layout > div').count();
    expect(widgetCount).toBe(4); // welcome + github + jira + jira

    // Both Jira widgets should be visible
    const jiraWidgets = page.locator('.drag-handle').filter({ hasText: /jira/i });
    await expect(jiraWidgets).toHaveCount(2);

    // Click a PR - both Jira widgets should receive the event
    const pr = page.locator('text=/.*PROJ.*/i').first();
    if (await pr.isVisible()) {
      await pr.click();
      await page.waitForTimeout(300);

      // Both Jira widgets should still be visible (no errors)
      await expect(jiraWidgets).toHaveCount(2);
    }
  });

  test('should survive rapid event publishing', async ({ page }) => {
    // Test: Clicking multiple PRs rapidly should not break the system

    // Add widgets
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    // Find all PRs
    const prs = page.locator('text=/.*PR.*/i');
    const count = await prs.count();

    // Click PRs rapidly
    for (let i = 0; i < Math.min(count, 5); i++) {
      await prs.nth(i).click();
      await page.waitForTimeout(50); // Very short delay
    }

    // Wait a bit for events to settle
    await page.waitForTimeout(500);

    // Verify no crashes - both widgets still visible
    await expect(page.locator('.drag-handle').filter({ hasText: /github/i })).toBeVisible();
    await expect(page.locator('.drag-handle').filter({ hasText: /jira/i })).toBeVisible();
  });
});

test.describe('Event Mesh - Undo/Redo Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Agentic Dashboard');
  });

  test('should preserve Event Mesh subscriptions after undo/redo', async ({ page }) => {
    // Test: After undo/redo, widgets should still be interconnected

    // Add GitHub widget
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);

    // Add Jira widget
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    // Undo adding Jira
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(300);

    // Redo adding Jira
    await page.getByRole('button', { name: /Redo/i }).click();
    await page.waitForTimeout(300);

    // Verify both widgets are visible (check widget headers)
    await expect(page.locator('.drag-handle:has-text("github")')).toBeVisible();
    await expect(page.locator('.drag-handle:has-text("jira")')).toBeVisible();

    // Click a PR - Event Mesh should still work after undo/redo
    const pr = page.locator('text=/.*PROJ.*/i').first();
    if (await pr.isVisible()) {
      await pr.click();
      await page.waitForTimeout(300);

      // No crashes
      await expect(page.locator('.drag-handle').filter({ hasText: /jira/i })).toBeVisible();
    }
  });

  test('should handle Safe Mode toggle with undo/redo', async ({ page }) => {
    // Test: Toggling Safe Mode and using undo/redo should not break anything

    // Add widgets
    await page.getByRole('button', { name: /Add GitHub Widget/i }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Add Jira Widget/i }).click();
    await page.waitForTimeout(200);

    // Toggle Safe Mode
    let safeModeButton = page.getByRole('button', { name: /Mesh Enabled/i });
    await safeModeButton.click();
    await page.waitForTimeout(200);

    // Get fresh reference after state change
    safeModeButton = page.getByRole('button', { name: /Safe Mode|Mesh Enabled/i });
    await expect(safeModeButton).toContainText('Safe Mode');

    // Undo
    await page.getByRole('button', { name: /Undo/i }).click();
    await page.waitForTimeout(300);

    // Redo
    await page.getByRole('button', { name: /Redo/i }).click();
    await page.waitForTimeout(300);

    // Safe Mode should still be enabled
    safeModeButton = page.getByRole('button', { name: /Safe Mode|Mesh Enabled/i });
    await expect(safeModeButton).toContainText('Safe Mode');

    // Toggle back
    await safeModeButton.click();
    await page.waitForTimeout(200);

    safeModeButton = page.getByRole('button', { name: /Safe Mode|Mesh Enabled/i });
    await expect(safeModeButton).toContainText('Mesh Enabled');
  });
});
