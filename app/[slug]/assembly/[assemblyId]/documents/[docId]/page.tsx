'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { usePersonalizedDocument } from '@/app/_lib/features/assembly/api/useDocumentHook';
import { useSignDocument } from '@/app/_lib/features/assembly/api/useSignatureHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle, Printer } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import DocumentViewer from '@/app/_lib/features/assembly/ui/DocumentViewer';
import SignatureModal from '@/app/_lib/features/assembly/ui/SignatureModal';
import { DOCUMENT_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';
import type { SignerRole } from '@/app/_lib/shared/type/assembly.types';

export default function MemberDocumentViewPage({
  params,
}: {
  params: Promise<{ assemblyId: string; docId: string }>;
}) {
  const { assemblyId, docId } = use(params);
  const router = useRouter();
  const { slug } = useSlug();
  const { user } = useAuth();
  const { data: instance, isLoading } = usePersonalizedDocument(assemblyId, docId);
  const signMutation = useSignDocument(assemblyId);

  const [confirmed, setConfirmed] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  const handleSignRequest = () => {
    setSignatureModalOpen(true);
  };

  const handleSignatureConfirm = (signatureDataUrl: string) => {
    if (!instance) return;
    signMutation.mutate(
      {
        documentId: docId,
        signerRole: (instance.signerRole || 'MEMBER') as SignerRole,
        signatureMethod: 'SIMPLE_HASH',
        expectedHash: instance.contentHash,
        signatureImageData: signatureDataUrl,
      },
      {
        onSuccess: () => {
          setSignatureModalOpen(false);
          router.push(getUnionPath(slug, `/assembly/${assemblyId}/documents/${docId}/signed`));
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[600px] rounded-lg" />
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-gray-400">
        <p>문서를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/assembly/${assemblyId}/documents`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {DOCUMENT_TYPE_LABELS[instance.documentType] || instance.documentTitle}
          </h1>
          <p className="text-sm text-gray-500">v{instance.version}</p>
        </div>
      </div>

      {/* A4 문서 뷰어 */}
      <DocumentViewer html={instance.personalizedHtml} />

      {/* 서명 영역 */}
      {instance.canSign && !instance.hasSigned && (
        <div className="space-y-3 no-print">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              내용을 모두 확인했습니다
            </span>
          </label>

          <Button
            onClick={handleSignRequest}
            disabled={!confirmed || signMutation.isPending}
            className="w-full min-h-[44px]"
          >
            {signMutation.isPending ? '서명 중...' : '서명하기'}
          </Button>
        </div>
      )}

      {/* 이미 서명한 경우 */}
      {instance.hasSigned && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-4 no-print">
          <CheckCircle className="w-5 h-5" />
          서명이 완료되었습니다.
          {instance.signedAt && (
            <span className="text-xs text-gray-400 ml-auto">
              {new Date(instance.signedAt).toLocaleString('ko-KR')}
            </span>
          )}
        </div>
      )}

      {/* 보조 액션 */}
      <div className="flex gap-2 no-print">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" />
          인쇄
        </Button>
      </div>

      {/* 서명 모달 */}
      <SignatureModal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        onConfirm={handleSignatureConfirm}
        signerName={user?.name || ''}
        signerRole={(instance.signerRole || 'MEMBER') as SignerRole}
        documentTitle={DOCUMENT_TYPE_LABELS[instance.documentType] || ''}
        isSubmitting={signMutation.isPending}
      />
    </div>
  );
}
