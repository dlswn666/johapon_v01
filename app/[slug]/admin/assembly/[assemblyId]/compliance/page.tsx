'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import WizardStep6Compliance from '@/app/_lib/features/assembly/ui/wizard/WizardStep6Compliance';

export default function CompliancePage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly, isLoading } = useAssembly(assemblyId);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  if (isUnionLoading || isAuthLoading || isLoading) {
    return (
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-24" style={{ animationDelay: '50ms' }} />
          </div>
        </div>
        {/* 컴플라이언스 검증 헤더 + 재평가 버튼 */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" style={{ animationDelay: '100ms' }} />
          <Skeleton className="h-8 w-20 rounded-md" style={{ animationDelay: '130ms' }} />
        </div>
        {/* 체크포인트 선택 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" style={{ animationDelay: '160ms' }} />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-full" style={{ animationDelay: `${190 + i * 30}ms` }} />
            ))}
          </div>
        </div>
        {/* 배너 + 룰 목록 */}
        <Skeleton className="h-12 w-full rounded-lg" style={{ animationDelay: '400ms' }} />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
              <Skeleton className="h-5 w-5 rounded-full" style={{ animationDelay: `${450 + i * 50}ms` }} />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-48" style={{ animationDelay: `${470 + i * 50}ms` }} />
                <Skeleton className="h-3 w-32" style={{ animationDelay: `${490 + i * 50}ms` }} />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" style={{ animationDelay: `${510 + i * 50}ms` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin || !assembly) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">컴플라이언스 검증</h1>
          <p className="text-sm text-gray-500">{assembly.title}</p>
        </div>
      </div>

      <WizardStep6Compliance assemblyId={assemblyId} />
    </div>
  );
}
