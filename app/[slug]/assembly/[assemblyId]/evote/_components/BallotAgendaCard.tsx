'use client';

import React from 'react';
import { CheckCircle, FileText } from 'lucide-react';
import { VOTE_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';
import type { PollOption, VoteType } from '@/app/_lib/shared/type/assembly.types';
import type { BallotAgenda, BallotMyVote } from '@/app/_lib/features/evote/api/useEvoteBallot';
import BallotApproveOptions from './BallotApproveOptions';
import BallotElectOptions from './BallotElectOptions';
import BallotSelectOptions from './BallotSelectOptions';

interface BallotAgendaCardProps {
  agenda: BallotAgenda;
  index: number;
  selectedOptionId: string | null;
  onSelect: (pollId: string, optionId: string) => void;
  /** 복수 선출 ELECT용: pipe-separated option IDs */
  selectedOptionIds?: string[];
  onMultiSelect?: (pollId: string, optionIds: string[]) => void;
  myVote?: BallotMyVote;
  canRevise?: boolean;
  onRevise?: (pollId: string) => void;
}

/**
 * 안건 카드: 순번 + 제목 + 유형 배지 + 설명 + 첨부파일 + vote_type별 옵션
 */
export default function BallotAgendaCard({
  agenda,
  index,
  selectedOptionId,
  onSelect,
  selectedOptionIds = [],
  onMultiSelect,
  myVote,
  canRevise,
  onRevise,
}: BallotAgendaCardProps) {
  const poll = agenda.polls?.[0];
  if (!poll) return null;

  const options: PollOption[] = poll.poll_options || [];
  const voteType: VoteType = poll.vote_type;
  const electCount = poll.elect_count ?? 1;
  const hasVoted = !!myVote;

  const handleSelect = (optionId: string) => {
    onSelect(poll.id, optionId);
  };

  const handleMultiSelect = (optionIds: string[]) => {
    onMultiSelect?.(poll.id, optionIds);
  };

  // 유형 배지 색상
  const badgeColor = {
    APPROVE: 'bg-blue-100 text-blue-700',
    ELECT: 'bg-purple-100 text-purple-700',
    SELECT: 'bg-orange-100 text-orange-700',
  }[voteType] || 'bg-gray-100 text-gray-700';

  return (
    <div data-testid="agenda-card" className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 안건 헤더 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-gray-600">제{index + 1}호</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
            {VOTE_TYPE_LABELS[voteType]}
          </span>
          {hasVoted && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
              <CheckCircle className="w-3 h-3" aria-hidden="true" />
              투표 완료
            </span>
          )}
        </div>
        <h3 className="font-medium text-gray-900">{agenda.title}</h3>
        {agenda.description && (
          <p className="text-sm text-gray-500 mt-1">{agenda.description}</p>
        )}
        {agenda.agenda_documents && agenda.agenda_documents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {agenda.agenda_documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-3 h-3" />
                {doc.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* 투표 영역 */}
      <div className="p-4">
        {hasVoted && (
          <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm text-green-700 font-medium">투표 완료</p>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {myVote.last_voted_at &&
                `투표 일시: ${new Date(myVote.last_voted_at).toLocaleString('ko-KR')}`}
            </p>
            {myVote.receipt_token && (
              <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                영수증: {myVote.receipt_token}
              </p>
            )}
            {canRevise && onRevise && (
              <button
                onClick={() => onRevise(poll.id)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                투표 수정하기
              </button>
            )}
          </div>
        )}

        {!hasVoted && (
          <>
            {voteType === 'APPROVE' && (
              <BallotApproveOptions
                options={options}
                selectedOptionId={selectedOptionId}
                onSelect={handleSelect}
              />
            )}
            {voteType === 'ELECT' && (
              <BallotElectOptions
                options={options}
                electCount={electCount}
                selectedOptionId={selectedOptionId}
                onSelect={handleSelect}
                selectedOptionIds={selectedOptionIds}
                onMultiSelect={handleMultiSelect}
              />
            )}
            {voteType === 'SELECT' && (
              <BallotSelectOptions
                options={options}
                selectedOptionId={selectedOptionId}
                onSelect={handleSelect}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
