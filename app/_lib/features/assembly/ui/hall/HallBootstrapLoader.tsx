'use client';

import { useEffect, useRef } from 'react';
import { useHallBootstrap } from '@/app/_lib/features/assembly/api/useHallBootstrapHook';
import { useStartSession } from '@/app/_lib/features/assembly/api/useOnlineSessionHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface HallBootstrapLoaderProps {
  assemblyId: string;
  children: React.ReactNode;
}

/**
 * 총회장 부트스트랩 오케스트레이터
 * 초기 데이터 로드 → 스토어 설정 → 세션 시작
 */
export default function HallBootstrapLoader({
  assemblyId,
  children,
}: HallBootstrapLoaderProps) {
  const { data, isLoading, isError, error, refetch } = useHallBootstrap(assemblyId);
  const startSessionMutation = useStartSession(assemblyId);
  const {
    isBootstrapped,
    setSnapshot,
    setAssembly,
    setAgendaItems,
    setFeatureFlags,
    setBootstrapped,
    setSession,
    setSessionStatus,
  } = useVoteStore();

  const hasInitialized = useRef(false);

  // 데이터 로드 후 스토어 설정
  useEffect(() => {
    if (!data || hasInitialized.current) return;
    hasInitialized.current = true;

    setSnapshot(data.snapshot);
    setAssembly(data.assembly);
    setAgendaItems(data.agendaItems);
    setFeatureFlags(data.featureFlags);

    // 기존 세션 복원
    if (data.attendanceSession?.session_id) {
      setSession({
        sessionId: data.attendanceSession.session_id,
        logId: data.attendanceSession.id,
        entryAt: data.attendanceSession.entry_at || new Date().toISOString(),
      });
      setSessionStatus('ACTIVE');
      setBootstrapped(true);
      return;
    }

    // SESSION 모드면 새 세션 시작
    if (data.featureFlags.isSessionMode) {
      setSessionStatus('STARTING');
      startSessionMutation.mutate(undefined, {
        onSuccess: (result) => {
          setSession({
            sessionId: result.sessionId,
            logId: result.logId,
            entryAt: result.entryAt,
          });
          setSessionStatus('ACTIVE');
          setBootstrapped(true);
        },
        onError: () => {
          setSessionStatus('ENDED');
          setBootstrapped(true);
        },
      });
    } else {
      // LEGACY 모드
      setBootstrapped(true);
    }
  }, [data, setSnapshot, setAssembly, setAgendaItems, setFeatureFlags, setBootstrapped, setSession, setSessionStatus, startSessionMutation]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="aspect-video rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">데이터 로드 실패</h2>
          <p className="text-sm text-gray-500 mb-6">
            {error?.message || '총회장 데이터를 불러올 수 없습니다.'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            재시도
          </Button>
        </div>
      </div>
    );
  }

  // 부트스트랩 완료 대기
  if (!isBootstrapped) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="aspect-video rounded-lg" />
          <div className="text-center text-sm text-gray-500 py-4">세션을 시작하는 중...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
