'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type {
  ComplianceCheckResult,
  ComplianceEvaluation,
} from '@/app/_lib/shared/type/assembly.types';
import {
  COMPLIANCE_SEVERITY_COLORS,
  COMPLIANCE_SEVERITY_ICONS,
  COMPLIANCE_LAYER_LABELS,
  COMPLIANCE_STATUS_LABELS,
} from '@/app/_lib/shared/type/assembly.types';

interface CompliancePanelProps {
  open: boolean;
  onClose: () => void;
  checkResult: ComplianceCheckResult | undefined;
  onWaive?: (evaluationId: string, reason: string) => void;
  isWaiving?: boolean;
}

/** 컴플라이언스 상세 패널 (Sheet/Drawer) */
export default function CompliancePanel({
  open,
  onClose,
  checkResult,
  onWaive,
  isWaiving,
}: CompliancePanelProps) {
  const [waiverTarget, setWaiverTarget] = useState<string | null>(null);
  const [waiverReason, setWaiverReason] = useState('');

  const handleWaive = () => {
    if (!waiverTarget || !waiverReason.trim()) return;
    onWaive?.(waiverTarget, waiverReason.trim());
    setWaiverTarget(null);
    setWaiverReason('');
  };

  const grouped = groupBySeverity(checkResult?.evaluations || []);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>컴플라이언스 평가 상세</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* 요약 */}
          {checkResult && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-lg font-bold text-gray-900">{checkResult.summary.total}</p>
                <p className="text-xs text-gray-500">전체</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-lg font-bold text-green-700">{checkResult.summary.pass}</p>
                <p className="text-xs text-gray-500">통과</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-lg font-bold text-red-700">{checkResult.summary.fail}</p>
                <p className="text-xs text-gray-500">실패</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <p className="text-lg font-bold text-amber-700">{checkResult.summary.waived}</p>
                <p className="text-xs text-gray-500">면제</p>
              </div>
            </div>
          )}

          {/* BLOCK */}
          {grouped.BLOCK.length > 0 && (
            <RuleGroup
              title="차단 (BLOCK)"
              evaluations={grouped.BLOCK}
              onWaiveClick={(id) => setWaiverTarget(id)}
              waiverTarget={waiverTarget}
            />
          )}

          {/* WARNING */}
          {grouped.WARNING.length > 0 && (
            <RuleGroup
              title="경고 (WARNING)"
              evaluations={grouped.WARNING}
              onWaiveClick={(id) => setWaiverTarget(id)}
              waiverTarget={waiverTarget}
            />
          )}

          {/* INFO */}
          {grouped.INFO.length > 0 && (
            <RuleGroup
              title="정보 (INFO)"
              evaluations={grouped.INFO}
              onWaiveClick={(id) => setWaiverTarget(id)}
              waiverTarget={waiverTarget}
            />
          )}

          {/* 면제 입력 */}
          {waiverTarget && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-amber-800">규칙 면제 사유</h4>
              <Textarea
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="면제 사유를 입력하세요 (필수)"
                className="text-sm"
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setWaiverTarget(null);
                    setWaiverReason('');
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleWaive}
                  disabled={!waiverReason.trim() || isWaiving}
                >
                  {isWaiving ? '처리중...' : '면제 적용'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RuleGroup({
  title,
  evaluations,
  onWaiveClick,
  waiverTarget,
}: {
  title: string;
  evaluations: ComplianceEvaluation[];
  onWaiveClick: (id: string) => void;
  waiverTarget: string | null;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
      <ul className="space-y-2">
        {evaluations.map((ev) => {
          const isStatutory = ev.rule_layer === 'STATUTORY';
          const canWaive =
            !isStatutory && ev.status === 'FAIL' && ev.id !== waiverTarget;
          return (
            <li
              key={ev.id}
              className={`rounded-lg border p-3 ${COMPLIANCE_SEVERITY_COLORS[ev.severity]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-sm mt-0.5">
                    {COMPLIANCE_SEVERITY_ICONS[ev.severity]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      [{ev.rule_code}] {ev.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                      <span>{COMPLIANCE_LAYER_LABELS[ev.rule_layer]}</span>
                      <span>|</span>
                      <span>{COMPLIANCE_STATUS_LABELS[ev.status]}</span>
                      {ev.legal_basis && (
                        <>
                          <span>|</span>
                          <span>{ev.legal_basis}</span>
                        </>
                      )}
                    </div>
                    {ev.remediation && (
                      <p className="text-xs mt-1 opacity-70">{ev.remediation}</p>
                    )}
                    {ev.waiver_reason && (
                      <p className="text-xs mt-1 italic">
                        면제 사유: {ev.waiver_reason}
                      </p>
                    )}
                  </div>
                </div>
                {canWaive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex-shrink-0"
                    onClick={() => onWaiveClick(ev.id)}
                  >
                    면제
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function groupBySeverity(evaluations: ComplianceEvaluation[]) {
  return {
    BLOCK: evaluations.filter((e) => e.severity === 'BLOCK'),
    WARNING: evaluations.filter((e) => e.severity === 'WARNING'),
    INFO: evaluations.filter((e) => e.severity === 'INFO'),
  };
}
