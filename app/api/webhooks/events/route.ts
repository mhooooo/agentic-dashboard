/**
 * Webhook Events Polling Endpoint
 *
 * Allows clients to poll for new webhook events and publish them to the Event Mesh.
 * This is a simple polling approach for Phase 2. SSE or WebSockets can be added later.
 *
 * GET /api/webhooks/events?since=<timestamp>
 */

import { errorResponse } from '@/lib/api/auth';
import { createServerSupabaseClient } from '@/lib/supabase/client';

/**
 * GET /api/webhooks/events
 *
 * Get webhook events since a given timestamp
 */
export async function GET(request: Request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get('since');
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Default to last 5 minutes if no timestamp provided
    const since = sinceParam
      ? new Date(sinceParam)
      : new Date(Date.now() - 5 * 60 * 1000);

    // Query webhook events
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('webhook_events')
      .select('id, provider, event_type, payload, received_at')
      .gte('received_at', since.toISOString())
      .order('received_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[Webhook Events] Error fetching events:', error);
      return errorResponse('Failed to fetch webhook events', 'DATABASE_ERROR', 500);
    }

    // Transform events into Event Mesh format
    const events = (data || []).map((event) => ({
      id: event.id,
      eventName: `${event.provider}.${event.event_type}`,
      provider: event.provider,
      eventType: event.event_type,
      payload: transformWebhookPayload(event.provider, event.event_type, event.payload),
      receivedAt: event.received_at,
    }));

    return Response.json({
      success: true,
      data: {
        events,
        lastPollTime: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Webhook Events] Unexpected error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * Transform webhook payload into Event Mesh format
 *
 * Extracts relevant data from provider-specific webhook payloads.
 */
function transformWebhookPayload(
  provider: string,
  eventType: string,
  payload: any
): any {
  switch (provider) {
    case 'github':
      return transformGitHubPayload(eventType, payload);

    case 'jira':
      return transformJiraPayload(eventType, payload);

    default:
      return payload;
  }
}

/**
 * Transform GitHub webhook payload
 */
function transformGitHubPayload(eventType: string, payload: any): any {
  switch (eventType) {
    case 'pull_request':
      return {
        action: payload.action, // opened, closed, merged, etc.
        number: payload.pull_request?.number,
        title: payload.pull_request?.title,
        state: payload.pull_request?.state,
        author: payload.pull_request?.user?.login,
        repository: payload.repository?.full_name,
        url: payload.pull_request?.html_url,
        merged: payload.pull_request?.merged || false,
      };

    case 'issues':
      return {
        action: payload.action,
        number: payload.issue?.number,
        title: payload.issue?.title,
        state: payload.issue?.state,
        author: payload.issue?.user?.login,
        repository: payload.repository?.full_name,
        url: payload.issue?.html_url,
      };

    case 'push':
      return {
        ref: payload.ref,
        repository: payload.repository?.full_name,
        pusher: payload.pusher?.name,
        commits: payload.commits?.length || 0,
      };

    default:
      return payload;
  }
}

/**
 * Transform Jira webhook payload
 */
function transformJiraPayload(eventType: string, payload: any): any {
  switch (eventType) {
    case 'jira:issue_updated':
    case 'jira:issue_created':
      return {
        key: payload.issue?.key,
        summary: payload.issue?.fields?.summary,
        status: payload.issue?.fields?.status?.name,
        priority: payload.issue?.fields?.priority?.name,
        assignee: payload.issue?.fields?.assignee?.displayName,
        url: payload.issue?.self,
      };

    default:
      return payload;
  }
}
