'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useCastVote, useMyVote } from '@/app/_lib/features/assembly/api/useVoteHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import {
  ASSEMBLY_STATUS_LABELS,
  AGENDA_TYPE_LABELS,
  Poll,
  PollOption,
} from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { CheckCircle, Clock, FileText, Vote, AlertTriangle, Copy } from 'lucide-react';

/**
 * 투표 페이지
 * URL: /[slug]/assembly/[assemblyId]/vote
 *
 * 본인인증 완료 후 진입 가능
 * 안건별로 투표 세션 표시, OPEN 상태인 것만 투표 가능
 */
export default function VotePage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { snapshot, assembly, agendaItems, receiptTokens } = useVoteStore();

  // 인증되지 않은 사용자 리다이렉트 (DEF-003: consent_agreed_at 체크 추가)
  useEffect(() => {
    if (isUnionLoading || isAuthLoading) return;
    if (!slug) return;
    if (!user || !snapshot?.identity_verified_at) {
      router.push(getUnionPath(slug, `/assembly/${assemblyId}`));
      return;
    }
    if (snapshot && !((snapshot as Record<string, unknown>)?.consent_agreed_at)) {
      router.push(getUnionPath(slug, `/assembly/${assemblyId}`));
      return;
    }
  }, [isUnionLoading, isAuthLoading, user, snapshot, router, slug, assemblyId]);

  if (isUnionLoading || isAuthLoading || !snapshot || !assembly) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">{assembly.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
            <span>{ASSEMBLY_STATUS_LABELS[assembly.status]}</span>
            <span>·</span>
            <span>{snapshot.member_name}님</span>
            <span>·</span>
            <span>의결권 {snapshot.voting_weight}</span>
          </div>
        </div>
      </div>

      {/* 안건 목록 */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {agendaItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">등록된 안건이 없습니다</p>
          </div>
        ) : (
          agendaItems.map((agenda) => {
            const poll = agenda.polls?.[0];
            return (
              <AgendaVoteCard
                key={agenda.id}
                assemblyId={assemblyId}
                agendaSeq={agenda.seq_order}
                agendaTitle={agenda.title}
                agendaType={agenda.agenda_type}
                agendaDescription={agenda.description}
                poll={poll}
                receiptToken={poll ? receiptTokens[poll.id] : undefined}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * 개별 안건 투표 카드
 */
function AgendaVoteCard({
  assemblyId,
  agendaSeq,
  agendaTitle,
  agendaType,
  agendaDescription,
  poll,
  receiptToken: storedReceipt,
}: {
  assemblyId: string;
  agendaSeq: number;
  agendaTitle: string;
  agendaType: string;
  agendaDescription: string | null;
  poll?: Poll & { poll_options?: PollOption[] };
  receiptToken?: string;
}) {
  const castVoteMutation = useCastVote();
  const { openConfirmModal, openAlertModal } = useModalStore();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // 내 투표 기록 조회 (OPEN/CLOSED 상태만)
  const pollIdForQuery = poll?.status === 'OPEN' || poll?.status === 'CLOSED' ? poll?.id : undefined;
  const { data: myVote } = useMyVote(pollIdForQuery, assemblyId);

  const isOpen = poll?.status === 'OPEN';
  const isPollClosed = poll?.status === 'CLOSED';
  const isCancelled = poll?.status === 'CANCELLED';
  const hasVoted = !!myVote;
  const canRevise = myVote?.can_revise ?? false;
  const receiptToken = storedReceipt || myVote?.receipt_token;
  const sortedOptions = [...(poll?.poll_options || [])].sort((a, b) => a.seq_order - b.seq_order);

  const handleVote = (optionId: string) => {
    if (!poll) return;

    const option = sortedOptions.find((o) => o.id === optionId);
    const actionLabel = hasVoted ? '재투표' : '투표';

    openConfirmModal({
      title: `${actionLabel} 확인`,
      message: `"${option?.label}"(으)로 ${actionLabel}하시겠습니까?${hasVoted ? ' (기존 투표는 대체됩니다)' : ''}`,
      confirmText: actionLabel,
      cancelText: '취소',
      variant: 'default',
      onConfirm: () => {
        castVoteMutation.mutate(
          { pollId: poll.id, assemblyId, optionId },
          {
            onSuccess: () => {
              setSelectedOptionId(null);
            },
          },
        );
      },
    });
  };

  const copyReceipt = async () => {
    if (!receiptToken) return;
    try {
      await navigator.clipboard.writeText(receiptToken);
      openAlertModal({
        title: '복사 완료',
        message: '투표 영수증이 클립보드에 복사되었습니다.',
        type: 'success',
      });
    } catch {
      openAlertModal({
        title: '복사 실패',
        message: '클립보드 접근이 거부되었습니다. 직접 복사해 주세요.',
        type: 'error',
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 안건 헤더 */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-blue-600">제{agendaSeq}호</span>
          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
            {AGENDA_TYPE_LABELS[agendaType as keyof typeof AGENDA_TYPE_LABELS] || agendaType}
          </span>
          {/* 투표 상태 뱃지 */}
          {isCancelled && (
            <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600">취소</span>
          )}
          {isPollClosed && (
            <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-500">마감</span>
          )}
          {isOpen && (
            <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">투표중</span>
          )}
        </div>
        <h3 className="font-medium text-gray-900">{agendaTitle}</h3>
        {agendaDescription && (
          <p className="text-sm text-gray-500 mt-1">{agendaDescription}</p>
        )}
      </div>

      {/* 투표 영역 */}
      <div className="p-5">
        {!poll ? (
          <p className="text-sm text-gray-400 text-center">투표 세션이 없습니다</p>
        ) : isCancelled ? (
          <div className="flex items-center gap-2 justify-center text-gray-400">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            <p className="text-sm">이 안건의 투표가 취소되었습니다</p>
          </div>
        ) : !isOpen && !isPollClosed ? (
          <div className="flex items-center gap-2 justify-center text-gray-500">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <p className="text-sm">투표가 아직 시작되지 않았습니다</p>
          </div>
        ) : isOpen ? (
          <>
            {/* 이미 투표한 경우 */}
            {hasVoted && !canRevise && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-green-700 font-medium">투표 완료</p>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  투표 횟수: {myVote.vote_count}회
                  {myVote.last_voted_at && ` · ${new Date(myVote.last_voted_at).toLocaleString('ko-KR')}`}
                </p>
              </div>
            )}

            {hasVoted && canRevise && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-yellow-700 font-medium">재투표 가능</p>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  마감 전까지 투표를 변경할 수 있습니다.
                </p>
              </div>
            )}

            {/* 투표 선택지 (투표 가능한 경우만) */}
            {(!hasVoted || canRevise) && (
              <div className="space-y-2" role="radiogroup" aria-label={`제${agendaSeq}호 안건 투표`}>
                {sortedOptions.map((option) => (
                  <button
                    key={option.id}
                    role="radio"
                    aria-checked={selectedOptionId === option.id}
                    onClick={() => setSelectedOptionId(option.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedOptionId(option.id);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      selectedOptionId === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedOptionId === option.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedOptionId === option.id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </div>
                    {option.description && (
                      <p className="text-xs text-gray-500 mt-1 ml-8">{option.description}</p>
                    )}
                  </button>
                ))}

                <Button
                  className="w-full mt-3"
                  disabled={!selectedOptionId || castVoteMutation.isPending}
                  onClick={() => selectedOptionId && handleVote(selectedOptionId)}
                >
                  <Vote className="w-4 h-4 mr-2" aria-hidden="true" />
                  {castVoteMutation.isPending
                    ? '투표 처리 중...'
                    : hasVoted
                      ? '재투표'
                      : '투표하기'}
                </Button>
              </div>
            )}

            {/* 영수증 표시 */}
            {receiptToken && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">투표 영수증 (투표 검증용)</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
                    {receiptToken}
                  </code>
                  <button
                    onClick={copyReceipt}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
                    title="영수증 복사"
                    aria-label="투표 영수증 복사"
                  >
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">이 코드로 나중에 투표 내역을 확인하실 수 있습니다</p>
              </div>
            )}
          </>
        ) : (
          /* 투표 마감 */
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">투표가 마감되었습니다</p>
            {receiptToken && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">투표 영수증</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
                    {receiptToken}
                  </code>
                  <button
                    onClick={copyReceipt}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
                    title="영수증 복사"
                    aria-label="투표 영수증 복사"
                  >
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">이 코드로 나중에 투표 내역을 확인하실 수 있습니다</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
