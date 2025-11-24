'use client';

/**
 * Connection Status Indicator
 *
 * Shows the real-time connection status with Supabase.
 */

import { useConnectionStatus } from '@/lib/supabase/use-realtime';

export function ConnectionStatus() {
  const status = useConnectionStatus();

  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      icon: '●',
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Disconnected',
      icon: '●',
    },
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting...',
      icon: '●',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-xs font-medium text-muted-foreground">
        {config.text}
      </span>
    </div>
  );
}
