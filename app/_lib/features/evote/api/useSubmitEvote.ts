'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

// submit_evote_ballot RPC 응답
export interface SubmitEvoteResult {
  success: boolean;
  receipt_token: string;
  cast_count: number;
  skip_count: number;
}

/**
 * 전자투표 일괄 투표 제출
 * POST /api/evotes/[id]/submit
 */
export const useSubmitEvote = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      votes,
      authNonce,
    }: {
      votes: { pollId: string; optionId: string }[];
      authNonce: string;
    }) => {
      const res = await fetch(`/api/evotes/${assemblyId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authNonce, votes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '투표 제출에 실패했습니다.');
      }
      const { data } = await res.json();
      return data as SubmitEvoteResult;
    },
    onSuccess: () => {
      // ballot 캐시 무효화 → 화면 갱신
      queryClient.invalidateQueries({
        queryKey: ['evoteBallot', union?.id, assemblyId],
      });
    },
    onError: (error: Error) => {
      console.error('투표 제출 실패:', error);
      openAlertModal({
        title: '투표 제출 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};
