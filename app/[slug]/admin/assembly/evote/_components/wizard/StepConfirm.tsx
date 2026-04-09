'use client';

import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import {
  ASSEMBLY_TYPE_LABELS,
  VOTE_TYPE_LABELS,
} from '../evoteConstants';
import { getLegalChecks } from '@/app/_lib/features/evote/utils/evoteValidation';
import type { EvoteCreateForm } from '@/app/_lib/features/evote/types/evote.types';

interface StepConfirmProps {
  formData: EvoteCreateForm;
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.toLocaleDateString('ko-KR')} ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function StepConfirm({ formData }: StepConfirmProps) {
  const { checks, allPassed } = getLegalChecks(formData);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">최종 확인</h2>
        <p className="text-sm text-gray-500 mt-1">생성 전 내용을 검토합니다</p>
      </div>

      {/* 기본 정보 요약 */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">기본 정보</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">총회 유형:</span>{' '}
            <span className="font-medium">{ASSEMBLY_TYPE_LABELS[formData.assemblyType]}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">총회명:</span>{' '}
            <span className="font-medium">{formData.title || '-'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">총회 일시:</span>{' '}
            <span className="font-medium">{formatDate(formData.scheduledAt)}</span>
          </div>
        </div>
      </div>

      {/* 안건 요약 */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">
          안건 ({formData.agendas.length}건)
        </h3>
        {formData.agendas.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 안건이 없습니다</p>
        ) : (
          <ul className="space-y-2">
            {formData.agendas.map((agenda, i) => (
              <li key={agenda.id} className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 font-mono w-6 text-right shrink-0">{i + 1}.</span>
                <div>
                  <p className="text-gray-900">{agenda.title || '(제목 없음)'}</p>
                  <p className="text-xs text-gray-500">
                    {VOTE_TYPE_LABELS[agenda.voteType]}
                    {agenda.voteType === 'ELECT' && ` / 후보 ${agenda.candidates.length}명`}
                    {agenda.voteType === 'SELECT' && ` / 업체 ${agenda.companies.length}개`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 투표 대상/일정 요약 */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">투표 대상/일정</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">대상 인원:</span>{' '}
            <span className="font-medium">{formData.selectedVoterIds.length}명</span>
          </div>
          <div>
            <span className="text-gray-500">게시 방식:</span>{' '}
            <span className="font-medium">
              {formData.publishMode === 'IMMEDIATE' ? '즉시 게시' : '예약 게시'}
            </span>
          </div>
          {formData.preVoteStartAt && (
            <div className="col-span-2">
              <span className="text-gray-500">사전투표:</span>{' '}
              <span className="font-medium">
                {formatDate(formData.preVoteStartAt)} ~ {formatDate(formData.preVoteEndAt)}
              </span>
            </div>
          )}
          {formData.finalDeadline && (
            <div className="col-span-2">
              <span className="text-gray-500">최종 마감:</span>{' '}
              <span className="font-medium">{formatDate(formData.finalDeadline)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 법정 요건 체크 */}
      <div className={`rounded-lg p-4 space-y-3 ${allPassed ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <h3 className="text-sm font-semibold text-gray-800">법정 요건 체크</h3>
        <ul className="space-y-1.5">
          {checks.map((check, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              {check.passed ? (
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className={check.passed ? 'text-gray-700' : 'text-red-600'}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
        {!allPassed && (
          <p className="text-xs text-amber-600 mt-2">
            모든 요건을 충족해야 전자투표를 생성할 수 있습니다
          </p>
        )}
      </div>
    </div>
  );
}
