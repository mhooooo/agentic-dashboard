'use client';

/**
 * UniversalDataWidget
 *
 * Renders widgets declaratively from JSON configuration.
 * No code execution - just data transformation and rendering.
 *
 * This component:
 * 1. Fetches data from configured API endpoint
 * 2. Transforms data using field mappings
 * 3. Renders UI based on layout config
 * 4. Publishes events on interaction
 * 5. Subscribes to events and filters data
 */

import { useState, useEffect, useRef } from 'react';
import { useEventMesh } from '@/lib/event-mesh/mesh';
import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
import {
  transformData,
  filterData,
  applyTemplate,
  extractByPath,
} from '@/lib/universal-widget/transformers';

export interface UniversalDataWidgetProps {
  /** Widget definition (JSON config) */
  definition: UniversalWidgetDefinition;
}

/**
 * Format a value for display (handles Dates, objects, etc.)
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function UniversalDataWidget({ definition }: UniversalDataWidgetProps) {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [filteredData, setFilteredData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const publish = useEventMesh((state) => state.publish);
  const subscribe = useEventMesh((state) => state.subscribe);
  const unsubscribeRef = useRef<(() => void)[]>([]);

  /**
   * Fetch data from API
   */
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { provider, endpoint, method, params, body, dataPath } = definition.dataSource;

      // Call backend proxy
      const response = await fetch(`/api/proxy/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          method,
          params,
          ...(body && { body }),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch data');
      }

      // Extract data using dataPath if specified
      let rawData = result.data;
      if (dataPath) {
        rawData = extractByPath(result.data, dataPath);
      }

      // Transform data using field mappings
      const transformed = transformData(rawData, definition.fields);
      setData(transformed);
      setFilteredData(transformed);
    } catch (err) {
      console.error(`[UniversalWidget:${definition.metadata.name}] Error:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Setup data fetching and polling
   */
  useEffect(() => {
    fetchData();

    // Setup polling if configured
    const pollInterval = definition.dataSource.pollInterval || 0;
    if (pollInterval > 0) {
      const interval = setInterval(fetchData, pollInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [definition]);

  /**
   * Setup event subscriptions
   */
  useEffect(() => {
    if (!definition.subscriptions) return;

    const unsubscribers: (() => void)[] = [];

    for (const subscription of definition.subscriptions) {
      const unsubscribe = subscribe(subscription.pattern, (event) => {
        console.log(
          `[UniversalWidget:${definition.metadata.name}] Received event:`,
          event.type,
          event.payload
        );

        // Apply filter if configured
        if (subscription.action.filter) {
          const filtered = filterData(data, subscription.action.filter, event.payload);
          setFilteredData(filtered);
        }

        // Show notification if configured
        if (subscription.action.notification) {
          const message = applyTemplate(
            subscription.action.notification.message,
            { event: event.payload }
          );
          console.log(`[Notification] ${message}`);
          // TODO: Show toast notification
        }
      });

      unsubscribers.push(unsubscribe);
    }

    unsubscribeRef.current = unsubscribers;

    return () => {
      unsubscribers.forEach((fn) => fn());
    };
  }, [definition, data, subscribe]);

  /**
   * Handle item selection/click
   */
  const handleItemClick = (item: Record<string, any>, index: number) => {
    const itemId = item.id || item.number || String(index);
    setSelectedId(itemId);

    // Publish event if configured
    if (definition.interactions?.onSelect) {
      const { eventName, payload, source } = definition.interactions.onSelect;

      // Build event payload using template substitution
      const eventPayload: Record<string, any> = {};
      for (const [key, template] of Object.entries(payload)) {
        eventPayload[key] = applyTemplate(template, item);
      }

      publish(eventName, eventPayload, source);

      console.log(
        `[UniversalWidget:${definition.metadata.name}] Published:`,
        eventName,
        eventPayload
      );
    }
  };

  /**
   * Render layout based on configuration
   */
  const renderLayout = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          Loading...
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-sm">
          <p className="text-red-600 mb-2">{error}</p>
          {definition.errorMessage && (
            <p className="text-muted-foreground text-xs">{definition.errorMessage}</p>
          )}
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          {definition.emptyMessage || 'No data'}
        </div>
      );
    }

    switch (definition.layout.type) {
      case 'list':
        return renderList();
      case 'table':
        return renderTable();
      case 'cards':
        return renderCards();
      case 'metric':
        return renderMetric();
      default:
        return (
          <div className="text-sm text-muted-foreground">
            Unsupported layout: {definition.layout.type}
          </div>
        );
    }
  };

  /**
   * Render list layout
   */
  const renderList = () => {
    if (definition.layout.type !== 'list') return null;

    const { fields } = definition.layout;

    return (
      <div className="space-y-2 overflow-auto flex-1">
        {filteredData.map((item, index) => {
          const itemId = item.id || item.number || String(index);
          const isSelected = selectedId === itemId;

          return (
            <button
              key={itemId}
              onClick={() => handleItemClick(item, index)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
              }`}
            >
              {/* Title */}
              <div className="font-medium text-sm mb-1 line-clamp-2">{item[fields.title]}</div>

              {/* Subtitle */}
              {fields.subtitle && (
                <div className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {item[fields.subtitle]}
                </div>
              )}

              {/* Metadata */}
              {fields.metadata && fields.metadata.length > 0 && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {fields.metadata.map((metaField) => (
                    <span key={metaField}>{formatValue(item[metaField])}</span>
                  ))}
                </div>
              )}

              {/* Badge */}
              {fields.badge && (
                <div className="mt-2">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      fields.badge.colorMap[item[fields.badge.field]] || 'bg-gray-100'
                    }`}
                  >
                    {item[fields.badge.field]}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  /**
   * Render table layout
   */
  const renderTable = () => {
    if (definition.layout.type !== 'table') return null;

    const { columns } = definition.layout;

    return (
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className="text-left p-2 font-medium"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr
                key={index}
                onClick={() => handleItemClick(item, index)}
                className="border-b hover:bg-accent cursor-pointer"
              >
                {columns.map((col) => (
                  <td key={col.field} className="p-2 max-w-xs truncate">
                    {formatValue(item[col.field])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /**
   * Render cards layout
   */
  const renderCards = () => {
    if (definition.layout.type !== 'cards') return null;

    const { card } = definition.layout;

    return (
      <div
        className="grid gap-4 overflow-auto flex-1"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}
      >
        {filteredData.map((item, index) => (
          <div
            key={index}
            onClick={() => handleItemClick(item, index)}
            className="border rounded-lg p-4 hover:border-primary cursor-pointer"
          >
            {/* Image */}
            {card.image && (
              <img
                src={item[card.image]}
                alt={item[card.title]}
                className="w-full h-32 object-cover rounded mb-2"
              />
            )}

            {/* Title */}
            <h4 className="font-medium text-sm mb-1 line-clamp-2">{item[card.title]}</h4>

            {/* Description */}
            {card.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-3">{item[card.description]}</p>
            )}

            {/* Metadata */}
            {card.metadata && (
              <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                {card.metadata.map((field) => (
                  <span key={field}>{formatValue(item[field])}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render metric layout
   */
  const renderMetric = () => {
    if (definition.layout.type !== 'metric') return null;

    const { value, label } = definition.layout;
    const metricValue = filteredData[0]?.[value] || 0;

    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-4xl font-bold">{metricValue}</div>
        <div className="text-sm text-muted-foreground mt-2">{label}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{definition.metadata.name}</h3>
          {definition.metadata.description && (
            <p className="text-xs text-muted-foreground">{definition.metadata.description}</p>
          )}
        </div>
        {!loading && !error && filteredData.length > 0 && (
          <span className="text-sm text-muted-foreground">{filteredData.length} items</span>
        )}
      </div>

      {/* Content */}
      {renderLayout()}
    </div>
  );
}
