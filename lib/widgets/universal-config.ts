/**
 * UniversalDataWidget Configuration Schema
 *
 * Declarative JSON configuration for creating data widgets
 * without writing React code.
 *
 * This is a Month 3 prototype - start simple, expand incrementally.
 */

// ============================================================================
// Data Source Configuration
// ============================================================================

export interface ApiDataSource {
  type: 'api';
  endpoint: string;
  method?: 'GET' | 'POST';
  params?: Record<string, any>;
  refreshInterval?: number; // milliseconds
}

export interface StaticDataSource {
  type: 'static';
  data: any[];
}

export interface EventDrivenDataSource {
  type: 'event-driven';
  listenTo: string; // Event pattern
}

export type DataSourceConfig = ApiDataSource | StaticDataSource | EventDrivenDataSource;

// ============================================================================
// Data Transformation Configuration
// ============================================================================

export interface TransformConfig {
  // Select nested path from response
  path?: string; // e.g., "data.items" or "results"

  // Map fields (simple key renaming)
  mapItem?: {
    [newKey: string]: string; // newKey: "path.to.field" or "field|transformer"
  };

  // Filter items (simple conditions)
  filter?: {
    field: string;
    operator: '==' | '!=' | '>' | '<' | 'contains';
    value: any;
  }[];

  // Sort
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

// ============================================================================
// Display Configuration
// ============================================================================

export interface FieldConfig {
  key: string;
  label?: string;
  type?: 'text' | 'number' | 'date' | 'badge' | 'icon' | 'link';
  format?: string; // e.g., "relative-time", "short-date"

  // Conditional styling
  style?: {
    condition?: string; // Simple expression: "state === 'open'"
    className?: string; // Tailwind classes
  }[];
}

export interface DisplayConfig {
  view: 'list' | 'table' | 'card' | 'stat';

  layout?: {
    height?: 'auto' | 'fixed';
    emptyState?: string;
  };

  fields: FieldConfig[];

  actions?: {
    trigger: 'click' | 'hover';
    event: string; // Internal event name
  }[];
}

// ============================================================================
// Event Configuration (Event Mesh Integration)
// ============================================================================

export interface EventConfig {
  onItemClick?: {
    eventName: string; // e.g., "github.pr.selected"
    payload: string[]; // Fields to include
    source?: string; // Event source identifier
  };
}

export interface SubscriptionConfig {
  pattern: string; // Event pattern to listen for
  action: 'filter' | 'highlight' | 'refresh';

  // For action: 'filter'
  filterBy?: {
    eventField: string; // Field in event payload
    widgetField: string; // Field in widget data
  };
}

// ============================================================================
// Top-Level Widget Configuration
// ============================================================================

export interface UniversalWidgetConfig {
  // Identity
  type: 'universal-data';
  version: number;
  name: string;
  description?: string;

  // Data
  dataSource: DataSourceConfig;
  transform?: TransformConfig;

  // Display
  display: DisplayConfig;

  // Event Mesh Integration
  events?: EventConfig;
  subscriptions?: SubscriptionConfig[];
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Transformed data item (normalized shape)
 */
export type DataItem = Record<string, any>;

/**
 * Widget state
 */
export interface UniversalWidgetState {
  loading: boolean;
  error: string | null;
  data: DataItem[];
  filteredData: DataItem[];
  selectedItem: DataItem | null;
}
