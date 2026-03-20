'use client';

import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import type { Assembly, AgendaItem, AgendaDocument } from '@/app/_lib/shared/type/assembly.types';

// API 응답의 참여현황 타입
export interface EvoteParticipation {
  electronic: number;
  written: number;
  onsite: number;
  proxy: number;
  total: number;
}

// API 응답의 정족수 요약 타입
export interface EvoteQuorumSummary {
  direct_attendance_pct: number;
  approval_pct: number;
  direct_met: boolean;
  approval_met: boolean;
}

// API 응답의 summary 타입
export interface EvoteDashboardSummary {
  eligible_count: number;
  total_weight: number;
  participation: EvoteParticipation;
  quorum: EvoteQuorumSummary;
}

// 안건 + 관계 데이터
export interface EvoteDashboardAgenda extends AgendaItem {
  polls?: Array<{
    id: string;
    status: string;
    vote_type: string;
    poll_options?: Array<{ id: string; label: string; seq_order: number }>;
  }>;
  agenda_documents?: AgendaDocument[];
}

// GET /api/evotes/[id] 전체 응답
export interface EvoteDashboardData {
  assembly: Assembly & { creator?: { id: string; name: string } | null };
  agendas: EvoteDashboardAgenda[];
  summary: EvoteDashboardSummary;
}

/**
 * 전자투표 대시보드 데이터 조회
 * GET /api/evotes/[id] → assembly + agendas + summary
 */
export const useEvoteDashboard = (evoteId: string | undefined, enabled: boolean = true) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['evote-dashboard', union?.id, evoteId],
    queryFn: async () => {
      const res = await fetch(`/api/evotes/${evoteId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '전자투표 대시보드 조회 실패');
      }
      const { data } = await res.json();
      return data as EvoteDashboardData;
    },
    enabled: !!evoteId && !!union?.id && enabled,
    retry: false,
  });
};
