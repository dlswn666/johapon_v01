'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

/**
 * 사전투표 훅 (P1)
 */

// 사전투표 현황 조회
export const useAdvanceVotingStatus = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['advanceVoting', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/advance-voting`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '사전투표 현황 조회 실패');
      }
      const { data } = await res.json();
      return data as { isActive: boolean; startsAt: string | null; endsAt: string | null };
    },
    enabled: !!assemblyId,
  });
};

// 사전투표 기간 설정
export const useSetAdvanceWindow = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ advanceStart, advanceEnd }: { advanceStart: string; advanceEnd: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/advance-voting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advanceStart, advanceEnd }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '사전투표 기간 설정 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanceVoting', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '사전투표 기간 설정 실패', message: error.message, type: 'error' });
    },
  });
};
