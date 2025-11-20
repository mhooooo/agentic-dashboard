/**
 * Webhook Event Polling Hook
 *
 * Client-side hook that polls for new webhook events and publishes them
 * to the Event Mesh. This bridges server-side webhooks to client-side widgets.
 *
 * Usage:
 * ```tsx
 * function Dashboard() {
 *   useWebhookPolling({ interval: 10000 }); // Poll every 10 seconds
 *   return <YourDashboardContent />;
 * }
 * ```
 */

'use client';

import { useEffect, useRef } from 'react';
import { useEventMesh } from '@/lib/event-mesh/mesh';

interface WebhookPollingOptions {
  /**
   * Polling interval in milliseconds
   * @default 30000 (30 seconds)
   */
  interval?: number;

  /**
   * Enable polling (can be toggled)
   * @default true
   */
  enabled?: boolean;
}

interface WebhookEvent {
  id: string;
  eventName: string;
  provider: string;
  eventType: string;
  payload: any;
  receivedAt: string;
}

/**
 * Poll for new webhook events and publish to Event Mesh
 */
export function useWebhookPolling(options: WebhookPollingOptions = {}) {
  const { interval = 30000, enabled = true } = options;
  const lastPollTimeRef = useRef<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const publish = useEventMesh((state) => state.publish);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (lastPollTimeRef.current) {
          params.set('since', lastPollTimeRef.current);
        }
        params.set('limit', '20');

        // Fetch new events
        const response = await fetch(`/api/webhooks/events?${params.toString()}`);

        if (!response.ok) {
          console.error('[Webhook Polling] Failed to fetch events:', response.statusText);
          return;
        }

        const result = await response.json();

        if (result.success && result.data.events) {
          const events: WebhookEvent[] = result.data.events;

          // Publish new events to Event Mesh
          events.forEach((event) => {
            // Skip if already processed (deduplication)
            if (processedEventsRef.current.has(event.id)) {
              return;
            }

            // Publish to Event Mesh
            publish(event.eventName, event.payload, `webhook:${event.provider}`);

            console.log(`[Webhook Polling] Published: ${event.eventName}`);

            // Mark as processed
            processedEventsRef.current.add(event.id);

            // Cleanup old processed IDs (keep last 100)
            if (processedEventsRef.current.size > 100) {
              const firstId = processedEventsRef.current.values().next().value;
              if (firstId) {
                processedEventsRef.current.delete(firstId);
              }
            }
          });

          // Update last poll time
          lastPollTimeRef.current = result.data.lastPollTime;
        }
      } catch (error) {
        console.error('[Webhook Polling] Error polling events:', error);
      } finally {
        // Schedule next poll
        timeoutId = setTimeout(poll, interval);
      }
    };

    // Start polling
    poll();

    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, interval, publish]);
}

/**
 * Get webhook polling status
 *
 * This can be used to show webhook activity in the UI.
 */
export function useWebhookStatus() {
  const [status, setStatus] = React.useState<{
    lastEventTime: Date | null;
    eventCount: number;
  }>({
    lastEventTime: null,
    eventCount: 0,
  });

  // Subscribe to webhook events
  useEffect(() => {
    const unsubscribe = useEventMesh.subscribe(
      (state) => state.eventLog,
      (eventLog) => {
        // Find webhook events
        const webhookEvents = eventLog.filter((e) => e.source?.startsWith('webhook:'));

        if (webhookEvents.length > 0) {
          const latest = webhookEvents[webhookEvents.length - 1];
          setStatus({
            lastEventTime: latest.timestamp,
            eventCount: webhookEvents.length,
          });
        }
      }
    );

    return unsubscribe;
  }, []);

  return status;
}

// Re-export React for the hook
import React from 'react';
