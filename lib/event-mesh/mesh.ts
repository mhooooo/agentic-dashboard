/**
 * Event Mesh - The core interconnection system for widgets
 *
 * This is the "magic" that allows widgets to communicate and react to each other.
 * Example: Click a GitHub PR → Jira widget auto-filters to that ticket
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Event handler function type
 */
type EventHandler = (payload: any) => void;

/**
 * Event subscription with pattern matching
 */
type EventSubscription = {
  id: string;
  pattern: string;
  handler: EventHandler;
  widgetId?: string;
};

/**
 * Event log entry for debugging and replay
 */
type EventLogEntry = {
  timestamp: Date;
  event: string;
  payload: any;
  source?: string;
};

/**
 * Event Mesh Store State
 */
interface EventMeshStore {
  subscriptions: EventSubscription[];
  eventLog: EventLogEntry[];
  enabled: boolean; // "Safe Mode" toggle

  // Actions
  subscribe: (pattern: string, handler: EventHandler, widgetId?: string) => () => void;
  publish: (event: string, payload: any, source?: string) => void;
  getEventLog: () => EventLogEntry[];
  clearEventLog: () => void;
  toggleSafeMode: () => void;
  setEnabled: (enabled: boolean) => void;
}

/**
 * Simple glob-style pattern matching
 *
 * Patterns:
 * - "*" matches all events
 * - "github.*" matches "github.pr.selected", "github.commit.pushed", etc.
 * - "github.pr.selected" matches exactly that event
 */
function eventMatchesPattern(event: string, pattern: string): boolean {
  if (pattern === '*') return true;

  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return event.startsWith(prefix + '.');
  }

  return event === pattern;
}

/**
 * Event Mesh Store
 *
 * This is the global state for widget interconnection.
 * All widgets can publish events and subscribe to patterns.
 */
export const useEventMesh = create<EventMeshStore>()(
  devtools(
    (set, get) => ({
      subscriptions: [],
      eventLog: [],
      enabled: true,

      /**
       * Subscribe to events matching a pattern
       *
       * @param pattern - Event pattern to match (e.g., "github.*")
       * @param handler - Function to call when event is published
       * @param widgetId - Optional widget ID for debugging
       * @returns Unsubscribe function
       */
      subscribe: (pattern, handler, widgetId) => {
        const subscription: EventSubscription = {
          id: crypto.randomUUID(),
          pattern,
          handler,
          widgetId,
        };

        set((state) => ({
          subscriptions: [...state.subscriptions, subscription],
        }));

        // Return unsubscribe function
        return () => {
          set((state) => ({
            subscriptions: state.subscriptions.filter(s => s.id !== subscription.id),
          }));
        };
      },

      /**
       * Publish an event to all matching subscribers
       *
       * @param event - Event name (e.g., "github.pr.selected")
       * @param payload - Event data
       * @param source - Optional source widget ID
       */
      publish: (event, payload, source) => {
        const { subscriptions, enabled, eventLog } = get();

        // Log event (for debugging and replay)
        const logEntry: EventLogEntry = {
          timestamp: new Date(),
          event,
          payload,
          source,
        };

        set((state) => ({
          eventLog: [...state.eventLog.slice(-99), logEntry], // Keep last 100 events
        }));

        // If safe mode is enabled (Event Mesh disabled), don't notify subscribers
        if (!enabled) {
          console.log('[Event Mesh] Safe mode enabled. Event not dispatched:', event);
          return;
        }

        // Notify all matching subscribers
        let notifiedCount = 0;
        subscriptions.forEach((sub) => {
          if (eventMatchesPattern(event, sub.pattern)) {
            try {
              sub.handler(payload);
              notifiedCount++;
            } catch (error) {
              console.error(`[Event Mesh] Error in subscriber for ${event}:`, error);
            }
          }
        });

        console.log(`[Event Mesh] Published ${event} to ${notifiedCount} subscribers`);
      },

      /**
       * Get the event log (for debugging)
       */
      getEventLog: () => get().eventLog,

      /**
       * Clear the event log
       */
      clearEventLog: () => set({ eventLog: [] }),

      /**
       * Toggle Safe Mode (enables/disables Event Mesh)
       */
      toggleSafeMode: () => {
        set((state) => {
          const newEnabled = !state.enabled;
          console.log(`[Event Mesh] Safe mode ${newEnabled ? 'disabled' : 'enabled'}`);
          return { enabled: newEnabled };
        });
      },

      /**
       * Set Safe Mode state directly
       */
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: 'EventMesh' }
  )
);

/**
 * React Hook: Subscribe to event patterns
 *
 * Automatically unsubscribes when component unmounts.
 *
 * @example
 * ```tsx
 * useEventSubscription('github.pr.*', (data) => {
 *   console.log('PR event:', data);
 * });
 * ```
 */
export function useEventSubscription(
  pattern: string,
  handler: EventHandler,
  widgetId?: string
) {
  const subscribe = useEventMesh((state) => state.subscribe);

  React.useEffect(() => {
    const unsubscribe = subscribe(pattern, handler, widgetId);
    return unsubscribe;
  }, [pattern, handler, widgetId, subscribe]);
}

// Export for use in React components
import React from 'react';
