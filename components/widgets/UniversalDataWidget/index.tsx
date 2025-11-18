'use client';

/**
 * UniversalDataWidget - Month 3 Prototype
 *
 * A declarative, config-driven widget that can display data from any source
 * without writing custom React code.
 *
 * Features:
 * - Declarative JSON configuration
 * - Multiple view types (list, table, card, stat)
 * - Event Mesh integration (publish/subscribe)
 * - Data transformation (mapping, filtering, sorting)
 * - Secure (no code execution)
 *
 * This is a PROTOTYPE to validate the design before full implementation.
 */

import { useState, useEffect } from 'react';
import { useEventMesh, useEventSubscription } from '@/lib/event-mesh/mesh';
import {
  UniversalWidgetConfig,
  DataItem,
  UniversalWidgetState,
} from '@/lib/widgets/universal-config';
import { transformData } from '@/lib/widgets/universal-transformer';
import { ListView } from './ListView';

export interface UniversalDataWidgetProps {
  config: UniversalWidgetConfig;
  widgetId?: string;
}

export function UniversalDataWidget({ config, widgetId = 'universal-widget' }: UniversalDataWidgetProps) {
  const publish = useEventMesh((state) => state.publish);

  const [state, setState] = useState<UniversalWidgetState>({
    loading: true,
    error: null,
    data: [],
    filteredData: [],
    selectedItem: null,
  });

  // ============================================================================
  // Data Fetching
  // ============================================================================

  /**
   * Fetch data based on data source config
   */
  const fetchData = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { dataSource } = config;

      let rawData: any;

      // Handle different data source types
      switch (dataSource.type) {
        case 'static':
          rawData = dataSource.data;
          break;

        case 'api':
          const response = await fetch(dataSource.endpoint, {
            method: dataSource.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...dataSource.params,
            },
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
          }

          rawData = await response.json();
          break;

        case 'event-driven':
          // Data will be set via event subscription
          rawData = [];
          break;

        default:
          throw new Error(`Unknown data source type: ${(dataSource as any).type}`);
      }

      // Transform data
      const transformedData = transformData(rawData, config.transform);

      setState((prev) => ({
        ...prev,
        loading: false,
        data: transformedData,
        filteredData: transformedData,
      }));
    } catch (error) {
      console.error('[UniversalDataWidget] Data fetch error:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();

    // Set up auto-refresh if configured
    const { dataSource } = config;
    if (dataSource.type === 'api' && dataSource.refreshInterval) {
      const interval = setInterval(fetchData, dataSource.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [config]);

  // ============================================================================
  // Event Mesh Integration
  // ============================================================================

  /**
   * Subscribe to events if configured
   */
  useEffect(() => {
    if (!config.subscriptions) return;

    // Set up subscriptions
    config.subscriptions.forEach((sub) => {
      console.log(`[UniversalDataWidget] Subscribing to ${sub.pattern}`);
    });
  }, [config.subscriptions]);

  /**
   * Handle event subscription for filtering
   */
  if (config.subscriptions) {
    config.subscriptions.forEach((sub) => {
      if (sub.action === 'filter' && sub.filterBy) {
        useEventSubscription(
          sub.pattern,
          (eventData) => {
            console.log(`[UniversalDataWidget] Received event:`, eventData);

            const eventValue = eventData[sub.filterBy!.eventField];
            if (!eventValue) {
              // Clear filter
              setState((prev) => ({ ...prev, filteredData: prev.data }));
              return;
            }

            // Filter data
            const filtered = state.data.filter(
              (item) => item[sub.filterBy!.widgetField] === eventValue
            );

            setState((prev) => ({ ...prev, filteredData: filtered }));
          },
          widgetId
        );
      }
    });
  }

  /**
   * Handle item click
   */
  const handleItemClick = (item: DataItem) => {
    setState((prev) => ({ ...prev, selectedItem: item }));

    // Publish event if configured
    if (config.events?.onItemClick) {
      const { eventName, payload, source } = config.events.onItemClick;

      // Extract payload fields
      const eventPayload: Record<string, any> = {};
      payload.forEach((field) => {
        eventPayload[field] = item[field];
      });

      publish(eventName, eventPayload, source || widgetId);

      console.log(`[UniversalDataWidget] Published event: ${eventName}`, eventPayload);
    }
  };

  // ============================================================================
  // Rendering
  // ============================================================================

  const { display } = config;

  // Loading state
  if (state.loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{config.name}</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{config.name}</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-sm text-red-600">
          Error: {state.error}
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="flex flex-col h-full">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{config.name}</h3>
        {config.description && (
          <span className="text-xs text-muted-foreground">
            {state.filteredData.length} items
          </span>
        )}
      </div>

      {/* View Renderer */}
      {display.view === 'list' && (
        <ListView
          data={state.filteredData}
          config={display}
          selectedItem={state.selectedItem}
          onItemClick={handleItemClick}
        />
      )}

      {display.view === 'table' && (
        <div className="text-muted-foreground text-sm">
          Table view not yet implemented
        </div>
      )}

      {display.view === 'card' && (
        <div className="text-muted-foreground text-sm">
          Card view not yet implemented
        </div>
      )}

      {display.view === 'stat' && (
        <div className="text-muted-foreground text-sm">
          Stat view not yet implemented
        </div>
      )}
    </div>
  );
}
