/**
 * OAuth 2.0 Configuration for Providers
 *
 * Each provider has specific OAuth settings including:
 * - Authorization URL
 * - Token exchange URL
 * - Required scopes
 * - PKCE support
 * - Refresh token support
 */

export interface OAuthConfig {
  name: string;
  displayName: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  usePKCE: boolean;
  supportsRefreshToken: boolean;
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
}

export const OAUTH_PROVIDERS: Record<string, OAuthConfig> = {
  github: {
    name: 'github',
    displayName: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user'],
    usePKCE: true, // PKCE recommended as of 2025
    supportsRefreshToken: false, // GitHub doesn't use refresh tokens - tokens don't expire
    clientIdEnvVar: 'GITHUB_CLIENT_ID',
    clientSecretEnvVar: 'GITHUB_CLIENT_SECRET',
  },
  jira: {
    name: 'jira',
    displayName: 'Jira',
    authUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    scopes: ['read:jira-work', 'read:jira-user', 'offline_access'], // offline_access for refresh token
    usePKCE: false,
    supportsRefreshToken: true, // Rotating refresh tokens
    clientIdEnvVar: 'JIRA_CLIENT_ID',
    clientSecretEnvVar: 'JIRA_CLIENT_SECRET',
  },
  linear: {
    name: 'linear',
    displayName: 'Linear',
    authUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    scopes: ['read', 'write'], // Adjust based on your needs
    usePKCE: true,
    supportsRefreshToken: true, // Default for apps created after Oct 1, 2025
    clientIdEnvVar: 'LINEAR_CLIENT_ID',
    clientSecretEnvVar: 'LINEAR_CLIENT_SECRET',
  },
  slack: {
    name: 'slack',
    displayName: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['channels:read', 'channels:history', 'users:read'],
    usePKCE: false,
    supportsRefreshToken: true,
    clientIdEnvVar: 'SLACK_CLIENT_ID',
    clientSecretEnvVar: 'SLACK_CLIENT_SECRET',
  },
  calendar: {
    name: 'calendar',
    displayName: 'Google Calendar',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    usePKCE: false,
    supportsRefreshToken: true,
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
  },
};

/**
 * Get OAuth callback URL for a provider
 */
export function getCallbackUrl(provider: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/auth/${provider}/callback`;
}

/**
 * Validate OAuth provider exists
 */
export function isValidProvider(provider: string): boolean {
  return provider in OAUTH_PROVIDERS;
}

/**
 * Get OAuth config for a provider
 */
export function getOAuthConfig(provider: string): OAuthConfig | null {
  return OAUTH_PROVIDERS[provider] || null;
}
