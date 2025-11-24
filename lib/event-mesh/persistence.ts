/**
 * Event Mesh V2: Persistence Layer
 *
 * Handles database storage for DocumentableEvents.
 * Provides functions to persist events, query history, and update outcomes.
 *
 * Uses dev mode fallback pattern: if Supabase not available, stores in memory.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  DocumentableEvent,
  QueryEventHistoryOptions,
  UpdateOutcomeOptions,
  NarrativeContext,
} from './types';

/**
 * Get Supabase client for event persistence
 * Returns null if Supabase not configured (dev mode)
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Dev mode in-memory event storage
 * Persists across hot-reloads using global variable pattern
 */
interface DevEventStore {
  events: DocumentableEvent[];
  narratives: Map<string, NarrativeContext>;
}

declare global {
  // eslint-disable-next-line no-var
  var devEventStore: DevEventStore | undefined;
}

// Initialize dev store
const devEventStore: DevEventStore = global.devEventStore ?? {
  events: [],
  narratives: new Map(),
};

// Persist store across hot-reloads
if (process.env.NODE_ENV === 'development') {
  global.devEventStore = devEventStore;
}

/**
 * Auto-marks important events with shouldDocument: true
 *
 * These events are automatically flagged for narrative generation:
 * - widget.created
 * - provider.connected
 * - automation.triggered
 * - workflow.completed
 * - error.occurred
 */
function autoMarkDocumentable(event: DocumentableEvent): DocumentableEvent {
  const importantEvents = [
    'widget.created',
    'provider.connected',
    'automation.triggered',
    'workflow.completed',
    'error.occurred',
  ];

  // If shouldDocument not explicitly set, auto-mark important events
  if (event.shouldDocument === undefined) {
    const shouldAutoMark = importantEvents.some(pattern =>
      event.eventName === pattern || event.eventName.startsWith(pattern + '.')
    );

    return {
      ...event,
      shouldDocument: shouldAutoMark,
    };
  }

  return event;
}

/**
 * Publishes a DocumentableEvent with database persistence
 *
 * @param event - DocumentableEvent to publish
 * @returns Promise resolving to the published event with generated ID
 *
 * @example
 * ```typescript
 * const event = await publishDocumentable({
 *   eventName: 'widget.created',
 *   source: 'widget_wizard',
 *   timestamp: Date.now(),
 *   payload: { widgetType: 'stripe_payments' },
 *   shouldDocument: true,
 *   userIntent: {
 *     problemSolved: "Track late payments",
 *     painPoint: "Manually checking Stripe takes 30min/day",
 *     goal: "See failed payments automatically",
 *     expectedOutcome: "Dashboard shows failures <1min"
 *   }
 * });
 * ```
 */
export async function publishDocumentable(
  event: Omit<DocumentableEvent, 'id'>
): Promise<DocumentableEvent> {
  // Generate ID
  const id = crypto.randomUUID();

  // Auto-mark important events
  const eventWithDefaults = autoMarkDocumentable({
    ...event,
    id,
  });

  const supabase = getSupabaseClient();

  if (!supabase) {
    // Dev mode: store in memory
    console.log('[Event Mesh] Dev mode: Storing event in memory', eventWithDefaults);
    devEventStore.events.push(eventWithDefaults);
    return eventWithDefaults;
  }

  // Production: persist to database
  const dbEvent = {
    id: eventWithDefaults.id,
    event_name: eventWithDefaults.eventName,
    source: eventWithDefaults.source,
    timestamp: eventWithDefaults.timestamp,
    payload: eventWithDefaults.payload,
    should_document: eventWithDefaults.shouldDocument,
    user_intent: eventWithDefaults.userIntent,
    context: eventWithDefaults.context,
    metadata: eventWithDefaults.metadata,
    // user_id will be auto-filled by RLS or set to NULL for anonymous
  };

  const { data, error } = await supabase
    .from('event_history')
    .insert(dbEvent)
    .select()
    .single();

  if (error) {
    console.error('[Event Mesh] Failed to persist event:', error);
    // Fallback to memory storage
    devEventStore.events.push(eventWithDefaults);
    return eventWithDefaults;
  }

  console.log('[Event Mesh] Event persisted to database:', data);
  return eventWithDefaults;
}

/**
 * Queries event history with optional graph traversal
 *
 * @param options - Query filters and options
 * @returns Promise resolving to array of matching events
 *
 * @example
 * ```typescript
 * // Get all widget creation events
 * const events = await queryEventHistory({
 *   eventName: 'widget.created'
 * });
 *
 * // Get workflow with related events
 * const workflow = await queryEventHistory({
 *   eventId: 'evt_123',
 *   includeRelated: true,
 *   maxDepth: 5
 * });
 * ```
 */
export async function queryEventHistory(
  options: QueryEventHistoryOptions = {}
): Promise<DocumentableEvent[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Dev mode: query in-memory store
    let events = [...devEventStore.events];

    // Apply filters
    if (options.eventName) {
      events = events.filter(e => e.eventName === options.eventName);
    }
    if (options.source) {
      events = events.filter(e => e.source === options.source);
    }
    if (options.userId) {
      events = events.filter(e => e.metadata?.userId === options.userId);
    }
    if (options.sessionId) {
      events = events.filter(e => e.metadata?.sessionId === options.sessionId);
    }
    if (options.startTime) {
      events = events.filter(e => e.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      events = events.filter(e => e.timestamp <= options.endTime!);
    }

    // Graph traversal (if requested)
    if (options.includeRelated && options.eventId) {
      events = traverseEventGraph(events, options.eventId, options.maxDepth ?? 5);
    }

    return events;
  }

  // Production: query database
  let query = supabase.from('event_history').select('*');

  // Apply filters
  if (options.eventName) {
    query = query.eq('event_name', options.eventName);
  }
  if (options.source) {
    query = query.eq('source', options.source);
  }
  if (options.startTime) {
    query = query.gte('timestamp', options.startTime);
  }
  if (options.endTime) {
    query = query.lte('timestamp', options.endTime);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Event Mesh] Failed to query event history:', error);
    return [];
  }

  // Convert database format to DocumentableEvent format
  const events = (data ?? []).map(dbEventToDocumentable);

  // Graph traversal (if requested)
  if (options.includeRelated && options.eventId) {
    const startEvent = events.find(e => e.id === options.eventId);
    if (startEvent) {
      return traverseEventGraph(events, options.eventId, options.maxDepth ?? 5);
    }
  }

  return events;
}

/**
 * Traverses event graph following relatedEvents links
 *
 * @param allEvents - Pool of events to search
 * @param startEventId - Starting event ID
 * @param maxDepth - Maximum depth to traverse
 * @returns Array of connected events
 */
function traverseEventGraph(
  allEvents: DocumentableEvent[],
  startEventId: string,
  maxDepth: number
): DocumentableEvent[] {
  const visited = new Set<string>();
  const result: DocumentableEvent[] = [];

  function traverse(eventId: string, depth: number) {
    if (depth > maxDepth || visited.has(eventId)) {
      return;
    }

    visited.add(eventId);
    const event = allEvents.find(e => e.id === eventId);

    if (!event) {
      return;
    }

    result.push(event);

    // Follow related events
    const relatedIds = event.context?.relatedEvents ?? [];
    relatedIds.forEach(relatedId => traverse(relatedId, depth + 1));
  }

  traverse(startEventId, 0);
  return result;
}

/**
 * Updates the outcome of an event asynchronously
 *
 * This is the ONLY way to modify events after creation (events are immutable).
 *
 * @param eventId - ID of event to update
 * @param options - Outcome and optional impact metric
 *
 * @example
 * ```typescript
 * await updateEventOutcome('evt_123', {
 *   outcome: "Successfully created 5 Jira tickets in first hour",
 *   impactMetric: "Saved 25 minutes compared to manual process"
 * });
 * ```
 */
export async function updateEventOutcome(
  eventId: string,
  options: UpdateOutcomeOptions
): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Dev mode: update in-memory store
    const event = devEventStore.events.find(e => e.id === eventId);
    if (event) {
      event.context = {
        ...event.context,
        outcome: options.outcome,
      };
      if (options.impactMetric) {
        event.userIntent = {
          ...event.userIntent!,
          impactMetric: options.impactMetric,
        };
      }
      console.log('[Event Mesh] Dev mode: Updated event outcome', event);
    }
    return;
  }

  // Production: use database function
  const { error } = await supabase.rpc('update_event_outcome', {
    event_id: eventId,
    outcome_text: options.outcome,
    impact_metric: options.impactMetric ?? null,
  });

  if (error) {
    console.error('[Event Mesh] Failed to update event outcome:', error);
  }
}

/**
 * Gets a single event by ID
 *
 * @param eventId - Event ID
 * @returns Promise resolving to event or null if not found
 */
export async function getEvent(eventId: string): Promise<DocumentableEvent | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Dev mode: search in-memory store
    return devEventStore.events.find(e => e.id === eventId) ?? null;
  }

  // Production: query database
  const { data, error } = await supabase
    .from('event_history')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('[Event Mesh] Failed to get event:', error);
    return null;
  }

  return dbEventToDocumentable(data);
}

/**
 * Converts database event format to DocumentableEvent format
 */
function dbEventToDocumentable(dbEvent: any): DocumentableEvent {
  return {
    id: dbEvent.id,
    eventName: dbEvent.event_name,
    source: dbEvent.source,
    timestamp: dbEvent.timestamp,
    payload: dbEvent.payload,
    shouldDocument: dbEvent.should_document,
    userIntent: dbEvent.user_intent,
    context: dbEvent.context,
    metadata: dbEvent.metadata,
  };
}

/**
 * Creates or updates narrative context for an event
 *
 * @param eventId - Event ID
 * @param context - Narrative context data
 */
export async function saveNarrativeContext(
  eventId: string,
  context: Omit<NarrativeContext, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Dev mode: store in memory
    const existing = devEventStore.narratives.get(eventId);
    devEventStore.narratives.set(eventId, {
      id: crypto.randomUUID(),
      eventId,
      ...context,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  // Production: upsert to database
  const { error } = await supabase
    .from('narrative_context')
    .upsert({
      event_id: eventId,
      long_description: context.longDescription,
      screenshots: context.screenshots,
      code_snippets: context.codeSnippets,
      related_docs: context.relatedDocs,
      ai_narrative: context.aiNarrative,
      ai_summary: context.aiSummary,
      ai_tags: context.aiTags,
    });

  if (error) {
    console.error('[Event Mesh] Failed to save narrative context:', error);
  }
}

/**
 * Gets narrative context for an event
 *
 * @param eventId - Event ID
 * @returns Promise resolving to narrative context or null if not found
 */
export async function getNarrativeContext(
  eventId: string
): Promise<NarrativeContext | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Dev mode: get from memory
    return devEventStore.narratives.get(eventId) ?? null;
  }

  // Production: query database
  const { data, error } = await supabase
    .from('narrative_context')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (error) {
    // Not found is ok
    if (error.code !== 'PGRST116') {
      console.error('[Event Mesh] Failed to get narrative context:', error);
    }
    return null;
  }

  return {
    id: data.id,
    eventId: data.event_id,
    longDescription: data.long_description,
    screenshots: data.screenshots,
    codeSnippets: data.code_snippets,
    relatedDocs: data.related_docs,
    aiNarrative: data.ai_narrative,
    aiSummary: data.ai_summary,
    aiTags: data.ai_tags,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
