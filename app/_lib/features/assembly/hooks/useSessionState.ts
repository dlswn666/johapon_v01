'use client';

import { useMemo } from 'react';
import { useHeartbeat } from '@/app/_lib/shared/hooks/useHeartbeat';
import { useStartSession, useEndSession } from '@/app/_lib/features/assembly/api/useOnlineSessionHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';

type SessionUIStatus = 'INACTIVE' | 'STARTING' | 'ACTIVE' | 'IDLE' | 'RECONNECTING' | 'ENDED';

interface UseSessionStateReturn {
  status: SessionUIStatus;
  statusText: string;
  statusColor: 'green' | 'yellow' | 'red' | 'gray';
  isConnected: boolean;
  activePollIds: string[];
  start: () => void;
  end: () => void;
}

const STATUS_TEXT: Record<SessionUIStatus, string> = {
  INACTIVE: '미접속',
  STARTING: '접속 중...',
  ACTIVE: '접속 중',
  IDLE: '연결 확인 중',
  RECONNECTING: '재연결 중...',
  ENDED: '연결 종료',
};

const STATUS_COLOR: Record<SessionUIStatus, UseSessionStateReturn['statusColor']> = {
  INACTIVE: 'gray',
  STARTING: 'yellow',
  ACTIVE: 'green',
  IDLE: 'yellow',
  RECONNECTING: 'red',
  ENDED: 'gray',
};

export const useSessionState = (assemblyId: string): UseSessionStateReturn => {
  const { sessionId, sessionStatus, setSession, setSessionStatus, updateLastSeen, endSession: endSessionStore } = useVoteStore();
  const startSessionMutation = useStartSession(assemblyId);
  const endSessionMutation = useEndSession(assemblyId);

  const heartbeat = useHeartbeat({
    assemblyId,
    sessionId: sessionId ?? '',
    enabled: sessionStatus === 'ACTIVE' || sessionStatus === 'IDLE' || sessionStatus === 'RECONNECTING',
    onSessionExpired: () => {
      setSessionStatus('ENDED');
    },
    onReconnected: () => {
      setSessionStatus('ACTIVE');
    },
  });

  // heartbeat 상태 → store 동기화
  const uiStatus: SessionUIStatus = useMemo(() => {
    if (sessionStatus === 'INACTIVE') return 'INACTIVE';
    if (sessionStatus === 'STARTING') return 'STARTING';
    if (sessionStatus === 'ENDED') return 'ENDED';
    // ACTIVE 상태에서 heartbeat 상태 반영
    return heartbeat.sessionStatus as SessionUIStatus;
  }, [sessionStatus, heartbeat.sessionStatus]);

  // lastSeenAt 동기화
  if (heartbeat.lastSeenAt && heartbeat.lastSeenAt !== useVoteStore.getState().lastSeenAt) {
    updateLastSeen(heartbeat.lastSeenAt);
  }

  const start = () => {
    setSessionStatus('STARTING');
    startSessionMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSession({
          sessionId: data.sessionId,
          logId: data.logId,
          entryAt: data.entryAt,
        });
        setSessionStatus('ACTIVE');
      },
      onError: () => {
        setSessionStatus('INACTIVE');
      },
    });
  };

  const end = () => {
    if (sessionId) {
      endSessionMutation.mutate(
        { sessionId },
        {
          onSettled: () => {
            endSessionStore();
          },
        },
      );
    } else {
      endSessionStore();
    }
  };

  return {
    status: uiStatus,
    statusText: STATUS_TEXT[uiStatus],
    statusColor: STATUS_COLOR[uiStatus],
    isConnected: uiStatus === 'ACTIVE',
    activePollIds: heartbeat.activePollIds,
    start,
    end,
  };
};
