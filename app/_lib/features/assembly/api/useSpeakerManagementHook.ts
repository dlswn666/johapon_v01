'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { SpeakerRequest } from '@/app/_lib/shared/type/assembly.types';

/**
 * 관리자용 발언 요청 전체 목록
 */
export const useAdminSpeakers = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['adminSpeakers', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/speakers?admin=true`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '발언 요청 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as SpeakerRequest[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 발언 요청 승인
 */
export const useApproveSpeaker = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/speakers/${requestId}/approve`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        let errorMessage = '발언 승인에 실패했습니다.';
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
      queryClient.invalidateQueries({ queryKey: ['adminSpeakers', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['speakerRequests', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '발언 승인 실패', message: error.message, type: 'error' });
    },
  });
};

/**
 * 발언 요청 거절
 */
export const useRejectSpeaker = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/speakers/${requestId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        let errorMessage = '발언 거절에 실패했습니다.';
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
      queryClient.invalidateQueries({ queryKey: ['adminSpeakers', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['speakerRequests', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '발언 거절 실패', message: error.message, type: 'error' });
    },
  });
};

/**
 * 발언 완료 처리
 */
export const useCompleteSpeaker = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/speakers/${requestId}/complete`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        let errorMessage = '발언 완료 처리에 실패했습니다.';
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
      queryClient.invalidateQueries({ queryKey: ['adminSpeakers', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['speakerRequests', union?.id, assemblyId] });
    },
  });
};

/**
 * 발언 순서 변경
 */
export const useReorderSpeakers = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ orderedIds }: { orderedIds: string[] }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/speakers/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        let errorMessage = '발언 순서 변경에 실패했습니다.';
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
      queryClient.invalidateQueries({ queryKey: ['adminSpeakers', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '순서 변경 실패', message: error.message, type: 'error' });
    },
  });
};
