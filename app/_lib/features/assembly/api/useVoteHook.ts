'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { MyVoteInfo, CastVoteResult } from '@/app/_lib/shared/type/assembly.types';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';

/**
 * 투표 실행 (cast_vote RPC)
 */
export const useCastVote = () => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { setReceiptToken, markPollVoted } = useVoteStore();
  const { union } = useSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pollId,
      assemblyId,
      optionId,
    }: {
      pollId: string;
      assemblyId: string;
      optionId: string;
    }) => {
      // 투표 전 heartbeat 1회 발송 (실패해도 투표 계속)
      try {
        const sessionId = useVoteStore.getState().sessionId;
        if (sessionId) {
          await fetch(`/api/assemblies/${assemblyId}/online-session/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
        }
      } catch {
        // heartbeat 실패 무시
      }

      const res = await fetch('/api/votes/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, assemblyId, optionId }),
      });
      if (!res.ok) {
        let errorMessage = '투표에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as CastVoteResult | null;
    },
    onSuccess: (data, variables) => {
      if (data?.receipt_token) {
        setReceiptToken(variables.pollId, data.receipt_token);
      } else {
        markPollVoted(variables.pollId);
      }
      // 참여 기록 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['myVote', union?.id, variables.pollId, variables.assemblyId],
      });
    },
    onError: (error: Error) => {
      console.error('투표 실패:', error);
      // AlertModalConfig에 actionButton 미지원 — onOk 미사용, 재시도는 투표 버튼으로 유도
      openAlertModal({
        title: '투표 실패',
        message: `${error.message}\n다시 투표하려면 선택지를 다시 선택 후 투표 버튼을 눌러주세요.`,
        type: 'error',
      });
    },
  });
};

/**
 * 내 투표 참여 기록 조회
 */
export const useMyVote = (pollId: string | undefined, assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['myVote', union?.id, pollId, assemblyId],
    queryFn: async () => {
      const params = new URLSearchParams({ pollId: pollId!, assemblyId: assemblyId! });
      const res = await fetch(`/api/votes/my?${params}`);
      if (!res.ok) {
        let errorMessage = '참여 기록 조회 실패';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as MyVoteInfo | null;
    },
    enabled: !!pollId && !!assemblyId && !!union?.id,
  });
};
