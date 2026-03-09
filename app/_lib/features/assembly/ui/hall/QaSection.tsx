'use client';

import React, { useState } from 'react';
import {
  useAssemblyQuestions,
  useSubmitQuestion,
} from '@/app/_lib/features/assembly/api/useAssemblyHallHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Send } from 'lucide-react';

export interface QaSectionProps {
  assemblyId: string;
}

/**
 * Q&A 섹션
 * 질문 작성 폼 + 질문 목록
 */
export default function QaSection({ assemblyId }: QaSectionProps) {
  const { assembly } = useVoteStore();
  const isLive = ['IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'].includes(assembly?.status || '');
  const { data: questions, isLoading } = useAssemblyQuestions(assemblyId, isLive);
  const submitMutation = useSubmitQuestion(assemblyId);
  const [questionText, setQuestionText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    submitMutation.mutate(
      { content: questionText.trim() },
      { onSuccess: () => setQuestionText('') },
    );
  };

  return (
    <div className="space-y-4">
      {/* 질문 작성 폼 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4">
        <label htmlFor="qa-input" className="text-sm font-medium text-gray-700 mb-2 block">
          질문하기
        </label>
        <div className="flex gap-2">
          <textarea
            id="qa-input"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="의장에게 질문할 내용을 입력하세요..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            maxLength={1000}
          />
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={!questionText.trim() || submitMutation.isPending}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-1">{questionText.length}/1000자 · 관리자 승인 후 공개됩니다</p>
      </form>

      {/* 질문 목록 */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : !questions || questions.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-gray-500">등록된 질문이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-900">{q.content}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                <span>{new Date(q.submitted_at).toLocaleString('ko-KR')}</span>
                {!q.is_approved && <span className="text-yellow-600">승인 대기</span>}
                {q.is_read_aloud && <span className="text-blue-600">낭독됨</span>}
              </div>
              {q.answer && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-blue-600 mb-1">답변</p>
                  <p className="text-sm text-gray-700">{q.answer}</p>
                  {q.answered_at && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(q.answered_at).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
