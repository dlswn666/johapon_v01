'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type {
  DocumentSignature,
  SignDocumentResult,
  SignerRole,
  SignatureMethod,
} from '@/app/_lib/shared/type/assembly.types';

/**
 * 문서 서명 목록 조회
 */
export const useDocumentSignatures = (
  assemblyId: string | undefined,
  documentId: string | undefined
) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['signatures', union?.id, assemblyId, documentId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/${documentId}/signatures`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '서명 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as DocumentSignature[];
    },
    enabled: !!assemblyId && !!documentId && !!union?.id,
  });
};

/**
 * 문서 서명 실행
 */
export const useSignDocument = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      documentId,
      signerRole,
      signatureMethod,
      expectedHash,
      signatureImageData,
    }: {
      documentId: string;
      signerRole: SignerRole;
      signatureMethod: SignatureMethod;
      expectedHash: string;
      signatureImageData?: string;
    }) => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/${documentId}/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signerRole,
            signatureMethod,
            expectedHash,
            signatureImageData,
          }),
        }
      );
      if (!res.ok) {
        let errorMessage = '서명에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as SignDocumentResult;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['signatures', union?.id, assemblyId, variables.documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['official-documents', union?.id, assemblyId, variables.documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['official-documents', union?.id, assemblyId],
      });

      if (data.thresholdMet) {
        openAlertModal({
          title: '서명 완료',
          message: `서명이 완료되었습니다. 필요 서명(${data.requiredCount}명)이 모두 완료되었습니다.`,
          type: 'success',
        });
      } else {
        openAlertModal({
          title: '서명 완료',
          message: `서명이 추가되었습니다. (${data.currentCount}/${data.requiredCount})`,
          type: 'success',
        });
      }
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
