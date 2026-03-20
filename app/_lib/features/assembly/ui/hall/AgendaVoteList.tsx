'use client';

import React, { useState } from 'react';
import { useCastVote, useMyVote } from '@/app/_lib/features/assembly/api/useVoteHook';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import StepUpAuthModal from '@/app/_lib/features/assembly/ui/StepUpAuthModal';
import {
  AGENDA_TYPE_LABELS,
  AgendaItem,
  Poll,
  PollOption,
  AgendaType,
} from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Vote,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy,
} from 'lucide-react';

export interface AgendaVoteListProps {
  assemblyId: string;
  agendaItems: (AgendaItem & { polls?: (Poll & { poll_options?: PollOption[] })[] })[];
  receiptTokens: Record<string, string>;
  activePollIds?: string[];
}

/**
 * 전체 안건 목록 (ActiveVoteCard로 표시되는 OPEN 투표 제외)
 */
export default function AgendaVoteList({
  assemblyId,
  agendaItems,
  receiptTokens,
  activePollIds,
}: AgendaVoteListProps) {
  if (agendaItems.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
        <p className="text-gray-600">등록된 안건이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {agendaItems.map((agenda) => {
        const poll = agenda.polls?.[0];
        const isActivePoll = poll && activePollIds?.includes(poll.id);

        // 활성 투표는 상단 카드에서 표시
        if (isActivePoll) {
          return (
            <div
              key={agenda.id}
              className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Vote className="w-4 h-4" aria-hidden="true" />
                <p className="text-sm font-medium">
                  제{agenda.seq_order}호 — 투표 진행 중 — 상단 카드에서 투표하세요
                </p>
              </div>
            </div>
          );
        }

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
      })}
    </div>
  );
}

/** 개별 안건 투표 카드 (비활성 투표용) */
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
  const { openAlertModal } = useModalStore();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

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
    setPendingOptionId(optionId);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (nonce: string) => {
    setIsAuthModalOpen(false);
    if (!poll || !pendingOptionId) return;
    castVoteMutation.mutate(
      { pollId: poll.id, assemblyId, optionId: pendingOptionId, authNonce: nonce },
      { onSuccess: () => { setSelectedOptionId(null); setPendingOptionId(null); } },
    );
  };

  const copyReceipt = async () => {
    if (!receiptToken) return;
    try {
      await navigator.clipboard.writeText(receiptToken);
      openAlertModal({ title: '복사 완료', message: '투표 영수증이 클립보드에 복사되었습니다.', type: 'success' });
    } catch {
      openAlertModal({ title: '복사 실패', message: '클립보드 접근이 거부되었습니다.', type: 'error' });
    }
  };

  return (
    <>
    <StepUpAuthModal
      isOpen={isAuthModalOpen}
      assemblyId={assemblyId}
      pollId={poll?.id}
      agendaTitle={agendaTitle}
      selectedOptionLabel={pendingOptionId ? sortedOptions.find(o => o.id === pendingOptionId)?.label : undefined}
      onSuccess={handleAuthSuccess}
      onClose={() => { setIsAuthModalOpen(false); setPendingOptionId(null); }}
    />
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-blue-600">제{agendaSeq}호</span>
          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
            {AGENDA_TYPE_LABELS[agendaType as AgendaType] || agendaType}
          </span>
          {isCancelled && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-600">취소</span>}
          {isPollClosed && <span className="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-500">마감</span>}
          {isOpen && <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">투표중</span>}
        </div>
        <h3 className="font-medium text-gray-900">{agendaTitle}</h3>
        {agendaDescription && <p className="text-sm text-gray-500 mt-1">{agendaDescription}</p>}
      </div>

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
            {hasVoted && !canRevise && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                  <p className="text-sm text-green-700 font-medium">투표 완료</p>
                </div>
                <p className="text-xs text-green-600 mt-1">
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
                <p className="text-xs text-yellow-600 mt-1">마감 전까지 투표를 변경할 수 있습니다.</p>
              </div>
            )}
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
                          selectedOptionId === option.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}
                      >
                        {selectedOptionId === option.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </div>
                    {option.description && <p className="text-xs text-gray-500 mt-1 ml-8">{option.description}</p>}
                  </button>
                ))}
                <Button
                  className="w-full mt-3"
                  disabled={!selectedOptionId || castVoteMutation.isPending}
                  onClick={() => selectedOptionId && handleVote(selectedOptionId)}
                >
                  <Vote className="w-4 h-4 mr-2" aria-hidden="true" />
                  {castVoteMutation.isPending ? '투표 처리 중...' : hasVoted ? '재투표' : '투표하기'}
                </Button>
              </div>
            )}
            {receiptToken && <ReceiptDisplay token={receiptToken} onCopy={copyReceipt} />}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">투표가 마감되었습니다</p>
            {receiptToken && <ReceiptDisplay token={receiptToken} onCopy={copyReceipt} />}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

/** 투표 영수증 표시 */
function ReceiptDisplay({ token, onCopy }: { token: string; onCopy: () => void }) {
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 mb-1">투표 영수증 (투표 검증용)</p>
      <div className="flex items-center gap-2">
        <code className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
          {token}
        </code>
        <button
          onClick={onCopy}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1"
          title="영수증 복사"
          aria-label="투표 영수증 복사"
        >
          <Copy className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">이 코드로 나중에 투표 내역을 확인하실 수 있습니다</p>
    </div>
  );
}
