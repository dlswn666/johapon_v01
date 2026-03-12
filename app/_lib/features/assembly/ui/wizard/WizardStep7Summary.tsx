'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle } from 'lucide-react';
import ChecklistGroup, { type ChecklistItem } from '@/app/_lib/widgets/common/ChecklistGroup';
import type {
  Assembly,
  ComplianceCheckResult,
  WizardStep,
} from '@/app/_lib/shared/type/assembly.types';
import {
  ASSEMBLY_TYPE_LABELS,
  WIZARD_STEP_LABELS,
} from '@/app/_lib/shared/type/assembly.types';

interface WizardStep7Props {
  assembly: Assembly | null;
  completedSteps: Set<WizardStep>;
  complianceResult: ComplianceCheckResult | undefined;
  onConfirm: () => void;
  isConfirming: boolean;
}

export default function WizardStep7Summary({
  assembly,
  completedSteps,
  complianceResult,
  onConfirm,
  isConfirming,
}: WizardStep7Props) {
  // 체크리스트 생성
  const stepChecklist: ChecklistItem[] = ([1, 2, 3, 4, 5, 6] as WizardStep[]).map((step) => ({
    id: `step-${step}`,
    label: `${step}단계: ${WIZARD_STEP_LABELS[step]}`,
    status: completedSteps.has(step) ? 'complete' : 'incomplete',
  }));

  const hasBlockingIssues = complianceResult?.summary.hasBlockingFailures ?? false;
  const allStepsComplete = ([1, 2, 3, 4, 5, 6] as WizardStep[]).every((s) =>
    completedSteps.has(s)
  );
  const canConfirm = allStepsComplete && !hasBlockingIssues;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">최종 확인</h2>

      {/* 총회 요약 */}
      {assembly && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">총회 정보</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">제목</dt>
              <dd className="font-medium text-gray-900">{assembly.title}</dd>
            </div>
            <div>
              <dt className="text-gray-500">유형</dt>
              <dd className="font-medium text-gray-900">
                {ASSEMBLY_TYPE_LABELS[assembly.assembly_type]}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">일시</dt>
              <dd className="font-medium text-gray-900">
                {new Date(assembly.scheduled_at).toLocaleString('ko-KR')}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">장소</dt>
              <dd className="font-medium text-gray-900">
                {assembly.venue_address || '-'}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* 단계별 완료 현황 */}
      <ChecklistGroup title="준비 현황" items={stepChecklist} />

      {/* 컴플라이언스 요약 */}
      {complianceResult && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">컴플라이언스 현황</h3>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <p className="font-bold text-gray-900">{complianceResult.summary.total}</p>
              <p className="text-xs text-gray-500">전체</p>
            </div>
            <div>
              <p className="font-bold text-green-600">{complianceResult.summary.pass}</p>
              <p className="text-xs text-gray-500">통과</p>
            </div>
            <div>
              <p className="font-bold text-red-600">{complianceResult.summary.fail}</p>
              <p className="text-xs text-gray-500">실패</p>
            </div>
            <div>
              <p className="font-bold text-amber-600">{complianceResult.summary.waived}</p>
              <p className="text-xs text-gray-500">면제</p>
            </div>
          </div>
        </div>
      )}

      {/* 경고 메시지 */}
      {!allStepsComplete && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          모든 단계를 완료한 후 확정할 수 있습니다.
        </div>
      )}

      {hasBlockingIssues && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          차단 규칙이 해결되지 않았습니다. 컴플라이언스 검증(6단계)에서 해결하세요.
        </div>
      )}

      {/* 확정 버튼 */}
      <Button
        onClick={onConfirm}
        disabled={!canConfirm || isConfirming}
        className="w-full"
        size="lg"
      >
        {isConfirming ? '처리중...' : '총회 준비 확정'}
      </Button>
    </div>
  );
}
