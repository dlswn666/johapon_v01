'use client';

import React, { useState, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BallotAgenda, BallotMyVote } from '@/app/_lib/features/evote/api/useEvoteBallot';
import BallotAgendaCard from './BallotAgendaCard';
import SubmitConfirmModal from './SubmitConfirmModal';

interface EvoteBallotProps {
  assemblyId: string;
  assemblyTitle: string;
  finalDeadline: string | null;
  agendas: BallotAgenda[];
  myVotes: BallotMyVote[];
  onSubmitWithNonce: (votes: { pollId: string; optionId: string }[], authNonce: string) => void;
  isSubmitting: boolean;
}

/**
 * 투표 화면 컨테이너: 헤더 + 안건 카드 리스트 + 진행 상황 + 제출 버튼
 */
export default function EvoteBallot({
  assemblyId,
  assemblyTitle,
  finalDeadline,
  agendas,
  myVotes,
  onSubmitWithNonce,
  isSubmitting,
}: EvoteBallotProps) {
  // selections: pollId -> optionId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // 투표가 필요한 안건만 필터 (이미 투표한 안건 제외)
  const votedPollIds = useMemo(
    () => new Set(myVotes.map((v) => v.poll_id)),
    [myVotes],
  );

  // 투표 가능한 (OPEN) 안건
  const votableAgendas = useMemo(
    () =>
      agendas.filter((a) => {
        const poll = a.polls?.[0];
        return poll && poll.status === 'OPEN' && !votedPollIds.has(poll.id);
      }),
    [agendas, votedPollIds],
  );

  const totalCount = votableAgendas.length;
  const selectedCount = votableAgendas.filter((a) => {
    const poll = a.polls?.[0];
    return poll && selections[poll.id];
  }).length;

  const allSelected = totalCount > 0 && selectedCount === totalCount;

  const handleSelect = (pollId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [pollId]: optionId }));
  };

  const handleSubmit = (authNonce: string) => {
    const votes = votableAgendas
      .map((a) => {
        const poll = a.polls?.[0];
        if (!poll) return null;
        const optionId = selections[poll.id];
        if (!optionId) return null;
        return { pollId: poll.id, optionId };
      })
      .filter((v): v is { pollId: string; optionId: string } => v !== null);

    onSubmitWithNonce(votes, authNonce);
    setIsConfirmOpen(false);
  };

  // 마감시각 카운트다운
  const deadlineText = useMemo(() => {
    if (!finalDeadline) return null;
    const deadline = new Date(finalDeadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff <= 0) return '마감됨';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `D-${days}`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  }, [finalDeadline]);

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)]">
      {/* 상단 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900 truncate">{assemblyTitle}</h1>
        {deadlineText && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
            <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>투표 마감: {deadlineText}</span>
          </div>
        )}
      </div>

      {/* 안건 카드 리스트 */}
      <div className="flex-1 p-4 space-y-4 pb-28">
        {agendas
          .sort((a, b) => a.seq_order - b.seq_order)
          .map((agenda, index) => {
            const poll = agenda.polls?.[0];
            const myVote = poll ? myVotes.find((v) => v.poll_id === poll.id) : undefined;

            return (
              <BallotAgendaCard
                key={agenda.id}
                agenda={agenda}
                index={index}
                selectedOptionId={poll ? (selections[poll.id] ?? null) : null}
                onSelect={handleSelect}
                myVote={myVote}
              />
            );
          })}
      </div>

      {/* 하단 고정: 진행 상황 + 제출 버튼 */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-lg mx-auto">
            <p className="text-sm text-gray-500 text-center mb-2">
              {totalCount}개 중 {selectedCount}개 선택 완료
            </p>
            <Button
              className="w-full min-h-[48px] text-base"
              disabled={!allSelected || isSubmitting}
              onClick={() => setIsConfirmOpen(true)}
            >
              {isSubmitting ? '제출 처리 중...' : '투표 제출'}
            </Button>
          </div>
        </div>
      )}

      <SubmitConfirmModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        assemblyId={assemblyId}
        assemblyTitle={assemblyTitle}
        agendas={votableAgendas}
        selections={selections}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
