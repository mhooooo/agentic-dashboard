/**
 * Test Script: Widget Creation Agent
 *
 * Tests the problem-first widget wizard with 5 sample problems.
 * Validates 70%+ accuracy in problem → widget mapping.
 *
 * Usage:
 *   npx tsx lib/ai/test-widget-creation-agent.ts
 */

import { inferWidgetFromProblem, extractIntent } from './widget-creation-agent';

// Test problems from RFC-001
const testProblems = [
  {
    description: "I need to track late payments from customers",
    expectedProvider: 'stripe',
    expectedType: 'payment-list',
    context: 'Business workflow - payment tracking',
  },
  {
    description: "I want to know when my team is blocked on Jira tickets",
    expectedProvider: 'jira',
    expectedType: 'issue-board',
    context: 'Dev tool - sprint management',
  },
  {
    description: "I need to see upcoming meetings for the week",
    expectedProvider: 'calendar',
    expectedType: 'calendar-grid',
    context: 'Personal productivity - scheduling',
  },
  {
    description: "I want to monitor GitHub PR review times",
    expectedProvider: 'github',
    expectedType: 'pr-list',
    context: 'Dev tool - code review tracking',
  },
  {
    description: "I need to track Slack mentions in important channels",
    expectedProvider: 'slack',
    expectedType: 'message-list',
    context: 'Communication - notification tracking',
  },
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log('cyan', `  ${title}`);
  console.log('='.repeat(80) + '\n');
}

async function testInferWidget(
  problem: typeof testProblems[0],
  index: number
): Promise<boolean> {
  log('blue', `\nTest ${index + 1}/5: ${problem.context}`);
  console.log(`Problem: "${problem.description}"`);
  console.log(`Expected: ${problem.expectedProvider} (${problem.expectedType})`);

  try {
    const result = await inferWidgetFromProblem(problem.description);

    console.log('\n📊 Results:');
    console.log(`  Provider: ${result.inferredWidget.provider} (confidence: ${result.inferredWidget.confidence.toFixed(2)})`);
    console.log(`  Type: ${result.inferredWidget.type}`);
    console.log(`  Message: "${result.message}"`);

    console.log('\n🎯 Extracted Intent:');
    console.log(`  Problem: ${result.extractedIntent.problemSolved}`);
    console.log(`  Pain Point: ${result.extractedIntent.painPoint}`);
    console.log(`  Goal: ${result.extractedIntent.goal}`);
    console.log(`  Expected Outcome: ${result.extractedIntent.expectedOutcome}`);
    if (result.extractedIntent.impactMetric) {
      console.log(`  Impact: ${result.extractedIntent.impactMetric}`);
    }

    // Validate provider match
    const providerMatch = result.inferredWidget.provider === problem.expectedProvider;

    if (providerMatch) {
      log('green', '\n✅ PASS: Provider correctly inferred');
      return true;
    } else {
      log('red', `\n❌ FAIL: Expected ${problem.expectedProvider}, got ${result.inferredWidget.provider}`);
      return false;
    }
  } catch (error) {
    log('red', `\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function testExtractIntent() {
  logSection('TEST: Extract Intent (without widget inference)');

  const problem = "My team is losing track of pull requests across 3 repos. We spend 30 minutes every morning checking each repo manually.";

  console.log(`Problem: "${problem}"\n`);

  try {
    const intent = await extractIntent(problem);

    console.log('✅ Intent Extracted:');
    console.log(`  Problem Solved: ${intent.problemSolved}`);
    console.log(`  Pain Point: ${intent.painPoint}`);
    console.log(`  Goal: ${intent.goal}`);
    console.log(`  Expected Outcome: ${intent.expectedOutcome}`);
    if (intent.impactMetric) {
      console.log(`  Impact Metric: ${intent.impactMetric}`);
    }

    // Validate minimum fields present
    if (intent.problemSolved && intent.painPoint && intent.goal && intent.expectedOutcome) {
      log('green', '\n✅ All required fields extracted');
      return true;
    } else {
      log('red', '\n❌ Missing required fields');
      return false;
    }
  } catch (error) {
    log('red', `❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function runTests() {
  logSection('Widget Creation Agent Test Suite');

  console.log('Testing problem-first widget wizard with 5 sample problems.');
  console.log('Success criteria: 70%+ accuracy (4 out of 5 correct)\n');

  // Test 1: Extract Intent
  const intentTestPassed = await testExtractIntent();

  // Test 2: Infer Widget from 5 problems
  logSection('TEST: Infer Widget from Problem');

  const results: boolean[] = [];
  for (let i = 0; i < testProblems.length; i++) {
    const passed = await testInferWidget(testProblems[i], i);
    results.push(passed);

    // Add delay between API calls to avoid rate limiting
    if (i < testProblems.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Calculate accuracy
  logSection('RESULTS SUMMARY');

  const passCount = results.filter(r => r).length;
  const accuracy = (passCount / testProblems.length) * 100;

  console.log(`Tests Passed: ${passCount}/${testProblems.length}`);
  console.log(`Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`Target: 70% (3.5/5)\n`);

  if (intentTestPassed) {
    log('green', '✅ Intent Extraction: PASS');
  } else {
    log('red', '❌ Intent Extraction: FAIL');
  }

  if (accuracy >= 70) {
    log('green', `✅ Widget Inference: PASS (${accuracy.toFixed(1)}% >= 70%)`);
  } else {
    log('red', `❌ Widget Inference: FAIL (${accuracy.toFixed(1)}% < 70%)`);
  }

  console.log('\n' + '='.repeat(80));

  if (intentTestPassed && accuracy >= 70) {
    log('green', '🎉 ALL TESTS PASSED - System prompt is ready for Month 5!');
  } else {
    log('yellow', '⚠️  SOME TESTS FAILED - System prompt needs refinement');
  }

  console.log('='.repeat(80) + '\n');

  // Exit with appropriate code
  process.exit(intentTestPassed && accuracy >= 70 ? 0 : 1);
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});
