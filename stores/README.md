# Conversation Store

## Overview

The Conversation Store is a Zustand-based state management solution for the Problem-First Widget Wizard. It manages the entire wizard conversation state across 5 stages, from initial problem discovery through deployment.

## Architecture

### Core Responsibilities

1. **State Management** - Tracks current stage, messages, intent, and widget inference
2. **Stage Transitions** - Validates requirements before allowing progression
3. **Event Mesh Integration** - Publishes stage transitions for observability
4. **Reset Functionality** - Clears all state to start fresh

### File Structure

```
stores/
├── conversation-store.ts              # Main store implementation
├── conversation-store.test.ts         # Unit tests (requires Jest)
├── test-conversation-store.mjs        # Node.js logic tests
└── README.md                          # This file
```

## Stage Flow

The wizard follows a strict 5-stage progression:

```
1. problem_discovery
   ↓ (requires: user message + extracted intent)
2. clarifying_questions
   ↓ (requires: inferred widget)
3. visualization
   ↓ (requires: 2+ user messages)
4. preview
   ↓ (requires: user confirmation with "yes")
5. deploy
   ↓ (marks complete)
   ✓ isComplete = true
```

## Data Types

### WizardStage

```typescript
type WizardStage =
  | 'problem_discovery'
  | 'clarifying_questions'
  | 'visualization'
  | 'preview'
  | 'deploy';
```

### UserIntent

Captured during Stage 1 (problem_discovery):

```typescript
interface UserIntent {
  problemSolved: string;      // "Manual PR tracking taking 30min/day"
  painPoint: string;          // "Team losing track of PRs"
  goal: string;               // "Consolidated PR view"
  expectedOutcome: string;    // "Zero manual checking"
  impactMetric: string;       // "Save 30min/day"
}
```

### InferredWidget

AI-recommended widget from Stage 2 (clarifying_questions):

```typescript
interface InferredWidget {
  provider: string;           // "github"
  widgetType: string;         // "pull-requests"
  confidence: number;         // 0.95 (0-1 scale)
  reasoning?: string;         // "User mentioned PR tracking"
}
```

### ConversationMessage

```typescript
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

## Store Actions

### Core Actions

#### `addMessage(role, content)`

Add a message to the conversation history.

```typescript
addMessage('user', 'I need to track PRs across multiple repos');
addMessage('assistant', 'What problem are you trying to solve?');
```

#### `setStage(stage)`

Transition to a new wizard stage. Publishes `wizard.stage.changed` event.

```typescript
setStage('clarifying_questions');
```

#### `setExtractedIntent(intent)`

Store user intent extracted from Stage 1. Publishes `wizard.intent.extracted` event.

```typescript
setExtractedIntent({
  problemSolved: 'Manual PR tracking',
  painPoint: '30min/day wasted',
  goal: 'Consolidated view',
  expectedOutcome: 'Zero manual checking',
  impactMetric: 'Save 30min/day',
});
```

#### `setInferredWidget(widget)`

Store AI-inferred widget recommendation. Publishes `wizard.widget.inferred` event.

```typescript
setInferredWidget({
  provider: 'github',
  widgetType: 'pull-requests',
  confidence: 0.95,
  reasoning: 'User mentioned PR tracking across repos',
});
```

#### `reset()`

Clear all state and return to initial stage. Publishes `wizard.reset` event.

```typescript
reset();
```

### Helper Actions

#### `progressToNextStage()`

Automatically progress to the next stage if validation passes. Publishes `wizard.completed` event when reaching the end.

```typescript
progressToNextStage();
```

#### `getMessagesForStage(stage)`

Get all messages for a specific stage (currently returns all messages).

```typescript
const messages = getMessagesForStage('problem_discovery');
```

## Event Mesh Integration

The store publishes events to the Event Mesh for debugging and observability:

### Published Events

1. **`wizard.stage.changed`**
   - Published: On stage transition
   - Payload: `{ previousStage, newStage, timestamp }`

2. **`wizard.intent.extracted`**
   - Published: When user intent is set
   - Payload: `{ intent, timestamp }`

3. **`wizard.widget.inferred`**
   - Published: When widget is inferred
   - Payload: `{ widget, timestamp }`

4. **`wizard.completed`**
   - Published: When wizard reaches completion
   - Payload: `{ timestamp, intent, widget }`

5. **`wizard.reset`**
   - Published: When store is reset
   - Payload: `{ timestamp }`

All events have `source: 'conversation-store'` for filtering in Event Flow Debugger.

## Usage Examples

### Basic Usage in React Component

```tsx
import { useConversationStore } from '@/stores/conversation-store';

function WizardComponent() {
  const stage = useConversationStore(state => state.stage);
  const messages = useConversationStore(state => state.messages);
  const canProgress = useConversationStore(state => state.canProgressToNextStage);
  const addMessage = useConversationStore(state => state.addMessage);
  const progressToNextStage = useConversationStore(state => state.progressToNextStage);

  const handleUserInput = (text: string) => {
    addMessage('user', text);
    // AI processes and responds
    addMessage('assistant', 'Response from AI...');
  };

  return (
    <div>
      <p>Current Stage: {stage}</p>
      <button 
        disabled={!canProgress}
        onClick={progressToNextStage}
      >
        Next Stage
      </button>
    </div>
  );
}
```

### Stage Transition Hook

```tsx
import { useStageTransition } from '@/stores/conversation-store';

function StageTracker() {
  useStageTransition((newStage) => {
    console.log('Stage changed to:', newStage);
    // Track analytics, update UI, etc.
  });

  return null;
}
```

### Complete Workflow Example

```typescript
// Stage 1: Problem Discovery
addMessage('user', 'I need to track PRs across 3 repos');
setExtractedIntent({
  problemSolved: 'Manual PR tracking taking 30min/day',
  painPoint: 'Team losing track of PRs',
  goal: 'Consolidated PR view',
  expectedOutcome: 'Zero manual checking',
  impactMetric: 'Save 30min/day',
});
progressToNextStage(); // → clarifying_questions

// Stage 2: Clarifying Questions
setInferredWidget({
  provider: 'github',
  widgetType: 'pull-requests',
  confidence: 0.95,
});
progressToNextStage(); // → visualization

// Stage 3: Visualization
addMessage('user', 'Show me a list view');
addMessage('assistant', 'Great choice!');
progressToNextStage(); // → preview

// Stage 4: Preview
addMessage('user', 'Yes, looks perfect');
progressToNextStage(); // → deploy

// Stage 5: Deploy
progressToNextStage(); // → isComplete = true
```

## Validation Rules

Each stage has specific requirements before allowing progression:

### problem_discovery
- ✓ At least one user message
- ✓ Extracted intent set

### clarifying_questions
- ✓ Inferred widget set

### visualization
- ✓ At least 2 user messages

### preview
- ✓ User message containing "yes" (case-insensitive)

### deploy
- ✓ Always can progress (final stage)

## Testing

### Run Node Logic Tests

```bash
node stores/test-conversation-store.mjs
```

Tests core logic without React dependencies:
- Stage progression
- Validation rules
- Type structures
- Complete workflow simulation

### Run Unit Tests (requires Jest setup)

```bash
npm test stores/conversation-store.test.ts
```

Comprehensive tests including:
- Initial state
- Message management
- Stage transitions
- Intent/widget extraction
- Event Mesh integration
- Reset functionality

## TypeScript Strict Mode

The store is built with TypeScript strict mode enabled:

- ✓ All types are explicitly defined
- ✓ Null/undefined handled correctly
- ✓ No `any` types used
- ✓ Full IntelliSense support

## Performance

### Memory Footprint

- Messages: Unbounded array (consider adding max limit)
- Event Log: Limited to last 100 events (handled by Event Mesh)
- State: Minimal overhead (~1KB per conversation)

### Optimization Tips

1. **Reset between sessions**: Call `reset()` when starting new conversation
2. **Selective subscriptions**: Only subscribe to needed state slices
3. **Memoize selectors**: Use shallow equality for derived state

## Future Enhancements

### Planned Features

1. **Stage-specific message filtering** - Track stage boundaries for better history
2. **Undo/Redo integration** - Connect with Checkpoint Manager
3. **Persistence** - Save/restore conversation state to Supabase
4. **Analytics integration** - Track stage completion times and drop-off rates

### Considered but Deferred

- **Message streaming** - Real-time AI response streaming (Month 6)
- **Multi-branch conversations** - Handle user going back and changing answers (Month 6)
- **Voice input** - Speech-to-text integration (Month 7+)

## Integration Points

### Current Integrations

- ✓ Event Mesh (`lib/event-mesh/mesh.ts`)
- ✓ Zustand (`zustand` package)
- ✓ TypeScript strict mode

### Planned Integrations

- Claude API Client (Month 5, Week 17)
- Widget Factory (Month 5, Week 18)
- Event Persistence Layer (Month 5, Week 19)

## Troubleshooting

### Store not updating

Check React component subscriptions:
```tsx
// ✓ Correct
const stage = useConversationStore(state => state.stage);

// ✗ Incorrect (won't trigger re-render)
const state = useConversationStore.getState();
```

### Stage won't progress

Check validation requirements:
```tsx
const canProgress = useConversationStore(state => state.canProgressToNextStage);
console.log('Can progress:', canProgress);
```

### Events not appearing in Event Mesh

Verify Event Mesh is enabled:
```tsx
const enabled = useEventMesh(state => state.enabled);
console.log('Event Mesh enabled:', enabled);
```

## Contributing

When modifying the store:

1. Update TypeScript types first
2. Update validation logic in `canProgress()`
3. Add tests to `conversation-store.test.ts`
4. Update this README
5. Run `npm run build` to verify no errors

## License

Part of the Agentic Dashboard project. See root LICENSE file.

---

**Last Updated**: November 24, 2025
**Author**: Agentic Dashboard Team
**Related**: RFC-001, MONTH_5_IMPLEMENTATION_GUIDE.md
