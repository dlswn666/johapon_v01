'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import EvoteWizard from '../_components/wizard/EvoteWizard';

export default function CreateEvotePage() {
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading) {
    return (
      <div className="space-y-3">
        {/* 헤더: 뒤로가기 + 제목 */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-48" style={{ animationDelay: '50ms' }} />
          </div>
        </div>

        {/* 위저드 스텝 인디케이터 */}
        <div className="flex items-center gap-2 py-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" style={{ animationDelay: `${100 + i * 40}ms` }} />
              <Skeleton className="h-4 w-16" style={{ animationDelay: `${120 + i * 40}ms` }} />
              {i < 3 && <Skeleton className="h-0.5 w-8" style={{ animationDelay: `${140 + i * 40}ms` }} />}
            </div>
          ))}
        </div>

        {/* 위저드 폼 영역 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <Skeleton className="h-6 w-32" style={{ animationDelay: '300ms' }} />
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" style={{ animationDelay: '330ms' }} />
            <Skeleton className="h-10 w-full rounded-md" style={{ animationDelay: '350ms' }} />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" style={{ animationDelay: '380ms' }} />
            <Skeleton className="h-24 w-full rounded-md" style={{ animationDelay: '400ms' }} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Skeleton className="h-10 w-20 rounded-md" style={{ animationDelay: '440ms' }} />
            <Skeleton className="h-10 w-20 rounded-md" style={{ animationDelay: '460ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, '/admin/assembly/evote'))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">전자투표 생성</h1>
          <p className="text-sm text-gray-500">새로운 전자투표를 생성합니다</p>
        </div>
      </div>

      {/* 위저드 */}
      <EvoteWizard />
    </div>
  );
}
