'use client';

/**
 * Event Flow Debugger
 *
 * Visualizes event propagation through the Event Mesh.
 * Helps users understand widget interconnections and debug broken states.
 *
 * This is part of Month 2: The Safety Net
 */

import { useState, useEffect, useRef } from 'react';
import { useEventMesh } from '@/lib/event-mesh/mesh';

interface EventFlowDebuggerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EventFlowDebugger({ isOpen, onClose }: EventFlowDebuggerProps) {
  const [selectedTab, setSelectedTab] = useState<'events' | 'subscriptions'>('events');
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const eventLogRef = useRef<HTMLDivElement>(null);

  const eventLog = useEventMesh((state) => state.eventLog);
  const subscriptions = useEventMesh((state) => state.subscriptions);
  const clearEventLog = useEventMesh((state) => state.clearEventLog);
  const enabled = useEventMesh((state) => state.enabled);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [eventLog, autoScroll]);

  // Filter events based on search
  const filteredEvents = filter
    ? eventLog.filter(
        (log) =>
          log.event.toLowerCase().includes(filter.toLowerCase()) ||
          log.source?.toLowerCase().includes(filter.toLowerCase())
      )
    : eventLog;

  // Group subscriptions by widget
  const subscriptionsByWidget = subscriptions.reduce((acc, sub) => {
    const widgetId = sub.widgetId || 'unknown';
    if (!acc[widgetId]) {
      acc[widgetId] = [];
    }
    acc[widgetId].push(sub);
    return acc;
  }, {} as Record<string, typeof subscriptions>);

  /**
   * Format timestamp
   */
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  /**
   * Get matching subscriptions for an event
   */
  const getMatchingSubscriptions = (eventName: string) => {
    return subscriptions.filter((sub) => {
      if (sub.pattern === '*') return true;
      if (sub.pattern.endsWith('.*')) {
        const prefix = sub.pattern.slice(0, -2);
        return eventName.startsWith(prefix + '.');
      }
      return eventName === sub.pattern;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">Event Flow Debugger</h3>
          {!enabled && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium">
              Safe Mode Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-background rounded-lg p-1 border">
            <button
              onClick={() => setSelectedTab('events')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                selectedTab === 'events'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Events ({eventLog.length})
            </button>
            <button
              onClick={() => setSelectedTab('subscriptions')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                selectedTab === 'subscriptions'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Subscriptions ({subscriptions.length})
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Close debugger"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="h-80 overflow-hidden">
        {selectedTab === 'events' ? (
          <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <input
                type="text"
                placeholder="Filter events..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="flex-1 px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`px-3 py-1 text-xs font-medium rounded border ${
                  autoScroll
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground'
                }`}
                title="Auto-scroll to latest events"
              >
                Auto-scroll
              </button>
              <button
                onClick={clearEventLog}
                className="px-3 py-1 text-xs font-medium rounded border bg-background text-muted-foreground hover:text-foreground hover:border-foreground"
              >
                Clear
              </button>
            </div>

            {/* Event Log */}
            <div
              ref={eventLogRef}
              className="flex-1 overflow-auto px-4 py-2 space-y-2 font-mono text-xs"
            >
              {filteredEvents.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {filter ? 'No matching events' : 'No events yet. Interact with widgets to see events.'}
                </div>
              ) : (
                filteredEvents.map((log, index) => {
                  const matchingSubs = getMatchingSubscriptions(log.event);
                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {/* Event Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {formatTime(log.timestamp)}
                          </span>
                          <span className="font-semibold text-blue-600">
                            {log.event}
                          </span>
                          {log.source && (
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              {log.source}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {matchingSubs.length} subscriber{matchingSubs.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Subscribers */}
                      {matchingSubs.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 text-xs">
                          <span className="text-muted-foreground">→</span>
                          {matchingSubs.map((sub) => (
                            <span
                              key={sub.id}
                              className="px-2 py-0.5 rounded bg-green-100 text-green-800"
                            >
                              {sub.widgetId || 'unknown'}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Payload */}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View payload
                        </summary>
                        <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto max-h-40">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto px-4 py-4">
            {/* Subscriptions View */}
            {Object.keys(subscriptionsByWidget).length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No active subscriptions
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(subscriptionsByWidget).map(([widgetId, subs]) => (
                  <div key={widgetId} className="border rounded-lg p-4 bg-card">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {widgetId}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({subs.length} subscription{subs.length !== 1 ? 's' : ''})
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {subs.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                        >
                          <span className="text-muted-foreground">Listening to:</span>
                          <code className="px-2 py-1 rounded bg-background text-blue-600 font-mono text-xs">
                            {sub.pattern}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Event Pattern Reference */}
            <div className="mt-6 p-4 rounded-lg border bg-muted/30">
              <h5 className="font-semibold text-sm mb-2">Pattern Matching Reference</h5>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>
                  <code className="text-foreground">*</code> - Matches all events
                </li>
                <li>
                  <code className="text-foreground">github.*</code> - Matches all GitHub events
                </li>
                <li>
                  <code className="text-foreground">github.pr.selected</code> - Matches exact event
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
