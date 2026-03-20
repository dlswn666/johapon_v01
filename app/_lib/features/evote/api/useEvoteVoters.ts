'use client';

import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

// 투표 대상자 필터
export type VoterFilter = 'ALL' | 'VOTED' | 'NOT_VOTED';

// 투표 대상자 항목
export interface EvoteVoter {
  id: string;
  user_id: string;
  name: string;
  phone?: string | null;
  has_voted: boolean;
  voted_at: string | null;
}

/**
 * 전자투표 대상자 목록 조회
 */
export const useEvoteVoters = (evoteId: string | undefined, filter: VoterFilter = 'ALL') => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['evote-voters', union?.id, evoteId, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'ALL') params.set('filter', filter);

      const res = await fetch(`/api/evotes/${evoteId}/voters?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '투표 대상자 조회 실패');
      }
      const { data } = await res.json();
      return data as EvoteVoter[];
    },
    enabled: !!evoteId && !!union?.id,
  });
};
