'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

export interface MinutesDraft {
  minutes_draft: string | null;
  minutes_finalized_at: string | null;
  minutes_confirmed_by: Array<{
    user_id: string;
    name: string;
    role: 'chair' | 'member';
    confirmed_at: string;
    ip: string;
  }> | null;
  minutes_content_hash: string | null;
}

/**
 * 의사록 초안 자동 생성
 */
export const useGenerateMinutes = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/minutes`, {
        method: 'POST',
      });
      if (!res.ok) {
        let errorMessage = '의사록 생성에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as MinutesDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minutesDraft', union?.id, assemblyId] });
      openAlertModal({
        title: '의사록 생성 완료',
        message: '의사록 초안이 생성되었습니다. 내용을 확인하고 필요 시 수정하세요.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '의사록 생성 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 의사록 초안 조회
 */
export const useMinutesDraft = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['minutesDraft', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/minutes`);
      if (!res.ok) {
        throw new Error('의사록을 불러올 수 없습니다.');
      }
      const { data } = await res.json();
      return data as MinutesDraft;
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 의사록 수정
 */
export const useUpdateMinutes = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async (minutesDraft: string) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/minutes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes_draft: minutesDraft }),
      });
      if (!res.ok) {
        let errorMessage = '의사록 수정에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as MinutesDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minutesDraft', union?.id, assemblyId] });
      openAlertModal({
        title: '저장 완료',
        message: '의사록이 저장되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '저장 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 의사록 전자서명
 */
export const useConfirmMinutes = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async (role: 'chair' | 'member') => {
      const res = await fetch(`/api/assemblies/${assemblyId}/minutes/confirm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        let errorMessage = '의사록 서명에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as MinutesDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minutesDraft', union?.id, assemblyId] });
      openAlertModal({
        title: '서명 완료',
        message: '의사록에 서명하였습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '서명 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 의사록 확정
 */
export const useFinalizeMinutes = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/minutes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalize: true }),
      });
      if (!res.ok) {
        let errorMessage = '의사록 확정에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as MinutesDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minutesDraft', union?.id, assemblyId] });
      openAlertModal({
        title: '의사록 확정',
        message: '의사록이 확정되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '확정 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};
