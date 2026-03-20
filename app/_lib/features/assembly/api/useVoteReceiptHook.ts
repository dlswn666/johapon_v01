'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type { VotingReceipt } from '@/app/_lib/shared/type/assembly.types';

/**
 * 투표 영수증 훅 (P0 Wave 7)
 */

// 투표 영수증 조회
export const useVoteReceipt = (pollId: string | undefined, assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['voteReceipt', pollId, assemblyId],
    queryFn: async () => {
      const params = new URLSearchParams({ pollId: pollId!, assemblyId: assemblyId! });
      const res = await fetch(`/api/votes/receipt?${params}`);
      if (res.status === 404) return null;
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '투표 영수증 조회 실패');
      }
      const { data } = await res.json();
      return data as VotingReceipt | null;
    },
    enabled: !!pollId && !!assemblyId,
  });
};

// 영수증 다운로드
export const useDownloadReceipt = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ pollId }: { pollId: string }) => {
      const params = new URLSearchParams({ pollId, assemblyId });
      const res = await fetch(`/api/votes/receipt/download?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '영수증 다운로드 실패');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vote_receipt_${pollId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      openAlertModal({ title: '영수증 다운로드 실패', message: error.message, type: 'error' });
    },
  });
};
