'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, ChevronRight } from 'lucide-react';
import type { ComplianceCheckResult, ComplianceSeverity } from '@/app/_lib/shared/type/assembly.types';
import { COMPLIANCE_SEVERITY_COLORS } from '@/app/_lib/shared/type/assembly.types';

interface ComplianceBannerProps {
  checkResult: ComplianceCheckResult | undefined;
  isLoading: boolean;
  onOpenDetail?: () => void;
  className?: string;
}

/** 컴플라이언스 요약 배너 (상시 표시) */
export default function ComplianceBanner({
  checkResult,
  isLoading,
  onOpenDetail,
  className = '',
}: ComplianceBannerProps) {
  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg p-4 h-16 ${className}`} />
    );
  }

  if (!checkResult) return null;

  const { summary } = checkResult;
  const hasBlocking = summary.hasBlockingFailures;
  const allPass = summary.fail === 0;

  // 가장 높은 심각도 결정
  const highestSeverity: ComplianceSeverity = hasBlocking
    ? 'BLOCK'
    : summary.fail > 0
      ? 'WARNING'
      : 'INFO';

  return (
    <div
      className={`rounded-lg border p-4 ${COMPLIANCE_SEVERITY_COLORS[highestSeverity]} ${className}`}
      role={hasBlocking ? 'alert' : 'status'}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {allPass ? (
            <ShieldCheck className="w-5 h-5" />
          ) : (
            <ShieldAlert className="w-5 h-5" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {allPass
                ? '모든 컴플라이언스 규칙을 통과했습니다.'
                : hasBlocking
                  ? `${summary.fail}개 규칙 실패 (차단 ${checkResult.evaluations.filter((e) => e.severity === 'BLOCK' && e.status === 'FAIL').length}건)`
                  : `${summary.fail}개 경고 사항이 있습니다.`}
            </p>
            <p className="text-xs mt-0.5 opacity-80">
              전체 {summary.total}개 규칙 | 통과 {summary.pass} | 실패 {summary.fail} | 면제{' '}
              {summary.waived}
            </p>
          </div>
        </div>
        {onOpenDetail && (
          <button
            onClick={onOpenDetail}
            className="flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            상세 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
