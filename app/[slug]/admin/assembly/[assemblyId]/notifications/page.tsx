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
import NotificationManager from '@/app/_lib/features/assembly/ui/admin/NotificationManager';

export default function NotificationsPage({ params }: { params: Promise<{ assemblyId: string }> }) {
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
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-24" style={{ animationDelay: '50ms' }} />
          </div>
        </div>
        {/* 빠른 발송 버튼 */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-md" style={{ animationDelay: `${100 + i * 40}ms` }} />
          ))}
        </div>
        {/* 타임라인 */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4 bg-white rounded-lg border border-gray-200">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" style={{ animationDelay: `${260 + i * 70}ms` }} />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" style={{ animationDelay: `${280 + i * 70}ms` }} />
                <Skeleton className="h-3 w-48" style={{ animationDelay: `${300 + i * 70}ms` }} />
                <Skeleton className="h-3 w-20" style={{ animationDelay: `${320 + i * 70}ms` }} />
              </div>
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
          <h1 className="text-xl font-bold text-gray-900">알림 관리</h1>
          <p className="text-sm text-gray-500">{assembly.title}</p>
        </div>
      </div>

      <NotificationManager assemblyId={assemblyId} />
    </div>
  );
}
