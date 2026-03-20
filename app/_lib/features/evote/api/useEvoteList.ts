'use client';

import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { Evote, EvoteListFilter } from '@/app/_lib/features/evote/types/evote.types';

/**
 * 전자투표 목록 조회
 */
export const useEvoteList = (filter?: EvoteListFilter, enabled: boolean = true) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['evotes', union?.id, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('union_id', union!.id);
      if (filter?.status) params.set('status', filter.status);
      if (filter?.evote_type) params.set('evote_type', filter.evote_type);
      if (filter?.search) params.set('search', filter.search);

      const res = await fetch(`/api/evotes?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '전자투표 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as Evote[];
    },
    enabled: enabled && !!union?.id,
  });
};

/**
 * 전자투표 상세 조회
 */
export const useEvote = (evoteId: string | undefined, enabled: boolean = true) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['evotes', union?.id, evoteId],
    queryFn: async () => {
      const res = await fetch(`/api/evotes/${evoteId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '전자투표 상세 조회 실패');
      }
      const { data } = await res.json();
      return data as Evote;
    },
    enabled: !!evoteId && !!union?.id && enabled,
    retry: false,
  });
};
