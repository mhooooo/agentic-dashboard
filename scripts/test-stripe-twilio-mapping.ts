/**
 * Test script to validate Stripe and Twilio AI mapping
 *
 * Validates that the widget creation agent correctly maps user problems
 * to Stripe and Twilio providers.
 */

import { inferWidgetFromProblem } from '../lib/ai/widget-creation-agent';

async function testMapping() {
  console.log('Testing Stripe and Twilio AI mapping...\n');

  // Test 1: Stripe payment tracking
  console.log('Test 1: Stripe payment tracking');
  console.log('Input: "I need to track customer payments"');

  try {
    const result1 = await inferWidgetFromProblem('I need to track customer payments');
    console.log(`Provider: ${result1.inferredWidget.provider}`);
    console.log(`Type: ${result1.inferredWidget.type}`);
    console.log(`Confidence: ${result1.inferredWidget.confidence}`);
    console.log(`Message: ${result1.message}`);

    if (result1.inferredWidget.provider === 'stripe') {
      console.log('✅ PASS - Correctly mapped to Stripe\n');
    } else {
      console.log(`❌ FAIL - Expected 'stripe', got '${result1.inferredWidget.provider}'\n`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }

  // Test 2: Twilio SMS alerts
  console.log('Test 2: Twilio SMS alerts');
  console.log('Input: "I want SMS alerts for important events"');

  try {
    const result2 = await inferWidgetFromProblem('I want SMS alerts for important events');
    console.log(`Provider: ${result2.inferredWidget.provider}`);
    console.log(`Type: ${result2.inferredWidget.type}`);
    console.log(`Confidence: ${result2.inferredWidget.confidence}`);
    console.log(`Message: ${result2.message}`);

    if (result2.inferredWidget.provider === 'twilio') {
      console.log('✅ PASS - Correctly mapped to Twilio\n');
    } else {
      console.log(`❌ FAIL - Expected 'twilio', got '${result2.inferredWidget.provider}'\n`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }

  // Test 3: Stripe subscription management
  console.log('Test 3: Stripe subscription management');
  console.log('Input: "Monitor subscription revenue and billing"');

  try {
    const result3 = await inferWidgetFromProblem('Monitor subscription revenue and billing');
    console.log(`Provider: ${result3.inferredWidget.provider}`);
    console.log(`Type: ${result3.inferredWidget.type}`);
    console.log(`Confidence: ${result3.inferredWidget.confidence}`);
    console.log(`Message: ${result3.message}`);

    if (result3.inferredWidget.provider === 'stripe') {
      console.log('✅ PASS - Correctly mapped to Stripe\n');
    } else {
      console.log(`❌ FAIL - Expected 'stripe', got '${result3.inferredWidget.provider}'\n`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }

  // Test 4: Twilio text reminders
  console.log('Test 4: Twilio text reminders');
  console.log('Input: "Send text message reminders before meetings"');

  try {
    const result4 = await inferWidgetFromProblem('Send text message reminders before meetings');
    console.log(`Provider: ${result4.inferredWidget.provider}`);
    console.log(`Type: ${result4.inferredWidget.type}`);
    console.log(`Confidence: ${result4.inferredWidget.confidence}`);
    console.log(`Message: ${result4.message}`);

    if (result4.inferredWidget.provider === 'twilio') {
      console.log('✅ PASS - Correctly mapped to Twilio\n');
    } else {
      console.log(`❌ FAIL - Expected 'twilio', got '${result4.inferredWidget.provider}'\n`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }

  console.log('Testing complete!');
}

// Run the test
testMapping().catch(console.error);
