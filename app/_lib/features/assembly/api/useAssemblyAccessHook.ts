'use client';

import { useMutation } from '@tanstack/react-query';
import { AssemblyAccessResult, IdentityMethod } from '@/app/_lib/shared/type/assembly.types';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';

/**
 * 총회 접근 토큰 검증 + 카카오 인증 확인
 * 토큰 링크 클릭 → 카카오 로그인 확인 → 스냅샷 매칭 → 총회 입장
 */
export const useVerifyAssemblyAccess = () => {
  const { setSnapshot, setAssembly, setAgendaItems } = useVoteStore();

  return useMutation({
    mutationFn: async ({ assemblyId, token, identityMethod }: { assemblyId: string; token: string; identityMethod?: IdentityMethod }) => {
      const res = await fetch('/api/assembly-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assemblyId, token, identityMethod }),
      });
      if (!res.ok) {
        let errorMessage = '총회 접근 인증에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as AssemblyAccessResult & { isReentry: boolean };
    },
    onSuccess: (data) => {
      setSnapshot(data.snapshot);
      if (data.assembly) setAssembly(data.assembly);
      if (data.agendaItems) setAgendaItems(data.agendaItems);
    },
    // onError는 gate page에서 직접 처리 (중복 에러 모달 방지)
  });
};
