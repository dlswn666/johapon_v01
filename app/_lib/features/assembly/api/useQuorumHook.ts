'use client';

import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import type { VotingWeightMode } from '@/app/_lib/shared/type/assembly.types';

export interface PerAgendaQuorum {
  agendaId: string;
  title: string;
  agendaType: string;
  requiredThreshold: number;
  currentPct: number;
  met: boolean;
}

export interface QuorumStatus {
  totalMembers: number;
  onsiteCount: number;
  onlineCount: number;
  writtenProxyCount: number;
  totalAttendance: number;
  quorumMet: boolean;
  quorumThresholdPct: number;
  perAgenda: PerAgendaQuorum[];
  // 확장 필드
  votingWeightMode: VotingWeightMode;
  weightedParticipation: number;
  quorumStatus: 'RED' | 'YELLOW' | 'GREEN';
  agendaQuorums?: {
    agendaId: string;
    required: number;
    current: number;
    met: boolean;
  }[];
}

/**
 * 정족수 현황 조회 (10초 자동 갱신)
 */
export const useQuorumStatus = (assemblyId: string | undefined, weightMode?: VotingWeightMode) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['quorum', union?.id, assemblyId, weightMode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (weightMode) params.set('weightMode', weightMode);
      const url = `/api/assemblies/${assemblyId}/quorum${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '정족수 조회 실패');
      }
      const { data } = await res.json();
      return data as QuorumStatus;
    },
    enabled: !!assemblyId && !!union?.id,
    refetchInterval: 10000, // 10초 자동 갱신
  });
};
