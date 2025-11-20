/**
 * OAuth Initiation Endpoint
 *
 * GET /api/auth/[provider]
 *
 * Redirects the user to the provider's OAuth authorization page
 * with appropriate parameters (client_id, scopes, PKCE, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOAuthConfig, getCallbackUrl } from '@/lib/oauth/config';
import {
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  encodeStateData,
} from '@/lib/oauth/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  // Get OAuth config for provider
  const config = getOAuthConfig(provider);

  if (!config) {
    return NextResponse.json(
      { error: 'Invalid provider' },
      { status: 400 }
    );
  }

  // Get client credentials from environment
  const clientId = process.env[config.clientIdEnvVar];
  const clientSecret = process.env[config.clientSecretEnvVar];

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: 'OAuth not configured',
        message: `Please set ${config.clientIdEnvVar} and ${config.clientSecretEnvVar} environment variables`,
      },
      { status: 500 }
    );
  }

  // Generate state for CSRF protection
  const state = generateState();

  // Generate PKCE parameters if supported
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;

  if (config.usePKCE) {
    codeVerifier = generateCodeVerifier();
    codeChallenge = generateCodeChallenge(codeVerifier);
  }

  // Provider-specific additional parameters
  const additionalParams: Record<string, string> = {};

  // Jira requires audience parameter
  if (provider === 'jira') {
    additionalParams.audience = 'api.atlassian.com';
    additionalParams.prompt = 'consent'; // Force consent screen to get refresh token
  }

  // Google requires access_type=offline for refresh token
  if (provider === 'calendar') {
    additionalParams.access_type = 'offline';
    additionalParams.prompt = 'consent';
  }

  // Build authorization URL
  const authUrl = buildAuthUrl({
    authUrl: config.authUrl,
    clientId,
    redirectUri: getCallbackUrl(provider),
    scopes: config.scopes,
    state,
    codeChallenge,
    additionalParams,
  });

  // Encode state data to store in cookie
  const stateData = encodeStateData({
    state,
    codeVerifier,
    provider,
  });

  // Create response with redirect
  const response = NextResponse.redirect(authUrl);

  // Set state cookie (expires in 10 minutes)
  response.cookies.set('oauth_state', stateData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
