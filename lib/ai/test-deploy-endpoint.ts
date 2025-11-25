/**
 * Test: Widget Deployment Endpoint
 *
 * Tests the POST /api/ai/widget-creation/deploy endpoint
 * Validates request/response format and error handling
 */

import type { UniversalWidgetDefinition } from '@/lib/universal-widget/schema';
import type { UserIntent } from '@/lib/event-mesh/types';

/**
 * Sample widget definition for testing
 */
const sampleWidgetDefinition: UniversalWidgetDefinition = {
  metadata: {
    name: 'GitHub Pull Requests',
    description: 'Shows open pull requests across repositories',
    category: 'development',
    version: 1,
  },
  dataSource: {
    provider: 'github',
    endpoint: '/repos/{owner}/{repo}/pulls',
    method: 'GET',
    params: {
      state: 'open',
      per_page: 10,
    },
    pollInterval: 60,
    dataPath: '$',
  },
  fields: [
    {
      name: 'number',
      path: '$.number',
      label: 'PR Number',
      type: 'number',
    },
    {
      name: 'title',
      path: '$.title',
      label: 'Title',
      type: 'string',
    },
    {
      name: 'author',
      path: '$.user.login',
      label: 'Author',
      type: 'string',
    },
    {
      name: 'state',
      path: '$.state',
      label: 'State',
      type: 'enum',
      enumLabels: {
        open: 'Open',
        closed: 'Closed',
        merged: 'Merged',
      },
    },
  ],
  layout: {
    type: 'list',
    fields: {
      title: 'title',
      subtitle: 'author',
      metadata: ['number'],
      badge: {
        field: 'state',
        colorMap: {
          open: 'green',
          closed: 'gray',
          merged: 'purple',
        },
      },
    },
    searchable: true,
    searchField: 'title',
  },
  interactions: {
    onSelect: {
      eventName: 'github.pr.selected',
      payload: {
        prNumber: 'number',
        prTitle: 'title',
      },
      source: 'github_pr_widget',
    },
  },
};

/**
 * Sample user intent for testing
 */
const sampleUserIntent: UserIntent = {
  problemSolved: 'Manual PR tracking across 3 repos taking 30min/day',
  painPoint: 'Team losing track of PRs, wasting time checking each repo',
  goal: 'Consolidated PR view in one dashboard',
  expectedOutcome: 'Zero manual checking, see all PRs instantly',
  impactMetric: 'Save 30min/day',
};

/**
 * Test: Successful widget deployment
 */
async function testSuccessfulDeployment() {
  console.log('\n=== Test 1: Successful Deployment ===');

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      widgetDefinition: sampleWidgetDefinition,
      userIntent: sampleUserIntent,
    }),
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  // Validate response
  if (response.status === 200 && data.success && data.widgetId) {
    console.log('✅ PASS: Widget deployed successfully');
    console.log('   Widget ID:', data.widgetId);
    return true;
  } else {
    console.log('❌ FAIL: Expected successful deployment');
    return false;
  }
}

/**
 * Test: Missing required fields
 */
async function testMissingFields() {
  console.log('\n=== Test 2: Missing Required Fields ===');

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Missing userIntent
      widgetDefinition: sampleWidgetDefinition,
    }),
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 400 && data.error?.includes('Missing required fields')) {
    console.log('✅ PASS: Correctly rejected missing fields');
    return true;
  } else {
    console.log('❌ FAIL: Expected 400 error for missing fields');
    return false;
  }
}

/**
 * Test: Invalid provider
 */
async function testInvalidProvider() {
  console.log('\n=== Test 3: Invalid Provider ===');

  const invalidWidget = {
    ...sampleWidgetDefinition,
    dataSource: {
      ...sampleWidgetDefinition.dataSource,
      provider: 'invalid-provider', // Invalid
    },
  };

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      widgetDefinition: invalidWidget,
      userIntent: sampleUserIntent,
    }),
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 400 && data.error?.includes('validation failed')) {
    console.log('✅ PASS: Correctly rejected invalid provider');
    return true;
  } else {
    console.log('❌ FAIL: Expected 400 error for invalid provider');
    return false;
  }
}

/**
 * Test: Invalid layout type
 */
async function testInvalidLayout() {
  console.log('\n=== Test 4: Invalid Layout Type ===');

  const invalidWidget = {
    ...sampleWidgetDefinition,
    layout: {
      type: 'invalid-layout', // Invalid
    },
  };

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      widgetDefinition: invalidWidget,
      userIntent: sampleUserIntent,
    }),
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 400 && data.error?.includes('validation failed')) {
    console.log('✅ PASS: Correctly rejected invalid layout');
    return true;
  } else {
    console.log('❌ FAIL: Expected 400 error for invalid layout');
    return false;
  }
}

/**
 * Test: Missing metadata fields
 */
async function testMissingMetadata() {
  console.log('\n=== Test 5: Missing Metadata ===');

  const invalidWidget = {
    ...sampleWidgetDefinition,
    metadata: {
      // Missing name
      description: 'Test widget',
      category: 'test',
      version: 1,
    },
  };

  const response = await fetch('http://localhost:3000/api/ai/widget-creation/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      widgetDefinition: invalidWidget,
      userIntent: sampleUserIntent,
    }),
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));

  if (response.status === 400 && data.details?.some((e: string) => e.includes('metadata.name'))) {
    console.log('✅ PASS: Correctly rejected missing metadata');
    return true;
  } else {
    console.log('❌ FAIL: Expected 400 error for missing metadata');
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('========================================');
  console.log('Widget Deployment Endpoint Test Suite');
  console.log('========================================');

  const results = await Promise.all([
    testSuccessfulDeployment(),
    testMissingFields(),
    testInvalidProvider(),
    testInvalidLayout(),
    testMissingMetadata(),
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log('\n========================================');
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('========================================');

  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

export {
  testSuccessfulDeployment,
  testMissingFields,
  testInvalidProvider,
  testInvalidLayout,
  testMissingMetadata,
  sampleWidgetDefinition,
  sampleUserIntent,
};
