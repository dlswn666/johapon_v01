'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { WrittenBallotStatus } from '@/app/_lib/shared/type/assembly.types';

export interface OnsiteBallotInput {
  id: string;
  assembly_id: string;
  poll_id: string;
  union_id: string;
  member_id: string;
  input_choice_id: string;
  inputter_id: string;
  input_at: string;
  verifier_id: string | null;
  verified_at: string | null;
  status: WrittenBallotStatus;
  dispute_note: string | null;
  scan_image_url: string | null;
  created_at: string;
  // 조인 데이터
  member_name?: string;
  poll_title?: string;
  choice_label?: string;
}

/**
 * 현장투표 입력 목록 조회 (관리자용)
 */
export const useOnsiteBallotList = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['onsiteBallot', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/onsite-ballot`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '현장투표 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as OnsiteBallotInput[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 현장투표 입력 (PENDING_VERIFICATION 상태로 생성)
 */
export const useCreateOnsiteBallot = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      pollId,
      memberId,
      inputChoiceId,
    }: {
      pollId: string;
      memberId: string;
      inputChoiceId: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/onsite-ballot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: pollId, member_id: memberId, input_choice_id: inputChoiceId }),
      });
      if (!res.ok) {
        let errorMessage = '현장투표 입력에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as OnsiteBallotInput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onsiteBallot', union?.id, assemblyId] });
      openAlertModal({
        title: '현장투표 입력',
        message: '현장투표가 입력되었습니다. 다른 관리자가 확인 후 최종 처리됩니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '현장투표 입력 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 현장투표 검증 (VERIFIED 상태로 변경, 입력자와 다른 관리자)
 */
export const useVerifyOnsiteBallot = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ ballotInputId }: { ballotInputId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/onsite-ballot/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ballot_input_id: ballotInputId }),
      });
      if (!res.ok) {
        let errorMessage = '현장투표 검증에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onsiteBallot', union?.id, assemblyId] });
      openAlertModal({
        title: '현장투표 확인',
        message: '현장투표가 최종 확인되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '현장투표 확인 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};
