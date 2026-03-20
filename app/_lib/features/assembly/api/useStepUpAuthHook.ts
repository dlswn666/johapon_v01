'use client';

import { useMutation } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type { AuthNonce } from '@/app/_lib/shared/type/assembly.types';

/**
 * PASS Step-up 인증 훅
 * PASS API 계약 전까지는 Mock 응답 사용
 */

// PASS 인증 요청 (팝업 세션키 발급)
export const useRequestPassVerification = (assemblyId: string) => {
  return useMutation({
    mutationFn: async (body: { pollId?: string }) => {
      // PASS API 미연동 시 Mock 응답
      const res = await fetch(`/api/assemblies/${assemblyId}/auth/pass-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => null);

      // 404 또는 네트워크 오류 → Mock 처리
      if (!res || res.status === 404) {
        return { sessionKey: `mock-${Date.now()}` };
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'PASS 인증 요청 실패');
      }
      const { data } = await res.json();
      return data as { sessionKey: string };
    },
  });
};

// PASS nonce 교환 (세션키 → 60초 TTL nonce)
export const useConsumePassNonce = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async (body: { sessionKey: string; assemblyId?: string }) => {
      // Mock 세션키 처리
      if (body.sessionKey.startsWith('mock-')) {
        const nonce = '0'.repeat(64); // 64자 hex mock nonce
        const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
        return { nonce, expires_at: expiresAt } as AuthNonce;
      }

      const res = await fetch(`/api/assemblies/${assemblyId}/auth/pass-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: body.sessionKey }),
      }).catch(() => null);

      if (!res || res.status === 404) {
        // Mock fallback
        const nonce = '0'.repeat(64);
        const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
        return { nonce, expires_at: expiresAt } as AuthNonce;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '인증 토큰 발급 실패');
      }
      const { data } = await res.json();
      return data as AuthNonce;
    },
    onError: (error: Error) => {
      openAlertModal({ title: '인증 실패', message: error.message, type: 'error' });
    },
  });
};
