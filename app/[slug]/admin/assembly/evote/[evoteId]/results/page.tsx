'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useEvote } from '@/app/_lib/features/evote/api/useEvoteList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle2, XCircle, Minus, Trophy, Inbox } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import type { VoteType } from '@/app/_lib/features/evote/types/evote.types';

const VOTE_TYPE_LABELS: Record<VoteType, string> = {
  APPROVE: '찬반투표',
  ELECT: '선출투표',
  SELECT: '시공사 선정',
};
import type { VotingMethod } from '@/app/_lib/shared/type/assembly.types';

// 안건별 집계 결과
interface AgendaTally {
  agenda_id: string;
  title: string;
  vote_type: VoteType;
  quorum_met: boolean;
  // 찬반투표
  approve_count?: number;
  reject_count?: number;
  abstain_count?: number;
  is_passed?: boolean;
  // 선출/업체 선정
  candidates?: CandidateTally[];
  // 투표 방식별 분리 집계
  by_method?: MethodTally[];
}

interface CandidateTally {
  name: string;
  vote_count: number;
  is_elected: boolean;
}

interface MethodTally {
  method: VotingMethod;
  count: number;
}

// 투표 방식 레이블
const VOTING_METHOD_LABELS: Record<string, string> = {
  ELECTRONIC: '전자투표',
  ONSITE: '현장투표',
  WRITTEN: '서면투표',
  PROXY: '대리투표',
};

export default function EvoteResultsPage({
  params,
}: {
  params: Promise<{ evoteId: string }>;
}) {
  const { evoteId } = use(params);
  const router = useRouter();
  const { slug, union, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: evote, isLoading: isEvoteLoading } = useEvote(evoteId);

  const { data: results, isLoading: isResultsLoading } = useQuery({
    queryKey: ['evote-results', union?.id, evoteId],
    queryFn: async () => {
      const res = await fetch(`/api/evotes/${evoteId}/results`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '개표 결과 조회 실패');
      }
      const { data } = await res.json();
      return data as AgendaTally[];
    },
    enabled: !!evoteId && !!union?.id,
  });

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading || isEvoteLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin || !evote) return null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/evote/${evoteId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">개표 결과</h1>
          <p className="text-sm text-gray-500">{evote.title}</p>
        </div>
      </div>

      {/* 결과 카드 목록 */}
      {isResultsLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : !results || results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 bg-white border rounded-lg">
          <Inbox className="w-12 h-12 mb-4 text-gray-300" />
          <p className="text-sm">개표 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((agenda) => (
            <AgendaResultCard key={agenda.agenda_id} agenda={agenda} />
          ))}
        </div>
      )}
    </div>
  );
}

// 안건별 결과 카드
function AgendaResultCard({ agenda }: { agenda: AgendaTally }) {
  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      {/* 안건 제목 + 투표 유형 */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{agenda.title}</h3>
        <div className="flex items-center gap-2">
          <Badge className="bg-slate-100 text-slate-600 border-transparent">
            {VOTE_TYPE_LABELS[agenda.vote_type]}
          </Badge>
          {agenda.quorum_met ? (
            <Badge className="bg-green-100 text-green-700 border-transparent">
              <CheckCircle2 className="w-3 h-3" />
              의결 충족
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-600 border-transparent">
              <XCircle className="w-3 h-3" />
              의결 미충족
            </Badge>
          )}
        </div>
      </div>

      {/* 투표 유형별 결과 */}
      {agenda.vote_type === 'APPROVE' && <ApproveResult agenda={agenda} />}
      {agenda.vote_type === 'ELECT' && <CandidateResult agenda={agenda} label="당선" />}
      {agenda.vote_type === 'SELECT' && <CandidateResult agenda={agenda} label="선정" />}

      {/* 투표 방식별 분리 집계 */}
      {agenda.by_method && agenda.by_method.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">투표 방식별 집계</p>
          <div className="flex gap-4">
            {agenda.by_method.map((m) => (
              <div key={m.method} className="text-sm text-gray-600">
                <span className="text-gray-400">{VOTING_METHOD_LABELS[m.method] ?? m.method}</span>{' '}
                <span className="font-medium">{m.count}표</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 찬반투표 결과
function ApproveResult({ agenda }: { agenda: AgendaTally }) {
  const total = (agenda.approve_count ?? 0) + (agenda.reject_count ?? 0) + (agenda.abstain_count ?? 0);

  return (
    <div className="space-y-3">
      {/* 결과 막대 */}
      <div className="flex items-center gap-4">
        <ResultBar label="찬성" count={agenda.approve_count ?? 0} total={total} color="bg-green-500" />
        <ResultBar label="반대" count={agenda.reject_count ?? 0} total={total} color="bg-red-500" />
        <ResultBar label="기권" count={agenda.abstain_count ?? 0} total={total} color="bg-gray-400" />
      </div>

      {/* 의결 결과 */}
      <div className="flex items-center gap-2">
        {agenda.is_passed ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">가결</span>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">부결</span>
          </>
        )}
      </div>
    </div>
  );
}

// 결과 막대 그래프
function ResultBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {count}표 ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// 선출/업체 선정 결과
function CandidateResult({ agenda, label }: { agenda: AgendaTally; label: string }) {
  if (!agenda.candidates || agenda.candidates.length === 0) {
    return <p className="text-sm text-gray-500">후보자 데이터가 없습니다.</p>;
  }

  const maxVote = Math.max(...agenda.candidates.map((c) => c.vote_count));

  return (
    <div className="space-y-2">
      {agenda.candidates.map((candidate, idx) => (
        <div
          key={idx}
          className={`flex items-center justify-between px-4 py-3 rounded-lg ${
            candidate.is_elected ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            {candidate.is_elected && <Trophy className="w-4 h-4 text-green-600" />}
            <span className="text-sm font-medium text-gray-900">{candidate.name}</span>
            {candidate.is_elected && (
              <Badge className="bg-green-100 text-green-700 border-transparent">{label}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{candidate.vote_count}표</span>
            {/* 간이 바 */}
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${candidate.is_elected ? 'bg-green-500' : 'bg-gray-400'}`}
                style={{ width: maxVote > 0 ? `${(candidate.vote_count / maxVote) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
