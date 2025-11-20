/**
 * OAuth Callback Handler
 *
 * GET /api/auth/[provider]/callback
 *
 * Receives the authorization code from the provider and exchanges it
 * for an access token. Stores the token securely and redirects to settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOAuthConfig, getCallbackUrl } from '@/lib/oauth/config';
import { exchangeCodeForToken, decodeStateData } from '@/lib/oauth/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Get authorization code and state from query params
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    const redirectUrl = new URL('/settings/credentials', request.url);
    redirectUrl.searchParams.set('error', error);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_description', errorDescription);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  // Get OAuth config
  const config = getOAuthConfig(provider);
  if (!config) {
    return NextResponse.json(
      { error: 'Invalid provider' },
      { status: 400 }
    );
  }

  // Retrieve and validate state from cookie
  const stateCookie = request.cookies.get('oauth_state');
  if (!stateCookie) {
    return NextResponse.json(
      { error: 'Missing state cookie - CSRF protection failed' },
      { status: 400 }
    );
  }

  const stateData = decodeStateData(stateCookie.value);
  if (!stateData || stateData.state !== state || stateData.provider !== provider) {
    return NextResponse.json(
      { error: 'Invalid state - CSRF protection failed' },
      { status: 400 }
    );
  }

  // Get client credentials
  const clientId = process.env[config.clientIdEnvVar];
  const clientSecret = process.env[config.clientSecretEnvVar];

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'OAuth not configured' },
      { status: 500 }
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken({
      tokenUrl: config.tokenUrl,
      code,
      clientId,
      clientSecret,
      redirectUri: getCallbackUrl(provider),
      codeVerifier: stateData.codeVerifier,
    });

    // Store credentials securely
    const credentialsResponse = await fetch(
      new URL(`/api/credentials/${provider}`, request.url),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pat: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_at: tokenResponse.expires_in
            ? Date.now() + tokenResponse.expires_in * 1000
            : undefined,
        }),
      }
    );

    const credentialsResult = await credentialsResponse.json();

    if (!credentialsResult.success) {
      throw new Error(credentialsResult.error?.message || 'Failed to store credentials');
    }

    // Clear state cookie
    const redirectUrl = new URL('/settings/credentials', request.url);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('provider', config.displayName);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('oauth_state');

    return response;
  } catch (error) {
    console.error(`[OAuth] ${provider} callback error:`, error);

    const redirectUrl = new URL('/settings/credentials', request.url);
    redirectUrl.searchParams.set('error', 'oauth_failed');
    redirectUrl.searchParams.set(
      'error_description',
      error instanceof Error ? error.message : 'Unknown error'
    );

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('oauth_state');

    return response;
  }
}
