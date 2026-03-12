'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useVerifyAssemblyAccess } from '@/app/_lib/features/assembly/api/useAssemblyAccessHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import { ASSEMBLY_STATUS_LABELS } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { Shield, CheckCircle, AlertCircle, LogIn, RefreshCw, FileCheck, Smartphone, Lock } from 'lucide-react';
import { IdentityMethod, IDENTITY_METHOD_LABELS } from '@/app/_lib/shared/type/assembly.types';

/**
 * 총회 입장 게이트 페이지
 * URL: /[slug]/assembly/[assemblyId]?token=xxx
 *
 * 플로우:
 * 1. 토큰 파라미터 확인
 * 2. 카카오 로그인 확인 (미로그인 시 로그인 유도)
 * 3. 토큰 검증 + 본인 매칭
 * 4. 성공 시 투표 페이지로 이동
 */
export default function AssemblyGatePage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { slug, isLoading: isUnionLoading } = useSlug();
  const { user, isLoading: isAuthLoading } = useAuth();
  const verifyMutation = useVerifyAssemblyAccess();
  const { snapshot, assembly } = useVoteStore();

  type Step = 'checking' | 'login_required' | 'verifying' | 'consent_required' | 'consenting' | 'success' | 'error';

  // 초기 상태 계산 (effect 외부에서)
  const getInitialStep = (): Step => {
    if (isUnionLoading || isAuthLoading) return 'checking';
    if (!token) return 'error';
    if (!user) return 'login_required';
    if (snapshot?.identity_verified_at && (snapshot as Record<string, unknown>)?.consent_agreed_at) return 'success';
    if (snapshot?.identity_verified_at && !(snapshot as Record<string, unknown>)?.consent_agreed_at) return 'consent_required';
    return 'checking';
  };

  const [verificationStep, setVerificationStep] = useState<Step>(getInitialStep);
  const [errorMessage, setErrorMessage] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [selectedIdentityMethod, setSelectedIdentityMethod] = useState<IdentityMethod>('KAKAO_LOGIN');
  const hasCalledVerify = useRef(false);

  // 상태 동기화 (로딩 완료 후 — 파생 상태)
  const currentStep = ((): Step => {
    if (isUnionLoading || isAuthLoading) return 'checking';
    if (!token) return 'error';
    if (!user) return 'login_required';
    if (snapshot?.identity_verified_at && (snapshot as Record<string, unknown>)?.consent_agreed_at) return 'success';
    if (verificationStep === 'consent_required' || verificationStep === 'consenting') return verificationStep;
    if (snapshot?.identity_verified_at && !(snapshot as Record<string, unknown>)?.consent_agreed_at) return 'consent_required';
    if (verificationStep === 'verifying' || verificationStep === 'error' || verificationStep === 'success') return verificationStep;
    return 'checking';
  })();

  // 토큰 검증 실행 (외부 시스템 호출이므로 effect 적합)
  useEffect(() => {
    if (isUnionLoading || isAuthLoading) return;
    if (!token || !user) return;
    if (snapshot?.identity_verified_at) return;
    if (hasCalledVerify.current) return;
    hasCalledVerify.current = true;

    setVerificationStep('verifying');
    verifyMutation.mutate(
      { assemblyId, token, identityMethod: selectedIdentityMethod },
      {
        onSuccess: (data) => {
          const consentAgreed = (data.snapshot as Record<string, unknown>)?.consent_agreed_at;
          setVerificationStep(consentAgreed ? 'success' : 'consent_required');
        },
        onError: (error: Error) => {
          hasCalledVerify.current = false;
          setVerificationStep('error');
          setErrorMessage(error.message);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUnionLoading, isAuthLoading, user, token, assemblyId, snapshot?.identity_verified_at]);

  // 성공 시 카운트다운 및 자동 이동 (DEF-025)
  useEffect(() => {
    if (currentStep === 'success' && slug) {
      setCountdown(2);
      const interval = setInterval(() => setCountdown((prev) => Math.max(0, prev - 1)), 1000);
      const timer = setTimeout(() => {
        router.push(getUnionPath(slug, `/assembly/${assemblyId}/hall`));
      }, 2000);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [currentStep, router, slug, assemblyId]);

  // 동의 처리 핸들러
  const handleConsent = async () => {
    setVerificationStep('consenting');
    try {
      const res = await fetch('/api/assembly-access/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assemblyId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '동의 처리에 실패했습니다.');
      }
      setVerificationStep('success');
    } catch (err) {
      setVerificationStep('error');
      setErrorMessage(err instanceof Error ? err.message : '동의 처리에 실패했습니다.');
    }
  };

  // 재시도 핸들러
  const handleRetry = () => {
    hasCalledVerify.current = false;
    setVerificationStep('checking');
    setErrorMessage('');
  };

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
        {/* 로고/아이콘 */}
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-blue-600" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">총회 본인인증</h1>

        {assembly && (
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <p className="font-medium text-gray-900">{assembly.title}</p>
            <p className="text-sm text-gray-500 mt-1">
              {ASSEMBLY_STATUS_LABELS[assembly.status]} |{' '}
              {new Date(assembly.scheduled_at).toLocaleDateString('ko-KR')}
            </p>
          </div>
        )}

        {/* 인증 방법 선택 */}
        {(currentStep === 'checking' || currentStep === 'login_required') && !snapshot?.identity_verified_at && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 text-left">인증 방법 선택</p>
            <div className="grid gap-2">
              {/* 카카오 로그인 (활성) */}
              <button
                type="button"
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                  selectedIdentityMethod === 'KAKAO_LOGIN'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedIdentityMethod('KAKAO_LOGIN')}
              >
                <LogIn className="w-5 h-5 text-yellow-600 shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{IDENTITY_METHOD_LABELS.KAKAO_LOGIN}</p>
                  <p className="text-xs text-gray-500">카카오 계정으로 본인 확인</p>
                </div>
              </button>

              {/* PASS 본인인증 (준비 중) */}
              <button
                type="button"
                disabled
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed text-left"
              >
                <Smartphone className="w-5 h-5 text-gray-400 shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">{IDENTITY_METHOD_LABELS.PASS_CERT}</p>
                  <p className="text-xs text-gray-400">휴대폰 본인인증</p>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full shrink-0">
                  준비 중
                </span>
              </button>

              {/* 공동인증서 (준비 중) */}
              <button
                type="button"
                disabled
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed text-left"
              >
                <Lock className="w-5 h-5 text-gray-400 shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">{IDENTITY_METHOD_LABELS.CERTIFICATE}</p>
                  <p className="text-xs text-gray-400">공동인증서(구 공인인증서)</p>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full shrink-0">
                  준비 중
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 단계별 UI */}
        <div aria-live="polite">
        {currentStep === 'checking' && (
          <div className="space-y-3">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600">인증 상태를 확인하고 있습니다...</p>
          </div>
        )}

        {currentStep === 'login_required' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto">
              <LogIn className="w-6 h-6 text-yellow-600" aria-hidden="true" />
            </div>
            <p className="text-gray-700">
              총회 참여를 위해 <strong>카카오 로그인</strong>이 필요합니다.
            </p>
            <p className="text-sm text-gray-500">
              가입 시 사용한 카카오 계정으로 로그인해주세요.
            </p>
            <Button
              className="w-full bg-[#FEE500] text-[#191919] hover:bg-[#FDD835] font-medium h-12"
              onClick={() => {
                const currentPath = pathname + (token ? `?token=${token}` : '');
                router.push(`/${slug}?redirectTo=${encodeURIComponent(currentPath)}`);
              }}
            >
              카카오 로그인
            </Button>
          </div>
        )}

        {currentStep === 'verifying' && (
          <div className="space-y-3">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-600">본인인증을 진행하고 있습니다...</p>
            <p className="text-sm text-gray-400">카카오 계정과 조합원 정보를 대조 중입니다</p>
          </div>
        )}

        {(currentStep === 'consent_required' || currentStep === 'consenting') && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <FileCheck className="w-6 h-6 text-blue-600" aria-hidden="true" />
            </div>
            <p className="text-lg font-semibold text-gray-900">개인정보 수집·이용 동의</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700 space-y-2">
              <p className="font-medium">전자투표 참여를 위해 아래 내용에 동의해 주세요.</p>
              <div className="border-t pt-2 space-y-1">
                <p><strong>수집 항목:</strong> 성명, 연락처, 소유 정보, 투표 참여 기록</p>
                <p><strong>이용 목적:</strong> 조합원 자격 확인, 전자투표 실시, 정족수 산정</p>
                <p><strong>보관 기간:</strong> 사업 완료 또는 조합 해산 시까지</p>
                <p><strong>제3자 제공:</strong> 없음</p>
              </div>
            </div>
            <label className="flex items-start gap-2 cursor-pointer text-left min-h-[44px]">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">
                전자투표 참여를 위한 개인정보 수집·이용에 동의합니다.
              </span>
            </label>
            <Button
              className="w-full"
              disabled={!consentChecked || currentStep === 'consenting'}
              onClick={handleConsent}
            >
              {currentStep === 'consenting' ? '처리 중...' : '동의 후 진행'}
            </Button>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold text-green-700">인증 완료</p>
              {snapshot && (
                <p className="text-sm text-gray-600 mt-1">
                  {snapshot.member_name}님, 환영합니다.
                </p>
              )}
            </div>
            <p className="text-sm text-gray-400">{countdown}초 후 총회 투표 페이지로 이동합니다...</p>
            <Button
              className="w-full"
              onClick={() => router.push(getUnionPath(slug, `/assembly/${assemblyId}/hall`))}
            >
              투표 페이지로 이동
            </Button>
          </div>
        )}

        {currentStep === 'error' && (
          <div role="alert" aria-live="assertive" className="space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-red-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold text-red-700">인증 실패</p>
              <p className="text-sm text-gray-600 mt-2">
                {errorMessage || '접근 토큰이 없습니다. 알림톡에서 받은 링크를 확인해주세요.'}
              </p>
            </div>
            <div className="space-y-2">
              {token && (
                <Button className="w-full" onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                  다시 시도
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => router.back()}>
                돌아가기
              </Button>
              <p className="text-xs text-gray-400 mt-2">문의: 조합 관리자에게 연락해주세요</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
