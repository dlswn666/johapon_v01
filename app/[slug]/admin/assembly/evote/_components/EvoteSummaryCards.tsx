'use client';

import { Calendar, Users } from 'lucide-react';
import type { Assembly } from '@/app/_lib/shared/type/assembly.types';
import type { EvoteDashboardSummary } from '@/app/_lib/features/evote/api/useEvoteDashboard';
import QuorumProgressBar from './QuorumProgressBar';

interface EvoteSummaryCardsProps {
  assembly: Assembly;
  summary: EvoteDashboardSummary;
}

function getDDay(endAt: string | null): string {
  if (!endAt) return '-';
  const now = new Date();
  const end = new Date(endAt);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-DAY';
  return `D+${Math.abs(diff)}`;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EvoteSummaryCards({ assembly, summary }: EvoteSummaryCardsProps) {
  const dDay = getDDay(assembly.final_deadline || assembly.pre_vote_end_date);

  // 정족수 기준 결정 (quorum_type 기반)
  const directRequiredPct = assembly.quorum_type === 'GENERAL' ? 10
    : assembly.quorum_type === 'SPECIAL' || assembly.quorum_type === 'SPECIAL_TWO_THIRDS' ? 20
    : 50; // CONTRACTOR

  const approvalRequiredPct = assembly.quorum_type === 'SPECIAL_TWO_THIRDS' ? 66.7 : 50;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 투표 기간 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">투표 기간</span>
        </div>
        <p className="text-sm text-gray-600">
          {formatDateTime(assembly.pre_vote_start_date || assembly.scheduled_at)}
        </p>
        <p className="text-sm text-gray-600">
          ~ {formatDateTime(assembly.final_deadline || assembly.pre_vote_end_date)}
        </p>
        <p className="mt-2 text-lg font-bold text-blue-700">{dDay}</p>
      </div>

      {/* 대상 인원 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">대상 인원</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{summary.eligible_count}명</p>
        <p className="text-xs text-gray-500 mt-1">
          의결권 합계: {summary.total_weight}
        </p>
      </div>

      {/* 직접출석 정족수 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">직접출석 정족수</p>
        <QuorumProgressBar
          label={`기준 ${directRequiredPct}%`}
          currentPct={summary.quorum.direct_attendance_pct}
          requiredPct={directRequiredPct}
        />
      </div>

      {/* 의결 정족수 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">의결 정족수</p>
        <QuorumProgressBar
          label={`기준 ${approvalRequiredPct}%`}
          currentPct={summary.quorum.approval_pct}
          requiredPct={approvalRequiredPct}
        />
      </div>
    </div>
  );
}
