/**
 * UniversalDataWidget Schema
 *
 * JSON schema for declaratively defining widgets without writing React code.
 * Covers 80% of use cases: lists, tables, cards, metrics, charts.
 *
 * Philosophy:
 * - Security: No code execution, only data transformation via JSONPath/templates
 * - Simplicity: Schema is readable and maintainable by non-developers
 * - Power: Supports most common widget patterns
 */

/**
 * Data source configuration
 * Defines how to fetch data from an API
 */
export interface DataSource {
  /** Provider name (github, jira, slack, etc.) */
  provider: string;

  /** API endpoint path */
  endpoint: string;

  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /** Query parameters (can use template variables) */
  params?: Record<string, string | number | boolean>;

  /** Request body (for POST/PUT) */
  body?: Record<string, any>;

  /** Polling interval in seconds (0 = no polling) */
  pollInterval?: number;

  /** JSONPath to extract data from response (e.g., "$.data.items") */
  dataPath?: string;
}

/**
 * Field definition for data transformation
 * Maps API response fields to widget display fields
 */
export interface FieldMapping {
  /** Internal field name */
  name: string;

  /** JSONPath to extract value from item (e.g., "$.user.login") */
  path: string;

  /** Display label */
  label?: string;

  /** Data type */
  type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'enum';

  /** Format template (e.g., "{{value}} days ago" or "{{firstName}} {{lastName}}") */
  format?: string;

  /** For enum types, mapping of values to display labels */
  enumLabels?: Record<string, string>;
}

/**
 * Layout configuration
 * Defines how to display the data
 */
export type LayoutType = 'list' | 'table' | 'cards' | 'metric' | 'chart';

export interface ListLayout {
  type: 'list';

  /** Fields to display in each item */
  fields: {
    /** Primary text (required) */
    title: string;

    /** Secondary text (optional) */
    subtitle?: string;

    /** Right-aligned metadata (optional) */
    metadata?: string[];

    /** Badge/status field (optional) */
    badge?: {
      field: string;
      colorMap: Record<string, string>; // value -> color
    };
  };

  /** Enable search/filter */
  searchable?: boolean;

  /** Field to search on */
  searchField?: string;
}

export interface TableLayout {
  type: 'table';

  /** Columns to display */
  columns: Array<{
    field: string;
    header: string;
    width?: string; // e.g., "200px" or "auto"
    sortable?: boolean;
  }>;

  /** Enable sorting */
  sortable?: boolean;

  /** Default sort field and direction */
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface CardsLayout {
  type: 'cards';

  /** Card template */
  card: {
    title: string;
    description?: string;
    image?: string;
    metadata?: string[];
    actions?: Array<{
      label: string;
      event: EventPublish;
    }>;
  };

  /** Grid columns */
  columns?: number;
}

export interface MetricLayout {
  type: 'metric';

  /** Metric value field */
  value: string;

  /** Metric label */
  label: string;

  /** Optional comparison value */
  comparison?: {
    field: string;
    label: string;
  };

  /** Value format (e.g., "number", "currency", "percentage") */
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}

export interface ChartLayout {
  type: 'chart';

  /** Chart type */
  chartType: 'line' | 'bar' | 'pie' | 'area';

  /** X-axis field */
  xAxis: string;

  /** Y-axis field(s) */
  yAxis: string | string[];

  /** Chart title */
  title?: string;

  /** Legend */
  legend?: boolean;
}

export type Layout = ListLayout | TableLayout | CardsLayout | MetricLayout | ChartLayout;

/**
 * Event publish configuration
 * Defines what events to publish when user interacts
 */
export interface EventPublish {
  /** Event name (e.g., "github.pr.selected") */
  eventName: string;

  /** Payload template - uses field names as variables */
  payload: Record<string, string>;

  /** Source identifier */
  source: string;
}

/**
 * Event subscription configuration
 * Defines what events to listen for and how to react
 */
export interface EventSubscription {
  /** Event pattern to match (e.g., "github.pr.*") */
  pattern: string;

  /** Action to take when event received */
  action: {
    /** Filter the displayed data */
    filter?: {
      field: string;
      operator: 'equals' | 'contains' | 'startsWith' | 'in';
      value: string; // Can reference event payload via {{event.field}}
    };

    /** Highlight matching items */
    highlight?: {
      field: string;
      value: string; // Can reference event payload
    };

    /** Show notification */
    notification?: {
      message: string; // Template string
    };
  };
}

/**
 * Complete widget definition
 * This is the JSON schema that defines a widget
 */
export interface UniversalWidgetDefinition {
  /** Widget metadata */
  metadata: {
    /** Widget name */
    name: string;

    /** Widget description */
    description: string;

    /** Category (development, project-management, analytics, etc.) */
    category: string;

    /** Schema version */
    version: number;
  };

  /** Data source configuration */
  dataSource: DataSource;

  /** Field mappings - how to transform API data */
  fields: FieldMapping[];

  /** Layout configuration - how to display data */
  layout: Layout;

  /** Interactions - what happens on click/select */
  interactions?: {
    /** Event to publish when item is clicked/selected */
    onSelect?: EventPublish;
  };

  /** Event subscriptions - what events to listen for */
  subscriptions?: EventSubscription[];

  /** Empty state message */
  emptyMessage?: string;

  /** Error state message */
  errorMessage?: string;
}

/**
 * Validation function for widget definitions
 */
export function validateWidgetDefinition(def: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!def.metadata?.name) errors.push('metadata.name is required');
  if (!def.dataSource?.provider) errors.push('dataSource.provider is required');
  if (!def.dataSource?.endpoint) errors.push('dataSource.endpoint is required');
  if (!def.layout?.type) errors.push('layout.type is required');
  if (!def.fields || def.fields.length === 0) errors.push('fields array is required');

  // Validate field mappings
  def.fields?.forEach((field: any, index: number) => {
    if (!field.name) errors.push(`fields[${index}].name is required`);
    if (!field.path) errors.push(`fields[${index}].path is required`);
    if (!field.type) errors.push(`fields[${index}].type is required`);
  });

  // Validate layout-specific fields
  if (def.layout?.type === 'list' && !def.layout.fields?.title) {
    errors.push('list layout requires fields.title');
  }

  if (def.layout?.type === 'table' && (!def.layout.columns || def.layout.columns.length === 0)) {
    errors.push('table layout requires columns array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
