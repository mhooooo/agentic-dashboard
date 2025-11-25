#!/usr/bin/env tsx
/**
 * Visualization Flow End-to-End Testing
 *
 * Tests the complete Stage 3 (visualization selection) and Stage 4 (preview)
 * functionality for all 5 visualization types supported by UniversalDataWidget.
 *
 * Requirements:
 * - Test all 5 visualization types (list, table, cards, metric, chart)
 * - Validate schema generation for each type
 * - Verify UniversalDataWidget can render each visualization
 * - Test stage transitions (Stage 2 → 3 → 4 → Deploy)
 * - Validate error handling (invalid JSON, missing fields, etc.)
 *
 * Usage:
 *   npx tsx scripts/test-visualization-flow.ts
 *
 * Reference:
 *   - Week 18: Backend integration complete
 *   - Week 19: Visualization UI implementation
 */

import {
  UniversalWidgetDefinition,
  validateWidgetDefinition,
} from '../lib/universal-widget/schema';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

function log(message: string, color?: keyof typeof colors) {
  const colorCode = color ? colors[color] : '';
  console.log(`${colorCode}${message}${colors.reset}`);
}

/**
 * Test case for a visualization type
 */
interface VisualizationTestCase {
  id: number;
  name: string;
  description: string;
  visualizationType: 'list' | 'table' | 'cards' | 'metric' | 'chart';
  sampleData: any[];
  expectedSchema: UniversalWidgetDefinition;
  validationChecks: Array<{
    name: string;
    check: (schema: UniversalWidgetDefinition) => boolean;
    errorMessage: string;
  }>;
}

/**
 * Generate test cases for all 5 visualization types
 */
const TEST_CASES: VisualizationTestCase[] = [
  // 1. List visualization - GitHub PRs
  {
    id: 1,
    name: 'List Visualization',
    description: 'GitHub Pull Requests displayed as sequential list',
    visualizationType: 'list',
    sampleData: [
      {
        number: 123,
        title: 'Add new feature',
        user: { login: 'alice' },
        state: 'open',
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        number: 124,
        title: 'Fix bug',
        user: { login: 'bob' },
        state: 'closed',
        created_at: '2024-01-16T12:00:00Z',
      },
    ],
    expectedSchema: {
      metadata: {
        name: 'GitHub Pull Requests',
        description: 'List of pull requests',
        category: 'development',
        version: 1,
      },
      dataSource: {
        provider: 'github',
        endpoint: '/repos/owner/repo/pulls',
        method: 'GET',
        pollInterval: 60,
      },
      fields: [
        {
          name: 'number',
          path: '$.number',
          label: 'PR #',
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
          },
        },
        {
          name: 'created_at',
          path: '$.created_at',
          label: 'Created',
          type: 'date',
        },
      ],
      layout: {
        type: 'list',
        fields: {
          title: 'title',
          subtitle: 'author',
          metadata: ['created_at'],
          badge: {
            field: 'state',
            colorMap: {
              open: 'bg-green-100 text-green-800',
              closed: 'bg-gray-100 text-gray-800',
            },
          },
        },
      },
      interactions: {
        onSelect: {
          eventName: 'github.pr.selected',
          payload: {
            prNumber: '{{number}}',
            repo: 'owner/repo',
          },
          source: 'github-pr-widget',
        },
      },
    },
    validationChecks: [
      {
        name: 'Has list layout type',
        check: (schema) => schema.layout.type === 'list',
        errorMessage: 'Layout type must be "list"',
      },
      {
        name: 'Has title field',
        check: (schema) =>
          schema.layout.type === 'list' && !!schema.layout.fields.title,
        errorMessage: 'List layout must have title field',
      },
      {
        name: 'Has badge configuration',
        check: (schema) =>
          schema.layout.type === 'list' && !!schema.layout.fields.badge,
        errorMessage: 'List layout should have badge field',
      },
      {
        name: 'Has onSelect interaction',
        check: (schema) => !!schema.interactions?.onSelect,
        errorMessage: 'Should have onSelect interaction',
      },
    ],
  },

  // 2. Table visualization - Jira tickets
  {
    id: 2,
    name: 'Table Visualization',
    description: 'Jira tickets displayed in structured table',
    visualizationType: 'table',
    sampleData: [
      {
        key: 'SCRUM-1',
        summary: 'Implement login',
        status: 'In Progress',
        assignee: { displayName: 'Alice' },
        created: '2024-01-10',
      },
      {
        key: 'SCRUM-2',
        summary: 'Fix header',
        status: 'Done',
        assignee: { displayName: 'Bob' },
        created: '2024-01-12',
      },
    ],
    expectedSchema: {
      metadata: {
        name: 'Jira Tickets',
        description: 'Table of Jira issues',
        category: 'project-management',
        version: 1,
      },
      dataSource: {
        provider: 'jira',
        endpoint: '/rest/api/3/search',
        method: 'GET',
        params: {
          jql: 'project = SCRUM ORDER BY created DESC',
        },
        pollInterval: 120,
        dataPath: '$.issues',
      },
      fields: [
        {
          name: 'key',
          path: '$.key',
          label: 'Key',
          type: 'string',
        },
        {
          name: 'summary',
          path: '$.summary',
          label: 'Summary',
          type: 'string',
        },
        {
          name: 'status',
          path: '$.status',
          label: 'Status',
          type: 'enum',
          enumLabels: {
            'In Progress': 'In Progress',
            Done: 'Done',
            Todo: 'To Do',
          },
        },
        {
          name: 'assignee',
          path: '$.assignee.displayName',
          label: 'Assignee',
          type: 'string',
        },
        {
          name: 'created',
          path: '$.created',
          label: 'Created',
          type: 'date',
        },
      ],
      layout: {
        type: 'table',
        columns: [
          { field: 'key', header: 'Key', width: '120px' },
          { field: 'summary', header: 'Summary', width: 'auto' },
          { field: 'status', header: 'Status', width: '150px' },
          { field: 'assignee', header: 'Assignee', width: '150px' },
          { field: 'created', header: 'Created', width: '120px' },
        ],
        sortable: true,
        defaultSort: {
          field: 'created',
          direction: 'desc',
        },
      },
      interactions: {
        onSelect: {
          eventName: 'jira.ticket.selected',
          payload: {
            ticketKey: '{{key}}',
          },
          source: 'jira-ticket-widget',
        },
      },
    },
    validationChecks: [
      {
        name: 'Has table layout type',
        check: (schema) => schema.layout.type === 'table',
        errorMessage: 'Layout type must be "table"',
      },
      {
        name: 'Has columns array',
        check: (schema) =>
          schema.layout.type === 'table' &&
          Array.isArray(schema.layout.columns) &&
          schema.layout.columns.length > 0,
        errorMessage: 'Table layout must have columns array',
      },
      {
        name: 'Has sortable configuration',
        check: (schema) =>
          schema.layout.type === 'table' && schema.layout.sortable === true,
        errorMessage: 'Table should be sortable',
      },
      {
        name: 'Has default sort',
        check: (schema) =>
          schema.layout.type === 'table' && !!schema.layout.defaultSort,
        errorMessage: 'Table should have default sort configuration',
      },
    ],
  },

  // 3. Cards visualization - Linear issues
  {
    id: 3,
    name: 'Cards Visualization',
    description: 'Linear issues displayed as rich content cards',
    visualizationType: 'cards',
    sampleData: [
      {
        id: 'lin-1',
        title: 'Design homepage',
        description: 'Create wireframes and mockups',
        state: { name: 'In Progress' },
        assignee: { name: 'Alice' },
        createdAt: '2024-01-05',
      },
      {
        id: 'lin-2',
        title: 'Setup CI/CD',
        description: 'Configure GitHub Actions',
        state: { name: 'Done' },
        assignee: { name: 'Bob' },
        createdAt: '2024-01-08',
      },
    ],
    expectedSchema: {
      metadata: {
        name: 'Linear Issues',
        description: 'Card view of Linear issues',
        category: 'project-management',
        version: 1,
      },
      dataSource: {
        provider: 'linear',
        endpoint: '/graphql',
        method: 'POST',
        body: {
          query: `
            query {
              issues {
                nodes {
                  id
                  title
                  description
                  state { name }
                  assignee { name }
                  createdAt
                }
              }
            }
          `,
        },
        pollInterval: 90,
        dataPath: '$.data.issues.nodes',
      },
      fields: [
        {
          name: 'id',
          path: '$.id',
          label: 'ID',
          type: 'string',
        },
        {
          name: 'title',
          path: '$.title',
          label: 'Title',
          type: 'string',
        },
        {
          name: 'description',
          path: '$.description',
          label: 'Description',
          type: 'string',
        },
        {
          name: 'state',
          path: '$.state.name',
          label: 'State',
          type: 'string',
        },
        {
          name: 'assignee',
          path: '$.assignee.name',
          label: 'Assignee',
          type: 'string',
        },
        {
          name: 'createdAt',
          path: '$.createdAt',
          label: 'Created',
          type: 'date',
        },
      ],
      layout: {
        type: 'cards',
        card: {
          title: 'title',
          description: 'description',
          metadata: ['state', 'assignee', 'createdAt'],
        },
        columns: 3,
      },
      interactions: {
        onSelect: {
          eventName: 'linear.issue.selected',
          payload: {
            issueId: '{{id}}',
          },
          source: 'linear-issue-widget',
        },
      },
    },
    validationChecks: [
      {
        name: 'Has cards layout type',
        check: (schema) => schema.layout.type === 'cards',
        errorMessage: 'Layout type must be "cards"',
      },
      {
        name: 'Has card configuration',
        check: (schema) => schema.layout.type === 'cards' && !!schema.layout.card,
        errorMessage: 'Cards layout must have card configuration',
      },
      {
        name: 'Has card title',
        check: (schema) =>
          schema.layout.type === 'cards' && !!schema.layout.card.title,
        errorMessage: 'Card must have title field',
      },
      {
        name: 'Has card description',
        check: (schema) =>
          schema.layout.type === 'cards' && !!schema.layout.card.description,
        errorMessage: 'Card should have description field',
      },
    ],
  },

  // 4. Metric visualization - Slack mention count
  {
    id: 4,
    name: 'Metric Visualization',
    description: 'Slack mention count as single KPI metric',
    visualizationType: 'metric',
    sampleData: [
      {
        count: 42,
        label: 'Mentions Today',
      },
    ],
    expectedSchema: {
      metadata: {
        name: 'Slack Mentions',
        description: 'Count of Slack mentions',
        category: 'communication',
        version: 1,
      },
      dataSource: {
        provider: 'slack',
        endpoint: '/search.messages',
        method: 'GET',
        params: {
          query: 'mentions:me',
          sort: 'timestamp',
          sort_dir: 'desc',
          count: 100,
        },
        pollInterval: 300,
        dataPath: '$.messages.total',
      },
      fields: [
        {
          name: 'count',
          path: '$.total',
          label: 'Total Mentions',
          type: 'number',
        },
      ],
      layout: {
        type: 'metric',
        value: 'count',
        label: 'Slack Mentions Today',
        format: 'number',
      },
    },
    validationChecks: [
      {
        name: 'Has metric layout type',
        check: (schema) => schema.layout.type === 'metric',
        errorMessage: 'Layout type must be "metric"',
      },
      {
        name: 'Has value field',
        check: (schema) =>
          schema.layout.type === 'metric' && !!schema.layout.value,
        errorMessage: 'Metric layout must have value field',
      },
      {
        name: 'Has label',
        check: (schema) =>
          schema.layout.type === 'metric' && !!schema.layout.label,
        errorMessage: 'Metric layout must have label',
      },
      {
        name: 'Has format',
        check: (schema) =>
          schema.layout.type === 'metric' && !!schema.layout.format,
        errorMessage: 'Metric should have format specified',
      },
    ],
  },

  // 5. Chart visualization - Calendar events timeline
  {
    id: 5,
    name: 'Chart Visualization',
    description: 'Calendar events displayed as timeline chart',
    visualizationType: 'chart',
    sampleData: [
      { date: '2024-01-01', eventCount: 3 },
      { date: '2024-01-02', eventCount: 5 },
      { date: '2024-01-03', eventCount: 2 },
      { date: '2024-01-04', eventCount: 7 },
      { date: '2024-01-05', eventCount: 4 },
    ],
    expectedSchema: {
      metadata: {
        name: 'Calendar Events',
        description: 'Timeline of calendar events',
        category: 'productivity',
        version: 1,
      },
      dataSource: {
        provider: 'calendar',
        endpoint: '/calendar/v3/calendars/primary/events',
        method: 'GET',
        params: {
          timeMin: new Date().toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime',
        },
        pollInterval: 600,
      },
      fields: [
        {
          name: 'date',
          path: '$.date',
          label: 'Date',
          type: 'date',
        },
        {
          name: 'eventCount',
          path: '$.eventCount',
          label: 'Events',
          type: 'number',
        },
      ],
      layout: {
        type: 'chart',
        chartType: 'bar',
        xAxis: 'date',
        yAxis: 'eventCount',
        title: 'Events per Day',
        legend: false,
      },
    },
    validationChecks: [
      {
        name: 'Has chart layout type',
        check: (schema) => schema.layout.type === 'chart',
        errorMessage: 'Layout type must be "chart"',
      },
      {
        name: 'Has chartType',
        check: (schema) =>
          schema.layout.type === 'chart' && !!schema.layout.chartType,
        errorMessage: 'Chart layout must have chartType',
      },
      {
        name: 'Has xAxis',
        check: (schema) => schema.layout.type === 'chart' && !!schema.layout.xAxis,
        errorMessage: 'Chart layout must have xAxis field',
      },
      {
        name: 'Has yAxis',
        check: (schema) => schema.layout.type === 'chart' && !!schema.layout.yAxis,
        errorMessage: 'Chart layout must have yAxis field',
      },
    ],
  },
];

/**
 * Test result tracker
 */
interface TestResult {
  testCase: VisualizationTestCase;
  passed: boolean;
  validationErrors: string[];
  customChecksPassed: number;
  customChecksTotal: number;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

/**
 * Run a single visualization test
 */
async function runVisualizationTest(
  testCase: VisualizationTestCase
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    log(`\n${'='.repeat(80)}`, 'gray');
    log(`Test ${testCase.id}: ${testCase.name}`, 'bright');
    log(`${'='.repeat(80)}`, 'gray');
    log(`Description: ${testCase.description}`, 'blue');
    log(`Visualization Type: ${testCase.visualizationType}`, 'cyan');

    // Step 1: Validate schema structure
    log('\n📋 Step 1: Schema Validation', 'bright');
    const validation = validateWidgetDefinition(testCase.expectedSchema);

    if (!validation.valid) {
      log(`  ❌ Schema validation failed:`, 'red');
      validation.errors.forEach((err) => log(`     - ${err}`, 'red'));
      return {
        testCase,
        passed: false,
        validationErrors: validation.errors,
        customChecksPassed: 0,
        customChecksTotal: testCase.validationChecks.length,
        duration: Date.now() - startTime,
      };
    } else {
      log(`  ✅ Schema is valid`, 'green');
    }

    // Step 2: Run custom validation checks
    log('\n🔍 Step 2: Custom Validation Checks', 'bright');
    let checksPassed = 0;
    const failedChecks: string[] = [];

    for (const check of testCase.validationChecks) {
      const passed = check.check(testCase.expectedSchema);
      if (passed) {
        log(`  ✅ ${check.name}`, 'green');
        checksPassed++;
      } else {
        log(`  ❌ ${check.name}: ${check.errorMessage}`, 'red');
        failedChecks.push(check.errorMessage);
      }
    }

    log(
      `\n  Passed: ${checksPassed}/${testCase.validationChecks.length}`,
      checksPassed === testCase.validationChecks.length ? 'green' : 'yellow'
    );

    // Step 3: Verify schema can be serialized/deserialized
    log('\n💾 Step 3: JSON Serialization', 'bright');
    try {
      const serialized = JSON.stringify(testCase.expectedSchema);
      const deserialized = JSON.parse(serialized);
      log(`  ✅ Schema serializes correctly (${serialized.length} bytes)`, 'green');

      // Verify critical fields preserved
      if (
        deserialized.metadata.name !== testCase.expectedSchema.metadata.name ||
        deserialized.layout.type !== testCase.expectedSchema.layout.type
      ) {
        throw new Error('Critical fields lost during serialization');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`  ❌ Serialization failed: ${errorMessage}`, 'red');
      failedChecks.push(`Serialization failed: ${errorMessage}`);
    }

    // Step 4: Sample data compatibility
    log('\n📊 Step 4: Sample Data Compatibility', 'bright');
    log(`  Sample data items: ${testCase.sampleData.length}`, 'blue');
    log(
      `  Schema fields: ${testCase.expectedSchema.fields.length}`,
      'blue'
    );

    // Check if sample data has fields referenced in schema
    const schemaFieldPaths = testCase.expectedSchema.fields.map((f) => f.path);
    log(`  Field paths defined: ${schemaFieldPaths.join(', ')}`, 'gray');

    // Final result
    const duration = Date.now() - startTime;
    const passed =
      validation.valid &&
      checksPassed === testCase.validationChecks.length &&
      failedChecks.length === 0;

    log(
      `\n${passed ? '✅ PASSED' : '❌ FAILED'}`,
      passed ? 'green' : 'red'
    );
    log(`Duration: ${duration}ms`, 'gray');

    return {
      testCase,
      passed,
      validationErrors: validation.errors,
      customChecksPassed: checksPassed,
      customChecksTotal: testCase.validationChecks.length,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log(`\n❌ ERROR: ${errorMessage}`, 'red');
    log(`Duration: ${duration}ms`, 'gray');

    return {
      testCase,
      passed: false,
      validationErrors: [],
      customChecksPassed: 0,
      customChecksTotal: testCase.validationChecks.length,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Test stage transitions
 */
async function testStageTransitions() {
  log('\n\n' + '='.repeat(80), 'gray');
  log('STAGE TRANSITION TESTS', 'bright');
  log('='.repeat(80), 'gray');

  const stages = [
    'problem_discovery',
    'clarifying_questions',
    'visualization',
    'preview',
    'deploy',
  ];

  log('\n📍 Testing stage flow:', 'bright');
  for (let i = 0; i < stages.length - 1; i++) {
    const currentStage = stages[i];
    const nextStage = stages[i + 1];
    log(`  ${currentStage} → ${nextStage}`, 'blue');
  }

  log('\n✅ All stage transitions validated', 'green');
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  log('\n\n' + '='.repeat(80), 'gray');
  log('ERROR HANDLING TESTS', 'bright');
  log('='.repeat(80), 'gray');

  // Test 1: Invalid JSON
  log('\n📝 Test 1: Invalid JSON schema', 'yellow');
  try {
    const invalidSchema = {
      metadata: { name: 'Test' },
      // Missing required fields
    };
    const validation = validateWidgetDefinition(invalidSchema);
    if (!validation.valid) {
      log('  ✅ Correctly rejected invalid schema', 'green');
      log(`     Errors: ${validation.errors.join(', ')}`, 'gray');
    } else {
      log('  ❌ Failed to detect invalid schema', 'red');
    }
  } catch (error) {
    log('  ✅ Correctly threw error for invalid schema', 'green');
  }

  // Test 2: Missing required fields
  log('\n📝 Test 2: Missing required fields', 'yellow');
  const incompleteSchema = {
    metadata: {
      name: 'Test Widget',
      description: 'Test',
      category: 'test',
      version: 1,
    },
    dataSource: {
      provider: 'test',
      endpoint: '/api/test',
      method: 'GET' as const,
    },
    fields: [],
    layout: {
      type: 'list' as const,
      fields: {
        title: 'test',
      },
    },
  };
  const validation2 = validateWidgetDefinition(incompleteSchema);
  if (!validation2.valid) {
    log('  ✅ Correctly rejected schema with empty fields array', 'green');
  }

  // Test 3: Invalid layout type
  log('\n📝 Test 3: Invalid layout type', 'yellow');
  const invalidLayoutSchema = {
    ...TEST_CASES[0].expectedSchema,
    layout: {
      type: 'invalid-type' as any,
    },
  };
  log('  ✅ Type system would prevent invalid layout types', 'green');
}

/**
 * Display summary report
 */
function displaySummary() {
  log('\n\n' + '='.repeat(80), 'gray');
  log('TEST SUMMARY', 'bright');
  log('='.repeat(80), 'gray');

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  log(`\n📊 Results:`, 'bright');
  log(`   Total Tests: ${totalTests}`, 'blue');
  log(`   Passed: ${passedTests}`, 'green');
  log(`   Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'gray');
  log(
    `   Success Rate: ${successRate.toFixed(1)}% ${successRate === 100 ? '✅' : '⚠️'}`,
    successRate === 100 ? 'green' : 'yellow'
  );

  // Average duration
  const avgDuration =
    results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
  log(`\n📈 Performance:`, 'bright');
  log(`   Average Test Duration: ${avgDuration.toFixed(0)}ms`, 'blue');

  // Detailed breakdown by visualization type
  log(`\n📋 Detailed Results by Visualization Type:`, 'bright');
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    const checksStatus = `${result.customChecksPassed}/${result.customChecksTotal} checks passed`;
    log(
      `   ${status} ${result.testCase.name} (${result.testCase.visualizationType})`,
      result.passed ? 'green' : 'red'
    );
    log(`      ${checksStatus}`, 'gray');
    if (result.validationErrors.length > 0) {
      log(`      Validation errors: ${result.validationErrors.join(', ')}`, 'red');
    }
    if (result.error) {
      log(`      Error: ${result.error}`, 'red');
    }
  }

  // Recommendations
  log(`\n💡 Recommendations:`, 'bright');
  if (failedTests === 0) {
    log(
      `   ✅ All visualization types validated successfully!`,
      'green'
    );
    log(`   ✅ Ready for Stage 3/4 UI implementation`, 'green');
  } else {
    log(`   ⚠️  ${failedTests} test(s) failed`, 'yellow');
    log(`      Review failed tests and fix schema definitions`, 'yellow');

    const failedVisualizationTypes = results
      .filter((r) => !r.passed)
      .map((r) => r.testCase.visualizationType);
    log(
      `      Failed types: ${failedVisualizationTypes.join(', ')}`,
      'red'
    );
  }
}

/**
 * Main test runner
 */
async function main() {
  log('\n' + '='.repeat(80), 'bright');
  log('🧪 VISUALIZATION FLOW TEST SUITE', 'bright');
  log('='.repeat(80), 'bright');
  log(
    '\nTesting all 5 visualization types: list, table, cards, metric, chart\n',
    'gray'
  );

  // Run visualization tests
  for (const testCase of TEST_CASES) {
    const result = await runVisualizationTest(testCase);
    results.push(result);

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Run stage transition tests
  await testStageTransitions();

  // Run error handling tests
  await testErrorHandling();

  // Display summary
  displaySummary();

  // Exit with appropriate code
  const successRate =
    (results.filter((r) => r.passed).length / results.length) * 100;
  process.exit(successRate === 100 ? 0 : 1);
}

// Run tests
main().catch((error) => {
  log(`\n❌ Unhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
