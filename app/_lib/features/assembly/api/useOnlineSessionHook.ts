'use client';

import { useMutation } from '@tanstack/react-query';
import { SessionStartResponse } from '@/app/_lib/shared/type/assembly.types';

/**
 * 온라인 세션 시작
 */
export const useStartSession = (assemblyId: string) => {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/online-session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'WEB',
          clientSessionId: crypto.randomUUID(),
        }),
      });
      if (!res.ok) {
        let errorMessage = '세션 시작에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as SessionStartResponse;
    },
  });
};

/**
 * 온라인 세션 종료
 */
export const useEndSession = (assemblyId: string) => {
  return useMutation({
    mutationFn: async ({ sessionId, reason = 'manual' }: { sessionId: string; reason?: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/online-session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reason }),
      });
      if (!res.ok) {
        let errorMessage = '세션 종료에 실패했습니다.';
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
  });
};
