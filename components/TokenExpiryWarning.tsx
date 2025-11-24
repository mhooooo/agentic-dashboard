'use client';

/**
 * Token Expiry Warning Component
 *
 * Displays detailed warning cards for expiring/expired tokens on settings page.
 * Includes countdown timer and manual refresh button.
 */

import { useState } from 'react';
import { TokenExpiryBadge } from './TokenExpiryBadge';
import { toast } from 'sonner';

export interface CredentialExpiryStatus {
  provider: string;
  expiresAt?: number;
  timeRemaining?: number;
  status: 'ok' | 'warning' | 'expired' | 'no-expiry';
  supportsRefresh: boolean;
}

interface TokenExpiryWarningProps {
  providers: CredentialExpiryStatus[];
  onRefresh?: () => void;
}

export function TokenExpiryWarning({ providers, onRefresh }: TokenExpiryWarningProps) {
  // Filter to only show warning and expired tokens
  const alertProviders = providers.filter(
    p => p.status === 'warning' || p.status === 'expired'
  );

  if (alertProviders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {alertProviders.map(provider => (
        <TokenExpiryCard
          key={provider.provider}
          provider={provider}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

function TokenExpiryCard({
  provider,
  onRefresh,
}: {
  provider: CredentialExpiryStatus;
  onRefresh?: () => void;
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/auth/refresh-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.provider }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Token refreshed successfully for ${provider.provider}`);
        onRefresh?.();
      } else {
        toast.error(result.error?.message || 'Failed to refresh token');
      }
    } catch {
      toast.error('Network error while refreshing token');
    } finally {
      setRefreshing(false);
    }
  };

  const getProviderDisplayName = (name: string) => {
    const names: Record<string, string> = {
      github: 'GitHub',
      jira: 'Jira',
      linear: 'Linear',
      slack: 'Slack',
      calendar: 'Google Calendar',
    };
    return names[name] || name;
  };

  const isExpired = provider.status === 'expired';
  const cardBgColor = isExpired ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = isExpired ? 'border-red-200' : 'border-yellow-200';

  return (
    <div className={`border rounded-lg p-4 ${cardBgColor} ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold">{getProviderDisplayName(provider.provider)}</h4>
            <TokenExpiryBadge
              status={provider.status}
              expiresAt={provider.expiresAt}
              timeRemaining={provider.timeRemaining}
            />
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {isExpired ? (
              <>
                Your authentication token has expired. {provider.supportsRefresh
                  ? 'Click "Refresh Token" to renew it automatically.'
                  : 'Please reconnect your account.'}
              </>
            ) : (
              <>
                Your authentication token will expire soon. {provider.supportsRefresh
                  ? 'It will be refreshed automatically, or you can refresh it manually now.'
                  : 'Please reconnect your account before it expires.'}
              </>
            )}
          </p>

          <div className="flex gap-2">
            {provider.supportsRefresh && (
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="text-sm px-3 py-1.5 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Token'}
              </button>
            )}
            <button
              onClick={() => {
                window.location.href = `/api/auth/${provider.provider}`;
              }}
              className={`text-sm px-3 py-1.5 rounded ${
                isExpired
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              Reconnect Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
