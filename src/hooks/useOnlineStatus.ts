import { useCallback, useEffect, useRef, useState } from 'react';
import { dbFetchHealth } from '../lib/neon';

export interface OnlineStatusState {
  isOnline: boolean;
  isChecking: boolean;
  lastCheckedAt: number | null;
  wasOffline: boolean;
  checkNow: () => Promise<boolean>;
}

/**
 * Combines browser navigator.onLine events with real /api/health reachability checks
 * so the app detects both dead Wi-Fi/cellular connections and unreachable servers accurately.
 */
export function useOnlineStatus(pollIntervalMs = 25000): OnlineStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const isMountedRef = useRef(true);
  const checkingPromiseRef = useRef<Promise<boolean> | null>(null);

  const checkNow = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (isMountedRef.current) {
        setIsOnline(false);
        setWasOffline(true);
        setLastCheckedAt(Date.now());
      }
      return false;
    }

    if (checkingPromiseRef.current) {
      return checkingPromiseRef.current;
    }

    if (isMountedRef.current) setIsChecking(true);

    const runCheck = (async () => {
      try {
        const reachable = await dbFetchHealth();
        if (isMountedRef.current) {
          setIsOnline((prev) => {
            if (!prev && !reachable) setWasOffline(true);
            return reachable;
          });
          if (!reachable) setWasOffline(true);
          setLastCheckedAt(Date.now());
        }
        return reachable;
      } catch {
        if (isMountedRef.current) {
          setIsOnline(false);
          setWasOffline(true);
          setLastCheckedAt(Date.now());
        }
        return false;
      } finally {
        if (isMountedRef.current) setIsChecking(false);
        checkingPromiseRef.current = null;
      }
    })();

    checkingPromiseRef.current = runCheck;
    return runCheck;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const handleOffline = () => {
      if (!isMountedRef.current) return;
      setIsOnline(false);
      setWasOffline(true);
      setLastCheckedAt(Date.now());
    };

    const handleOnline = () => {
      // Verify server reachability before switching status to live online
      void checkNow();
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void checkNow();
      }
    };

    void checkNow();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('bsmart-remote-url-changed', handleOnline);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const interval = window.setInterval(() => {
      void checkNow();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('bsmart-remote-url-changed', handleOnline);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(interval);
    };
  }, [checkNow, pollIntervalMs]);

  return {
    isOnline,
    isChecking,
    lastCheckedAt,
    wasOffline,
    checkNow,
  };
}
