'use client';

import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import type {
  Assembly,
  AgendaItem,
  Poll,
  PollOption,
} from '@/app/_lib/shared/type/assembly.types';

// 안건 + 투표 + 선택지 중첩
export type BallotAgenda = AgendaItem & {
  polls?: (Poll & { poll_options?: PollOption[] })[];
};

// 내 투표 기록 (participation_records)
export interface BallotMyVote {
  id: string;
  poll_id: string;
  first_voted_at: string;
  last_voted_at: string;
  vote_count: number;
  receipt_token: string | null;
  voting_method: string;
  can_revise?: boolean;
}

// 내 스냅샷
export interface BallotSnapshot {
  id: string;
  voting_weight: number;
  identity_verified_at: string | null;
  consent_agreed_at: string | null;
  is_active: boolean;
  member_name: string;
}

// GET /api/evotes/[id]/ballot 응답
export interface BallotData {
  assembly: Assembly;
  agendas: BallotAgenda[];
  my_votes: BallotMyVote[];
  snapshot: BallotSnapshot;
}

/**
 * 전자투표 투표화면 데이터 조회
 */
export const useEvoteBallot = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['evoteBallot', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/evotes/${assemblyId}/ballot`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '투표 화면 데이터 조회 실패');
      }
      const { data } = await res.json();
      return data as BallotData;
    },
    enabled: !!assemblyId && !!union?.id,
    retry: false,
  });
};
