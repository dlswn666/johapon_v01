'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useKgInicisAuthRequest, useKgInicisAuthResult } from '../api/useKgInicisHook';

interface IdentityVerificationStepProps {
  onComplete: (ciHash: string) => void;
  userName?: string;
  userPhone?: string;
}

type VerifyState = 'idle' | 'pending' | 'success' | 'failed';

/** 본인확인(03) 컴포넌트 — 최초 1회 CI/DI 확보 */
export default function IdentityVerificationStep({
  onComplete,
  userName,
  userPhone,
}: IdentityVerificationStepProps) {
  const [state, setState] = useState<VerifyState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mTxIdRef = useRef<string | null>(null);

  const authRequest = useKgInicisAuthRequest();
  const authResult = useKgInicisAuthResult();

  const handleStart = async () => {
    setState('pending');
    setErrorMessage(null);

    try {
      // STEP1: 인증 요청
      const { mTxId, authUrl, formParams } = await authRequest.mutateAsync({
        reqSvcCd: '03',
        userName,
        userPhone,
      });
      mTxIdRef.current = mTxId;

      // STEP2: 팝업 열고 POST 폼 제출
      const popup = window.open('about:blank', 'kgInicisIdentity', 'width=400,height=640');
      if (!popup) {
        throw new Error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
      }

      const form = popup.document.createElement('form');
      form.method = 'POST';
      form.action = authUrl;
      for (const [name, value] of Object.entries(formParams)) {
        const input = popup.document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      popup.document.body.appendChild(form);
      form.submit();

      // STEP3: 팝업 닫힘 감지 (500ms 폴링)
      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            resolve();
          }
        }, 500);
      });

      // STEP4: 결과 조회
      const result = await authResult.mutateAsync(mTxId);

      if (result.userCi) {
        setState('success');
        onComplete(result.userCi);
      } else {
        throw new Error('CI 정보를 받지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '본인확인에 실패했습니다.';
      setErrorMessage(msg);
      setState('failed');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">본인 확인</h2>
        <p className="text-sm text-gray-500 mt-1">
          전자투표 참여를 위해 최초 1회 본인확인이 필요합니다.
        </p>
      </div>

      {state === 'idle' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            KG이니시스 본인확인 서비스를 통해 본인 여부를 확인합니다.
            팝업이 열리면 안내에 따라 인증을 완료해 주세요.
          </p>
          <Button onClick={handleStart} className="w-full">
            본인확인 시작
          </Button>
        </div>
      )}

      {state === 'pending' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-700 text-center">
            팝업 창에서 본인확인을 완료해 주세요.
          </p>
        </div>
      )}

      {state === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-700">본인확인이 완료되었습니다.</p>
        </div>
      )}

      {state === 'failed' && (
        <div className="space-y-3">
          <div
            className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200"
            role="alert"
          >
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <p className="text-sm text-red-700">{errorMessage || '본인확인에 실패했습니다.'}</p>
          </div>
          <Button onClick={handleStart} className="w-full">
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
