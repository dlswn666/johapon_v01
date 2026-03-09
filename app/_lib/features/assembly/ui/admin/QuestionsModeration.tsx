'use client';

import React, { useState } from 'react';
import { Check, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import {
  useAdminQuestions,
  useApproveQuestion,
  useRejectQuestion,
  useAnswerQuestion,
} from '@/app/_lib/features/assembly/api/useQuestionModerationHook';
import { AssemblyQuestion } from '@/app/_lib/shared/type/assembly.types';

interface QuestionsModerationProps {
  assemblyId: string;
}

function QuestionCard({
  question,
  assemblyId,
}: {
  question: AssemblyQuestion;
  assemblyId: string;
}) {
  const [answerText, setAnswerText] = useState('');
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const { openConfirmModal } = useModalStore();
  const approveMutation = useApproveQuestion(assemblyId);
  const rejectMutation = useRejectQuestion(assemblyId);
  const answerMutation = useAnswerQuestion(assemblyId);

  const handleReject = () => {
    openConfirmModal({
      title: '질문 반려',
      message: '이 질문을 반려하시겠습니까?',
      confirmText: '반려',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => {
        rejectMutation.mutate({ questionId: question.id, reason: '관리자 판단에 의한 반려' });
      },
    });
  };

  const handleAnswer = () => {
    const trimmed = answerText.trim();
    if (!trimmed) return;
    answerMutation.mutate(
      { questionId: question.id, answer: trimmed },
      {
        onSuccess: () => {
          setAnswerText('');
          setShowAnswerInput(false);
        },
      }
    );
  };

  const isPending = question.is_approved === null;
  const isApproved = question.is_approved === true;

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isPending ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">{question.content}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(question.submitted_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {isPending && (
          <div className="flex gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => approveMutation.mutate({ questionId: question.id })}
              disabled={approveMutation.isPending}
              className="h-7 px-2"
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="h-7 px-2 text-red-600 hover:text-red-700"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* 답변 표시 */}
      {question.answer && (
        <div className="bg-blue-50 rounded p-2 text-sm text-blue-800">
          <p className="text-xs font-medium text-blue-600 mb-1">답변</p>
          {question.answer}
        </div>
      )}

      {/* 답변 입력 (승인된 질문에만) */}
      {isApproved && !question.answer && (
        <>
          {showAnswerInput ? (
            <div className="space-y-2">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="답변을 입력하세요"
                className="w-full border border-gray-300 rounded p-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setShowAnswerInput(false)} className="h-7">
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleAnswer}
                  disabled={!answerText.trim() || answerMutation.isPending}
                  className="h-7"
                >
                  등록
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAnswerInput(true)}
              className="h-7 text-xs text-gray-500"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              답변 작성
            </Button>
          )}
        </>
      )}
    </div>
  );
}

export default function QuestionsModeration({ assemblyId }: QuestionsModerationProps) {
  const { data: questions, isLoading } = useAdminQuestions(assemblyId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const pending = (questions ?? []).filter((q) => q.is_approved === null);
  const approved = (questions ?? []).filter((q) => q.is_approved === true);
  const rejected = (questions ?? []).filter((q) => q.is_approved === false);

  return (
    <div className="space-y-4">
      {/* 미승인 질문 */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-amber-700 mb-2">
            미승인 질문 ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map((q) => (
              <QuestionCard key={q.id} question={q} assemblyId={assemblyId} />
            ))}
          </div>
        </div>
      )}

      {/* 승인된 질문 */}
      {approved.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            승인된 질문 ({approved.length})
          </h4>
          <div className="space-y-2">
            {approved.map((q) => (
              <QuestionCard key={q.id} question={q} assemblyId={assemblyId} />
            ))}
          </div>
        </div>
      )}

      {/* 반려된 질문 */}
      {rejected.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-red-500 mb-2">
            반려된 질문 ({rejected.length})
          </h4>
          <div className="space-y-2 opacity-60">
            {rejected.map((q) => (
              <QuestionCard key={q.id} question={q} assemblyId={assemblyId} />
            ))}
          </div>
        </div>
      )}

      {(questions ?? []).length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          아직 접수된 질문이 없습니다
        </div>
      )}
    </div>
  );
}
