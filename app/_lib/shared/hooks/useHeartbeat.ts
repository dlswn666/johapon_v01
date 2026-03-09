'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseHeartbeatOptions {
  assemblyId: string;
  sessionId: string;
  enabled?: boolean;
  intervalMs?: number;
  onSessionExpired?: () => void;
  onReconnected?: () => void;
}

interface UseHeartbeatReturn {
  sessionStatus: 'ACTIVE' | 'IDLE' | 'RECONNECTING' | 'ENDED';
  lastSeenAt: string | null;
  assemblyStatus: string | null;
  activePollIds: string[];
  failCount: number;
  sendHeartbeat: () => Promise<void>;
}

export const useHeartbeat = ({
  assemblyId,
  sessionId,
  enabled = true,
  intervalMs = 30000,
  onSessionExpired,
  onReconnected,
}: UseHeartbeatOptions): UseHeartbeatReturn => {
  const [sessionStatus, setSessionStatus] = useState<UseHeartbeatReturn['sessionStatus']>('ACTIVE');
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [assemblyStatus, setAssemblyStatus] = useState<string | null>(null);
  const [activePollIds, setActivePollIds] = useState<string[]>([]);
  const [failCount, setFailCount] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);
  const sessionStatusRef = useRef(sessionStatus);
  const onSessionExpiredRef = useRef(onSessionExpired);
  const onReconnectedRef = useRef(onReconnected);

  // ref 동기화
  useEffect(() => {
    sessionStatusRef.current = sessionStatus;
  }, [sessionStatus]);
  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  }, [onSessionExpired]);
  useEffect(() => {
    onReconnectedRef.current = onReconnected;
  }, [onReconnected]);

  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(`/api/assemblies/${assemblyId}/online-session/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (res.status === 409) {
        // 세션 만료 (서버가 거부)
        setSessionStatus('ENDED');
        failCountRef.current = 0;
        setFailCount(0);
        onSessionExpiredRef.current?.();
        return;
      }

      if (!res.ok) {
        throw new Error(`heartbeat failed: ${res.status}`);
      }

      const { data } = await res.json();

      // 복구 성공
      if (failCountRef.current > 0) {
        onReconnectedRef.current?.();
      }
      failCountRef.current = 0;
      setFailCount(0);
      setSessionStatus('ACTIVE');
      setLastSeenAt(data.lastSeenAt ?? null);
      setAssemblyStatus(data.assemblyStatus ?? null);
      setActivePollIds(data.activePollIds ?? []);
    } catch {
      failCountRef.current += 1;
      const count = failCountRef.current;
      setFailCount(count);

      if (count >= 4) {
        setSessionStatus('ENDED');
        onSessionExpiredRef.current?.();
      } else if (count >= 2) {
        setSessionStatus('RECONNECTING');
      } else {
        setSessionStatus('IDLE');
      }
    }
  }, [assemblyId, sessionId]);

  // interval 시작/리셋 헬퍼
  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(sendHeartbeat, intervalMs);
  }, [sendHeartbeat, intervalMs]);

  // 메인 interval 설정
  useEffect(() => {
    if (!enabled || !assemblyId || !sessionId) return;

    startInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, assemblyId, sessionId, startInterval]);

  // visibilitychange: 탭 복귀 시 즉시 heartbeat + interval 리셋
  useEffect(() => {
    if (!enabled || !assemblyId || !sessionId) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && sessionStatusRef.current !== 'ENDED') {
        sendHeartbeat();
        startInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, assemblyId, sessionId, sendHeartbeat, startInterval]);

  // pagehide: sendBeacon으로 end API 호출
  useEffect(() => {
    if (!enabled || !assemblyId || !sessionId) return;

    const handlePageHide = () => {
      const body = JSON.stringify({ sessionId, reason: 'pagehide' });
      navigator.sendBeacon(
        `/api/assemblies/${assemblyId}/online-session/end`,
        new Blob([body], { type: 'application/json' }),
      );
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, assemblyId, sessionId]);

  return {
    sessionStatus,
    lastSeenAt,
    assemblyStatus,
    activePollIds,
    failCount,
    sendHeartbeat,
  };
};
