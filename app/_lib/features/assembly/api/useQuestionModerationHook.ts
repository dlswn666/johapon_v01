'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { AssemblyQuestion } from '@/app/_lib/shared/type/assembly.types';

/**
 * 관리자용 질문 전체 목록 (승인/미승인 포함)
 */
export const useAdminQuestions = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['adminQuestions', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/questions?admin=true`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '질문 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as AssemblyQuestion[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 질문 승인
 */
export const useApproveQuestion = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ questionId }: { questionId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/questions/${questionId}/approve`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        let errorMessage = '질문 승인에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assemblyQuestions', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '질문 승인 실패', message: error.message, type: 'error' });
    },
  });
};

/**
 * 질문 반려
 */
export const useRejectQuestion = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ questionId, reason }: { questionId: string; reason?: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/questions/${questionId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        let errorMessage = '질문 반려에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assemblyQuestions', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '질문 반려 실패', message: error.message, type: 'error' });
    },
  });
};

/**
 * 질문 답변 등록
 */
export const useAnswerQuestion = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/questions/${questionId}/answer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      if (!res.ok) {
        let errorMessage = '답변 등록에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminQuestions', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assemblyQuestions', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '답변 등록 실패', message: error.message, type: 'error' });
    },
  });
};
