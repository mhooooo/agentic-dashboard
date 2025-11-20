/**
 * Data Transformation Utilities for UniversalDataWidget
 *
 * Handles:
 * - Path extraction from nested responses
 * - Field mapping and renaming
 * - Whitelisted transformers (safe functions)
 * - Filtering and sorting
 *
 * Security: No eval(), no Function(), only whitelisted transformations
 */

import { TransformConfig, DataItem } from './universal-config';

// ============================================================================
// Whitelisted Transformer Functions
// ============================================================================

/**
 * Extract Jira ticket ID from text (e.g., "PROJ-123: Fix bug" → "PROJ-123")
 */
function extractJiraKey(text: string): string | null {
  const match = text.match(/([A-Z]+-\d+)/);
  return match ? match[1] : null;
}

/**
 * Format date as relative time (e.g., "2 days ago")
 */
function relativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
}

/**
 * Uppercase text
 */
function uppercase(text: string): string {
  return text.toUpperCase();
}

/**
 * Lowercase text
 */
function lowercase(text: string): string {
  return text.toLowerCase();
}

/**
 * Registry of whitelisted transformers
 */
const TRANSFORMERS: Record<string, (value: any) => any> = {
  extractJiraKey,
  relativeTime,
  uppercase,
  lowercase,
};

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Get nested value from object using dot notation
 * Example: getNestedValue({ user: { name: "Alice" } }, "user.name") → "Alice"
 */
export function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }

  return current;
}

/**
 * Apply transformer function to a value
 * Syntax: "field|transformer" or just "field"
 */
function applyTransformer(value: any, transformerName: string): any {
  const transformer = TRANSFORMERS[transformerName];
  if (!transformer) {
    console.warn(`[UniversalWidget] Unknown transformer: ${transformerName}`);
    return value;
  }

  try {
    return transformer(value);
  } catch (error) {
    console.error(`[UniversalWidget] Transformer error:`, error);
    return value;
  }
}

/**
 * Map a single item according to mapItem config
 */
function mapItem(item: any, mapConfig: Record<string, string>): DataItem {
  const mapped: DataItem = {};

  for (const [newKey, fieldPath] of Object.entries(mapConfig)) {
    // Check if transformer is specified: "field|transformer"
    const [path, transformerName] = fieldPath.split('|');
    let value = getNestedValue(item, path.trim());

    // Apply transformer if specified
    if (transformerName) {
      value = applyTransformer(value, transformerName.trim());
    }

    mapped[newKey] = value;
  }

  return mapped;
}

/**
 * Filter items based on filter config
 */
function filterItems(items: DataItem[], filters: TransformConfig['filter']): DataItem[] {
  if (!filters || filters.length === 0) return items;

  return items.filter((item) => {
    return filters.every((filter) => {
      const value = item[filter.field];
      const { operator, value: filterValue } = filter;

      switch (operator) {
        case '==':
          return value == filterValue;
        case '!=':
          return value != filterValue;
        case '>':
          return value > filterValue;
        case '<':
          return value < filterValue;
        case 'contains':
          return String(value).includes(String(filterValue));
        default:
          return true;
      }
    });
  });
}

/**
 * Sort items based on sort config
 */
function sortItems(items: DataItem[], sort: TransformConfig['sort']): DataItem[] {
  if (!sort) return items;

  const { field, direction } = sort;

  return [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Transform raw data according to transform config
 */
export function transformData(rawData: any, config?: TransformConfig): DataItem[] {
  // If no config, assume data is already in correct format
  if (!config) {
    return Array.isArray(rawData) ? rawData : [rawData];
  }

  // Step 1: Extract data from nested path
  let data = rawData;
  if (config.path) {
    data = getNestedValue(rawData, config.path);
  }

  // Ensure data is an array
  if (!Array.isArray(data)) {
    console.warn('[UniversalWidget] Data is not an array:', data);
    return [];
  }

  // Step 2: Map items
  let items = data;
  if (config.mapItem) {
    items = data.map((item) => mapItem(item, config.mapItem!));
  }

  // Step 3: Filter items
  if (config.filter) {
    items = filterItems(items, config.filter);
  }

  // Step 4: Sort items
  if (config.sort) {
    items = sortItems(items, config.sort);
  }

  return items;
}

/**
 * Evaluate simple condition expression
 * Security: Only supports simple === comparisons, no eval()
 *
 * Example: "state === 'open'" with item { state: 'open' } → true
 */
export function evaluateCondition(condition: string, item: DataItem): boolean {
  try {
    // Parse simple conditions: "field === 'value'" or "field !== 'value'"
    const eqMatch = condition.match(/^(\w+)\s*===\s*['"](.+)['"]$/);
    const neqMatch = condition.match(/^(\w+)\s*!==\s*['"](.+)['"]$/);

    if (eqMatch) {
      const [, field, value] = eqMatch;
      return item[field] === value;
    }

    if (neqMatch) {
      const [, field, value] = neqMatch;
      return item[field] !== value;
    }

    // Fallback: return true if we can't parse
    console.warn(`[UniversalWidget] Cannot parse condition: ${condition}`);
    return true;
  } catch (error) {
    console.error(`[UniversalWidget] Condition evaluation error:`, error);
    return true;
  }
}
