/**
 * Widget Migrations
 *
 * Define how to migrate widget configs from old versions to new versions.
 * Each migration function transforms config from version N to N+1.
 *
 * Example: When updating GitHub widget from v1 to v2:
 * 1. Increment version in registry.ts (github: { version: 2, ... })
 * 2. Add migration here: github: { 1: (config) => { ...transform... } }
 * 3. Old widgets auto-upgrade when loaded
 */

/**
 * Migration function type
 * Transforms config from version N to N+1
 */
export type WidgetMigration = (oldConfig: Record<string, any>) => Record<string, any>;

/**
 * Widget Migrations Registry
 * Structure: { widgetType: { fromVersion: migrationFunction } }
 *
 * Example:
 * {
 *   'github': {
 *     1: (config) => ({ ...config, newField: 'default' }),  // v1 → v2
 *     2: (config) => ({ ...config, anotherField: [] }),     // v2 → v3
 *   }
 * }
 */
export const WIDGET_MIGRATIONS: Record<string, Record<number, WidgetMigration>> = {
  // Welcome widget migrations
  welcome: {
    // No migrations yet (still on v1)
  },

  // GitHub widget migrations
  github: {
    // Example migration (not active, since we're still on v1):
    // 1: (config) => ({
    //   ...config,
    //   // Add new field with default value
    //   autoRefresh: false,
    // }),
  },

  // Jira widget migrations
  jira: {
    // Example migration (not active, since we're still on v1):
    // 1: (config) => ({
    //   ...config,
    //   // Rename field
    //   projectKey: config.project_key,
    //   jiraUrl: config.jira_url,
    // }),
  },
};

/**
 * Apply migrations to upgrade a widget config from oldVersion to newVersion
 *
 * Example: Upgrading from v1 to v3 applies migrations 1→2, then 2→3
 */
export function migrateWidgetConfig(
  widgetType: string,
  config: Record<string, any>,
  fromVersion: number,
  toVersion: number
): Record<string, any> {
  // No migration needed if versions match
  if (fromVersion === toVersion) {
    return config;
  }

  // Get migrations for this widget type
  const migrations = WIDGET_MIGRATIONS[widgetType] || {};

  // Apply migrations sequentially
  let migratedConfig = { ...config };
  for (let version = fromVersion; version < toVersion; version++) {
    const migration = migrations[version];
    if (migration) {
      try {
        migratedConfig = migration(migratedConfig);
        console.log(
          `[Widget Migration] ${widgetType}: v${version} → v${version + 1}`,
          migratedConfig
        );
      } catch (error) {
        console.error(
          `[Widget Migration] Failed to migrate ${widgetType} from v${version} to v${version + 1}:`,
          error
        );
        // On error, return current state (fail gracefully)
        return migratedConfig;
      }
    } else {
      console.warn(
        `[Widget Migration] No migration defined for ${widgetType} v${version} → v${version + 1}`
      );
    }
  }

  return migratedConfig;
}

/**
 * Check if a migration is needed
 */
export function needsMigration(
  widgetType: string,
  currentVersion: number,
  targetVersion: number
): boolean {
  if (currentVersion >= targetVersion) {
    return false;
  }

  const migrations = WIDGET_MIGRATIONS[widgetType] || {};

  // Check if we have migrations for all required versions
  for (let version = currentVersion; version < targetVersion; version++) {
    if (!migrations[version]) {
      return false; // Missing migration, cannot upgrade
    }
  }

  return true;
}
