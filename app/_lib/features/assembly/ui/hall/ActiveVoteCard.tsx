'use client';

import React, { useState } from 'react';
import { useCastVote, useMyVote } from '@/app/_lib/features/assembly/api/useVoteHook';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import {
  Poll,
  PollOption,
  AgendaItem,
} from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import {
  Vote,
  CheckCircle,
  AlertTriangle,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import StepUpAuthModal from '@/app/_lib/features/assembly/ui/StepUpAuthModal';

export interface ActiveVoteCardProps {
  assemblyId: string;
  agenda: AgendaItem & { polls?: (Poll & { poll_options?: PollOption[] })[] };
  poll: Poll & { poll_options?: PollOption[] };
  receiptToken?: string;
}

/**
 * OPEN 투표 전용 최상단 고정 카드
 * 의결 기준 표시 + 비밀투표 안내 + 투표 기능 (옵션 선택, 투표, 영수증)
 */
export default function ActiveVoteCard({
  assemblyId,
  agenda,
  poll,
  receiptToken: storedReceipt,
}: ActiveVoteCardProps) {
  const castVoteMutation = useCastVote();
  const { openAlertModal } = useModalStore();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);

  const pollIdForQuery = poll.status === 'OPEN' || poll.status === 'CLOSED' ? poll.id : undefined;
  const { data: myVote } = useMyVote(pollIdForQuery, assemblyId);

  const hasVoted = !!myVote;
  const canRevise = myVote?.can_revise ?? false;
  const receiptToken = storedReceipt || myVote?.receipt_token;
  const sortedOptions = [...(poll.poll_options || [])].sort((a, b) => a.seq_order - b.seq_order);

  // 의결 기준 텍스트
  const quorumPct = agenda.quorum_threshold_pct ?? 50;
  const approvalPct = agenda.approval_threshold_pct ?? 50;
  const quorumText = `${quorumPct}% 이상 출석, 출석 ${approvalPct}% 이상 찬성`;

  const handleVote = (optionId: string) => {
    setPendingOptionId(optionId);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (nonce: string) => {
    setIsAuthModalOpen(false);
    if (!pendingOptionId) return;
    castVoteMutation.mutate(
      { pollId: poll.id, assemblyId, optionId: pendingOptionId, authNonce: nonce },
      {
        onSuccess: () => {
          setSelectedOptionId(null);
          setPendingOptionId(null);
        },
      }
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
    <div className="bg-white rounded-lg border-2 border-blue-400 overflow-hidden shadow-sm">
      {/* 안건 헤더 */}
      <div className="px-5 py-4 border-b border-blue-100 bg-blue-50">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">투표중</span>
          <span className="text-sm font-bold text-blue-600">제{agenda.seq_order}호</span>
        </div>
        <h3 className="font-medium text-gray-900">{agenda.title}</h3>
        {agenda.description && <p className="text-sm text-gray-500 mt-1">{agenda.description}</p>}

        {/* 의결 기준 */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>의결 기준: {quorumText}</span>
        </div>
        {/* 비밀투표 안내 */}
        <p className="mt-1 text-xs text-gray-400">비밀투표로 진행됩니다</p>
      </div>

      {/* 투표 영역 */}
      <div className="p-5">
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
          <div className="space-y-2" role="radiogroup" aria-label={`제${agenda.seq_order}호 안건 투표`}>
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
      </div>

      <StepUpAuthModal
        isOpen={isAuthModalOpen}
        assemblyId={assemblyId}
        pollId={poll.id}
        agendaTitle={agenda.title}
        selectedOptionLabel={sortedOptions.find((o) => o.id === pendingOptionId)?.label}
        onSuccess={handleAuthSuccess}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
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
