/**
 * Test script for Claude API Client
 *
 * Run with: npx tsx lib/ai/test-claude-client.ts
 *
 * This script tests:
 * 1. Basic prompt functionality
 * 2. Streaming prompt functionality
 * 3. Structured output functionality
 * 4. Multi-turn conversation functionality
 * 5. Error handling for missing API key
 */

import {
  prompt,
  promptStream,
  promptStructured,
  conversation,
  ClaudeAPIKeyMissingError,
  type ClaudeMessage,
} from './claude-client';

// ANSI color codes for pretty output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bold + colors.blue);
  console.log('='.repeat(60) + '\n');
}

async function testBasicPrompt() {
  section('TEST 1: Basic Prompt (Non-Streaming)');

  try {
    log('Sending: "What is 2+2? Answer in one sentence."', colors.yellow);

    const response = await prompt('What is 2+2? Answer in one sentence.', {
      maxTokens: 100,
    });

    log('Response:', colors.green);
    console.log(response.content);
    console.log('\nMetadata:');
    console.log(`  Model: ${response.model}`);
    console.log(`  Stop Reason: ${response.stopReason}`);
    console.log(
      `  Tokens: ${response.usage.inputTokens} in, ${response.usage.outputTokens} out`
    );

    return true;
  } catch (error) {
    if (error instanceof ClaudeAPIKeyMissingError) {
      log('⚠️  Test skipped: API key not configured', colors.yellow);
      return null; // Indicates skipped, not failed
    }
    log(`❌ Test failed: ${error}`, colors.red);
    return false;
  }
}

async function testStreamingPrompt() {
  section('TEST 2: Streaming Prompt');

  try {
    log(
      'Sending: "Count from 1 to 5 slowly." (streaming)',
      colors.yellow
    );

    const stream = await promptStream(
      'Count from 1 to 5, with each number on a new line.',
      {
        maxTokens: 100,
      }
    );

    log('Streaming response:', colors.green);
    process.stdout.write('  ');

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        process.stdout.write(chunk.delta.text);
      }
    }

    console.log('\n');
    return true;
  } catch (error) {
    if (error instanceof ClaudeAPIKeyMissingError) {
      log('⚠️  Test skipped: API key not configured', colors.yellow);
      return null;
    }
    log(`❌ Test failed: ${error}`, colors.red);
    return false;
  }
}

async function testStructuredOutput() {
  section('TEST 3: Structured Output (JSON Schema)');

  try {
    log(
      'Sending: "John Doe is 30 years old and works as a software engineer."',
      colors.yellow
    );
    log('Expected schema: { name, age, occupation }', colors.yellow);

    const result = await promptStructured<{
      name: string;
      age: number;
      occupation: string;
    }>(
      'Extract the person details from this text: John Doe is 30 years old and works as a software engineer.',
      {
        name: 'extract_person',
        description: 'Extract person details from text',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name of the person' },
            age: { type: 'number', description: 'Age in years' },
            occupation: {
              type: 'string',
              description: 'Job title or occupation',
            },
          },
          required: ['name', 'age', 'occupation'],
        },
      }
    );

    log('Structured output:', colors.green);
    console.log(JSON.stringify(result, null, 2));

    // Validate structure
    const isValid =
      typeof result.name === 'string' &&
      typeof result.age === 'number' &&
      typeof result.occupation === 'string';

    if (isValid) {
      log('✓ Schema validation passed', colors.green);
    } else {
      log('✗ Schema validation failed', colors.red);
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof ClaudeAPIKeyMissingError) {
      log('⚠️  Test skipped: API key not configured', colors.yellow);
      return null;
    }
    log(`❌ Test failed: ${error}`, colors.red);
    return false;
  }
}

async function testConversation() {
  section('TEST 4: Multi-turn Conversation');

  try {
    const messages: ClaudeMessage[] = [
      { role: 'user', content: 'My name is Alice and I like pizza.' },
      {
        role: 'assistant',
        content: 'Nice to meet you, Alice! Pizza is delicious.',
      },
      { role: 'user', content: 'What is my name and what do I like?' },
    ];

    log('Conversation history:', colors.yellow);
    messages.forEach((msg, i) => {
      console.log(`  ${i + 1}. ${msg.role}: ${msg.content}`);
    });

    const response = await conversation(messages, {
      maxTokens: 100,
    });

    log('\nResponse:', colors.green);
    console.log(response.content);

    return true;
  } catch (error) {
    if (error instanceof ClaudeAPIKeyMissingError) {
      log('⚠️  Test skipped: API key not configured', colors.yellow);
      return null;
    }
    log(`❌ Test failed: ${error}`, colors.red);
    return false;
  }
}

async function testErrorHandling() {
  section('TEST 5: Error Handling');

  try {
    // This should fail gracefully if API key is not set
    await prompt('Test');
    log('✓ API key is configured', colors.green);
    return true;
  } catch (error) {
    if (error instanceof ClaudeAPIKeyMissingError) {
      log(
        '✓ Error handling works: Missing API key detected correctly',
        colors.green
      );
      log(
        '  Error message: ' + error.message,
        colors.yellow
      );
      return true; // This is actually a success for this test
    }
    log(`❌ Unexpected error: ${error}`, colors.red);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n');
  log('🧪 Claude API Client Test Suite', colors.bold + colors.blue);
  console.log('='.repeat(60));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    log(
      '\n⚠️  ANTHROPIC_API_KEY not configured in .env.local',
      colors.yellow
    );
    log(
      '   Most tests will be skipped. To run full tests:',
      colors.yellow
    );
    log(
      '   1. Get API key from: https://console.anthropic.com/settings/keys',
      colors.yellow
    );
    log('   2. Add to .env.local: ANTHROPIC_API_KEY=sk-...', colors.yellow);
    log('   3. Run: npx tsx lib/ai/test-claude-client.ts\n', colors.yellow);
  }

  const results = {
    basicPrompt: await testBasicPrompt(),
    streamingPrompt: await testStreamingPrompt(),
    structuredOutput: await testStructuredOutput(),
    conversation: await testConversation(),
    errorHandling: await testErrorHandling(),
  };

  // Summary
  section('Test Summary');

  const testResults = Object.entries(results).map(([name, result]) => {
    let status = '';
    let color = colors.reset;

    if (result === true) {
      status = '✓ PASSED';
      color = colors.green;
    } else if (result === false) {
      status = '✗ FAILED';
      color = colors.red;
    } else {
      status = '⊘ SKIPPED';
      color = colors.yellow;
    }

    return { name, status, color };
  });

  testResults.forEach(({ name, status, color }) => {
    log(`  ${name}: ${status}`, color);
  });

  const passed = testResults.filter((t) => t.status === '✓ PASSED').length;
  const failed = testResults.filter((t) => t.status === '✗ FAILED').length;
  const skipped = testResults.filter((t) => t.status === '⊘ SKIPPED').length;

  console.log('\n' + '='.repeat(60));
  log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`, colors.bold);
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error}`, colors.red);
  console.error(error);
  process.exit(1);
});
