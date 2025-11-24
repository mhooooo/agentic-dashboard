/**
 * Event Mesh V2 Types
 *
 * TypeScript interfaces for DocumentableEvent schema.
 * See docs/EVENT_MESH_V2.md for complete specification.
 */

/**
 * V1 Event Schema (backward compatible)
 */
export interface EventLogEntry {
  id: string;
  eventName: string;
  source: string;
  timestamp: number; // Unix timestamp in milliseconds
  payload: Record<string, unknown>;
  relatedEvents?: string[];
}

/**
 * User intent captured during event creation
 *
 * Captures WHY the user took this action, not just WHAT they did.
 * Essential for AI narratives and future optimization.
 */
export interface UserIntent {
  /**
   * High-level problem this action solves
   *
   * @example "Need to track late payments across customers"
   */
  problemSolved: string;

  /**
   * Specific pain point that triggered this action
   *
   * @example "Manually checking Stripe for failed payments takes 30min/day"
   */
  painPoint: string;

  /**
   * User's desired outcome
   *
   * @example "Automatically see failed payments in dashboard"
   */
  goal: string;

  /**
   * Concrete success criteria
   *
   * @example "Dashboard shows failed payments within 1 minute of occurrence"
   */
  expectedOutcome: string;

  /**
   * Optional: How to measure impact
   *
   * @example "Reduce manual payment checking from 30min to 0min/day"
   */
  impactMetric?: string;
}

/**
 * Contextual information about an event
 */
export interface EventContext {
  /**
   * Decision made at this point
   *
   * @example "User chose Stripe webhook over polling"
   */
  decision?: string;

  /**
   * Actual outcome (filled in after event completes)
   *
   * @example "Webhook successfully received 3 payment events in first hour"
   */
  outcome?: string;

  /**
   * Array of related event IDs for workflow linking
   *
   * @example ["evt_123", "evt_456"]
   */
  relatedEvents?: string[];

  /**
   * Categorization for filtering/analysis
   */
  category?: 'architecture' | 'bug-fix' | 'feature' | 'refactor';
}

/**
 * Technical metadata for debugging
 */
export interface EventMetadata {
  /**
   * User who triggered this event
   */
  userId: string;

  /**
   * Session identifier for grouping related events
   */
  sessionId: string;

  /**
   * Environment where event occurred
   */
  environment: 'dev' | 'prod';
}

/**
 * V2 Event Schema (DocumentableEvent)
 *
 * Extends EventLogEntry with optional context fields for
 * self-documentation and knowledge graph capabilities.
 *
 * All new fields are optional for backward compatibility.
 */
export interface DocumentableEvent extends EventLogEntry {
  /**
   * Flag indicating this event should be included in AI-generated narratives
   *
   * Auto-set to true for:
   * - widget.created
   * - provider.connected
   * - automation.triggered
   * - workflow.completed
   * - error.occurred
   */
  shouldDocument?: boolean;

  /**
   * Captures why the user took this action
   *
   * Essential for "explain what happened" and future AI optimization
   */
  userIntent?: UserIntent;

  /**
   * Contextual information about this event
   */
  context?: EventContext;

  /**
   * Technical metadata for debugging
   */
  metadata?: EventMetadata;
}

/**
 * Narrative context for rich event documentation
 *
 * Stored separately from event_history to keep that table fast and lean.
 */
export interface NarrativeContext {
  id: string;
  eventId: string;

  // Rich context fields
  longDescription?: string;
  screenshots?: string[];
  codeSnippets?: Array<{
    language: string;
    code: string;
  }>;
  relatedDocs?: string[];

  // AI-generated content
  aiNarrative?: string;
  aiSummary?: string;
  aiTags?: string[];

  // Audit fields
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Query options for event history
 */
export interface QueryEventHistoryOptions {
  /**
   * Start from specific event (for graph traversal)
   */
  eventId?: string;

  /**
   * Filter by event type
   *
   * @example "widget.created"
   */
  eventName?: string;

  /**
   * Filter by source widget
   *
   * @example "github_widget_1"
   */
  source?: string;

  /**
   * Filter by user
   */
  userId?: string;

  /**
   * Filter by session
   */
  sessionId?: string;

  /**
   * Time range start (Unix timestamp in milliseconds)
   */
  startTime?: number;

  /**
   * Time range end (Unix timestamp in milliseconds)
   */
  endTime?: number;

  /**
   * If true, follow relatedEvents links for graph traversal
   */
  includeRelated?: boolean;

  /**
   * Max graph traversal depth (default: 5)
   */
  maxDepth?: number;
}

/**
 * Options for building narratives from events
 */
export interface BuildNarrativeOptions {
  /**
   * Array of events to narrate
   */
  events: DocumentableEvent[];

  /**
   * Narrative style
   *
   * - technical: Debug-focused, includes timestamps and error details
   * - business: Outcome-focused, emphasizes impact and metrics
   * - tutorial: Educational, explains why each step happened
   */
  style?: 'technical' | 'business' | 'tutorial';

  /**
   * If true, include user goals and pain points
   */
  includeIntent?: boolean;

  /**
   * If true, include actual results vs expectations
   */
  includeOutcomes?: boolean;
}

/**
 * Options for updating event outcomes
 */
export interface UpdateOutcomeOptions {
  /**
   * Actual result that occurred
   */
  outcome: string;

  /**
   * Optional: Measured impact
   */
  impactMetric?: string;
}
