'use client';

import React, { useState } from 'react';
import { FileText, Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/app/_lib/widgets/common/StatusBadge';
import HashDisplay from '@/app/_lib/widgets/common/HashDisplay';
import ProgressBar from '@/app/_lib/widgets/common/ProgressBar';
import DocumentPreview from '@/app/_lib/features/assembly/ui/DocumentPreview';
import {
  useDocuments,
  useTransitionDocumentStatus,
  useSealDocument,
} from '@/app/_lib/features/assembly/api/useDocumentHook';
import type { OfficialDocument, DocumentStatus } from '@/app/_lib/shared/type/assembly.types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/app/_lib/shared/type/assembly.types';
import { getNextDocStates, isSealableStatus } from '@/app/_lib/features/assembly/domain/documentStateMachine';
import { calculateSignatureProgress } from '@/app/_lib/features/assembly/domain/signatureRules';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

interface DocumentListProps {
  assemblyId: string;
  statusFilter?: DocumentStatus | 'ALL';
  onDocumentClick?: (doc: OfficialDocument) => void;
  showCreateButton?: boolean;
}

/** 관리자 문서 목록 — 상태 관리, 미리보기, 봉인 */
export default function DocumentList({ assemblyId, statusFilter = 'ALL', onDocumentClick }: DocumentListProps) {
  const { data: documents, isLoading } = useDocuments(assemblyId);
  const transitionMutation = useTransitionDocumentStatus(assemblyId);
  const sealMutation = useSealDocument(assemblyId);
  const { openConfirmModal } = useModalStore();
  const [previewDoc, setPreviewDoc] = useState<OfficialDocument | null>(null);

  // 필터 적용
  const activeDocuments = documents?.filter((d) => {
    if (statusFilter === 'ALL') {
      return d.status !== 'SUPERSEDED' && d.status !== 'VOID';
    }
    return d.status === statusFilter;
  });

  const handleTransition = (doc: OfficialDocument, nextStatus: OfficialDocument['status']) => {
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

  const handleSeal = (doc: OfficialDocument) => {
    openConfirmModal({
      title: '문서 봉인',
      message: `"${DOCUMENT_TYPE_LABELS[doc.document_type]}"을(를) 봉인하시겠습니까? 봉인 후에는 수정할 수 없습니다.`,
      confirmText: '봉인',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => {
        sealMutation.mutate({ documentId: doc.id });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
        ))}
      </div>
    );
  }

  if (!activeDocuments || activeDocuments.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>생성된 문서가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeDocuments.map((doc) => {
        const nextStates = getNextDocStates(doc.status).filter(
          (s) => s !== 'SUPERSEDED' && s !== 'VOID'
        );
        const canSeal = isSealableStatus(doc.status);
        const { percent } = calculateSignatureProgress(
          doc.required_signers?.length || 0,
          doc.signature_threshold
        );

        return (
          <div
            key={doc.id}
            className={`bg-white rounded-lg border border-gray-200 p-4 ${onDocumentClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
            onClick={() => onDocumentClick?.(doc)}
            role={onDocumentClick ? 'button' : undefined}
            tabIndex={onDocumentClick ? 0 : undefined}
            onKeyDown={(e) => e.key === 'Enter' && onDocumentClick?.(doc)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">
                    {DOCUMENT_TYPE_LABELS[doc.document_type]}
                  </p>
                  <StatusBadge
                    label={DOCUMENT_STATUS_LABELS[doc.status]}
                    colorClass={DOCUMENT_STATUS_COLORS[doc.status]}
                  />
                  <span className="text-xs text-gray-400">v{doc.version}</span>
                </div>

                {/* 해시 */}
                {doc.content_hash && (
                  <div className="mt-1">
                    <HashDisplay hash={doc.content_hash} label="해시" />
                  </div>
                )}

                {/* 서명 진행률 (서명 단계인 경우) */}
                {['SIGNED_PARTIAL', 'SIGNED_COMPLETE', 'APPROVED'].includes(doc.status) &&
                  doc.signature_threshold > 0 && (
                    <div className="mt-2 max-w-xs">
                      <ProgressBar
                        value={percent}
                        label="서명 진행"
                        colorClass={doc.status === 'SIGNED_COMPLETE' ? 'bg-emerald-500' : 'bg-blue-500'}
                      />
                    </div>
                  )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <Eye className="w-4 h-4" />
                </Button>

                {nextStates.map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    variant="outline"
                    size="sm"
                    onClick={() => handleTransition(doc, nextStatus)}
                    disabled={transitionMutation.isPending}
                  >
                    {DOCUMENT_STATUS_LABELS[nextStatus]}
                  </Button>
                ))}

                {canSeal && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleSeal(doc)}
                    disabled={sealMutation.isPending}
                  >
                    <Lock className="w-4 h-4 mr-1" />
                    봉인
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* 미리보기 */}
      <DocumentPreview
        document={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        assemblyId={assemblyId}
      />
    </div>
  );
}
