'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RoundAutoRefreshProps {
  roundId?: string;
  pollIntervalMs?: number;
  showControls?: boolean;
  className?: string;
}

/**
 * Live synchronization component for Engineer's Round.
 * 
 * Provides instantaneous updates across all users (engineers, managers, admins):
 * 1. Fast-polls /api/rounds/live-sync (default 3.5s) when the tab is visible.
 * 2. Immediately refreshes when user switches back to the browser tab.
 * 3. Listens for window 'bemms:notification' events dispatched via SSE.
 * 4. Never interrupts active user input/form typing.
 */
export function RoundAutoRefresh({
  roundId,
  pollIntervalMs = 3500,
  showControls = false,
  className,
}: RoundAutoRefreshProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'error'>('connected');

  const lastSignatureRef = useRef<string>('');
  const lastRefreshTimestampRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef<boolean>(false);

  const triggerRefresh = (newSignature?: string) => {
    // Avoid rapid-fire refreshes (throttle 1.5s)
    const now = Date.now();
    if (now - lastRefreshTimestampRef.current < 1500) {
      return;
    }

    // Do not disrupt user if they are currently typing in an input/textarea
    const activeElement = document.activeElement;
    if (activeElement && ['INPUT', 'TEXTAREA'].includes(activeElement.tagName)) {
      return;
    }

    lastRefreshTimestampRef.current = now;
    if (newSignature) {
      lastSignatureRef.current = newSignature;
    }
    isRefreshingRef.current = true;
    setSyncStatus('syncing');

    startTransition(() => {
      router.refresh();
      setTimeout(() => {
        isRefreshingRef.current = false;
        setSyncStatus('connected');
      }, 700);
    });
  };

  const handleManualRefresh = () => {
    const now = Date.now();
    lastRefreshTimestampRef.current = now;
    isRefreshingRef.current = true;
    setSyncStatus('syncing');

    startTransition(() => {
      router.refresh();
      setTimeout(() => {
        isRefreshingRef.current = false;
        setSyncStatus('connected');
      }, 700);
    });
  };

  // 1. Listen for notification events dispatched by NotificationBell via SSE
  useEffect(() => {
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent<any[]>;
      const notifications = customEvent.detail;
      if (!Array.isArray(notifications)) return;

      const isForRounds = notifications.some(
        (n) =>
          n.relatedEntityType === 'engineer_round' ||
          (n.actionUrl && n.actionUrl.includes('/rounds')) ||
          (n.title && n.title.toLowerCase().includes('round'))
      );

      if (isForRounds) {
        triggerRefresh();
      }
    };

    window.addEventListener('bemms:notification', handleNotification);
    return () => {
      window.removeEventListener('bemms:notification', handleNotification);
    };
  }, [roundId]);

  // 2. High-performance live-sync polling
  useEffect(() => {
    let isCancelled = false;

    const checkLiveSync = async () => {
      // Don't poll if document is hidden or refresh is pending
      if (document.hidden || isRefreshingRef.current) return;

      try {
        const url = roundId
          ? `/api/rounds/live-sync?roundId=${encodeURIComponent(roundId)}`
          : '/api/rounds/live-sync';

        const res = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!res.ok || isCancelled) return;

        const data = await res.json();
        const serverSignature = data.syncSignature;

        if (serverSignature) {
          if (!lastSignatureRef.current) {
            // First observation: seed the signature
            lastSignatureRef.current = serverSignature;
          } else if (lastSignatureRef.current !== serverSignature) {
            // State changed on server! Trigger live refresh
            triggerRefresh(serverSignature);
          }
        }
      } catch {
        // Silently tolerate minor network blips
      }
    };

    const intervalId = setInterval(checkLiveSync, pollIntervalMs);

    // Refresh immediately when tab gains focus / becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkLiveSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [roundId, pollIntervalMs]);

  if (!showControls) {
    return null;
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        title={`Live updates active (auto-syncing every ${(pollIntervalMs / 1000).toFixed(1)}s)`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live Sync
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isPending}
        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
        title="Refresh now"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", isPending && "animate-spin text-primary")} />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </div>
  );
}
