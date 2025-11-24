'use client';

/**
 * Token Expiry Banner Component
 *
 * Global banner displayed at top of application when tokens are expired.
 * Only shows for expired tokens (not warnings).
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CredentialExpiryStatus {
  provider: string;
  expiresAt?: number;
  timeRemaining?: number;
  status: 'ok' | 'warning' | 'expired' | 'no-expiry';
  supportsRefresh: boolean;
}

export function TokenExpiryBanner() {
  const [expiredProviders, setExpiredProviders] = useState<CredentialExpiryStatus[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpiryStatus();

    // Refresh status every 30 seconds
    const interval = setInterval(fetchExpiryStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchExpiryStatus = async () => {
    try {
      const response = await fetch('/api/credentials/expiry');
      const result = await response.json();

      if (result.success) {
        const expired = result.data.filter((p: CredentialExpiryStatus) => p.status === 'expired');
        setExpiredProviders(expired);
      }
    } catch (error) {
      console.error('Error fetching token expiry status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if loading, dismissed, or no expired tokens
  if (loading || dismissed || expiredProviders.length === 0) {
    return null;
  }

  const providerNames = expiredProviders.map(p => {
    const names: Record<string, string> = {
      github: 'GitHub',
      jira: 'Jira',
      linear: 'Linear',
      slack: 'Slack',
      calendar: 'Google Calendar',
    };
    return names[p.provider] || p.provider;
  });

  return (
    <div className="bg-red-600 text-white px-4 py-3 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xl">❌</span>
          <div className="flex-1">
            <p className="font-semibold">
              {expiredProviders.length === 1
                ? `Your ${providerNames[0]} token has expired`
                : `${expiredProviders.length} tokens have expired`}
            </p>
            <p className="text-sm text-red-100">
              {expiredProviders.length === 1
                ? `Reconnect your ${providerNames[0]} account to restore functionality.`
                : `Reconnect your accounts (${providerNames.join(', ')}) to restore functionality.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/settings/credentials"
            className="px-4 py-2 bg-white text-red-600 rounded font-medium hover:bg-red-50 text-sm whitespace-nowrap"
          >
            Fix Now
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-red-700 rounded"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
