'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import {
  AssemblyQuestion,
  SpeakerRequest,
  AgendaDocument,
} from '@/app/_lib/shared/type/assembly.types';

/**
 * 총회 질문 목록 조회 (승인된 공개 질문 + 내 질문)
 */
export const useAssemblyQuestions = (assemblyId: string | undefined, isLive = false) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['assemblyQuestions', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/questions`);
      if (!res.ok) {
        throw new Error('질문 목록을 불러올 수 없습니다.');
      }
      const { data } = await res.json();
      return data as AssemblyQuestion[];
    },
    enabled: !!assemblyId && !!union?.id,
    refetchInterval: isLive ? 15000 : false, // 진행 중일 때만 15초 폴링
  });
};

/**
 * 질문 제출
 */
export const useSubmitQuestion = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, agendaItemId }: { content: string; agendaItemId?: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, agendaItemId }),
      });
      if (!res.ok) {
        let errorMessage = '질문 등록에 실패했습니다.';
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
      queryClient.invalidateQueries({
        queryKey: ['assemblyQuestions', union?.id, assemblyId],
      });
      openAlertModal({
        title: '질문 등록',
        message: '질문이 등록되었습니다. 관리자 승인 후 공개됩니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '질문 등록 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 발언 요청 목록 조회 (내 요청만)
 */
export const useSpeakerRequests = (assemblyId: string | undefined, isLive = false) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['speakerRequests', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/speakers`);
      if (!res.ok) {
        throw new Error('발언 요청을 불러올 수 없습니다.');
      }
      const { data } = await res.json();
      return data as SpeakerRequest[];
    },
    enabled: !!assemblyId && !!union?.id,
    refetchInterval: isLive ? 10000 : false, // 진행 중일 때만 10초 폴링
  });
};

/**
 * 발언 요청 제출
 */
export const useRequestToSpeak = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agendaItemId }: { agendaItemId?: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/speakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendaItemId }),
      });
      if (!res.ok) {
        let errorMessage = '발언 요청에 실패했습니다.';
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
      queryClient.invalidateQueries({
        queryKey: ['speakerRequests', union?.id, assemblyId],
      });
      openAlertModal({
        title: '발언 요청',
        message: '발언 요청이 등록되었습니다. 승인 대기 중입니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '발언 요청 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 총회 자료 목록 조회
 */
export const useAssemblyDocuments = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['assemblyDocuments', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/documents`);
      if (!res.ok) {
        throw new Error('자료 목록을 불러올 수 없습니다.');
      }
      const { data } = await res.json();
      return data as AgendaDocument[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 자료 열람 기록 저장
 */
export const useLogDocumentView = (assemblyId: string) => {
  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      await fetch(`/api/assemblies/${assemblyId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
    },
  });
};
