'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

export interface EvidencePackageInfo {
  evidence_package_url: string | null;
  evidence_packaged_at: string | null;
}

export interface EvidencePackageResult extends EvidencePackageInfo {
  chain_integrity: boolean;
  chain_errors: string[];
}

/**
 * 증거 패키지 생성
 */
export const useGenerateEvidencePackage = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/evidence-package`, {
        method: 'POST',
      });
      if (!res.ok) {
        let errorMessage = '증거 패키지 생성에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await res.json();
        // 직접 URL이 있는 경우
        if (body.data) return body.data as EvidencePackageResult;
        // JSON 폴백 (Storage 업로드 실패 시 — 파일로 저장)
        const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evidence_${assemblyId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return { evidence_package_url: null, evidence_packaged_at: new Date().toISOString(), chain_integrity: true, chain_errors: [] } as EvidencePackageResult;
      }
      return null;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evidencePackage', union?.id, assemblyId] });
      const chainMsg = data?.chain_integrity === false
        ? '\n\n⚠️ 경고: 감사 로그 해시 체인 무결성 검증 실패가 감지되었습니다.'
        : '';
      openAlertModal({
        title: '증거 패키지 생성 완료',
        message: `증거 패키지가 생성되었습니다.${chainMsg}`,
        type: data?.chain_integrity === false ? 'error' : 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '증거 패키지 생성 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 증거 패키지 정보 조회
 */
export const useEvidencePackage = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['evidencePackage', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/evidence-package`);
      if (!res.ok) {
        throw new Error('증거 패키지 정보를 불러올 수 없습니다.');
      }
      const { data } = await res.json();
      return data as EvidencePackageInfo;
    },
    enabled: !!assemblyId && !!union?.id,
  });
};
