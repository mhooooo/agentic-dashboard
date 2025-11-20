/**
 * Widget Definition Loader
 *
 * Utilities for loading and validating widget definitions from JSON.
 */

import type { UniversalWidgetDefinition } from './schema';
import { validateWidgetDefinition } from './schema';

// Import example definitions (for demo/testing)
import githubPRsExample from './examples/github-prs.json';
import linearIssuesExample from './examples/linear-issues.json';
import slackMessagesExample from './examples/slack-messages.json';
import calendarEventsExample from './examples/calendar-events.json';

/**
 * Registry of available widget definitions
 * In the future, this could be loaded from database or API
 */
const WIDGET_REGISTRY: Record<string, UniversalWidgetDefinition> = {
  'github-prs': githubPRsExample as UniversalWidgetDefinition,
  'linear-issues': linearIssuesExample as UniversalWidgetDefinition,
  'slack-messages': slackMessagesExample as UniversalWidgetDefinition,
  'calendar-events': calendarEventsExample as UniversalWidgetDefinition,
};

/**
 * Load a widget definition by ID
 */
export function loadWidgetDefinition(widgetId: string): UniversalWidgetDefinition | null {
  const definition = WIDGET_REGISTRY[widgetId];

  if (!definition) {
    console.error(`[WidgetLoader] Widget not found: ${widgetId}`);
    return null;
  }

  // Validate definition
  const validation = validateWidgetDefinition(definition);
  if (!validation.valid) {
    console.error(`[WidgetLoader] Invalid definition for ${widgetId}:`, validation.errors);
    return null;
  }

  return definition;
}

/**
 * Register a new widget definition
 * Useful for dynamic widget creation
 */
export function registerWidgetDefinition(
  id: string,
  definition: UniversalWidgetDefinition
): boolean {
  // Validate first
  const validation = validateWidgetDefinition(definition);
  if (!validation.valid) {
    console.error('[WidgetLoader] Cannot register invalid definition:', validation.errors);
    return false;
  }

  WIDGET_REGISTRY[id] = definition;
  console.log(`[WidgetLoader] Registered widget: ${id}`);
  return true;
}

/**
 * List all available widgets
 */
export function listAvailableWidgets(): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
}> {
  return Object.entries(WIDGET_REGISTRY).map(([id, def]) => ({
    id,
    name: def.metadata.name,
    description: def.metadata.description,
    category: def.metadata.category,
  }));
}

/**
 * Parse and validate a widget definition from JSON string
 */
export function parseWidgetDefinition(json: string): {
  success: boolean;
  definition?: UniversalWidgetDefinition;
  errors?: string[];
} {
  try {
    const parsed = JSON.parse(json);
    const validation = validateWidgetDefinition(parsed);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    return {
      success: true,
      definition: parsed as UniversalWidgetDefinition,
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Invalid JSON'],
    };
  }
}
