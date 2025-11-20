/**
 * Widget Data Fetching Hook
 *
 * Uses SWR for efficient data fetching with automatic caching and revalidation.
 * Supports static data, API endpoints (via proxy), and event-driven data.
 */

'use client';

import useSWR from 'swr';
import type { DataSourceConfig, ApiDataSource } from './universal-config';

interface UseWidgetDataOptions {
  dataSource: DataSourceConfig;
  enabled?: boolean;
}

interface WidgetDataResult<T = any> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<any>;
}

/**
 * Fetcher function for SWR
 *
 * Makes POST requests to the API proxy endpoint
 */
async function apiFetcher(url: string, options: any): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.error?.message || `API request failed: ${response.statusText}`
    );
    (error as any).code = errorData.error?.code;
    (error as any).retryable = errorData.error?.retryable;
    throw error;
  }

  const result = await response.json();

  if (!result.success) {
    const error = new Error(result.error?.message || 'API request failed');
    (error as any).code = result.error?.code;
    throw error;
  }

  return result.data;
}

/**
 * Hook for fetching widget data
 *
 * @param options - Data source configuration and options
 * @returns SWR result with data, error, and loading states
 */
export function useWidgetData<T = any>(options: UseWidgetDataOptions): WidgetDataResult<T> {
  const { dataSource, enabled = true } = options;

  // Handle static data (no fetching needed)
  if (dataSource.type === 'static') {
    return {
      data: dataSource.data as T,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: async () => dataSource.data,
    };
  }

  // Handle event-driven data (managed externally)
  if (dataSource.type === 'event-driven') {
    return {
      data: [] as T,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: async () => [],
    };
  }

  // Handle API data sources
  if (dataSource.type === 'api') {
    const apiSource = dataSource as ApiDataSource;

    // Build SWR key (unique identifier for caching)
    const swrKey = enabled
      ? [apiSource.endpoint, apiSource.method, apiSource.params]
      : null;

    // Use SWR with custom fetcher
    const result = useSWR(
      swrKey,
      ([endpoint, method, params]) => apiFetcher(endpoint, { endpoint: params?.endpoint || '', method, params: params?.params }),
      {
        refreshInterval: apiSource.refreshInterval || 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000, // Dedupe requests within 5 seconds
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        onError: (error) => {
          console.error('[useWidgetData] Fetch error:', error);
        },
      }
    );

    return {
      data: result.data as T,
      error: result.error,
      isLoading: !result.error && !result.data,
      isValidating: result.isValidating,
      mutate: result.mutate,
    };
  }

  // Unknown data source type
  return {
    data: undefined,
    error: new Error(`Unknown data source type: ${(dataSource as any).type}`),
    isLoading: false,
    isValidating: false,
    mutate: async () => undefined,
  };
}

/**
 * Hook for manually triggering data refresh
 *
 * Useful for user-triggered refreshes or after mutations.
 */
export function useRefreshWidget(mutate: () => Promise<any>) {
  return async () => {
    try {
      await mutate();
    } catch (error) {
      console.error('[useRefreshWidget] Refresh error:', error);
      throw error;
    }
  };
}
