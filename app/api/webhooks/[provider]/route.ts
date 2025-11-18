/**
 * Webhook Receiver Endpoint
 *
 * Receives webhooks from external providers (GitHub, Jira, Slack).
 * Verifies signatures, stores events, and publishes to Event Mesh.
 *
 * POST /api/webhooks/[provider]
 */

import { createServerSupabaseClient } from '@/lib/supabase/client';
import { verifyWebhookSignature } from '@/lib/webhooks/verify';
import { errorResponse } from '@/lib/api/auth';

/**
 * POST /api/webhooks/[provider]
 *
 * Receive webhook from external provider
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // 1. Get raw body for signature verification
    const body = await request.text();

    // 2. Verify webhook signature
    const isValid = verifyWebhookSignature(provider, request.headers, body);

    if (!isValid) {
      console.error(`[Webhooks] Invalid signature for ${provider} webhook`);
      return errorResponse('Invalid webhook signature', 'INVALID_SIGNATURE', 401);
    }

    // 3. Parse webhook payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return errorResponse('Invalid JSON payload', 'INVALID_PAYLOAD', 400);
    }

    // 4. Determine event type based on provider
    const eventType = getEventType(provider, request.headers, payload);

    if (!eventType) {
      console.warn(`[Webhooks] Unknown event type for ${provider}`);
      return errorResponse('Unknown event type', 'UNKNOWN_EVENT', 400);
    }

    console.log(`[Webhooks] Received ${provider}.${eventType}`);

    // 5. Store webhook event in database
    const supabase = createServerSupabaseClient();
    const { error: dbError } = await supabase.from('webhook_events').insert({
      provider,
      event_type: eventType,
      payload,
    });

    if (dbError) {
      console.error(`[Webhooks] Error storing event:`, dbError);
      // Don't fail the webhook - return success to provider
    }

    // 6. Publish to Event Mesh (server-side broadcast)
    // Note: This will be implemented in the next task
    await publishToEventMesh(provider, eventType, payload);

    // 7. Return success
    return Response.json({
      success: true,
      received: true,
    });
  } catch (error) {
    console.error('[Webhooks] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * Determine event type from webhook payload
 */
function getEventType(provider: string, headers: Headers, payload: any): string | null {
  switch (provider) {
    case 'github':
      // GitHub sends event type in X-GitHub-Event header
      return headers.get('x-github-event');

    case 'jira':
      // Jira sends event type in webhookEvent field
      return payload.webhookEvent || null;

    case 'slack':
      // Slack sends event type in type field
      return payload.type || null;

    default:
      return null;
  }
}

/**
 * Publish webhook event to Event Mesh
 *
 * This is a server-side operation. We'll implement real-time
 * broadcasting in the next task.
 */
async function publishToEventMesh(
  provider: string,
  eventType: string,
  payload: any
): Promise<void> {
  // TODO: Implement server-side Event Mesh publishing
  // Options:
  // 1. Server-Sent Events (SSE) for real-time updates
  // 2. WebSocket connection
  // 3. Polling (simplest for Phase 2)

  console.log(`[Event Mesh] Would publish: ${provider}.${eventType}`);

  // For now, this is a placeholder
  // The Event Mesh bridge will be implemented in the next task
}

/**
 * GET /api/webhooks/[provider]
 *
 * Not supported - webhooks must use POST
 */
export async function GET() {
  return errorResponse(
    'GET requests are not supported for webhooks. Use POST.',
    'METHOD_NOT_ALLOWED',
    405
  );
}
