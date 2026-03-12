'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// 결과 공개 실행
export const usePublishResults = (assemblyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/results/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '결과 공개에 실패했습니다.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['result-publication', assemblyId] });
    },
  });
};

// 결과 공개 상태 조회 (관리자용 — publication 존재 여부)
export const useResultPublication = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['result-publication', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/results/public`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('결과 조회 실패');
      const { data } = await res.json();
      return data;
    },
    enabled: !!assemblyId,
  });
};

// 공개 결과 조회 (조합원용)
export const usePublicAssemblyResults = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['public-results', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/results/public`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('결과를 불러올 수 없습니다.');
      const { data } = await res.json();
      return data;
    },
    enabled: !!assemblyId,
  });
};
