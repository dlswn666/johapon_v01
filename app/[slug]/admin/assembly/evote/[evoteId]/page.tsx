'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useEvoteDashboard } from '@/app/_lib/features/evote/api/useEvoteDashboard';
import { ASSEMBLY_STATUS_LABELS } from '@/app/_lib/shared/type/assembly.types';
import { EVOTE_STATUS_BADGE } from '../_components/evoteConstants';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Bell, BarChart2 } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import StatusTransitionBar from '../_components/StatusTransitionBar';
import EvoteSummaryCards from '../_components/EvoteSummaryCards';
import ParticipationByMethod from '../_components/ParticipationByMethod';
import AgendaList from '../_components/AgendaList';
import type { EvoteStatus } from '@/app/_lib/features/evote/types/evote.types';

export default function EvoteDashboardPage({ params }: { params: Promise<{ evoteId: string }> }) {
  const { evoteId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading } = useEvoteDashboard(evoteId);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading || isLoading) {
    return (
      <div className="space-y-3">
        {/* 헤더: 뒤로가기 + 투표명 + 상태 배지 */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-16 rounded-full" style={{ animationDelay: '50ms' }} />
            </div>
            <Skeleton className="h-4 w-64" style={{ animationDelay: '80ms' }} />
          </div>
        </div>

        {/* 상태 전환 바 */}
        <Skeleton className="h-14 w-full rounded-lg" style={{ animationDelay: '120ms' }} />

        {/* 요약 카드 4개 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
              <Skeleton className="h-4 w-20" style={{ animationDelay: `${150 + i * 50}ms` }} />
              <Skeleton className="h-8 w-16" style={{ animationDelay: `${170 + i * 50}ms` }} />
              <Skeleton className="h-3 w-24" style={{ animationDelay: `${190 + i * 50}ms` }} />
            </div>
          ))}
        </div>

        {/* 참여 방식별 현황 */}
        <Skeleton className="h-32 w-full rounded-lg" style={{ animationDelay: '400ms' }} />

        {/* 안건 현황 */}
        <Skeleton className="h-40 w-full rounded-lg" style={{ animationDelay: '450ms' }} />

        {/* 관리 메뉴 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
              <Skeleton className="w-10 h-10 rounded-lg" style={{ animationDelay: `${500 + i * 60}ms` }} />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" style={{ animationDelay: `${520 + i * 60}ms` }} />
                <Skeleton className="h-3 w-28" style={{ animationDelay: `${540 + i * 60}ms` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  if (!data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl font-semibold text-gray-700">전자투표를 찾을 수 없습니다</p>
          <Button variant="outline" onClick={() => router.push(getUnionPath(slug, '/admin/assembly/evote'))}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const { assembly, agendas, summary } = data;
  const status = assembly.status as EvoteStatus;
  // EvoteStatus와 AssemblyStatus 매핑 — evoteConstants의 배지는 EvoteStatus 키만 가짐
  const badgeKey = status in EVOTE_STATUS_BADGE ? status : undefined;
  const badge = badgeKey ? EVOTE_STATUS_BADGE[badgeKey] : { bg: 'bg-gray-100', text: 'text-gray-600' };

  return (
    <div className="space-y-3">
      {/* 헤더: 뒤로가기 + 투표명 + 상태 배지 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, '/admin/assembly/evote'))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{assembly.title}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
              {ASSEMBLY_STATUS_LABELS[assembly.status] || assembly.status}
            </span>
          </div>
          {assembly.description && (
            <p className="text-sm text-gray-500 mt-1">{assembly.description}</p>
          )}
        </div>
      </div>

      {/* 상태 전환 바 */}
      <StatusTransitionBar evoteId={evoteId} currentStatus={assembly.status} />

      {/* 요약 카드 4개 */}
      <EvoteSummaryCards assembly={assembly} summary={summary} />

      {/* 참여 방식별 현황 */}
      <ParticipationByMethod participation={summary.participation} />

      {/* 안건 현황 */}
      <AgendaList agendas={agendas} />

      {/* 관리 메뉴 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/evote/${evoteId}/voters`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">투표 대상자</p>
            <p className="text-xs text-gray-500">대상자 조회/관리</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/evote/${evoteId}/notifications`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">알림 관리</p>
            <p className="text-xs text-gray-500">발송 이력/추적</p>
          </div>
        </button>

        <button
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/evote/${evoteId}/results`))}
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">결과/보고서</p>
            <p className="text-xs text-gray-500">집계 결과 및 보고서</p>
          </div>
        </button>
      </div>
    </div>
  );
}
