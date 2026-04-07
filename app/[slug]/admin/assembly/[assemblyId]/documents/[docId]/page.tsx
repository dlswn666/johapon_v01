'use client';

import React, { useState, useEffect, use } from 'react';
import DOMPurify from 'dompurify';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import {
  useDocument,
  useTransitionDocumentStatus,
  useSealDocument,
} from '@/app/_lib/features/assembly/api/useDocumentHook';
import { useDocumentSignatures, useSignDocument } from '@/app/_lib/features/assembly/api/useSignatureHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Lock, XCircle } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import DocumentStatusFlow from '@/app/_lib/features/assembly/ui/admin/DocumentStatusFlow';
import PersonalizedDocumentList from '@/app/_lib/features/assembly/ui/admin/PersonalizedDocumentList';
import SignatureWorkflow from '@/app/_lib/features/assembly/ui/SignatureWorkflow';
import type { DocumentStatus, SignerRole } from '@/app/_lib/shared/type/assembly.types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
} from '@/app/_lib/shared/type/assembly.types';
import { getNextDocStates, isSealableStatus, isImmutableStatus } from '@/app/_lib/features/assembly/domain/documentStateMachine';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

type TabType = 'preview' | 'instances' | 'signatures';

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ assemblyId: string; docId: string }>;
}) {
  const { assemblyId, docId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, user, isLoading: isAuthLoading } = useAuth();
  const { data: doc, isLoading } = useDocument(assemblyId, docId);
  const { data: signatures } = useDocumentSignatures(assemblyId, docId);
  const transitionMutation = useTransitionDocumentStatus(assemblyId);
  const sealMutation = useSealDocument(assemblyId);
  const signMutation = useSignDocument(assemblyId);
  const { openConfirmModal } = useModalStore();
  const [activeTab, setActiveTab] = useState<TabType>('preview');

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
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-16" style={{ animationDelay: '50ms' }} />
          </div>
        </div>
        {/* 상태 흐름 */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" style={{ animationDelay: `${100 + i * 40}ms` }} />
          ))}
        </div>
        {/* 탭 */}
        <div className="flex gap-1 border-b border-gray-200">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-sm" style={{ animationDelay: `${350 + i * 40}ms` }} />
          ))}
        </div>
        {/* 문서 미리보기 영역 */}
        <Skeleton className="h-[400px] w-full rounded-lg" style={{ animationDelay: '500ms' }} />
        {/* 하단 액션 바 */}
        <div className="flex justify-end gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" style={{ animationDelay: `${600 + i * 40}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin || !doc) return null;

  const nextStates = getNextDocStates(doc.status as DocumentStatus).filter(
    (s) => s !== 'SUPERSEDED' && s !== 'VOID'
  );
  const canSeal = isSealableStatus(doc.status as DocumentStatus);
  const immutable = isImmutableStatus(doc.status as DocumentStatus);

  const handleTransition = (nextStatus: DocumentStatus) => {
    const label = DOCUMENT_STATUS_LABELS[nextStatus];
    openConfirmModal({
      title: '문서 상태 변경',
      message: `"${DOCUMENT_TYPE_LABELS[doc.document_type]}"을(를) "${label}" 상태로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      onConfirm: () => {
        transitionMutation.mutate({ documentId: doc.id, status: nextStatus });
      },
    });
  };

  const handleSeal = () => {
    openConfirmModal({
      title: '문서 봉인',
      message: '봉인 후에는 수정할 수 없습니다. 계속하시겠습니까?',
      confirmText: '봉인',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => {
        sealMutation.mutate({ documentId: doc.id });
      },
    });
  };

  const handleVoid = () => {
    openConfirmModal({
      title: '문서 무효 처리',
      message: '이 문서를 무효 처리하시겠습니까?',
      confirmText: '무효 처리',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => {
        transitionMutation.mutate({ documentId: doc.id, status: 'VOID' as DocumentStatus });
      },
    });
  };

  const handleSign = (signerRole: SignerRole) => {
    signMutation.mutate({
      documentId: doc.id,
      signerRole,
      signatureMethod: 'SIMPLE_HASH',
      expectedHash: doc.content_hash || '',
    });
  };

  const TABS: Array<{ value: TabType; label: string }> = [
    { value: 'preview', label: '미리보기' },
    { value: 'instances', label: '개인화 목록' },
    { value: 'signatures', label: '서명 현황' },
  ];

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/documents`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {DOCUMENT_TYPE_LABELS[doc.document_type]}
          </h1>
          <p className="text-sm text-gray-500">v{doc.version}</p>
        </div>
      </div>

      {/* 상태 흐름 */}
      <DocumentStatusFlow currentStatus={doc.status as DocumentStatus} />

      {/* 탭 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'preview' && (
        <div className="overflow-x-auto">
          {doc.html_content ? (
            <div
              className="document-a4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(doc.html_content) }}
            />
          ) : (
            <div className="flex items-center justify-center min-h-[400px] bg-white border border-gray-300 rounded-lg text-gray-400">
              <p>문서 내용이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'instances' && (
        <PersonalizedDocumentList assemblyId={assemblyId} documentId={docId} />
      )}

      {activeTab === 'signatures' && (
        <SignatureWorkflow
          document={doc}
          signatures={signatures || []}
          currentUserId={user?.id || null}
          onSign={handleSign}
          isSigning={signMutation.isPending}
        />
      )}

      {/* 하단 액션 바 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-2">
        {nextStates.map((s) => (
          <Button
            key={s}
            variant="outline"
            size="sm"
            onClick={() => handleTransition(s)}
            disabled={transitionMutation.isPending}
          >
            {DOCUMENT_STATUS_LABELS[s]}
          </Button>
        ))}
        {canSeal && (
          <Button
            size="sm"
            onClick={handleSeal}
            disabled={sealMutation.isPending}
          >
            <Lock className="w-4 h-4 mr-1" />
            봉인
          </Button>
        )}
        {!immutable && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleVoid}
            disabled={transitionMutation.isPending}
          >
            <XCircle className="w-4 h-4 mr-1" />
            무효
          </Button>
        )}
      </div>
    </div>
  );
}
