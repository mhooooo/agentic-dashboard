/**
 * Widget System
 *
 * Centralized exports for the widget versioning system:
 * - Registry: Widget metadata and versions
 * - Migrations: Upgrade logic between versions
 * - Versioning: Utilities for working with versioned widgets
 */

// Core types
export type { WidgetInstance } from './versioning';
export type { WidgetMetadata } from './registry';
export type { WidgetMigration } from './migrations';

// Registry functions
export {
  WIDGET_REGISTRY,
  getWidgetMetadata,
  getCurrentVersion,
  widgetExists,
  listWidgetTypes,
} from './registry';

// Migration functions
export {
  WIDGET_MIGRATIONS,
  migrateWidgetConfig,
  needsMigration,
} from './migrations';

// Versioning utilities
export {
  ensureLatestVersion,
  createWidgetInstance,
  normalizeWidgetInstance,
  normalizeWidgetInstances,
  getWidgetVersionInfo,
} from './versioning';
