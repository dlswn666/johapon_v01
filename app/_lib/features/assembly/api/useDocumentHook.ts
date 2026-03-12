'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type {
  OfficialDocument,
  OfficialDocumentType,
  DocumentStatus,
} from '@/app/_lib/shared/type/assembly.types';

/**
 * 문서 목록 조회
 */
export const useDocuments = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['documents', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/documents`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '문서 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as OfficialDocument[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 문서 상세 조회
 */
export const useDocument = (assemblyId: string | undefined, documentId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['documents', union?.id, assemblyId, documentId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/documents/${documentId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '문서 조회 실패');
      }
      const { data } = await res.json();
      return data as OfficialDocument;
    },
    enabled: !!assemblyId && !!documentId && !!union?.id,
  });
};

/**
 * 문서 생성 (템플릿 기반)
 */
export const useGenerateDocument = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      documentType,
      agendaItemId,
    }: {
      documentType: OfficialDocumentType;
      agendaItemId?: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          agenda_item_id: agendaItemId || null,
        }),
      });
      if (!res.ok) {
        let errorMessage = '문서 생성에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as OfficialDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', union?.id, assemblyId] });
      openAlertModal({
        title: '문서 생성 완료',
        message: '문서가 생성되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '문서 생성 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 문서 상태 전이 (REVIEW, APPROVED, VOID 등)
 */
export const useTransitionDocumentStatus = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      documentId,
      status,
      voidReason,
    }: {
      documentId: string;
      status: DocumentStatus;
      voidReason?: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, void_reason: voidReason }),
      });
      if (!res.ok) {
        let errorMessage = '문서 상태 변경에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as OfficialDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', union?.id, assemblyId] });
      queryClient.invalidateQueries({
        queryKey: ['documents', union?.id, assemblyId, data.id],
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '상태 변경 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 문서 봉인
 */
export const useSealDocument = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/documents/${documentId}/seal`, {
        method: 'POST',
      });
      if (!res.ok) {
        let errorMessage = '문서 봉인에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as OfficialDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', union?.id, assemblyId] });
      queryClient.invalidateQueries({
        queryKey: ['documents', union?.id, assemblyId, data.id],
      });
      openAlertModal({
        title: '봉인 완료',
        message: '문서가 봉인되었습니다. 더 이상 수정할 수 없습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '봉인 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};
