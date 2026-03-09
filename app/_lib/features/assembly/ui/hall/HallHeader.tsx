'use client';

import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import { ASSEMBLY_STATUS_LABELS } from '@/app/_lib/shared/type/assembly.types';
import AccessibilityPanel from './AccessibilityPanel';

/**
 * 총회장 헤더
 * 총회명, 상태 배지, 조합원명, 의결권 수, 법적 근거 표시
 */
export default function HallHeader() {
  const { assembly, snapshot } = useVoteStore();

  if (!assembly || !snapshot) return null;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-gray-900 truncate">{assembly.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
              {ASSEMBLY_STATUS_LABELS[assembly.status]}
            </span>
            <span>·</span>
            <span className="truncate max-w-[120px]">{snapshot.member_name}님</span>
            <span>·</span>
            <span>의결권 {snapshot.voting_weight}</span>
          </div>
          {assembly.legal_basis && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{assembly.legal_basis}</p>
          )}
        </div>
        <AccessibilityPanel />
      </div>
    </div>
  );
}
