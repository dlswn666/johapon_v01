'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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

      // KG이니시스 팝업 연동
      if (result.authData) {
        const { authData } = result;
        const popup = window.open('about:blank', 'kgInicisAuth', 'width=400,height=640');
        if (popup) {
          const form = popup.document.createElement('form');
          form.method = 'POST';
          form.action = authData.authUrl;
          for (const [name, value] of Object.entries(authData.formParams)) {
            const input = popup.document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value as string;
            form.appendChild(input);
          }
          popup.document.body.appendChild(form);
          form.submit();

          await new Promise<void>((resolve) => {
            const timer = setInterval(() => {
              if (popup.closed) {
                clearInterval(timer);
                resolve();
              }
            }, 500);
          });
        }

        const nonceResult = await consumeNonce.mutateAsync({ sessionKey: authData.mTxId, assemblyId });
        setAuthState('success');
        setTimeout(() => onSuccess(nonceResult.nonce), 500);
        return;
      }

      // authData 없는 실제 세션키 처리 (예비 경로)
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

  // 포커스 트랩 및 ESC 키 처리
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;
        const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelector);
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    // 모달 열릴 때 첫 번째 포커스 가능 요소로 포커스 이동
    requestAnimationFrame(() => {
      const modal = modalRef.current;
      if (!modal) return;
      const firstFocusable = modal.querySelector<HTMLElement>(focusableSelector);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        modal.focus();
      }
    });

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // 모달 닫힐 때 이전 포커스 복원
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-up-auth-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 id="step-up-auth-title" className="text-lg font-bold text-gray-900 mb-2">본인 인증</h2>
        <p className="text-sm text-gray-500 mb-4">투표를 위해 본인인증이 필요합니다.</p>

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
            <p className="text-sm text-gray-700 text-center">인증 앱에서 본인인증을 완료해 주세요.</p>
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
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg" role="alert">
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
