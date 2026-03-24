'use client';

import React, { use, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEvoteBallot } from '@/app/_lib/features/evote/api/useEvoteBallot';
import { useSubmitEvote } from '@/app/_lib/features/evote/api/useSubmitEvote';
import EvoteBallot from './_components/EvoteBallot';
import VoteCompleteView from './_components/VoteCompleteView';

/**
 * 전자투표 페이지
 * URL: /[slug]/assembly/[assemblyId]/evote
 *
 * 상태 분기:
 *   로딩 → 스켈레톤
 *   모든 안건 투표 완료 → VoteCompleteView
 *   미완료 → EvoteBallot
 */
export default function EvotePage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const { data: ballot, isLoading, error } = useEvoteBallot(assemblyId);
  const submitMutation = useSubmitEvote(assemblyId);

  // 모든 OPEN 안건에 대한 투표 완료 여부 확인
  const allVotesComplete = useMemo(() => {
    if (!ballot) return false;
    const { agendas, my_votes } = ballot;
    const votedPollIds = new Set(my_votes.map((v) => v.poll_id));
    const openPolls = agendas.flatMap((a) =>
      (a.polls || []).filter((p) => p.status === 'OPEN'),
    );
    return openPolls.length > 0 && openPolls.every((p) => votedPollIds.has(p.id));
  }, [ballot]);

  // 마지막 투표 일시 (영수증용)
  const lastVotedAt = useMemo(() => {
    if (!ballot?.my_votes.length) return undefined;
    const sorted = [...ballot.my_votes].sort(
      (a, b) => new Date(b.last_voted_at).getTime() - new Date(a.last_voted_at).getTime(),
    );
    return sorted[0]?.last_voted_at;
  }, [ballot]);

  // 마지막 영수증 토큰
  const lastReceiptToken = useMemo(() => {
    if (!ballot?.my_votes.length) return undefined;
    const withReceipt = ballot.my_votes.filter((v) => v.receipt_token);
    if (!withReceipt.length) return undefined;
    const sorted = [...withReceipt].sort(
      (a, b) => new Date(b.last_voted_at).getTime() - new Date(a.last_voted_at).getTime(),
    );
    return sorted[0]?.receipt_token ?? undefined;
  }, [ballot]);

  const handleSubmitWithNonce = (
    votes: { pollId: string; optionId: string }[],
    authNonce: string,
  ) => {
    submitMutation.mutate({ votes, authNonce });
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !ballot) {
    return (
      <div className="flex items-center justify-center min-h-[50dvh] p-4">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">
            투표 화면을 불러올 수 없습니다
          </p>
          <p className="text-sm text-gray-500">
            {error?.message || '잠시 후 다시 시도해주세요.'}
          </p>
          {error?.message?.includes('인증') && (
            <a
              href={`/auth/callback?redirect=${encodeURIComponent(window.location.pathname)}`}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#FEE500] text-[#3C1E1E] rounded-lg font-medium hover:bg-[#F5DC00] transition-colors"
            >
              카카오 로그인 후 참여하기
            </a>
          )}
        </div>
      </div>
    );
  }

  // 모든 투표 완료 → 완료 화면
  if (allVotesComplete) {
    return (
      <div className="bg-gray-50 min-h-dvh">
        <VoteCompleteView
          assemblyTitle={ballot.assembly.title}
          receiptToken={lastReceiptToken}
          votedAt={lastVotedAt}
        />
      </div>
    );
  }

  // 투표 진행
  return (
    <div className="bg-gray-50 min-h-dvh">
      <EvoteBallot
        assemblyId={assemblyId}
        assemblyTitle={ballot.assembly.title}
        finalDeadline={ballot.assembly.final_deadline}
        agendas={ballot.agendas}
        myVotes={ballot.my_votes}
        onSubmitWithNonce={handleSubmitWithNonce}
        isSubmitting={submitMutation.isPending}
      />
    </div>
  );
}
