'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { VOTE_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';
import type { VoteType, PollOption } from '@/app/_lib/shared/type/assembly.types';
import type { BallotAgenda } from '@/app/_lib/features/evote/api/useEvoteBallot';
import StepUpAuthModal from '@/app/_lib/features/assembly/ui/StepUpAuthModal';

interface SubmitConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assemblyId: string;
  assemblyTitle: string;
  agendas: BallotAgenda[];
  selections: Record<string, string>; // pollId -> optionId
  onSubmit: (authNonce: string) => void;
  isSubmitting: boolean;
}

/**
 * 제출 확인 모달: 응답 요약 + 본인인증 후 제출
 */
export default function SubmitConfirmModal({
  open,
  onOpenChange,
  assemblyId,
  assemblyTitle,
  agendas,
  selections,
  onSubmit,
  isSubmitting,
}: SubmitConfirmModalProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAuthSuccess = (nonce: string) => {
    setIsAuthModalOpen(false);
    onSubmit(nonce);
  };

  // 선택 요약 생성
  const getOptionLabel = (agenda: BallotAgenda, pollId: string, optionId: string): string => {
    const poll = agenda.polls?.find((p) => p.id === pollId);
    const option = poll?.poll_options?.find((o: PollOption) => o.id === optionId);
    if (!option) return '(선택없음)';

    if (poll?.vote_type === 'ELECT') {
      return option.candidate_name || option.label;
    }
    if (poll?.vote_type === 'SELECT') {
      return option.company_name || option.label;
    }
    return option.label;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>투표 내용을 확인해 주세요</DialogTitle>
            <DialogDescription>{assemblyTitle}</DialogDescription>
          </DialogHeader>

          {/* 안건별 선택 요약 */}
          <div className="space-y-3 my-2">
            {agendas.map((agenda, index) => {
              const poll = agenda.polls?.[0];
              if (!poll) return null;
              const selectedOptionId = selections[poll.id];
              const voteType: VoteType = poll.vote_type;

              return (
                <div key={agenda.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 font-medium">제{index + 1}호</span>
                    <span className="text-xs text-gray-400">{VOTE_TYPE_LABELS[voteType]}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{agenda.title}</p>
                  {selectedOptionId ? (
                    <p className="text-sm text-blue-700 font-medium">
                      {getOptionLabel(agenda, poll.id, selectedOptionId)}
                    </p>
                  ) : (
                    <p className="text-sm text-red-500">선택없음</p>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              수정하기
            </Button>
            <Button
              onClick={() => setIsAuthModalOpen(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? '처리 중...' : '본인인증 후 제출'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StepUpAuthModal
        isOpen={isAuthModalOpen}
        assemblyId={assemblyId}
        agendaTitle={assemblyTitle}
        onSuccess={handleAuthSuccess}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
