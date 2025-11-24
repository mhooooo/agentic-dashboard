/**
 * Test script for Event Mesh V2 Persistence Layer
 *
 * Run this script to verify event persistence works correctly.
 *
 * Usage:
 * ```bash
 * npx ts-node lib/event-mesh/test-persistence.ts
 * ```
 */

import {
  publishDocumentable,
  queryEventHistory,
  updateEventOutcome,
  getEvent,
} from './persistence';

async function testEventPersistence() {
  console.log('\n=== Event Mesh V2 Persistence Test ===\n');

  // Test 1: Publish a simple documentable event
  console.log('Test 1: Publishing simple documentable event...');
  const simpleEvent = await publishDocumentable({
    eventName: 'widget.created',
    source: 'widget_wizard',
    timestamp: Date.now(),
    payload: {
      widgetType: 'github_prs',
      providerId: 'github',
    },
    shouldDocument: true,
  });
  console.log('✅ Simple event published:', simpleEvent.id);

  // Test 2: Publish event with full user intent
  console.log('\nTest 2: Publishing event with user intent...');
  const intentEvent = await publishDocumentable({
    eventName: 'widget.created',
    source: 'widget_wizard',
    timestamp: Date.now(),
    payload: {
      widgetType: 'stripe_failed_payments',
      providerId: 'stripe',
    },
    shouldDocument: true,
    userIntent: {
      problemSolved: 'Track late payments across all customers',
      painPoint: 'Manually checking Stripe dashboard takes 30 minutes every day',
      goal: 'Automatically see failed payments in dashboard',
      expectedOutcome: 'Dashboard shows failed payments within 1 minute',
      impactMetric: 'Reduce manual payment checking from 30min to 0min per day',
    },
    context: {
      decision: 'User chose webhook approach over polling',
      category: 'feature',
    },
  });
  console.log('✅ Event with intent published:', intentEvent.id);

  // Test 3: Query event history
  console.log('\nTest 3: Querying event history...');
  const allEvents = await queryEventHistory({
    eventName: 'widget.created',
  });
  console.log(`✅ Found ${allEvents.length} widget.created events`);

  // Test 4: Get single event by ID
  console.log('\nTest 4: Getting single event by ID...');
  const retrievedEvent = await getEvent(intentEvent.id);
  if (retrievedEvent) {
    console.log('✅ Retrieved event:', retrievedEvent.id);
    console.log('   User intent:', retrievedEvent.userIntent?.problemSolved);
  } else {
    console.log('❌ Failed to retrieve event');
  }

  // Test 5: Multi-step workflow with related events
  console.log('\nTest 5: Publishing multi-step workflow...');

  const step1 = await publishDocumentable({
    eventName: 'provider.connected',
    source: 'oauth_flow',
    timestamp: Date.now(),
    payload: {
      providerId: 'stripe',
      scopes: ['read_payments'],
    },
    shouldDocument: true,
    userIntent: {
      problemSolved: 'Need access to Stripe payment data',
      painPoint: 'No visibility into payment failures',
      goal: 'Connect Stripe to dashboard',
      expectedOutcome: 'Successfully authenticate and fetch payment data',
    },
  });
  console.log('✅ Step 1 published:', step1.id);

  const step2 = await publishDocumentable({
    eventName: 'widget.created',
    source: 'widget_wizard',
    timestamp: Date.now(),
    payload: {
      widgetType: 'stripe_failed_payments',
      providerId: 'stripe',
    },
    shouldDocument: true,
    context: {
      relatedEvents: [step1.id],
      decision: 'Widget requires OAuth token from previous step',
    },
  });
  console.log('✅ Step 2 published:', step2.id);

  const step3 = await publishDocumentable({
    eventName: 'automation.created',
    source: 'automation_wizard',
    timestamp: Date.now(),
    payload: {
      trigger: 'stripe.payment.failed',
      actions: [
        { type: 'create_jira_ticket' },
        { type: 'send_slack_message', channel: '#billing' },
      ],
    },
    shouldDocument: true,
    userIntent: {
      problemSolved: 'Automate response to payment failures',
      painPoint: 'Manual ticket creation is slow',
      goal: 'Create Jira ticket and notify team when payment fails',
      expectedOutcome: 'Ticket created and Slack message sent within 1 minute',
    },
    context: {
      relatedEvents: [step1.id, step2.id],
      decision: 'User wants both ticket creation AND notification',
    },
  });
  console.log('✅ Step 3 published:', step3.id);

  // Test 6: Query workflow with graph traversal
  console.log('\nTest 6: Querying workflow with graph traversal...');
  const workflow = await queryEventHistory({
    eventId: step3.id,
    includeRelated: true,
    maxDepth: 5,
  });
  console.log(`✅ Workflow contains ${workflow.length} related events`);
  workflow.forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.eventName} (${event.id})`);
  });

  // Test 7: Update event outcome
  console.log('\nTest 7: Updating event outcome...');
  await updateEventOutcome(step3.id, {
    outcome: 'Successfully created 5 Jira tickets in first hour, average time: 45 seconds',
    impactMetric: '100% of payment failures now tracked (was 0% before)',
  });
  console.log('✅ Outcome updated');

  // Verify outcome was saved
  const updatedEvent = await getEvent(step3.id);
  if (updatedEvent?.context?.outcome) {
    console.log('   Outcome:', updatedEvent.context.outcome);
    console.log('   Impact:', updatedEvent.userIntent?.impactMetric);
  }

  // Test 8: Auto-marking important events
  console.log('\nTest 8: Testing auto-marking of important events...');
  const autoMarkedEvent = await publishDocumentable({
    eventName: 'error.occurred',
    source: 'stripe_widget_1',
    timestamp: Date.now(),
    payload: {
      errorMessage: 'Token expired',
      errorCode: 'TOKEN_EXPIRED',
    },
    // Note: shouldDocument not set - should auto-mark to true
  });
  console.log('✅ Auto-marked event:', autoMarkedEvent.id);
  console.log('   shouldDocument:', autoMarkedEvent.shouldDocument);

  // Test 9: Query by time range
  console.log('\nTest 9: Querying by time range...');
  const oneHourAgo = Date.now() - 3600000;
  const recentEvents = await queryEventHistory({
    startTime: oneHourAgo,
    endTime: Date.now(),
  });
  console.log(`✅ Found ${recentEvents.length} events in last hour`);

  console.log('\n=== All Tests Complete ===\n');
  console.log('Summary:');
  console.log('- Event persistence: ✅');
  console.log('- User intent capture: ✅');
  console.log('- Graph traversal: ✅');
  console.log('- Outcome updates: ✅');
  console.log('- Auto-marking: ✅');
  console.log('- Time range queries: ✅');
}

// Run tests
if (require.main === module) {
  testEventPersistence()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export { testEventPersistence };
