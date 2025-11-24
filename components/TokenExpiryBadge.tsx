'use client';

/**
 * Token Expiry Badge Component
 *
 * Visual indicator showing token expiry status with countdown timer.
 * Used in settings page and widget headers.
 *
 * States:
 * - ok: Green, no warning
 * - warning: Orange/yellow, shows countdown
 * - expired: Red, shows "Expired"
 * - no-expiry: No badge (token doesn't expire)
 */

import { useState, useEffect } from 'react';

interface TokenExpiryBadgeProps {
  status: 'ok' | 'warning' | 'expired' | 'no-expiry';
  expiresAt?: number; // Timestamp in milliseconds
  timeRemaining?: number; // Initial time remaining in milliseconds
  compact?: boolean; // Compact mode for widget headers
}

export function TokenExpiryBadge({
  status: initialStatus,
  expiresAt,
  timeRemaining: initialTimeRemaining,
  compact = false,
}: TokenExpiryBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining || 0);
  const [status, setStatus] = useState(initialStatus);

  // Update countdown every second
  useEffect(() => {
    if (!expiresAt || status === 'expired' || status === 'no-expiry') return;

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      setTimeRemaining(remaining);

      // Update status based on time remaining
      if (remaining <= 0) {
        setStatus('expired');
      } else if (remaining <= 15 * 60 * 1000) { // 15 minutes
        setStatus('warning');
      } else {
        setStatus('ok');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, status]);

  // Don't show badge for "ok" status or when no expiry
  if (status === 'no-expiry' || status === 'ok') {
    return null;
  }

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return 'Expired';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const config = {
    warning: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-300',
      icon: '⚠️',
      label: compact ? formatTimeRemaining(timeRemaining) : `Expires in ${formatTimeRemaining(timeRemaining)}`,
    },
    expired: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300',
      icon: '❌',
      label: 'Expired',
    },
  }[status];

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 ${compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'} rounded border ${config.bgColor} ${config.textColor} ${config.borderColor} font-medium`}
    >
      {!compact && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}
