/**
 * Widget Versioning Utilities
 *
 * Helper functions for working with widget versions:
 * - Validate widget instances
 * - Auto-upgrade old widgets
 * - Ensure backward compatibility
 */

import { getCurrentVersion, getWidgetMetadata, widgetExists } from './registry';
import { migrateWidgetConfig, needsMigration } from './migrations';

/**
 * Widget Instance (with version tracking)
 */
export interface WidgetInstance {
  id: string;
  type: string;
  version: number;
  config: Record<string, any>;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

/**
 * Ensure a widget instance has the latest version
 * Auto-upgrades if needed
 */
export function ensureLatestVersion(widget: WidgetInstance): WidgetInstance {
  const currentVersion = getCurrentVersion(widget.type);

  // Widget is already at latest version
  if (widget.version === currentVersion) {
    return widget;
  }

  // Widget is newer than what we know about (shouldn't happen, but handle gracefully)
  if (widget.version > currentVersion) {
    console.warn(
      `[Widget Versioning] Widget ${widget.type} has version ${widget.version} but registry has v${currentVersion}. Using widget as-is.`
    );
    return widget;
  }

  // Widget is older, try to migrate
  if (needsMigration(widget.type, widget.version, currentVersion)) {
    console.log(
      `[Widget Versioning] Migrating ${widget.type} from v${widget.version} to v${currentVersion}`
    );

    const migratedConfig = migrateWidgetConfig(
      widget.type,
      widget.config,
      widget.version,
      currentVersion
    );

    return {
      ...widget,
      version: currentVersion,
      config: migratedConfig,
    };
  } else {
    // No migration available, use as-is with warning
    console.warn(
      `[Widget Versioning] Cannot migrate ${widget.type} from v${widget.version} to v${currentVersion}. Using old version.`
    );
    return widget;
  }
}

/**
 * Create a new widget instance with current version
 */
export function createWidgetInstance(
  type: string,
  config: Record<string, any>
): WidgetInstance {
  const metadata = getWidgetMetadata(type);

  if (!metadata) {
    throw new Error(`Unknown widget type: ${type}`);
  }

  return {
    id: crypto.randomUUID(),
    type,
    version: metadata.version,
    config: {
      ...metadata.defaultConfig,
      ...config,
    },
  };
}

/**
 * Validate and upgrade a widget instance
 * Handles missing version field (assumes v1) for backward compatibility
 */
export function normalizeWidgetInstance(
  widget: Partial<WidgetInstance> & { id: string; type: string }
): WidgetInstance {
  // Handle widgets without version field (created before versioning)
  const version = widget.version ?? 1;

  // Check if widget type exists
  if (!widgetExists(widget.type)) {
    console.warn(`[Widget Versioning] Unknown widget type: ${widget.type}`);
    // Return as-is, will be handled by Dashboard
    return {
      id: widget.id,
      type: widget.type,
      version,
      config: widget.config ?? {},
    };
  }

  // Create normalized widget
  const normalizedWidget: WidgetInstance = {
    id: widget.id,
    type: widget.type,
    version,
    config: widget.config ?? {},
  };

  // Ensure latest version
  return ensureLatestVersion(normalizedWidget);
}

/**
 * Batch normalize widget instances (for checkpoint restoration)
 */
export function normalizeWidgetInstances(
  widgets: Array<Partial<WidgetInstance> & { id: string; type: string }>
): WidgetInstance[] {
  return widgets.map(normalizeWidgetInstance);
}

/**
 * Get widget version info for debugging
 */
export function getWidgetVersionInfo(widget: WidgetInstance): {
  type: string;
  currentVersion: number;
  latestVersion: number;
  needsUpgrade: boolean;
} {
  const latestVersion = getCurrentVersion(widget.type);

  return {
    type: widget.type,
    currentVersion: widget.version,
    latestVersion,
    needsUpgrade: widget.version < latestVersion,
  };
}
