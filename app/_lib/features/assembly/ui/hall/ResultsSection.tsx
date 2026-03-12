'use client';

import React from 'react';
import { usePublicAssemblyResults } from '@/app/_lib/features/assembly/api/useResultPublicationHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart2, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import type { PublicAgendaResult, PublicOptionResult } from '@/app/_lib/shared/type/assembly.types';

export interface ResultsSectionProps {
  assemblyId: string;
}

/** 결과 공개 대상 총회 상태 */
const RESULTS_VISIBLE_STATUSES = ['VOTING_CLOSED', 'CLOSED', 'ARCHIVED'];

/**
 * 투표 결과 열람 섹션 (조합원용)
 * 비밀투표 원칙: 개별 투표 내용은 절대 미표시
 */
export default function ResultsSection({ assemblyId }: ResultsSectionProps) {
  const { assembly } = useVoteStore();
  const canShowResults = RESULTS_VISIBLE_STATUSES.includes(assembly?.status || '');

  const { data: publication, isLoading } = usePublicAssemblyResults(
    canShowResults ? assemblyId : undefined,
  );

  // 총회 상태가 결과 공개 대상이 아니면 렌더링 안 함
  if (!canShowResults) return null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  // 결과 미공개
  if (!publication) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
        <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-gray-500">투표 결과가 아직 공개되지 않았습니다</p>
        <p className="text-xs text-gray-400 mt-1">관리자가 결과를 공개하면 이곳에서 확인할 수 있습니다</p>
      </div>
    );
  }

  const resultJson = publication.result_json as {
    assembly_title: string;
    published_at: string;
    agendas: PublicAgendaResult[];
  };

  return (
    <div className="space-y-4">
      {/* 공개 시각 안내 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          결과 공개: {new Date(resultJson.published_at).toLocaleString('ko-KR')}
        </p>
      </div>

      {/* 안건별 결과 카드 */}
      {resultJson.agendas.length === 0 ? (
        <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">집계된 안건이 없습니다</p>
        </div>
      ) : (
        resultJson.agendas.map((agenda) => (
          <AgendaResultCard key={agenda.agenda_id} agenda={agenda} />
        ))
      )}

      {/* 해시 무결성 */}
      {publication.result_hash && (
        <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-400">결과 해시 (SHA-256)</p>
          <p className="text-xs font-mono text-gray-500 mt-0.5 break-all">{publication.result_hash}</p>
        </div>
      )}
    </div>
  );
}

/** 안건별 투표 결과 카드 */
function AgendaResultCard({ agenda }: { agenda: PublicAgendaResult }) {
  const maxVotes = Math.max(...agenda.options.map((o) => o.vote_count), 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-blue-600">제{agenda.seq_order}호</span>
          {agenda.is_passed ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" aria-hidden="true" />
              가결
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              부결
            </span>
          )}
        </div>
        <h3 className="font-medium text-gray-900">{agenda.title}</h3>
      </div>

      {/* 결과 바 차트 */}
      <div className="p-5 space-y-3">
        {agenda.options.map((option, idx) => (
          <OptionBar
            key={idx}
            option={option}
            totalVotes={agenda.total_votes}
            maxVotes={maxVotes}
          />
        ))}

        {/* 합계 */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">총 투표</span>
          <span className="font-semibold text-gray-900">{agenda.total_votes}표</span>
        </div>
      </div>
    </div>
  );
}

/** 선택지별 가로 바 */
function OptionBar({
  option,
  totalVotes,
  maxVotes,
}: {
  option: PublicOptionResult;
  totalVotes: number;
  maxVotes: number;
}) {
  const pct = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
  const barWidth = maxVotes > 0 ? (option.vote_count / maxVotes) * 100 : 0;

  // 선택지 유형에 따른 색상
  const barColor =
    option.option_type === 'FOR'
      ? 'bg-blue-500'
      : option.option_type === 'AGAINST'
        ? 'bg-red-400'
        : 'bg-gray-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{option.label}</span>
        <span className="text-sm text-gray-600">
          {option.vote_count}표 ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
