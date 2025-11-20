/**
 * Data Transformation Utilities
 *
 * Utilities for transforming API responses into widget data
 * using JSONPath extraction and template strings.
 *
 * Security: No eval() or Function() - only safe string operations
 */

import type { FieldMapping } from './schema';

/**
 * Simple JSONPath implementation
 * Supports basic path expressions like:
 * - $.field
 * - $.nested.field
 * - $.array[0]
 * - $.array[*].field
 *
 * Note: This is a simplified version. For production, consider using a library like jsonpath-plus
 */
export function extractByPath(data: any, path: string): any {
  if (!path || path === '$') return data;

  // Remove leading $. if present
  const cleanPath = path.replace(/^\$\.?/, '');

  // Split path into segments
  const segments = cleanPath.split('.');

  let current = data;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array access: field[0] or field[*]
    const arrayMatch = segment.match(/^(\w+)\[(\d+|\*)\]$/);
    if (arrayMatch) {
      const [, field, index] = arrayMatch;

      // Get the array
      current = field ? current[field] : current;

      if (!Array.isArray(current)) {
        return undefined;
      }

      // Handle [*] - return array of values
      if (index === '*') {
        return current;
      }

      // Handle [0] - return specific index
      current = current[parseInt(index)];
    } else {
      // Simple field access
      current = current[segment];
    }
  }

  return current;
}

/**
 * Apply field mappings to transform raw API data
 */
export function transformData(
  rawData: any[],
  fields: FieldMapping[]
): Record<string, any>[] {
  if (!Array.isArray(rawData)) {
    console.warn('[Transformer] Expected array, got:', typeof rawData);
    return [];
  }

  return rawData.map((item) => {
    const transformed: Record<string, any> = {};

    for (const field of fields) {
      const value = extractByPath(item, field.path);

      // Apply type conversion and formatting
      transformed[field.name] = formatValue(value, field);
    }

    // Keep original item for reference (useful for event payloads)
    transformed._original = item;

    return transformed;
  });
}

/**
 * Format a value based on field configuration
 */
function formatValue(value: any, field: FieldMapping): any {
  if (value === null || value === undefined) {
    return null;
  }

  // Type conversion
  switch (field.type) {
    case 'string':
      value = String(value);
      break;
    case 'number':
      value = Number(value);
      break;
    case 'boolean':
      value = Boolean(value);
      break;
    case 'date':
      value = new Date(value);
      break;
    case 'enum':
      // Map enum value to label if provided
      if (field.enumLabels && typeof value === 'string') {
        value = field.enumLabels[value] || value;
      }
      break;
  }

  // Apply format template
  if (field.format) {
    value = applyTemplate(field.format, { value });
  }

  return value;
}

/**
 * Apply template string
 * Replaces {{variable}} with values from context
 *
 * Examples:
 * - "{{value}} days ago" with {value: 5} => "5 days ago"
 * - "{{firstName}} {{lastName}}" with {firstName: "John", lastName: "Doe"} => "John Doe"
 */
export function applyTemplate(
  template: string,
  context: Record<string, any>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
    const value = extractByPath(context, path);
    return value !== null && value !== undefined ? String(value) : '';
  });
}

/**
 * Filter data based on event payload
 */
export function filterData(
  data: Record<string, any>[],
  filterConfig: {
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'in';
    value: string;
  },
  eventPayload?: Record<string, any>
): Record<string, any>[] {
  // Resolve filter value (may be a template referencing event payload)
  const filterValue = eventPayload
    ? applyTemplate(filterConfig.value, { event: eventPayload })
    : filterConfig.value;

  return data.filter((item) => {
    const itemValue = item[filterConfig.field];

    if (itemValue === null || itemValue === undefined) {
      return false;
    }

    const itemStr = String(itemValue);
    const filterStr = String(filterValue);

    switch (filterConfig.operator) {
      case 'equals':
        return itemStr === filterStr;
      case 'contains':
        return itemStr.toLowerCase().includes(filterStr.toLowerCase());
      case 'startsWith':
        return itemStr.toLowerCase().startsWith(filterStr.toLowerCase());
      case 'in':
        // filterValue should be comma-separated list
        const values = filterStr.split(',').map((v) => v.trim());
        return values.includes(itemStr);
      default:
        return false;
    }
  });
}

/**
 * Relative time formatter
 * Converts a date to "2 days ago", "just now", etc.
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
  return `${Math.floor(diffInDays / 365)}y ago`;
}

/**
 * Number formatter
 */
export function formatNumber(
  value: number,
  format: 'number' | 'currency' | 'percentage' | 'duration'
): string {
  switch (format) {
    case 'number':
      return value.toLocaleString();
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'duration':
      // Assume value is in seconds
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    default:
      return String(value);
  }
}
