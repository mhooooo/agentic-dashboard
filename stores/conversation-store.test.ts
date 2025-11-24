/**
 * Conversation Store Tests
 *
 * Tests for the conversation state management store, including:
 * - Stage transitions
 * - Message accumulation
 * - Intent/widget extraction
 * - Event Mesh integration
 * - Reset functionality
 */

import { useConversationStore } from './conversation-store';
import { useEventMesh } from '@/lib/event-mesh/mesh';

describe('ConversationStore', () => {
  beforeEach(() => {
    // Reset both stores before each test
    useConversationStore.getState().reset();
    useEventMesh.getState().clearEventLog();
  });

  describe('Initial State', () => {
    it('should start at problem_discovery stage', () => {
      const state = useConversationStore.getState();
      expect(state.stage).toBe('problem_discovery');
    });

    it('should have empty messages array', () => {
      const state = useConversationStore.getState();
      expect(state.messages).toEqual([]);
    });

    it('should have null intent and widget', () => {
      const state = useConversationStore.getState();
      expect(state.extractedIntent).toBeNull();
      expect(state.inferredWidget).toBeNull();
    });

    it('should not be complete', () => {
      const state = useConversationStore.getState();
      expect(state.isComplete).toBe(false);
    });

    it('should not allow progression initially', () => {
      const state = useConversationStore.getState();
      expect(state.canProgressToNextStage).toBe(false);
    });
  });

  describe('Message Management', () => {
    it('should add user message correctly', () => {
      const { addMessage } = useConversationStore.getState();
      addMessage('user', 'Test message');

      const state = useConversationStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('Test message');
      expect(state.messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should add assistant message correctly', () => {
      const { addMessage } = useConversationStore.getState();
      addMessage('assistant', 'AI response');

      const state = useConversationStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('assistant');
      expect(state.messages[0].content).toBe('AI response');
    });

    it('should accumulate messages in order', () => {
      const { addMessage } = useConversationStore.getState();
      addMessage('user', 'Message 1');
      addMessage('assistant', 'Message 2');
      addMessage('user', 'Message 3');

      const state = useConversationStore.getState();
      expect(state.messages).toHaveLength(3);
      expect(state.messages[0].content).toBe('Message 1');
      expect(state.messages[1].content).toBe('Message 2');
      expect(state.messages[2].content).toBe('Message 3');
    });
  });

  describe('Stage Transitions', () => {
    it('should transition to clarifying_questions', () => {
      const { setStage } = useConversationStore.getState();
      setStage('clarifying_questions');

      const state = useConversationStore.getState();
      expect(state.stage).toBe('clarifying_questions');
    });

    it('should publish stage transition event to Event Mesh', () => {
      const { setStage } = useConversationStore.getState();
      setStage('clarifying_questions');

      const eventLog = useEventMesh.getState().getEventLog();
      const stageEvent = eventLog.find((e) => e.event === 'wizard.stage.changed');

      expect(stageEvent).toBeDefined();
      expect(stageEvent?.payload.previousStage).toBe('problem_discovery');
      expect(stageEvent?.payload.newStage).toBe('clarifying_questions');
    });

    it('should transition through all stages in order', () => {
      const { setStage } = useConversationStore.getState();
      const stages = [
        'problem_discovery',
        'clarifying_questions',
        'visualization',
        'preview',
        'deploy',
      ];

      stages.forEach((stage) => {
        setStage(stage as any);
        expect(useConversationStore.getState().stage).toBe(stage);
      });
    });
  });

  describe('Intent Extraction', () => {
    it('should set extracted intent', () => {
      const { setExtractedIntent } = useConversationStore.getState();
      const intent = {
        problemSolved: 'Manual PR tracking',
        painPoint: '30min/day wasted',
        goal: 'Consolidated view',
        expectedOutcome: 'Zero manual checking',
        impactMetric: 'Save 30min/day',
      };

      setExtractedIntent(intent);

      const state = useConversationStore.getState();
      expect(state.extractedIntent).toEqual(intent);
    });

    it('should publish intent extraction event', () => {
      const { setExtractedIntent } = useConversationStore.getState();
      const intent = {
        problemSolved: 'Manual PR tracking',
        painPoint: '30min/day wasted',
        goal: 'Consolidated view',
        expectedOutcome: 'Zero manual checking',
        impactMetric: 'Save 30min/day',
      };

      setExtractedIntent(intent);

      const eventLog = useEventMesh.getState().getEventLog();
      const intentEvent = eventLog.find((e) => e.event === 'wizard.intent.extracted');

      expect(intentEvent).toBeDefined();
      expect(intentEvent?.payload.intent).toEqual(intent);
    });

    it('should enable progression when intent is set', () => {
      const { addMessage, setExtractedIntent } = useConversationStore.getState();
      
      // Add user message
      addMessage('user', 'I need to track PRs');
      
      // Set intent
      const intent = {
        problemSolved: 'Manual PR tracking',
        painPoint: '30min/day wasted',
        goal: 'Consolidated view',
        expectedOutcome: 'Zero manual checking',
        impactMetric: 'Save 30min/day',
      };
      setExtractedIntent(intent);

      const state = useConversationStore.getState();
      expect(state.canProgressToNextStage).toBe(true);
    });
  });

  describe('Widget Inference', () => {
    it('should set inferred widget', () => {
      const { setInferredWidget } = useConversationStore.getState();
      const widget = {
        provider: 'github',
        widgetType: 'pull-requests',
        confidence: 0.95,
        reasoning: 'User mentioned PR tracking',
      };

      setInferredWidget(widget);

      const state = useConversationStore.getState();
      expect(state.inferredWidget).toEqual(widget);
    });

    it('should publish widget inference event', () => {
      const { setInferredWidget } = useConversationStore.getState();
      const widget = {
        provider: 'github',
        widgetType: 'pull-requests',
        confidence: 0.95,
      };

      setInferredWidget(widget);

      const eventLog = useEventMesh.getState().getEventLog();
      const widgetEvent = eventLog.find((e) => e.event === 'wizard.widget.inferred');

      expect(widgetEvent).toBeDefined();
      expect(widgetEvent?.payload.widget).toEqual(widget);
    });
  });

  describe('Stage Progression Logic', () => {
    it('should not allow progression from problem_discovery without intent', () => {
      const { addMessage } = useConversationStore.getState();
      addMessage('user', 'I need help');

      const state = useConversationStore.getState();
      expect(state.canProgressToNextStage).toBe(false);
    });

    it('should allow progression from problem_discovery with intent', () => {
      const { addMessage, setExtractedIntent } = useConversationStore.getState();
      
      addMessage('user', 'I need to track PRs');
      setExtractedIntent({
        problemSolved: 'PR tracking',
        painPoint: 'Manual work',
        goal: 'Automation',
        expectedOutcome: 'Less time',
        impactMetric: 'Save time',
      });

      const state = useConversationStore.getState();
      expect(state.canProgressToNextStage).toBe(true);
    });

    it('should progress to next stage automatically', () => {
      const { addMessage, setExtractedIntent, progressToNextStage } =
        useConversationStore.getState();

      // Complete problem_discovery stage
      addMessage('user', 'I need to track PRs');
      setExtractedIntent({
        problemSolved: 'PR tracking',
        painPoint: 'Manual work',
        goal: 'Automation',
        expectedOutcome: 'Less time',
        impactMetric: 'Save time',
      });

      // Progress
      progressToNextStage();

      const state = useConversationStore.getState();
      expect(state.stage).toBe('clarifying_questions');
    });

    it('should complete wizard at final stage', () => {
      const { setStage, progressToNextStage } = useConversationStore.getState();

      // Go to final stage
      setStage('deploy');

      // Try to progress
      progressToNextStage();

      const state = useConversationStore.getState();
      expect(state.isComplete).toBe(true);
    });

    it('should publish completion event', () => {
      const { setStage, progressToNextStage, setExtractedIntent, setInferredWidget } =
        useConversationStore.getState();

      const intent = {
        problemSolved: 'PR tracking',
        painPoint: 'Manual work',
        goal: 'Automation',
        expectedOutcome: 'Less time',
        impactMetric: 'Save time',
      };

      const widget = {
        provider: 'github',
        widgetType: 'pull-requests',
        confidence: 0.95,
      };

      setExtractedIntent(intent);
      setInferredWidget(widget);
      setStage('deploy');
      progressToNextStage();

      const eventLog = useEventMesh.getState().getEventLog();
      const completionEvent = eventLog.find((e) => e.event === 'wizard.completed');

      expect(completionEvent).toBeDefined();
      expect(completionEvent?.payload.intent).toEqual(intent);
      expect(completionEvent?.payload.widget).toEqual(widget);
    });
  });

  describe('Reset Functionality', () => {
    it('should clear all state on reset', () => {
      const { addMessage, setExtractedIntent, setInferredWidget, setStage, reset } =
        useConversationStore.getState();

      // Set up some state
      addMessage('user', 'Test message');
      setExtractedIntent({
        problemSolved: 'Test',
        painPoint: 'Test',
        goal: 'Test',
        expectedOutcome: 'Test',
        impactMetric: 'Test',
      });
      setInferredWidget({
        provider: 'github',
        widgetType: 'test',
        confidence: 1,
      });
      setStage('visualization');

      // Reset
      reset();

      const state = useConversationStore.getState();
      expect(state.stage).toBe('problem_discovery');
      expect(state.messages).toEqual([]);
      expect(state.extractedIntent).toBeNull();
      expect(state.inferredWidget).toBeNull();
      expect(state.isComplete).toBe(false);
      expect(state.canProgressToNextStage).toBe(false);
    });

    it('should publish reset event', () => {
      const { reset } = useConversationStore.getState();
      reset();

      const eventLog = useEventMesh.getState().getEventLog();
      const resetEvent = eventLog.find((e) => e.event === 'wizard.reset');

      expect(resetEvent).toBeDefined();
    });
  });

  describe('Event Mesh Integration', () => {
    it('should publish events with correct source', () => {
      const { setStage } = useConversationStore.getState();
      setStage('clarifying_questions');

      const eventLog = useEventMesh.getState().getEventLog();
      const event = eventLog[eventLog.length - 1];

      expect(event.source).toBe('conversation-store');
    });

    it('should include timestamp in all events', () => {
      const { setStage, setExtractedIntent, setInferredWidget } =
        useConversationStore.getState();

      setStage('clarifying_questions');
      setExtractedIntent({
        problemSolved: 'Test',
        painPoint: 'Test',
        goal: 'Test',
        expectedOutcome: 'Test',
        impactMetric: 'Test',
      });
      setInferredWidget({
        provider: 'github',
        widgetType: 'test',
        confidence: 1,
      });

      const eventLog = useEventMesh.getState().getEventLog();
      eventLog.forEach((event) => {
        expect(event.payload.timestamp).toBeDefined();
      });
    });
  });
});
