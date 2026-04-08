'use client';

import { useMutation } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

interface AuthRequestParams {
  reqSvcCd: '01' | '02' | '03';
  identifier?: string;
  userName?: string;
  userPhone?: string;
}

interface AuthRequestResult {
  mTxId: string;
  authUrl: string;
  formParams: Record<string, string>;
}

interface AuthResult {
  resultCode: string;
  userName?: string;
  userPhone?: string;
  userCi?: string;
  userDi?: string;
  userGender?: string;
  isForeign?: string;
  signedData?: string;
  txId: string;
  mTxId: string;
}

/** KG이니시스 인증 요청 훅 (STEP1) */
export const useKgInicisAuthRequest = () => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async (params: AuthRequestParams): Promise<AuthRequestResult> => {
      const res = await fetch(`${API_BASE}/api/kg-inicis/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...params,
          successUrl: `${API_BASE}/api/kg-inicis/auth/success`,
          failUrl: `${API_BASE}/api/kg-inicis/auth/fail`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '인증 요청 실패');
      }

      const { data } = await res.json();
      return data as AuthRequestResult;
    },
    onError: (error: Error) => {
      openAlertModal({ title: '인증 요청 실패', message: error.message, type: 'error' });
    },
  });
};

/** KG이니시스 결과 조회 훅 (STEP3 S2S) */
export const useKgInicisAuthResult = () => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async (mTxId: string): Promise<AuthResult> => {
      const res = await fetch(`${API_BASE}/api/kg-inicis/auth/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mTxId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '인증 결과 조회 실패');
      }

      const { data } = await res.json();
      return data as AuthResult;
    },
    onError: (error: Error) => {
      openAlertModal({ title: '인증 실패', message: error.message, type: 'error' });
    },
  });
};

/** KG이니시스 트랜잭션 상태 폴링 훅 */
export const useKgInicisTxStatus = () => {
  return useMutation({
    mutationFn: async (mTxId: string): Promise<{ mTxId: string; status: string }> => {
      const res = await fetch(`${API_BASE}/api/kg-inicis/auth/status/${mTxId}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('상태 조회 실패');

      const { data } = await res.json();
      return data;
    },
  });
};
