'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type {
  ComplianceCheckpoint,
  ComplianceCheckResult,
} from '@/app/_lib/shared/type/assembly.types';

/**
 * 컴플라이언스 평가 실행 및 조회
 */
export const useComplianceCheck = (
  assemblyId: string | undefined,
  checkpoint?: ComplianceCheckpoint
) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['compliance', union?.id, assemblyId, checkpoint],
    queryFn: async () => {
      const params = checkpoint ? `?checkpoint=${checkpoint}` : '';
      const res = await fetch(`/api/assemblies/${assemblyId}/compliance${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '컴플라이언스 평가 실패');
      }
      const { data } = await res.json();
      return data as ComplianceCheckResult;
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 규칙 면제 (BYLAW/POLICY만, 사유 필수)
 */
export const useWaiveComplianceRule = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      evaluationId,
      waiverReason,
    }: {
      evaluationId: string;
      waiverReason: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/compliance/waive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation_id: evaluationId, waiver_reason: waiverReason }),
      });
      if (!res.ok) {
        let errorMessage = '규칙 면제에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance', union?.id, assemblyId] });
      openAlertModal({
        title: '면제 처리 완료',
        message: '규칙이 면제되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '면제 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};
