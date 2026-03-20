'use client';

import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import type { Assembly, AssemblyStatus } from '@/app/_lib/shared/type/assembly.types';

interface TransitionParams {
  evoteId: string;
  status: AssemblyStatus;
  reason?: string;
  reason_code?: string;
}

/**
 * 전자투표 상태 전환
 * PATCH /api/evotes/[id]/status
 */
export const useEvoteStatusTransition = () => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({ evoteId, status, reason, reason_code }: TransitionParams) => {
      const res = await fetch(`/api/evotes/${evoteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason, reason_code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '상태 변경 실패');
      }
      const { data } = await res.json();
      return data as Assembly;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evote-dashboard', union?.id, variables.evoteId] });
      queryClient.invalidateQueries({ queryKey: ['evotes', union?.id] });
    },
    onError: (error: Error) => {
      console.error('전자투표 상태 변경 실패:', error);
      openAlertModal({
        title: '상태 변경 실패',
        message: error.message || '상태 변경에 실패했습니다.',
        type: 'error',
      });
    },
  });
};
