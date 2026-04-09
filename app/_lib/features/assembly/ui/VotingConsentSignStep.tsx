'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useKgInicisAuthRequest, useKgInicisAuthResult } from '../api/useKgInicisHook';

interface VotingConsentSignStepProps {
  assemblyName: string;
  assemblyDate: string;
  unionName: string;
  userName: string;
  memberNumber: string;
  onComplete: (data: { txId: string; signedDataHash: string }) => void;
}

type SignState = 'idle' | 'pending' | 'success' | 'failed';

/** 전자서명(02) 동의서 컴포넌트 — 참여 동의서 서명 */
export default function VotingConsentSignStep({
  assemblyName,
  assemblyDate,
  unionName,
  userName,
  memberNumber,
  onComplete,
}: VotingConsentSignStepProps) {
  const [state, setState] = useState<SignState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mTxIdRef = useRef<string | null>(null);

  const authRequest = useKgInicisAuthRequest();
  const authResult = useKgInicisAuthResult();

  const consentText = useMemo(() => {
    const timestamp = new Date().toISOString();
    return `전자투표 참여 동의서

총회명: ${assemblyName}
총회일시: ${assemblyDate}
조합명: ${unionName}

본인은 위 총회의 전자투표에 본인의 의사로 참여하며,
다음 사항에 동의합니다:

1. 본 전자투표는 도시정비법 제45조에 따른 전자적 방식의
   의결권 행사임을 확인합니다.
2. 본인인증을 통해 본인 여부가 확인되었습니다.
3. 투표 결과는 정관에 정한 방법에 따라 처리됩니다.

서명일시: ${timestamp}
서명자: ${userName} (조합원번호: ${memberNumber})`;
  }, [assemblyName, assemblyDate, unionName, userName, memberNumber]);

  const handleSign = async () => {
    setState('pending');
    setErrorMessage(null);

    try {
      // STEP1: 전자서명 요청
      const { mTxId, authUrl, formParams } = await authRequest.mutateAsync({
        reqSvcCd: '02',
        identifier: consentText,
      });
      mTxIdRef.current = mTxId;

      // STEP2: 팝업 열고 POST 폼 제출
      const popup = window.open('about:blank', 'kgInicisSign', 'width=400,height=640');
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

      if (result.txId && result.signedData) {
        setState('success');
        onComplete({
          txId: result.txId,
          signedDataHash: result.signedData,
        });
      } else {
        throw new Error('서명 데이터를 받지 못했습니다. 다시 시도해 주세요.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '전자서명에 실패했습니다.';
      setErrorMessage(msg);
      setState('failed');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">전자서명</h2>
        <p className="text-sm text-gray-500 mt-1">
          아래 동의서 내용을 확인하고 전자서명을 진행해 주세요.
        </p>
      </div>

      {/* 동의서 본문 */}
      <div className="h-56 overflow-y-auto rounded-lg bg-gray-50 border border-gray-200 p-4">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
          {consentText}
        </pre>
      </div>

      {state === 'idle' && (
        <Button onClick={handleSign} className="w-full">
          전자서명 하기
        </Button>
      )}

      {state === 'pending' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-700 text-center">
            팝업 창에서 전자서명을 완료해 주세요.
          </p>
        </div>
      )}

      {state === 'success' && (
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-700">전자서명이 완료되었습니다.</p>
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
            <p className="text-sm text-red-700">{errorMessage || '전자서명에 실패했습니다.'}</p>
          </div>
          <Button onClick={handleSign} className="w-full">
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
