/**
 * Conversation Store - Manages wizard conversation state across 5 stages
 *
 * This store tracks the entire problem-first widget creation wizard journey,
 * from initial problem discovery through deployment. It integrates with the
 * Event Mesh to publish stage transition events.
 *
 * Stages:
 * 1. problem_discovery - "What problem are you solving?"
 * 2. clarifying_questions - AI asks follow-up questions based on extracted intent
 * 3. visualization - User selects how to display data
 * 4. preview - Show generated widget schema for review
 * 5. deploy - Deploy widget and set up Event Mesh connections
 */

import * as React from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useEventMesh } from '@/lib/event-mesh/mesh';

/**
 * Wizard stage identifiers
 */
export type WizardStage =
  | 'problem_discovery'
  | 'clarifying_questions'
  | 'visualization'
  | 'preview'
  | 'deploy';

/**
 * Message role (user or AI assistant)
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Conversation message
 */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/**
 * User intent extracted from problem description
 *
 * This is captured during Stage 1 (problem_discovery) and used throughout
 * the wizard to guide AI decisions and for self-documentation.
 */
export interface UserIntent {
  /** What problem is the user solving? */
  problemSolved: string;
  /** What's the pain point/frustration? */
  painPoint: string;
  /** What's the desired goal/outcome? */
  goal: string;
  /** What specific outcome do they expect? */
  expectedOutcome: string;
  /** How will success be measured? (e.g., "Save 30min/day") */
  impactMetric: string;
}

/**
 * Inferred widget recommendation
 *
 * AI infers which widget/provider best solves the user's problem based on
 * their intent from Stage 1.
 */
export interface InferredWidget {
  /** Provider identifier (e.g., "github", "jira", "linear") */
  provider: string;
  /** Widget type within provider (e.g., "pull-requests", "issues") */
  widgetType: string;
  /** AI confidence score (0-1) */
  confidence: number;
  /** Explanation of why this widget was recommended */
  reasoning?: string;
}

/**
 * Conversation Store State
 */
interface ConversationStore {
  // Core state
  stage: WizardStage;
  messages: ConversationMessage[];
  extractedIntent: UserIntent | null;
  inferredWidget: InferredWidget | null;

  // Derived state
  isComplete: boolean;
  canProgressToNextStage: boolean;

  // Actions
  addMessage: (role: MessageRole, content: string) => void;
  setStage: (stage: WizardStage) => void;
  setExtractedIntent: (intent: UserIntent) => void;
  setInferredWidget: (widget: InferredWidget) => void;
  reset: () => void;

  // Helper actions
  progressToNextStage: () => void;
  getMessagesForStage: (stage: WizardStage) => ConversationMessage[];
}

/**
 * Initial state factory
 */
const createInitialState = () => ({
  stage: 'problem_discovery' as WizardStage,
  messages: [],
  extractedIntent: null,
  inferredWidget: null,
  isComplete: false,
  canProgressToNextStage: false,
});

/**
 * Get next stage in the wizard flow
 */
function getNextStage(currentStage: WizardStage): WizardStage | null {
  const stageOrder: WizardStage[] = [
    'problem_discovery',
    'clarifying_questions',
    'visualization',
    'preview',
    'deploy',
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
    return null; // No next stage
  }

  return stageOrder[currentIndex + 1];
}

/**
 * Validate if current stage has minimum requirements to progress
 */
function canProgress(state: ConversationStore): boolean {
  switch (state.stage) {
    case 'problem_discovery':
      // Need at least one user message and extracted intent
      return (
        state.messages.some((m) => m.role === 'user') &&
        state.extractedIntent !== null
      );

    case 'clarifying_questions':
      // Need inferred widget recommendation
      return state.inferredWidget !== null;

    case 'visualization':
      // Need at least one exchange (user selected visualization)
      return state.messages.filter((m) => m.role === 'user').length >= 2;

    case 'preview':
      // Need user confirmation
      return state.messages.some(
        (m) => m.role === 'user' && m.content.toLowerCase().includes('yes')
      );

    case 'deploy':
      // Final stage - always can progress (marks completion)
      return true;

    default:
      return false;
  }
}

/**
 * Conversation Store
 *
 * Manages the entire wizard conversation state and integrates with Event Mesh
 * to publish stage transition events.
 */
export const useConversationStore = create<ConversationStore>()(
  devtools(
    (set, get) => ({
      ...createInitialState(),

      /**
       * Add a message to the conversation
       *
       * @param role - Message role (user or assistant)
       * @param content - Message content
       */
      addMessage: (role, content) => {
        const message: ConversationMessage = {
          role,
          content,
          timestamp: new Date(),
        };

        set((state) => {
          const newMessages = [...state.messages, message];
          const canProgressToNextStage = canProgress({
            ...state,
            messages: newMessages,
          });

          return {
            messages: newMessages,
            canProgressToNextStage,
          };
        });

        console.log(`[ConversationStore] Added ${role} message:`, content);
      },

      /**
       * Set the current wizard stage
       *
       * Publishes a stage transition event to the Event Mesh for observability
       * and debugging.
       *
       * @param stage - New stage to transition to
       */
      setStage: (stage) => {
        const previousStage = get().stage;

        set((state) => ({
          stage,
          canProgressToNextStage: canProgress({ ...state, stage }),
        }));

        // Publish stage transition event to Event Mesh
        const eventMesh = useEventMesh.getState();
        eventMesh.publish(
          'wizard.stage.changed',
          {
            previousStage,
            newStage: stage,
            timestamp: new Date().toISOString(),
          },
          'conversation-store'
        );

        console.log(
          `[ConversationStore] Stage transition: ${previousStage} → ${stage}`
        );
      },

      /**
       * Set extracted user intent from Stage 1
       *
       * @param intent - User intent extracted from problem description
       */
      setExtractedIntent: (intent) => {
        set((state) => ({
          extractedIntent: intent,
          canProgressToNextStage: canProgress({ ...state, extractedIntent: intent }),
        }));

        // Publish intent extraction event
        const eventMesh = useEventMesh.getState();
        eventMesh.publish(
          'wizard.intent.extracted',
          {
            intent,
            timestamp: new Date().toISOString(),
          },
          'conversation-store'
        );

        console.log('[ConversationStore] Extracted user intent:', intent);
      },

      /**
       * Set inferred widget recommendation
       *
       * @param widget - Inferred widget details
       */
      setInferredWidget: (widget) => {
        set((state) => ({
          inferredWidget: widget,
          canProgressToNextStage: canProgress({ ...state, inferredWidget: widget }),
        }));

        // Publish widget inference event
        const eventMesh = useEventMesh.getState();
        eventMesh.publish(
          'wizard.widget.inferred',
          {
            widget,
            timestamp: new Date().toISOString(),
          },
          'conversation-store'
        );

        console.log('[ConversationStore] Inferred widget:', widget);
      },

      /**
       * Reset conversation to initial state
       *
       * Clears all messages, intent, and widget data. Returns to problem_discovery stage.
       */
      reset: () => {
        set(createInitialState());

        // Publish reset event
        const eventMesh = useEventMesh.getState();
        eventMesh.publish(
          'wizard.reset',
          {
            timestamp: new Date().toISOString(),
          },
          'conversation-store'
        );

        console.log('[ConversationStore] Reset conversation state');
      },

      /**
       * Progress to the next stage in the wizard
       *
       * Validates that current stage requirements are met before progressing.
       * If already at final stage, marks conversation as complete.
       */
      progressToNextStage: () => {
        const state = get();

        if (!state.canProgressToNextStage) {
          console.warn(
            '[ConversationStore] Cannot progress - requirements not met for stage:',
            state.stage
          );
          return;
        }

        const nextStage = getNextStage(state.stage);

        if (nextStage) {
          get().setStage(nextStage);
        } else {
          // No next stage - mark as complete
          set({ isComplete: true });

          const eventMesh = useEventMesh.getState();
          eventMesh.publish(
            'wizard.completed',
            {
              timestamp: new Date().toISOString(),
              intent: state.extractedIntent,
              widget: state.inferredWidget,
            },
            'conversation-store'
          );

          console.log('[ConversationStore] Wizard completed');
        }
      },

      /**
       * Get messages filtered by stage
       *
       * Useful for displaying conversation history within a specific stage.
       *
       * @param stage - Stage to filter by
       * @returns Messages from that stage
       */
      getMessagesForStage: (stage) => {
        // For simplicity, this returns all messages
        // In a more sophisticated implementation, we could track stage boundaries
        // and filter messages by timestamp ranges
        return get().messages;
      },
    }),
    { name: 'ConversationStore' }
  )
);

/**
 * React Hook: Subscribe to stage transitions
 *
 * Automatically unsubscribes when component unmounts.
 *
 * @example
 * ```tsx
 * useStageTransition((newStage) => {
 *   console.log('Stage changed to:', newStage);
 * });
 * ```
 */
export function useStageTransition(
  onStageChange: (newStage: WizardStage) => void
) {
  const stage = useConversationStore((state) => state.stage);

  React.useEffect(() => {
    onStageChange(stage);
  }, [stage, onStageChange]);
}
