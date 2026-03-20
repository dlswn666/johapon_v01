'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { AgendaItem, Poll, PollOption } from '@/app/_lib/shared/type/assembly.types';

type PollWithOptions = Poll & { poll_options?: PollOption[] };

interface VotingSummaryConfirmationProps {
  agendas: AgendaItem[];
  polls: PollWithOptions[];
  selections: Record<string, string>; // pollId → optionId
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function VotingSummaryConfirmation({
  agendas,
  polls,
  selections,
  onConfirm,
  onBack,
  isSubmitting,
}: VotingSummaryConfirmationProps) {
  const unvotedCount = polls.filter((p) => !selections[p.id]).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold text-gray-900">투표 내용을 확인해 주세요</h2>

      {unvotedCount > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 font-medium">
            ⚠️ 투표하지 않은 안건이 {unvotedCount}건 있습니다. 뒤로 가서 투표해 주세요.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {polls.map((poll, index) => {
          const agenda = agendas.find((a) => a.id === poll.agenda_item_id);
          const selectedOptionId = selections[poll.id];
          const selectedOption = poll.poll_options?.find((o) => o.id === selectedOptionId);
          const isVoted = !!selectedOptionId;

          return (
            <div
              key={poll.id}
              className={`p-4 rounded-lg border ${
                isVoted
                  ? 'border-gray-200 bg-white'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">
                안건 {index + 1}{agenda ? ` — ${agenda.title}` : ''}
              </p>
              {isVoted ? (
                <p className="text-sm font-medium text-gray-900">
                  선택: <span className="text-blue-700">{selectedOption?.label ?? selectedOptionId}</span>
                </p>
              ) : (
                <p className="text-sm font-medium text-red-700">투표하지 않은 안건</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 mt-2">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          뒤로 가기
        </Button>
        <Button
          onClick={onConfirm}
          className="flex-1"
          disabled={isSubmitting || unvotedCount > 0}
        >
          {isSubmitting ? '처리 중...' : '최종 투표 완료'}
        </Button>
      </div>
    </div>
  );
}
