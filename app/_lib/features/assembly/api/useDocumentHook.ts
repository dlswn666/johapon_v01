'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type {
  OfficialDocument,
  OfficialDocumentType,
  DocumentStatus,
  DocumentTemplate,
  PersonalizedDocumentView,
  PersonalizedInstance,
  PdfGenerationResult,
} from '@/app/_lib/shared/type/assembly.types';

/**
 * 문서 목록 조회
 */
export const useDocuments = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['official-documents', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents`);
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
    queryKey: ['official-documents', union?.id, assemblyId, documentId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents/${documentId}`);
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
      sourceJson,
    }: {
      documentType: OfficialDocumentType;
      agendaItemId?: string;
      sourceJson?: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          agendaItemId: agendaItemId || null,
          sourceJson: sourceJson || {},
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
      queryClient.invalidateQueries({ queryKey: ['official-documents', union?.id, assemblyId] });
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
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, voidReason }),
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
      queryClient.invalidateQueries({ queryKey: ['official-documents', union?.id, assemblyId] });
      queryClient.invalidateQueries({
        queryKey: ['official-documents', union?.id, assemblyId, data.id],
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
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents/${documentId}/seal`, {
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
      queryClient.invalidateQueries({ queryKey: ['official-documents', union?.id, assemblyId] });
      queryClient.invalidateQueries({
        queryKey: ['official-documents', union?.id, assemblyId, data.id],
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

/**
 * 조합원용 개인화 문서 조회 (lazy generation)
 */
export const usePersonalizedDocument = (
  assemblyId: string | undefined,
  documentId: string | undefined
) => {
  return useQuery({
    queryKey: ['personalized-document', assemblyId, documentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/${documentId}/personalized`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '개인화 문서 조회 실패');
      }
      const { data } = await res.json();
      return data as PersonalizedDocumentView;
    },
    enabled: !!assemblyId && !!documentId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * 관리자용 개인화 인스턴스 목록 조회
 */
export const usePersonalizedInstances = (
  assemblyId: string | undefined,
  documentId: string | undefined
) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['personalized-instances', union?.id, assemblyId, documentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/${documentId}/personalized?admin=true`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '인스턴스 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as PersonalizedInstance[];
    },
    enabled: !!assemblyId && !!documentId && !!union?.id,
  });
};

/**
 * 문서 템플릿 목록 조회
 */
export const useDocumentTemplates = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['document-templates', union?.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/templates`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '템플릿 조회 실패');
      }
      const { data } = await res.json();
      return data as DocumentTemplate[];
    },
    enabled: !!assemblyId && !!union?.id,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
};

/**
 * PDF 생성 (Admin only)
 */
export const useGeneratePdf = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ documentId }: { documentId: string }) => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/${documentId}/pdf`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'PDF 생성에 실패했습니다.');
      }
      const { data } = await res.json();
      return data as PdfGenerationResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['official-documents', union?.id, assemblyId, variables.documentId],
      });
      openAlertModal({
        title: 'PDF 생성 완료',
        message: 'PDF가 생성되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: 'PDF 생성 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * PDF 다운로드 URL 조회
 */
export const useDownloadPdf = (
  assemblyId: string | undefined,
  documentId: string | undefined
) => {
  return useQuery({
    queryKey: ['pdf-download', assemblyId, documentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/${documentId}/pdf`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'PDF 다운로드 URL 조회 실패');
      }
      const { data } = await res.json();
      return data as { downloadUrl: string; pdfHash: string; fileName: string };
    },
    enabled: false, // 수동 트리거 (refetch)
  });
};
