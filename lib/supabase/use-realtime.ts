'use client';

/**
 * Real-time Supabase Subscriptions Hook
 *
 * Subscribes to widget_instances table changes and updates dashboard in real-time.
 */

import { useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from './client';
import type { WidgetInstance } from '@/lib/widgets';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseWidgetRealtimeOptions {
  userId: string;
  onInsert?: (widget: WidgetInstance) => void;
  onUpdate?: (widget: WidgetInstance) => void;
  onDelete?: (widgetId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to subscribe to real-time widget changes
 *
 * @param options - Configuration options
 * @returns Connection status and channel
 */
export function useWidgetRealtime({
  userId,
  onInsert,
  onUpdate,
  onDelete,
  onError,
}: UseWidgetRealtimeOptions) {
  const handleInsert = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      try {
        console.log('[Realtime] Widget inserted:', payload.new);

        if (onInsert && payload.new) {
          const widget: WidgetInstance = {
            id: payload.new.id,
            type: payload.new.type,
            version: payload.new.version || 1,
            config: payload.new.config || {},
            layout: payload.new.layout,
          };
          onInsert(widget);
        }
      } catch (error) {
        console.error('[Realtime] Error handling insert:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    [onInsert, onError]
  );

  const handleUpdate = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      try {
        console.log('[Realtime] Widget updated:', payload.new);

        if (onUpdate && payload.new) {
          const widget: WidgetInstance = {
            id: payload.new.id,
            type: payload.new.type,
            version: payload.new.version || 1,
            config: payload.new.config || {},
            layout: payload.new.layout,
          };
          onUpdate(widget);
        }
      } catch (error) {
        console.error('[Realtime] Error handling update:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    [onUpdate, onError]
  );

  const handleDelete = useCallback(
    (payload: RealtimePostgresChangesPayload<any>) => {
      try {
        console.log('[Realtime] Widget deleted:', payload.old);

        if (onDelete && payload.old && 'id' in payload.old) {
          onDelete(payload.old.id);
        }
      } catch (error) {
        console.error('[Realtime] Error handling delete:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    },
    [onDelete, onError]
  );

  useEffect(() => {
    // Skip in dev mode if Supabase not configured
    if (
      process.env.NODE_ENV === 'development' &&
      (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      console.log('[Realtime] DEV MODE: Supabase not configured, skipping real-time');
      return;
    }

    const supabase = createBrowserSupabaseClient();

    // Subscribe to widget changes for this user
    const channel = supabase
      .channel('widget-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'widget_instances',
          filter: `user_id=eq.${userId}`,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'widget_instances',
          filter: `user_id=eq.${userId}`,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'widget_instances',
          filter: `user_id=eq.${userId}`,
        },
        handleDelete
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, handleInsert, handleUpdate, handleDelete]);
}

/**
 * Hook to track connection status
 *
 * @returns Connection status (connected, disconnected, connecting)
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  useEffect(() => {
    // Skip in dev mode if Supabase not configured
    if (
      process.env.NODE_ENV === 'development' &&
      (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ) {
      setStatus('disconnected');
      return;
    }

    const supabase = createBrowserSupabaseClient();

    // Create a channel to monitor connection status
    const channel = supabase
      .channel('connection-status')
      .on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (payload.status === 'CLOSED') {
          setStatus('disconnected');
        } else if (payload.status === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        }
      })
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (subscriptionStatus === 'CLOSED') {
          setStatus('disconnected');
        } else if (subscriptionStatus === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}

// Import useState at the top (fix for TypeScript)
import { useState } from 'react';
