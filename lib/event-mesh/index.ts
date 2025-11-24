/**
 * Event Mesh - Core interconnection system for widgets
 *
 * V2 Enhancement: Database persistence for self-documentation and debugging
 */

// Export everything from mesh (includes V1 and V2 APIs)
export * from './mesh';

// Explicit re-exports for clarity
export {
  // V1 API (backward compatible)
  useEventMesh,
  useEventSubscription,

  // V2 Persistence API
  publishDocumentable,
  queryEventHistory,
  updateEventOutcome,
  getEvent,
  saveNarrativeContext,
  getNarrativeContext,
} from './mesh';

// Export types
export type {
  // V2 Types
  DocumentableEvent,
  EventLogEntry,
  UserIntent,
  EventContext,
  EventMetadata,
  NarrativeContext,
  QueryEventHistoryOptions,
  BuildNarrativeOptions,
  UpdateOutcomeOptions,
} from './types';
