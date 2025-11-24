/**
 * OAuth Token Refresh Job
 *
 * Background job that automatically refreshes OAuth tokens before they expire.
 * Prevents widget breakage from expired tokens.
 *
 * FLOW:
 * 1. Query for tokens expiring in next 15 minutes
 * 2. For each expiring token, call refresh endpoint
 * 3. Update database with new access_token and expires_at
 * 4. Log successes and failures
 */

import { getOAuthConfig } from './config';
import { refreshAccessToken } from './utils';
import type { ProviderCredentials } from '@/lib/providers/types';

/**
 * Result of refreshing a single token
 */
export interface RefreshResult {
  provider: string;
  userId: string;
  success: boolean;
  error?: string;
}

/**
 * Summary of refresh job execution
 */
export interface RefreshJobSummary {
  totalChecked: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  results: RefreshResult[];
  executedAt: Date;
}

/**
 * Token record from database (expiring soon)
 */
interface ExpiringToken {
  user_id: string;
  provider: string;
  credentials: ProviderCredentials;
}

/**
 * Get expiring tokens from database
 *
 * Queries for tokens that:
 * - Have a refresh_token (required for refresh flow)
 * - Have expires_at timestamp
 * - Expire in the next 15 minutes
 *
 * Uses PostgreSQL JSON operators to query JSONB credentials field
 */
async function getExpiringTokens(): Promise<ExpiringToken[]> {
  const restUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!restUrl || !serviceKey) {
    console.error('[RefreshJob] Missing Supabase configuration');
    return [];
  }

  try {
    // Calculate timestamp 15 minutes from now (in milliseconds)
    const expiresBeforeMs = Date.now() + 15 * 60 * 1000;

    // PostgREST query using JSON operators
    // credentials->>'expires_at' extracts expires_at as text
    // We cast to numeric for comparison
    const endpoint = `/rest/v1/user_credentials?select=user_id,provider,credentials&credentials->refresh_token=not.is.null&credentials->expires_at=not.is.null&order=credentials->>expires_at.asc`;

    const response = await fetch(`${restUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to query expiring tokens: ${error}`);
    }

    const allTokens = await response.json() as ExpiringToken[];

    // Filter in JavaScript for tokens expiring within 15 minutes
    // (PostgREST JSON comparison is tricky, so we filter after fetch)
    const expiringTokens = allTokens.filter(token => {
      const expiresAt = token.credentials.expires_at;
      if (!expiresAt) return false;

      // expires_at is stored as number (timestamp in milliseconds)
      const expiresAtMs = typeof expiresAt === 'number' ? expiresAt : parseInt(expiresAt, 10);
      return expiresAtMs <= expiresBeforeMs && expiresAtMs > Date.now();
    });

    console.log(`[RefreshJob] Found ${expiringTokens.length} tokens expiring within 15 minutes`);
    return expiringTokens;
  } catch (error) {
    console.error('[RefreshJob] Error querying expiring tokens:', error);
    return [];
  }
}

/**
 * Refresh a single token
 */
async function refreshSingleToken(token: ExpiringToken): Promise<RefreshResult> {
  const { user_id, provider, credentials } = token;

  try {
    // Get provider config
    const config = getOAuthConfig(provider);
    if (!config) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    // Check if provider supports refresh tokens
    if (!config.supportsRefreshToken) {
      throw new Error(`Provider ${provider} does not support token refresh`);
    }

    // Get client credentials from environment
    const clientId = process.env[config.clientIdEnvVar];
    const clientSecret = process.env[config.clientSecretEnvVar];

    if (!clientId || !clientSecret) {
      throw new Error(`Missing OAuth credentials for ${provider}`);
    }

    // Check if refresh token exists
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available');
    }

    console.log(`[RefreshJob] Refreshing token for ${provider} (user: ${user_id})`);

    // Call refresh endpoint
    const tokenResponse = await refreshAccessToken({
      tokenUrl: config.tokenUrl,
      refreshToken: credentials.refresh_token,
      clientId,
      clientSecret,
    });

    // Update credentials in database
    const updatedCredentials: ProviderCredentials = {
      ...credentials,
      pat: tokenResponse.access_token, // Update access token
      refresh_token: tokenResponse.refresh_token || credentials.refresh_token, // Some providers rotate refresh tokens
      expires_at: tokenResponse.expires_in
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined,
    };

    // Save to database
    const restUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const updateResponse = await fetch(
      `${restUrl}/rest/v1/user_credentials?user_id=eq.${user_id}&provider=eq.${provider}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(serviceKey ? { 'apikey': serviceKey } : {}),
          'Authorization': `Bearer ${serviceKey || ''}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          credentials: updatedCredentials,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update database: ${error}`);
    }

    console.log(`[RefreshJob] ✓ Successfully refreshed ${provider} token for user ${user_id}`);

    return {
      provider,
      userId: user_id,
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[RefreshJob] ✗ Failed to refresh ${provider} token for user ${user_id}:`, errorMessage);

    return {
      provider,
      userId: user_id,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute the token refresh job
 *
 * This function should be called periodically (e.g., every 5 minutes via cron)
 * or on-demand via API endpoint.
 *
 * @returns Summary of refresh operations
 */
export async function executeRefreshJob(): Promise<RefreshJobSummary> {
  console.log('[RefreshJob] Starting token refresh job...');
  const startTime = Date.now();

  // Get tokens that are expiring soon
  const expiringTokens = await getExpiringTokens();

  if (expiringTokens.length === 0) {
    console.log('[RefreshJob] No tokens need refreshing');
    return {
      totalChecked: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      results: [],
      executedAt: new Date(),
    };
  }

  // Refresh each token
  const results: RefreshResult[] = [];
  for (const token of expiringTokens) {
    const result = await refreshSingleToken(token);
    results.push(result);
  }

  // Calculate summary
  const successfulRefreshes = results.filter(r => r.success).length;
  const failedRefreshes = results.filter(r => !r.success).length;

  const duration = Date.now() - startTime;
  console.log(`[RefreshJob] Completed in ${duration}ms`);
  console.log(`[RefreshJob] Summary: ${successfulRefreshes} succeeded, ${failedRefreshes} failed`);

  return {
    totalChecked: expiringTokens.length,
    successfulRefreshes,
    failedRefreshes,
    results,
    executedAt: new Date(),
  };
}
