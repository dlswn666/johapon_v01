'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useEvoteList } from '@/app/_lib/features/evote/api/useEvoteList';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Vote, AlertTriangle, RotateCcw } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import EvoteCard from './_components/EvoteCard';

export default function EvoteListPage() {
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: evotes, isLoading: isEvotesLoading, isError: isEvotesError, refetch: refetchEvotes } = useEvoteList();

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="w-full h-[400px] rounded-lg" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전자투표 관리</h1>
          <p className="mt-1 text-sm text-gray-500">전자투표를 생성하고 관리합니다</p>
        </div>
        <Button
          onClick={() => router.push(getUnionPath(slug, '/admin/assembly/evote/create'))}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          전자투표 생성
        </Button>
      </div>

      {isEvotesError ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">목록을 불러올 수 없습니다.</p>
          <p className="text-sm text-gray-500 mt-1">다시 시도해주세요.</p>
          <Button
            onClick={() => refetchEvotes()}
            className="mt-4 gap-2"
            variant="outline"
          >
            <RotateCcw className="w-4 h-4" />
            새로고침
          </Button>
        </div>
      ) : isEvotesLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[160px] rounded-lg" />
          ))}
        </div>
      ) : evotes && evotes.length > 0 ? (
        <div className="grid gap-4">
          {evotes.map((evote) => (
            <EvoteCard
              key={evote.id}
              evote={evote}
              onClick={() => router.push(getUnionPath(slug, `/admin/assembly/evote/${evote.id}`))}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">등록된 전자투표가 없습니다</p>
          <p className="text-sm text-gray-500 mt-1">새 전자투표를 생성하여 시작하세요</p>
          <Button
            onClick={() => router.push(getUnionPath(slug, '/admin/assembly/evote/create'))}
            className="mt-4 gap-2"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            첫 전자투표 생성하기
          </Button>
        </div>
      )}
    </div>
  );
}
