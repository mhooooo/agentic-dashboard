/**
 * Webhook Signature Verification
 *
 * Verifies webhook signatures from external providers to ensure
 * requests are authentic and haven't been tampered with.
 */

import crypto from 'crypto';

/**
 * Verify GitHub webhook signature
 *
 * GitHub sends a X-Hub-Signature-256 header with HMAC-SHA256 signature.
 * Format: "sha256=<signature>"
 *
 * @param payload - Raw request body (string)
 * @param signature - X-Hub-Signature-256 header value
 * @param secret - Webhook secret configured in GitHub
 * @returns True if signature is valid
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  // GitHub signature format: "sha256=<signature>"
  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignature = parts[1];

  // Calculate HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const calculatedSignature = hmac.digest('hex');

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Verify Jira webhook signature
 *
 * Jira sends JWT tokens in the Authorization header.
 * This is a simplified implementation; full JWT verification requires the JWT library.
 *
 * @param token - JWT token from Authorization header
 * @param secret - Webhook secret configured in Jira
 * @returns True if token is valid
 */
export function verifyJiraSignature(token: string | null, secret: string): boolean {
  if (!token) {
    return false;
  }

  // TODO: Implement JWT verification for Jira webhooks
  // For now, just check if token exists (Phase 5)
  console.warn('[Webhooks] Jira signature verification not fully implemented');
  return !!token;
}

/**
 * Verify Slack webhook signature
 *
 * Slack sends a X-Slack-Signature header with timestamp and signature.
 * Format: "v0=<signature>"
 *
 * @param payload - Raw request body (string)
 * @param signature - X-Slack-Signature header value
 * @param timestamp - X-Slack-Request-Timestamp header value
 * @param secret - Signing secret from Slack app
 * @returns True if signature is valid
 */
export function verifySlackSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null,
  secret: string
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  // Check timestamp is recent (within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(timestamp, 10);

  if (Math.abs(currentTime - requestTime) > 60 * 5) {
    console.warn('[Webhooks] Slack webhook timestamp too old');
    return false;
  }

  // Slack signature format: "v0=<signature>"
  const parts = signature.split('=');
  if (parts.length !== 2 || parts[0] !== 'v0') {
    return false;
  }

  const expectedSignature = parts[1];

  // Calculate HMAC-SHA256
  const sigBasestring = `v0:${timestamp}:${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(sigBasestring);
  const calculatedSignature = hmac.digest('hex');

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(calculatedSignature)
  );
}

/**
 * Get webhook secret from environment
 *
 * Secrets should be stored in environment variables, not in database.
 * Format: WEBHOOK_SECRET_<PROVIDER> (e.g., WEBHOOK_SECRET_GITHUB)
 *
 * @param provider - Provider name
 * @returns Webhook secret or undefined if not configured
 */
export function getWebhookSecret(provider: string): string | undefined {
  const envVar = `WEBHOOK_SECRET_${provider.toUpperCase()}`;
  return process.env[envVar];
}

/**
 * Verify webhook signature for any provider
 *
 * @param provider - Provider name
 * @param headers - Request headers
 * @param body - Raw request body (string)
 * @returns True if signature is valid
 */
export function verifyWebhookSignature(
  provider: string,
  headers: Headers,
  body: string
): boolean {
  const secret = getWebhookSecret(provider);

  if (!secret) {
    console.error(`[Webhooks] No webhook secret configured for ${provider}`);
    return false;
  }

  switch (provider) {
    case 'github':
      return verifyGitHubSignature(
        body,
        headers.get('x-hub-signature-256'),
        secret
      );

    case 'jira':
      return verifyJiraSignature(headers.get('authorization'), secret);

    case 'slack':
      return verifySlackSignature(
        body,
        headers.get('x-slack-signature'),
        headers.get('x-slack-request-timestamp'),
        secret
      );

    default:
      console.error(`[Webhooks] Unknown provider: ${provider}`);
      return false;
  }
}
