'use client';

import React, { useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import { useHeartbeat } from '@/app/_lib/shared/hooks/useHeartbeat';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import HallBootstrapLoader from '@/app/_lib/features/assembly/ui/hall/HallBootstrapLoader';
import HallHeader from '@/app/_lib/features/assembly/ui/hall/HallHeader';
import VoteNotificationBanner from '@/app/_lib/features/assembly/ui/hall/VoteNotificationBanner';
import HallLayout from '@/app/_lib/features/assembly/ui/hall/HallLayout';

/**
 * 총회장 페이지 (온라인 참여)
 * URL: /[slug]/assembly/[assemblyId]/hall
 */
export default function AssemblyHallPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { snapshot, assembly } = useVoteStore();

  // 인증되지 않은 사용자 리다이렉트
  useEffect(() => {
    if (isUnionLoading || isAuthLoading) return;
    if (!slug) return;
    if (!user || !snapshot?.identity_verified_at || !assembly) {
      router.push(getUnionPath(slug, `/assembly/${assemblyId}`));
      return;
    }
    if (snapshot && !((snapshot as Record<string, unknown>)?.consent_agreed_at)) {
      router.push(getUnionPath(slug, `/assembly/${assemblyId}`));
      return;
    }
  }, [isUnionLoading, isAuthLoading, user, snapshot, assembly, router, slug, assemblyId]);

  if (isUnionLoading || isAuthLoading) {
    return null;
  }

  return (
    <HallBootstrapLoader assemblyId={assemblyId}>
      <HallHeader />
      <HallContent assemblyId={assemblyId} />
    </HallBootstrapLoader>
  );
}

/** 부트스트랩 이후 렌더링되는 내부 컴포넌트 */
function HallContent({ assemblyId }: { assemblyId: string }) {
  const { sessionId, sessionStatus, updateLastSeen, setSessionStatus } = useVoteStore();

  const onSessionExpired = useCallback(() => {
    setSessionStatus('ENDED');
  }, [setSessionStatus]);

  const onReconnected = useCallback(() => {
    setSessionStatus('ACTIVE');
  }, [setSessionStatus]);

  const {
    activePollIds,
    sessionStatus: heartbeatStatus,
    lastSeenAt,
  } = useHeartbeat({
    assemblyId,
    sessionId: sessionId || '',
    enabled: !!sessionId && sessionStatus !== 'ENDED',
    intervalMs: 30000,
    onSessionExpired,
    onReconnected,
  });

  // heartbeat 결과를 스토어에 동기화
  useEffect(() => {
    if (lastSeenAt) {
      updateLastSeen(lastSeenAt);
    }
  }, [lastSeenAt, updateLastSeen]);

  useEffect(() => {
    if (heartbeatStatus === 'RECONNECTING') {
      setSessionStatus('RECONNECTING');
    } else if (heartbeatStatus === 'IDLE') {
      setSessionStatus('IDLE');
    } else if (heartbeatStatus === 'ACTIVE' && sessionStatus === 'RECONNECTING') {
      setSessionStatus('ACTIVE');
    }
  }, [heartbeatStatus, sessionStatus, setSessionStatus]);

  return (
    <div className="bg-gray-50 min-h-[calc(100dvh-var(--header-height,56px))]">
      <VoteNotificationBanner activePollIds={activePollIds} />
      <HallLayout assemblyId={assemblyId} activePollIds={activePollIds} />
    </div>
  );
}
