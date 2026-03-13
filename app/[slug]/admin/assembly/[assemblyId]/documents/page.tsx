'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import DocumentList from '@/app/_lib/features/assembly/ui/admin/DocumentList';
import type { DocumentStatus, OfficialDocument } from '@/app/_lib/shared/type/assembly.types';

const STATUS_FILTER_TABS: Array<{ value: DocumentStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'DRAFT', label: '초안' },
  { value: 'GENERATED', label: '생성됨' },
  { value: 'REVIEW', label: '검토중' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'SIGNED_PARTIAL', label: '서명 진행중' },
  { value: 'SIGNED_COMPLETE', label: '서명 완료' },
  { value: 'SEALED', label: '봉인됨' },
  { value: 'VOID', label: '무효' },
];

export default function DocumentsPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly, isLoading } = useAssembly(assemblyId);
  const [activeFilter, setActiveFilter] = useState<DocumentStatus | 'ALL'>('ALL');

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  const handleDocumentClick = (doc: OfficialDocument) => {
    router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/documents/${doc.id}`));
  };

  const handleCreate = () => {
    router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/documents/create`));
  };

  if (isUnionLoading || isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin || !assembly) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">공식 문서 관리</h1>
            <p className="text-sm text-gray-500">{assembly.title}</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          새 문서 생성
        </Button>
      </div>

      {/* 상태 필터 탭 */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 border-b border-gray-200 whitespace-nowrap">
          {STATUS_FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                activeFilter === tab.value
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DocumentList
        assemblyId={assemblyId}
        statusFilter={activeFilter}
        onDocumentClick={handleDocumentClick}
      />
    </div>
  );
}
