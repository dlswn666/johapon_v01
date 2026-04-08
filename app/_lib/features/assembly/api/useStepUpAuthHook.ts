'use client';

import { useMutation } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type { AuthNonce } from '@/app/_lib/shared/type/assembly.types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

// 간편인증 요청 → 팝업 파라미터 반환
export const useRequestPassVerification = (assemblyId: string) => {
  return useMutation({
    mutationFn: async (body: { pollId?: string }) => {
      // 개발 환경 Mock 처리
      if (process.env.NODE_ENV === 'development') {
        const mockRes = await fetch(`/api/assemblies/${assemblyId}/auth/pass-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => null);

        if (!mockRes || mockRes.status === 404) {
          return { sessionKey: `mock-${Date.now()}`, isMock: true };
        }
      }

      // KG이니시스 간편인증 요청
      const res = await fetch(`${API_BASE}/api/kg-inicis/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reqSvcCd: '01',
          assemblyId,
          successUrl: `${API_BASE}/api/kg-inicis/auth/success`,
          failUrl: `${API_BASE}/api/kg-inicis/auth/fail`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '간편인증 요청 실패');
      }

      const { data } = await res.json();
      return { sessionKey: data.mTxId, isMock: false, authData: data };
    },
  });
};

// 간편인증 완료 후 nonce 교환
export const useConsumePassNonce = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async (body: { sessionKey: string; assemblyId?: string }) => {
      // Mock 세션키 처리 (개발 환경)
      if (body.sessionKey.startsWith('mock-')) {
        const nonce = '0'.repeat(64);
        const expiresAt = new Date(Date.now() + 60 * 1000).toISOString();
        return { nonce, expires_at: expiresAt } as AuthNonce;
      }

      // KG이니시스 결과 조회 → nonce 발급
      const res = await fetch(`/api/assemblies/${assemblyId}/auth/kg-inicis-nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mTxId: body.sessionKey }),
      });

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
