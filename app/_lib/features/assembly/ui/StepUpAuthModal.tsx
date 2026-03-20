'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRequestPassVerification, useConsumePassNonce } from '../api/useStepUpAuthHook';

interface StepUpAuthModalProps {
  isOpen: boolean;
  assemblyId: string;
  pollId?: string;
  /** C-07: 투표 의사 확인 — 안건명 */
  agendaTitle?: string;
  /** C-07: 투표 의사 확인 — 선택한 옵션 라벨 (찬성/반대/기권 등) */
  selectedOptionLabel?: string;
  onSuccess: (nonce: string) => void;
  onClose: () => void;
  onFailed?: () => void;
}

type AuthState = 'idle' | 'pending' | 'success' | 'failed' | 'exhausted';

const MAX_RETRIES = 3;
const COUNTDOWN_SECONDS = 60;

export default function StepUpAuthModal({
  isOpen,
  assemblyId,
  pollId,
  agendaTitle,
  selectedOptionLabel,
  onSuccess,
  onClose,
  onFailed,
}: StepUpAuthModalProps) {
  const [authState, setAuthState] = useState<AuthState>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestVerification = useRequestPassVerification(assemblyId);
  const consumeNonce = useConsumePassNonce(assemblyId);

  // 카운트다운 타이머 (setCountdown은 setInterval 콜백에서만 호출)
  useEffect(() => {
    if (authState !== 'pending') return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAuthState('failed');
          setErrorMessage('인증 시간이 초과되었습니다.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [authState]);

  const handleStart = async () => {
    setCountdown(COUNTDOWN_SECONDS);
    setAuthState('pending');
    setErrorMessage(null);

    try {
      const result = await requestVerification.mutateAsync({ pollId });
      const { sessionKey } = result;

      // Mock 처리: mock- 세션키이면 2초 후 자동 성공
      if (sessionKey.startsWith('mock-')) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const nonceResult = await consumeNonce.mutateAsync({ sessionKey, assemblyId });
        setAuthState('success');
        setTimeout(() => onSuccess(nonceResult.nonce), 500);
        return;
      }

      // 실제 PASS 팝업 열기 (sessionKey 사용)
      // TODO: 실제 PASS 팝업 연동 시 구현
      const nonceResult = await consumeNonce.mutateAsync({ sessionKey, assemblyId });
      setAuthState('success');
      setTimeout(() => onSuccess(nonceResult.nonce), 500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '인증에 실패했습니다.';
      setErrorMessage(msg);
      setRetryCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_RETRIES) {
          setAuthState('exhausted');
          onFailed?.();
        } else {
          setAuthState('failed');
        }
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">본인 인증</h2>
        <p className="text-sm text-gray-500 mb-4">투표를 위해 PASS 본인인증이 필요합니다.</p>

        {/* C-07: 투표 의사 확인 표시 */}
        {agendaTitle && selectedOptionLabel && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-bold text-blue-900 text-center leading-relaxed">
              귀하는 [{agendaTitle}]에 대해<br />
              <span className="text-base text-blue-700">[{selectedOptionLabel}]</span>(으)로 투표합니다.
            </p>
          </div>
        )}

        {authState === 'idle' && (
          <div className="flex flex-col gap-3">
            <Button onClick={handleStart} className="w-full">
              인증 시작
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              취소
            </Button>
          </div>
        )}

        {authState === 'pending' && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-700 text-center">PASS 앱에서 인증을 완료해 주세요.</p>
            <div className="text-2xl font-bold text-blue-600">{countdown}초</div>
          </div>
        )}

        {authState === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-700">인증 완료</p>
          </div>
        )}

        {authState === 'failed' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="text-sm text-red-700">{errorMessage || '인증에 실패했습니다.'}</p>
            </div>
            <p className="text-xs text-gray-500 text-center">
              남은 시도 횟수: {MAX_RETRIES - retryCount}회
            </p>
            <Button onClick={handleStart} className="w-full">
              다시 시도
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              취소
            </Button>
          </div>
        )}

        {authState === 'exhausted' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-700 text-center">
              인증에 3회 실패했습니다. 현장 투표로 진행해 주세요.
            </p>
            <Button onClick={onClose} className="w-full">
              닫기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
