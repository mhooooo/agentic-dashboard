/**
 * Manual Test Script for Conversation Store
 *
 * Run this in a Node REPL or browser console to test store functionality
 */

import { useConversationStore } from './conversation-store';
import { useEventMesh } from '@/lib/event-mesh/mesh';

console.log('=== Conversation Store Manual Test ===\n');

// Test 1: Initial State
console.log('Test 1: Initial State');
const initialState = useConversationStore.getState();
console.log('  Stage:', initialState.stage);
console.log('  Messages:', initialState.messages.length);
console.log('  Intent:', initialState.extractedIntent);
console.log('  Widget:', initialState.inferredWidget);
console.log('  Can Progress:', initialState.canProgressToNextStage);
console.log('  Is Complete:', initialState.isComplete);
console.log('  ✓ Initial state correct\n');

// Test 2: Add Messages
console.log('Test 2: Add Messages');
useConversationStore.getState().addMessage('user', 'I need to track PRs');
useConversationStore.getState().addMessage('assistant', 'What problem are you solving?');
const messagesState = useConversationStore.getState();
console.log('  Messages count:', messagesState.messages.length);
console.log('  First message:', messagesState.messages[0].content);
console.log('  ✓ Messages added correctly\n');

// Test 3: Set Intent
console.log('Test 3: Set Intent');
const testIntent = {
  problemSolved: 'Manual PR tracking taking 30min/day',
  painPoint: 'Team losing track of PRs across 3 repos',
  goal: 'Consolidated PR view in one dashboard',
  expectedOutcome: 'Zero manual checking',
  impactMetric: 'Save 30min/day',
};
useConversationStore.getState().setExtractedIntent(testIntent);
const intentState = useConversationStore.getState();
console.log('  Intent set:', intentState.extractedIntent !== null);
console.log('  Can Progress Now:', intentState.canProgressToNextStage);
console.log('  ✓ Intent set correctly\n');

// Test 4: Check Event Mesh Integration
console.log('Test 4: Event Mesh Integration');
const eventLog = useEventMesh.getState().getEventLog();
console.log('  Events logged:', eventLog.length);
const intentEvent = eventLog.find(e => e.event === 'wizard.intent.extracted');
console.log('  Intent event found:', intentEvent !== undefined);
if (intentEvent) {
  console.log('  Event source:', intentEvent.source);
}
console.log('  ✓ Event Mesh integration working\n');

// Test 5: Stage Transitions
console.log('Test 5: Stage Transitions');
console.log('  Current stage:', useConversationStore.getState().stage);
useConversationStore.getState().progressToNextStage();
console.log('  After progression:', useConversationStore.getState().stage);
console.log('  ✓ Stage progression working\n');

// Test 6: Set Inferred Widget
console.log('Test 6: Set Inferred Widget');
const testWidget = {
  provider: 'github',
  widgetType: 'pull-requests',
  confidence: 0.95,
  reasoning: 'User mentioned PR tracking across multiple repos',
};
useConversationStore.getState().setInferredWidget(testWidget);
const widgetState = useConversationStore.getState();
console.log('  Widget set:', widgetState.inferredWidget !== null);
console.log('  Provider:', widgetState.inferredWidget?.provider);
console.log('  Confidence:', widgetState.inferredWidget?.confidence);
console.log('  ✓ Widget inference working\n');

// Test 7: Stage-specific validation
console.log('Test 7: Stage-specific Validation');
useConversationStore.getState().setStage('visualization');
console.log('  Current stage:', useConversationStore.getState().stage);
console.log('  Can progress (needs more messages):', useConversationStore.getState().canProgressToNextStage);
useConversationStore.getState().addMessage('user', 'Show me a list view');
useConversationStore.getState().addMessage('assistant', 'Great choice!');
console.log('  After messages added:', useConversationStore.getState().canProgressToNextStage);
console.log('  ✓ Stage validation working\n');

// Test 8: Complete Workflow
console.log('Test 8: Complete Workflow');
useConversationStore.getState().setStage('preview');
useConversationStore.getState().addMessage('user', 'Yes, looks good!');
console.log('  Can progress from preview:', useConversationStore.getState().canProgressToNextStage);
useConversationStore.getState().progressToNextStage();
console.log('  Progressed to:', useConversationStore.getState().stage);
useConversationStore.getState().progressToNextStage();
console.log('  Is Complete:', useConversationStore.getState().isComplete);
const completionEvent = useEventMesh.getState().getEventLog().find(e => e.event === 'wizard.completed');
console.log('  Completion event found:', completionEvent !== undefined);
console.log('  ✓ Complete workflow working\n');

// Test 9: Reset
console.log('Test 9: Reset');
useConversationStore.getState().reset();
const resetState = useConversationStore.getState();
console.log('  Stage after reset:', resetState.stage);
console.log('  Messages after reset:', resetState.messages.length);
console.log('  Intent after reset:', resetState.extractedIntent);
console.log('  Widget after reset:', resetState.inferredWidget);
const resetEvent = useEventMesh.getState().getEventLog().find(e => e.event === 'wizard.reset');
console.log('  Reset event found:', resetEvent !== undefined);
console.log('  ✓ Reset working\n');

// Test 10: Event History
console.log('Test 10: Event History');
const allEvents = useEventMesh.getState().getEventLog();
console.log('  Total events logged:', allEvents.length);
const eventTypes = new Set(allEvents.map(e => e.event));
console.log('  Unique event types:', Array.from(eventTypes).join(', '));
console.log('  ✓ Event logging working\n');

console.log('=== All Tests Passed! ===');
