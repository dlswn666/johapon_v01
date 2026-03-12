'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

export interface TallyOptionResult {
  label: string;
  electronic_count: number;
  onsite_count: number;
  written_count: number;
  proxy_count: number;
  total_count: number;
  weight_sum: number;
}

export interface TallyPollResult {
  poll_id: string;
  options: TallyOptionResult[];
  total_votes: number;
  quorum_met: boolean | null;
  approved: boolean;
  tallied_at: string | null;
}

export interface AgendaReport {
  id: string;
  seq_order: number;
  title: string;
  type: string;
  type_label: string;
  quorum_threshold_pct: number | null;
  approval_threshold_pct: number | null;
  polls: TallyPollResult[];
}

export interface AssemblyReport {
  assembly: {
    id: string;
    title: string;
    type: string;
    type_label: string;
    scheduled_at: string;
    opened_at: string | null;
    closed_at: string | null;
    venue_address: string | null;
    legal_basis: string | null;
    status: string;
  };
  attendance: {
    onsite: number;
    online: number;
    written_proxy: number;
    total: number;
    quorum_total_members: number;
    quorum_met: boolean | null;
  };
  agendas: AgendaReport[];
  timestamps: {
    generated_at: string;
  };
}

/**
 * 투표 집계 실행
 */
export const useExecuteTally = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/tally`, {
        method: 'POST',
      });
      if (!res.ok) {
        let errorMessage = '집계 실행에 실패했습니다.';
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
      queryClient.invalidateQueries({ queryKey: ['tallyResults', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assemblyReport', union?.id, assemblyId] });
      openAlertModal({
        title: '집계 완료',
        message: '투표 집계가 완료되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '집계 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * 집계 결과 조회
 */
export const useTallyResults = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['tallyResults', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/tally`);
      if (!res.ok) {
        throw new Error('집계 결과를 불러올 수 없습니다.');
      }
      const { data } = await res.json();
      return data;
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 투표 결과 공개 조회 (P1-4, 조합원 열람용)
 * 비밀투표 원칙: 안건별 총 집계만 표시
 */
export const usePublicAssemblyReport = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['publicAssemblyReport', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/report`);
      if (!res.ok) throw new Error('결과를 불러올 수 없습니다.');
      const { data } = await res.json();
      return data as AssemblyReport;
    },
    enabled: !!assemblyId,
  });
};

/**
 * 총회 보고서 조회
 */
export const useAssemblyReport = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['assemblyReport', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/report`);
      if (!res.ok) {
        throw new Error('보고서를 불러올 수 없습니다.');
      }
      const { data } = await res.json();
      return data as AssemblyReport;
    },
    enabled: !!assemblyId && !!union?.id,
  });
};
