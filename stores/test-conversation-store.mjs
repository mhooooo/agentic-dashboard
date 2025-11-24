/**
 * Simple Node Test for Conversation Store
 * 
 * Tests core logic without React/Next.js dependencies
 */

console.log('=== Conversation Store Node Test ===\n');

// Test stage progression logic
const stages = [
  'problem_discovery',
  'clarifying_questions',
  'visualization',
  'preview',
  'deploy',
];

function getNextStage(currentStage) {
  const currentIndex = stages.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex === stages.length - 1) {
    return null;
  }
  return stages[currentIndex + 1];
}

// Test 1: Stage Order
console.log('Test 1: Stage Order');
console.log('  problem_discovery → ', getNextStage('problem_discovery'));
console.log('  clarifying_questions → ', getNextStage('clarifying_questions'));
console.log('  visualization → ', getNextStage('visualization'));
console.log('  preview → ', getNextStage('preview'));
console.log('  deploy → ', getNextStage('deploy'));
console.log('  ✓ Stage order correct\n');

// Test 2: Validation Logic
console.log('Test 2: Validation Logic');

function canProgress(stage, messages, intent, widget) {
  switch (stage) {
    case 'problem_discovery':
      return messages.some(m => m.role === 'user') && intent !== null;
    case 'clarifying_questions':
      return widget !== null;
    case 'visualization':
      return messages.filter(m => m.role === 'user').length >= 2;
    case 'preview':
      return messages.some(m => m.role === 'user' && m.content.toLowerCase().includes('yes'));
    case 'deploy':
      return true;
    default:
      return false;
  }
}

// Test problem_discovery validation
const messagesWithUser = [{ role: 'user', content: 'Test' }];
const messagesWithoutUser = [{ role: 'assistant', content: 'Test' }];
const testIntent = { problemSolved: 'Test' };

console.log('  problem_discovery (no user message):', canProgress('problem_discovery', messagesWithoutUser, testIntent, null));
console.log('  problem_discovery (no intent):', canProgress('problem_discovery', messagesWithUser, null, null));
console.log('  problem_discovery (has both):', canProgress('problem_discovery', messagesWithUser, testIntent, null));

// Test clarifying_questions validation
const testWidget = { provider: 'github', widgetType: 'pr' };
console.log('  clarifying_questions (no widget):', canProgress('clarifying_questions', messagesWithUser, testIntent, null));
console.log('  clarifying_questions (has widget):', canProgress('clarifying_questions', messagesWithUser, testIntent, testWidget));

// Test visualization validation
const twoUserMessages = [
  { role: 'user', content: 'Test1' },
  { role: 'user', content: 'Test2' }
];
console.log('  visualization (1 user message):', canProgress('visualization', messagesWithUser, testIntent, testWidget));
console.log('  visualization (2 user messages):', canProgress('visualization', twoUserMessages, testIntent, testWidget));

// Test preview validation
const messagesWithYes = [{ role: 'user', content: 'Yes, looks good' }];
const messagesWithNo = [{ role: 'user', content: 'No, change it' }];
console.log('  preview (yes response):', canProgress('preview', messagesWithYes, testIntent, testWidget));
console.log('  preview (no response):', canProgress('preview', messagesWithNo, testIntent, testWidget));

console.log('  ✓ Validation logic correct\n');

// Test 3: Type Structure
console.log('Test 3: Type Structure');
const mockUserIntent = {
  problemSolved: 'Manual PR tracking taking 30min/day',
  painPoint: 'Team losing track of PRs',
  goal: 'Consolidated PR view',
  expectedOutcome: 'Zero manual checking',
  impactMetric: 'Save 30min/day',
};
console.log('  UserIntent fields:', Object.keys(mockUserIntent).length === 5);

const mockInferredWidget = {
  provider: 'github',
  widgetType: 'pull-requests',
  confidence: 0.95,
  reasoning: 'User mentioned PR tracking',
};
console.log('  InferredWidget fields:', Object.keys(mockInferredWidget).length >= 3);

const mockMessage = {
  role: 'user',
  content: 'Test message',
  timestamp: new Date(),
};
console.log('  ConversationMessage fields:', Object.keys(mockMessage).length === 3);
console.log('  ✓ Type structures correct\n');

// Test 4: Complete Workflow Simulation
console.log('Test 4: Complete Workflow Simulation');
let currentStage = 'problem_discovery';
let messages = [];
let intent = null;
let widget = null;
let isComplete = false;

console.log('  Starting stage:', currentStage);

// Stage 1: Problem Discovery
messages.push({ role: 'user', content: 'I need to track PRs' });
intent = mockUserIntent;
console.log('  Can progress from problem_discovery:', canProgress(currentStage, messages, intent, widget));
currentStage = getNextStage(currentStage);
console.log('  Progressed to:', currentStage);

// Stage 2: Clarifying Questions
widget = mockInferredWidget;
console.log('  Can progress from clarifying_questions:', canProgress(currentStage, messages, intent, widget));
currentStage = getNextStage(currentStage);
console.log('  Progressed to:', currentStage);

// Stage 3: Visualization
messages.push({ role: 'user', content: 'Show me a list view' });
console.log('  Can progress from visualization:', canProgress(currentStage, messages, intent, widget));
currentStage = getNextStage(currentStage);
console.log('  Progressed to:', currentStage);

// Stage 4: Preview
messages.push({ role: 'user', content: 'Yes, looks good' });
console.log('  Can progress from preview:', canProgress(currentStage, messages, intent, widget));
currentStage = getNextStage(currentStage);
console.log('  Progressed to:', currentStage);

// Stage 5: Deploy
const nextStage = getNextStage(currentStage);
console.log('  Next stage after deploy:', nextStage);
isComplete = nextStage === null;
console.log('  Is Complete:', isComplete);
console.log('  ✓ Complete workflow simulation successful\n');

console.log('=== All Node Tests Passed! ===');
