'use client';

/**
 * OAuth Testing Page
 *
 * Quick verification that all OAuth providers are configured correctly
 */

import { useState, useEffect } from 'react';

interface OAuthStatus {
  provider: string;
  displayName: string;
  configured: boolean;
  connected: boolean;
  error?: string;
}

const PROVIDERS = [
  { name: 'github', displayName: 'GitHub', icon: '🐙' },
  { name: 'jira', displayName: 'Jira', icon: '📋' },
  { name: 'linear', displayName: 'Linear', icon: '📐' },
  { name: 'slack', displayName: 'Slack', icon: '💬' },
  { name: 'calendar', displayName: 'Google Calendar', icon: '📅' },
];

export default function OAuthTestPage() {
  const [statuses, setStatuses] = useState<OAuthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAllProviders();
  }, []);

  const checkAllProviders = async () => {
    setLoading(true);

    // Check which providers are connected
    try {
      const credResponse = await fetch('/api/credentials');
      const credResult = await credResponse.json();
      if (credResult.success) {
        const connected = new Set<string>(credResult.data.map((c: any) => c.provider as string));
        setConnectedProviders(connected);
      }
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }

    // Check OAuth configuration for each provider
    const results: OAuthStatus[] = [];

    for (const provider of PROVIDERS) {
      try {
        // Try to access the OAuth endpoint (it will redirect if configured)
        // We use a HEAD request to check without actually redirecting
        const response = await fetch(`/api/auth/${provider.name}`, {
          method: 'HEAD',
          redirect: 'manual', // Don't follow redirects
        });

        // If we get a redirect (302), OAuth is configured
        // If we get an error (400/500), it's not configured
        const configured = response.type === 'opaqueredirect' || response.status === 302;

        results.push({
          provider: provider.name,
          displayName: provider.displayName,
          configured,
          connected: connectedProviders.has(provider.name),
        });
      } catch (error) {
        results.push({
          provider: provider.name,
          displayName: provider.displayName,
          configured: false,
          connected: connectedProviders.has(provider.name),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setStatuses(results);
    setLoading(false);
  };

  const getStatusColor = (status: OAuthStatus) => {
    if (status.connected) return 'bg-green-100 text-green-800 border-green-200';
    if (status.configured) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getStatusText = (status: OAuthStatus) => {
    if (status.connected) return '✅ Connected';
    if (status.configured) return '⚙️ Configured (Not Connected)';
    return '❌ Not Configured';
  };

  const getStatusDescription = (status: OAuthStatus) => {
    if (status.connected) return 'OAuth credentials stored and ready to use';
    if (status.configured) return 'OAuth app credentials found in environment, ready to connect';
    return `Add ${status.provider.toUpperCase()}_CLIENT_ID and ${status.provider.toUpperCase()}_CLIENT_SECRET to .env.local`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6">OAuth Configuration Test</h1>
        <p className="text-muted-foreground">Checking all providers...</p>
      </div>
    );
  }

  const connectedCount = statuses.filter((s) => s.connected).length;
  const configuredCount = statuses.filter((s) => s.configured).length;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">OAuth Configuration Test</h1>
        <p className="text-muted-foreground">
          Quick verification of OAuth setup for all providers
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{connectedCount}</div>
          <div className="text-sm text-muted-foreground">Connected</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {configuredCount - connectedCount}
          </div>
          <div className="text-sm text-muted-foreground">Configured</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-600">
            {PROVIDERS.length - configuredCount}
          </div>
          <div className="text-sm text-muted-foreground">Not Configured</div>
        </div>
      </div>

      {/* Provider Status */}
      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const status = statuses.find((s) => s.provider === provider.name);
          if (!status) return null;

          return (
            <div key={provider.name} className="border rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{provider.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{provider.displayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getStatusDescription(status)}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-xs px-3 py-1 rounded border ${getStatusColor(status)}`}
                >
                  {getStatusText(status)}
                </span>
              </div>

              {/* Environment Variables */}
              <div className="bg-gray-50 rounded p-3 mb-3">
                <div className="text-xs font-mono space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        status.configured ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {status.configured ? '✓' : '✗'}
                    </span>
                    <code>{provider.name.toUpperCase()}_CLIENT_ID</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        status.configured ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {status.configured ? '✓' : '✗'}
                    </span>
                    <code>{provider.name.toUpperCase()}_CLIENT_SECRET</code>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {status.configured && !status.connected && (
                  <a
                    href="/settings/credentials"
                    className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90"
                  >
                    Connect Now
                  </a>
                )}
                {!status.configured && (
                  <a
                    href="/OAUTH_QUICKSTART.md"
                    className="text-sm px-4 py-2 border rounded hover:bg-accent"
                  >
                    Setup Instructions
                  </a>
                )}
                {status.connected && (
                  <a
                    href="/"
                    className="text-sm px-4 py-2 bg-green-600 text-white rounded hover:opacity-90"
                  >
                    Test Widget →
                  </a>
                )}
              </div>

              {status.error && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded">
                  Error: {status.error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-8 border rounded-lg p-6 bg-blue-50">
        <h3 className="font-semibold mb-2">Next Steps:</h3>
        <ol className="text-sm space-y-2 list-decimal list-inside">
          <li>
            Follow <code className="bg-white px-1 rounded">OAUTH_QUICKSTART.md</code> to
            create OAuth apps
          </li>
          <li>
            Add credentials to <code className="bg-white px-1 rounded">.env.local</code>
          </li>
          <li>
            Restart dev server: <code className="bg-white px-1 rounded">./dev.sh</code>
          </li>
          <li>
            Refresh this page to see updated status
          </li>
          <li>
            Click "Connect Now" to test OAuth flow
          </li>
        </ol>
      </div>

      {/* Quick Links */}
      <div className="mt-6 flex gap-4">
        <a
          href="/settings/credentials"
          className="text-sm text-blue-600 hover:underline"
        >
          → Credentials Settings
        </a>
        <a href="/" className="text-sm text-blue-600 hover:underline">
          → Dashboard
        </a>
        <button
          onClick={checkAllProviders}
          className="text-sm text-blue-600 hover:underline"
        >
          ↻ Refresh Status
        </button>
      </div>
    </div>
  );
}
