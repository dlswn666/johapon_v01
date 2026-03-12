'use client';

import React, { useState } from 'react';
import { useComplianceCheck, useWaiveComplianceRule } from '@/app/_lib/features/assembly/api/useComplianceHook';
import ComplianceBanner from '@/app/_lib/features/assembly/ui/ComplianceBanner';
import CompliancePanel from '@/app/_lib/features/assembly/ui/CompliancePanel';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { ComplianceCheckpoint } from '@/app/_lib/shared/type/assembly.types';

interface WizardStep6Props {
  assemblyId: string;
}

const CHECKPOINTS: { checkpoint: ComplianceCheckpoint; label: string }[] = [
  { checkpoint: 'BEFORE_NOTICE', label: '소집공고 전' },
  { checkpoint: 'BEFORE_CONVENE', label: '소집완료 전' },
  { checkpoint: 'BEFORE_START', label: '개회 전' },
  { checkpoint: 'BEFORE_VOTING', label: '투표 전' },
  { checkpoint: 'BEFORE_PUBLISH', label: '결과 공표 전' },
  { checkpoint: 'BEFORE_SEAL', label: '봉인 전' },
  { checkpoint: 'BEFORE_ARCHIVE', label: '보관 전' },
];

export default function WizardStep6Compliance({ assemblyId }: WizardStep6Props) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<ComplianceCheckpoint>('BEFORE_NOTICE');
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: checkResult, isLoading, refetch } = useComplianceCheck(assemblyId, selectedCheckpoint);
  const waiveMutation = useWaiveComplianceRule(assemblyId);

  const handleWaive = (evaluationId: string, reason: string) => {
    waiveMutation.mutate({ evaluationId, waiverReason: reason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">컴플라이언스 검증</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          재평가
        </Button>
      </div>

      {/* 체크포인트 선택 */}
      <div>
        <p className="text-sm text-gray-500 mb-2">검증 시점 선택</p>
        <div className="flex flex-wrap gap-2">
          {CHECKPOINTS.map((cp) => (
            <button
              key={cp.checkpoint}
              onClick={() => setSelectedCheckpoint(cp.checkpoint)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCheckpoint === cp.checkpoint
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cp.label}
            </button>
          ))}
        </div>
      </div>

      {/* 컴플라이언스 배너 */}
      <ComplianceBanner
        checkResult={checkResult}
        isLoading={isLoading}
        onOpenDetail={() => setPanelOpen(true)}
      />

      {/* 규칙 요약 카드 */}
      {checkResult && !isLoading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">
              {checkResult.evaluations.filter((e) => e.severity === 'BLOCK' && e.status === 'FAIL').length}
            </p>
            <p className="text-xs text-red-600">차단</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">
              {checkResult.evaluations.filter((e) => e.severity === 'WARNING' && e.status === 'FAIL').length}
            </p>
            <p className="text-xs text-amber-600">경고</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{checkResult.summary.pass}</p>
            <p className="text-xs text-green-600">통과</p>
          </div>
        </div>
      )}

      {/* 상세 패널 */}
      <CompliancePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        checkResult={checkResult}
        onWaive={handleWaive}
        isWaiving={waiveMutation.isPending}
      />
    </div>
  );
}
