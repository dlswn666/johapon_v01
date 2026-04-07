'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useDocuments } from '@/app/_lib/features/assembly/api/useDocumentHook';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import MemberDocumentList from '@/app/_lib/features/assembly/ui/MemberDocumentList';
import type { PersonalizedDocumentSummary } from '@/app/_lib/shared/type/assembly.types';

export default function MemberDocumentsPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isSlugLoading } = useSlug();
  const { data: assembly, isLoading: assemblyLoading } = useAssembly(assemblyId);
  const { data: documents, isLoading: docsLoading } = useDocuments(assemblyId);

  const isLoading = isSlugLoading || assemblyLoading || docsLoading;

  // 공개된 문서만 (멤버 RLS에 의해 이미 필터되지만 클라이언트에서도 확인)
  const memberDocs: PersonalizedDocumentSummary[] = (documents || [])
    .filter((d) => ['APPROVED', 'SIGNED_PARTIAL', 'SIGNED_COMPLETE', 'SEALED'].includes(d.status))
    .map((d) => ({
      documentId: d.id,
      instanceId: d.id,
      documentType: d.document_type,
      version: d.version,
      status: d.status === 'SEALED' ? 'SEALED' : 'PENDING' as 'PENDING' | 'VIEWED' | 'SIGNED' | 'SEALED',
      hasSigned: false,
      requiresSignature: d.signature_threshold > 0,
      signatureThreshold: d.signature_threshold,
      createdAt: d.created_at,
      viewedAt: null,
      signedAt: null,
      pdfAvailable: !!d.pdf_storage_path,
    }));

  const handleDocumentClick = (docId: string) => {
    router.push(getUnionPath(slug, `/assembly/${assemblyId}/documents/${docId}`));
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* 헤더: 뒤로가기 + 제목 */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-36" style={{ animationDelay: '50ms' }} />
          </div>
        </div>

        {/* 문서 목록 카드 */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
              <Skeleton className="w-10 h-10 rounded-lg" style={{ animationDelay: `${100 + i * 70}ms` }} />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" style={{ animationDelay: `${120 + i * 70}ms` }} />
                <Skeleton className="h-3 w-20" style={{ animationDelay: `${140 + i * 70}ms` }} />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" style={{ animationDelay: `${160 + i * 70}ms` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/assembly/${assemblyId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">내 문서</h1>
          <p className="text-sm text-gray-500">{assembly?.title}</p>
        </div>
      </div>

      <MemberDocumentList
        documents={memberDocs}
        onDocumentClick={handleDocumentClick}
        isLoading={false}
      />
    </div>
  );
}
