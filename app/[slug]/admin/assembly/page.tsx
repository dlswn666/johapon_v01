'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssemblies } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { ASSEMBLY_STATUS_LABELS, ASSEMBLY_TYPE_LABELS, Assembly } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar, Users, ChevronRight } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';

// 상태별 배지 색상
const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  NOTICE_SENT: 'bg-blue-100 text-blue-700',
  CONVENED: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-green-100 text-green-700',
  VOTING: 'bg-yellow-100 text-yellow-700',
  VOTING_CLOSED: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-gray-200 text-gray-500',
  CANCELLED: 'bg-red-200 text-red-600',
};

function AssemblyCard({ assembly, onClick }: { assembly: Assembly & { creator?: { name: string } | null; agenda_items?: { count: number }[] }; onClick: () => void }) {
  const scheduledDate = new Date(assembly.scheduled_at);
  const agendaCount = assembly.agenda_items?.[0]?.count ?? 0;

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{assembly.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {ASSEMBLY_TYPE_LABELS[assembly.assembly_type] || assembly.assembly_type}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-3 ${STATUS_COLORS[assembly.status] || 'bg-gray-100 text-gray-700'}`}>
          {ASSEMBLY_STATUS_LABELS[assembly.status] || assembly.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{scheduledDate.toLocaleDateString('ko-KR')} {scheduledDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>안건 {agendaCount}건</span>
        </div>
      </div>

      {assembly.description && (
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{assembly.description}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          작성자: {assembly.creator?.name || '-'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

export default function AssemblyListPage() {
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assemblies, isLoading: isAssembliesLoading } = useAssemblies();

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="space-y-3">
        {/* 헤더: 제목 + 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" style={{ animationDelay: '100ms' }} />
          </div>
          <Skeleton className="h-10 w-28 rounded-md" style={{ animationDelay: '200ms' }} />
        </div>
        {/* 카드 리스트 */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg p-5 space-y-3" style={{ animationDelay: `${300 + i * 150}ms` }}>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-xl font-semibold text-gray-700">접근 권한이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-gray-900">총회 관리</h1>
          <p className="text-sm text-gray-400">온라인/오프라인 총회를 생성하고 관리합니다</p>
        </div>
        <Button
          onClick={() => router.push(getUnionPath(slug, '/admin/assembly/create'))}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          총회 생성
        </Button>
      </div>

      {isAssembliesLoading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/5" style={{ animationDelay: `${i * 150}ms` }} />
                  <Skeleton className="h-4 w-24" style={{ animationDelay: `${i * 150 + 50}ms` }} />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" style={{ animationDelay: `${i * 150 + 100}ms` }} />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : assemblies && assemblies.length > 0 ? (
        <div className="grid gap-4">
          {assemblies.map((assembly) => (
            <AssemblyCard
              key={assembly.id}
              assembly={assembly}
              onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assembly.id}`))}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">등록된 총회가 없습니다</p>
          <p className="text-sm text-gray-500 mt-1">새 총회를 생성하여 시작하세요</p>
          <Button
            onClick={() => router.push(getUnionPath(slug, '/admin/assembly/create'))}
            className="mt-4 gap-2"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            첫 총회 생성하기
          </Button>
        </div>
      )}
    </div>
  );
}
