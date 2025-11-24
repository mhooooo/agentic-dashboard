/**
 * Manual Token Refresh Endpoint
 *
 * POST /api/auth/refresh-token
 *
 * Allows users to manually refresh a specific provider's OAuth token.
 * Different from /api/auth/refresh-tokens which refreshes ALL expiring tokens.
 *
 * SECURITY:
 * - Requires user authentication
 * - Only refreshes tokens for authenticated user
 * - Validates provider supports refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api/auth';
import { getOAuthConfig } from '@/lib/oauth/config';
import { refreshAccessToken } from '@/lib/oauth/utils';
import type { ProviderCredentials } from '@/lib/providers/types';

interface RefreshTokenRequest {
  provider: string;
}

/**
 * POST /api/auth/refresh-token
 *
 * Manually refresh a specific provider's token
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json() as RefreshTokenRequest;
    const { provider } = body;

    if (!provider) {
      return NextResponse.json(
        { error: { message: 'Provider is required' } },
        { status: 400 }
      );
    }

    // 3. Get provider OAuth config
    const config = getOAuthConfig(provider);
    if (!config) {
      return NextResponse.json(
        { error: { message: `Invalid provider: ${provider}` } },
        { status: 400 }
      );
    }

    if (!config.supportsRefreshToken) {
      return NextResponse.json(
        { error: { message: `Provider ${provider} does not support token refresh` } },
        { status: 400 }
      );
    }

    // 4. Get current credentials from database
    const restUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!restUrl || !serviceKey) {
      return NextResponse.json(
        { error: { message: 'Database configuration missing' } },
        { status: 500 }
      );
    }

    const getResponse = await fetch(
      `${restUrl}/rest/v1/user_credentials?user_id=eq.${user.userId}&provider=eq.${provider}&select=credentials`,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      }
    );

    if (!getResponse.ok) {
      return NextResponse.json(
        { error: { message: 'Failed to fetch credentials' } },
        { status: 500 }
      );
    }

    const credentialRecords = await getResponse.json() as Array<{ credentials: ProviderCredentials }>;

    if (credentialRecords.length === 0) {
      return NextResponse.json(
        { error: { message: `No credentials found for ${provider}` } },
        { status: 404 }
      );
    }

    const credentials = credentialRecords[0].credentials;

    if (!credentials.refresh_token) {
      return NextResponse.json(
        { error: { message: 'No refresh token available for this provider' } },
        { status: 400 }
      );
    }

    // 5. Get OAuth client credentials
    const clientId = process.env[config.clientIdEnvVar];
    const clientSecret = process.env[config.clientSecretEnvVar];

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: { message: `OAuth configuration missing for ${provider}` } },
        { status: 500 }
      );
    }

    // 6. Refresh the token
    console.log(`[RefreshToken] Manually refreshing ${provider} token for user ${user.userId}`);

    const tokenResponse = await refreshAccessToken({
      tokenUrl: config.tokenUrl,
      refreshToken: credentials.refresh_token,
      clientId,
      clientSecret,
    });

    // 7. Update credentials in database
    const updatedCredentials: ProviderCredentials = {
      ...credentials,
      pat: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || credentials.refresh_token,
      expires_at: tokenResponse.expires_in
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined,
    };

    const updateResponse = await fetch(
      `${restUrl}/rest/v1/user_credentials?user_id=eq.${user.userId}&provider=eq.${provider}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
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
      console.error(`[RefreshToken] Failed to update database:`, error);
      return NextResponse.json(
        { error: { message: 'Failed to save refreshed token' } },
        { status: 500 }
      );
    }

    console.log(`[RefreshToken] Successfully refreshed ${provider} token`);

    return NextResponse.json({
      success: true,
      data: {
        provider,
        expiresAt: updatedCredentials.expires_at,
        refreshedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[RefreshToken] Error:', error);
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
