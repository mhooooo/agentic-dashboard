/**
 * Test Script: Widget Creation Chat API
 *
 * Tests the POST /api/ai/widget-creation/chat endpoint
 * with various stages and messages.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/test-chat-api.ts
 */

// Test Stage 1: Problem Discovery
async function testProblemDiscovery() {
  console.log('\n🧪 Testing Stage 1: Problem Discovery\n');

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'My team is losing track of pull requests across 3 repos. We spend 30 minutes every morning checking each repo manually.',
      stage: 'problem_discovery',
    }),
  });

  if (!response.ok) {
    console.error('❌ Error:', response.status, response.statusText);
    const errorText = await response.text();
    console.error('Response:', errorText);
    return;
  }

  const data = await response.json();
  console.log('✅ Response:', JSON.stringify(data, null, 2));
}

// Test Stage 2: Clarifying Questions (Streaming)
async function testClarifyingQuestions() {
  console.log('\n🧪 Testing Stage 2: Clarifying Questions (Streaming)\n');

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'We use 3 repositories: frontend, backend, and mobile.',
      stage: 'clarifying_questions',
      conversationHistory: [
        {
          role: 'user',
          content: 'My team is losing track of pull requests across 3 repos.',
        },
        {
          role: 'assistant',
          content: 'Got it! I can create a GitHub PR widget. Which repositories should we monitor?',
        },
      ],
      extractedIntent: {
        problemSolved: 'Manual PR tracking across 3 repositories',
        painPoint: '30min/day wasted checking repos individually',
        goal: 'Consolidated PR view',
        expectedOutcome: 'See all PRs in one dashboard',
        impactMetric: 'Save 30min/day',
      },
      inferredWidget: {
        provider: 'github',
        type: 'pr-list',
        confidence: 0.95,
      },
    }),
  });

  if (!response.ok) {
    console.error('❌ Error:', response.status, response.statusText);
    return;
  }

  // Stream the response
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    console.error('❌ No reader available');
    return;
  }

  console.log('📡 Streaming response:');
  process.stdout.write('   ');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            process.stdout.write(parsed.text);
          } else if (parsed.done) {
            console.log('\n\n✅ Stream complete');
          } else if (parsed.error) {
            console.error('\n❌ Error:', parsed.error);
          }
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      }
    }
  }
}

// Test Stage 3: Visualization
async function testVisualization() {
  console.log('\n🧪 Testing Stage 3: Visualization (Streaming)\n');

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'I prefer a list view, like an inbox.',
      stage: 'visualization',
      conversationHistory: [
        {
          role: 'user',
          content: 'My team is losing track of pull requests.',
        },
        {
          role: 'assistant',
          content: 'Which repositories should we monitor?',
        },
        {
          role: 'user',
          content: 'frontend, backend, mobile',
        },
        {
          role: 'assistant',
          content: 'Great! How would you like to visualize the PRs?',
        },
      ],
      inferredWidget: {
        provider: 'github',
        type: 'pr-list',
        confidence: 0.95,
      },
    }),
  });

  if (!response.ok) {
    console.error('❌ Error:', response.status, response.statusText);
    return;
  }

  // Stream the response
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    console.error('❌ No reader available');
    return;
  }

  console.log('📡 Streaming response:');
  process.stdout.write('   ');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            process.stdout.write(parsed.text);
          } else if (parsed.done) {
            console.log('\n\n✅ Stream complete');
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
}

// Test Error Handling
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling\n');

  // Test missing message
  console.log('Testing missing message...');
  let response = await fetch('http://localhost:3000/api/ai/widget-creation/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stage: 'problem_discovery',
    }),
  });

  if (response.status === 400) {
    const error = await response.json();
    console.log('✅ Correctly rejected missing message:', error.error);
  } else {
    console.log('❌ Should have returned 400');
  }

  // Test invalid stage
  console.log('\nTesting invalid stage...');
  response = await fetch('http://localhost:3000/api/ai/widget-creation/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'test',
      stage: 'invalid_stage',
    }),
  });

  if (response.status === 400) {
    const error = await response.json();
    console.log('✅ Correctly rejected invalid stage:', error.error);
  } else {
    console.log('❌ Should have returned 400');
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Widget Creation Chat API Test Suite');
  console.log('=====================================');

  try {
    await testProblemDiscovery();
    await testClarifyingQuestions();
    await testVisualization();
    await testErrorHandling();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
