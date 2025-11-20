/**
 * Widget Registry
 *
 * Central registry of all widget types, their current versions,
 * and metadata. This enables widget versioning and safe evolution.
 *
 * When you add a new widget or update an existing one:
 * 1. Register it here with version number
 * 2. If updating, increment version and add migration in migrations.ts
 */

export interface WidgetMetadata {
  type: string;
  version: number;
  name: string;
  description: string;
  defaultConfig: Record<string, any>;
}

/**
 * Widget Registry
 * Maps widget type → metadata
 */
export const WIDGET_REGISTRY: Record<string, WidgetMetadata> = {
  welcome: {
    type: 'welcome',
    version: 1,
    name: 'Welcome',
    description: 'Welcome card with quick start actions',
    defaultConfig: {},
  },
  github: {
    type: 'github',
    version: 1,
    name: 'GitHub Pull Requests',
    description: 'Display pull requests from GitHub repositories',
    defaultConfig: {
      repositories: [],
      filters: [],
    },
  },
  jira: {
    type: 'jira',
    version: 1,
    name: 'Jira Issues',
    description: 'Display Jira issues and auto-filter based on events',
    defaultConfig: {
      project_key: 'PROJ',
      jira_url: '',
    },
  },
  // Universal widgets (JSON-based)
  'github-prs': {
    type: 'github-prs',
    version: 1,
    name: 'GitHub Pull Requests',
    description: 'View and track pull requests from your repositories (Universal)',
    defaultConfig: {},
  },
  'linear-issues': {
    type: 'linear-issues',
    version: 1,
    name: 'Linear Issues',
    description: 'View and track issues assigned to you (Universal)',
    defaultConfig: {},
  },
  'slack-messages': {
    type: 'slack-messages',
    version: 1,
    name: 'Slack Channels',
    description: 'View recent messages from your Slack channels (Universal)',
    defaultConfig: {},
  },
  'calendar-events': {
    type: 'calendar-events',
    version: 1,
    name: 'Calendar Events',
    description: 'View your upcoming calendar events (Universal)',
    defaultConfig: {},
  },
};

/**
 * Get widget metadata by type
 */
export function getWidgetMetadata(type: string): WidgetMetadata | undefined {
  return WIDGET_REGISTRY[type];
}

/**
 * Get current version for a widget type
 */
export function getCurrentVersion(type: string): number {
  const metadata = getWidgetMetadata(type);
  return metadata?.version ?? 1;
}

/**
 * Check if a widget type exists
 */
export function widgetExists(type: string): boolean {
  return type in WIDGET_REGISTRY;
}

/**
 * List all available widget types
 */
export function listWidgetTypes(): string[] {
  return Object.keys(WIDGET_REGISTRY);
}
