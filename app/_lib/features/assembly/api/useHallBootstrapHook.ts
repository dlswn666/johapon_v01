'use client';

import { useQuery } from '@tanstack/react-query';
import { HallBootstrapData } from '@/app/_lib/shared/type/assembly.types';

/**
 * 총회장 초기 데이터 로드 (bootstrap)
 */
export const useHallBootstrap = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['hallBootstrap', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/hall`);
      if (!res.ok) {
        let errorMessage = '총회장 데이터를 불러올 수 없습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as HallBootstrapData;
    },
    enabled: !!assemblyId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
};
