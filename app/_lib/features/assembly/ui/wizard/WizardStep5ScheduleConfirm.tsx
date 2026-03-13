'use client';

import React, { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ChecklistGroup, { type ChecklistItem } from '@/app/_lib/widgets/common/ChecklistGroup';
import InfoCard from '@/app/_lib/widgets/common/InfoCard';
import { Calendar, CheckCircle2, AlertTriangle, Clock, Send } from 'lucide-react';
import type {
  Assembly,
  ComplianceCheckResult,
  WizardStep,
} from '@/app/_lib/shared/type/assembly.types';
import {
  ASSEMBLY_TYPE_LABELS,
  WIZARD_STEP_LABELS,
} from '@/app/_lib/shared/type/assembly.types';

interface WizardStep5Props {
  assemblyId: string;
  assembly: Assembly | null;
  completedSteps: Set<number>;
  complianceResult: ComplianceCheckResult | undefined;
  onConfirm: () => void;
  isConfirming: boolean;
}

type DeadlineStatus = 'ok' | 'tight' | 'passed';

interface ScheduleRow {
  label: string;
  type: 'CONVOCATION_NOTICE' | 'INDIVIDUAL_NOTICE';
  daysBeforeAssembly: number;
  description: string;
}

const SCHEDULE_ROWS: ScheduleRow[] = [
  {
    label: '소집공고',
    type: 'CONVOCATION_NOTICE',
    daysBeforeAssembly: 14,
    description: '총회일 14일 전까지 발송',
  },
  {
    label: '소집통지서',
    type: 'INDIVIDUAL_NOTICE',
    daysBeforeAssembly: 7,
    description: '총회일 7일 전까지 발송',
  },
];

/** 날짜 계산 및 상태 판정 */
function calculateDeadline(
  scheduledAt: string,
  daysBefore: number
): { date: Date; formattedDate: string; status: DeadlineStatus; daysRemaining: number } {
  const assemblyDate = new Date(scheduledAt);
  const deadlineDate = new Date(assemblyDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  let status: DeadlineStatus = 'ok';
  if (daysRemaining <= 0) {
    status = 'passed';
  } else if (daysRemaining <= 3) {
    status = 'tight';
  }

  return {
    date: deadlineDate,
    formattedDate: deadlineDate.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    status,
    daysRemaining,
  };
}

/** 상태별 색상 클래스 */
function getStatusColors(status: DeadlineStatus) {
  switch (status) {
    case 'ok':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
      };
    case 'tight':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
      };
    case 'passed':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
      };
  }
}

/** datetime-local input 형식으로 변환 */
function toDatetimeLocalValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export default function WizardStep5ScheduleConfirm({
  assemblyId,
  assembly,
  completedSteps,
  complianceResult,
  onConfirm,
  isConfirming,
}: WizardStep5Props) {
  // 수동 오버라이드 날짜
  const [overrideDates, setOverrideDates] = useState<Record<string, string>>({});
  const [scheduleStatuses, setScheduleStatuses] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});

  // 예약 알림 등록 뮤테이션
  const scheduleMutation = useMutation({
    mutationFn: async ({
      notificationType,
      scheduledAt,
    }: {
      notificationType: string;
      scheduledAt: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/scheduled-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType, scheduledAt }),
      });
      if (!res.ok) throw new Error('예약 등록 실패');
      return res.json();
    },
    onSuccess: (_, variables) => {
      setScheduleStatuses((prev) => ({
        ...prev,
        [variables.notificationType]: 'sent',
      }));
    },
    onError: (_, variables) => {
      setScheduleStatuses((prev) => ({
        ...prev,
        [variables.notificationType]: 'idle',
      }));
    },
  });

  const handleSchedule = (type: string, defaultDate: Date) => {
    const overrideValue = overrideDates[type];
    const scheduledAt = overrideValue
      ? new Date(overrideValue).toISOString()
      : defaultDate.toISOString();

    setScheduleStatuses((prev) => ({ ...prev, [type]: 'sending' }));
    scheduleMutation.mutate({ notificationType: type, scheduledAt });
  };

  // 체크리스트 (1-4단계)
  const stepChecklist: ChecklistItem[] = useMemo(
    () =>
      ([1, 2, 3, 4] as WizardStep[]).map((step) => ({
        id: `step-${step}`,
        label: `${step}단계: ${WIZARD_STEP_LABELS[step]}`,
        status: completedSteps.has(step) ? 'complete' : 'incomplete',
      })),
    [completedSteps]
  );

  const hasBlockingIssues = complianceResult?.summary.hasBlockingFailures ?? false;
  const allPriorStepsComplete = ([1, 2, 3, 4] as WizardStep[]).every((s) =>
    completedSteps.has(s)
  );
  const canConfirm = allPriorStepsComplete && !hasBlockingIssues;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">발송 설정 & 확인</h2>

      {/* ===== 1. 발송 일정 ===== */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          발송 일정
        </h3>

        {assembly ? (
          <div className="space-y-3">
            {SCHEDULE_ROWS.map((row) => {
              const deadline = calculateDeadline(assembly.scheduled_at, row.daysBeforeAssembly);
              const colors = getStatusColors(deadline.status);
              const status = scheduleStatuses[row.type] || 'idle';

              return (
                <div
                  key={row.type}
                  className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {deadline.status === 'ok' && (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                      {deadline.status === 'tight' && (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                      {deadline.status === 'passed' && (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{row.label}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {deadline.status === 'passed'
                        ? '기한 경과'
                        : deadline.status === 'tight'
                          ? `D-${deadline.daysRemaining}`
                          : `D-${deadline.daysRemaining}`}
                    </span>
                  </div>

                  <p className="text-xs mb-2 opacity-75">{row.description}</p>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">
                        자동 계산: {deadline.formattedDate}
                      </p>
                      <Input
                        type="datetime-local"
                        value={overrideDates[row.type] || toDatetimeLocalValue(deadline.date)}
                        onChange={(e) =>
                          setOverrideDates((prev) => ({
                            ...prev,
                            [row.type]: e.target.value,
                          }))
                        }
                        className="bg-white text-sm"
                      />
                    </div>
                    <Button
                      variant={status === 'sent' ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleSchedule(row.type, deadline.date)}
                      disabled={scheduleMutation.isPending || status === 'sending'}
                      className="flex-shrink-0"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {status === 'sending'
                        ? '등록 중...'
                        : status === 'sent'
                          ? '등록됨'
                          : '예약 등록'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">총회 정보를 불러오는 중입니다...</p>
        )}
      </section>

      {/* ===== 2. 자동 생성 문서 ===== */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">자동 생성 문서</h3>
        <InfoCard title="자동 생성 안내" variant="default">
          <p>
            아래 문서는 총회 준비 확정 시 자동으로 생성됩니다. 별도의 편집이 필요하지 않습니다.
          </p>
          <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
            <li>서면결의서 - 서면 투표 의사 표시 문서</li>
            <li>위임장 - 대리 참석 위임 문서</li>
          </ul>
        </InfoCard>
      </section>

      {/* ===== 3. 컴플라이언스 요약 ===== */}
      {complianceResult && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">컴플라이언스 현황</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
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

            {hasBlockingIssues && (
              <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                차단 규칙이 해결되지 않았습니다. 해당 항목을 먼저 해결하세요.
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== 4. 최종 확인 ===== */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">최종 확인</h3>

        {/* 총회 정보 요약 */}
        {assembly && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">총회 정보</h4>
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

        {/* 단계 완료 체크리스트 */}
        <ChecklistGroup title="준비 현황" items={stepChecklist} />

        {/* 경고 메시지 */}
        {!allPriorStepsComplete && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            모든 단계를 완료한 후 확정할 수 있습니다.
          </div>
        )}

        {/* 확정 버튼 */}
        <Button
          onClick={onConfirm}
          disabled={!canConfirm || isConfirming}
          className="w-full"
          size="lg"
          style={{ backgroundColor: canConfirm ? '#5FA37C' : undefined }}
        >
          {isConfirming ? (
            '처리중...'
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              총회 준비 확정
            </span>
          )}
        </Button>
      </section>
    </div>
  );
}
