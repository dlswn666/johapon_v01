'use client';

import React from 'react';
import { FileText, Eye, CheckCircle, Lock } from 'lucide-react';
import type { PersonalizedDocumentSummary } from '@/app/_lib/shared/type/assembly.types';
import { DOCUMENT_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface MemberDocumentListProps {
  documents: PersonalizedDocumentSummary[];
  onDocumentClick: (docId: string) => void;
  isLoading?: boolean;
}

const STATUS_STYLES: Record<string, { border: string; badge: string; badgeText: string }> = {
  PENDING: {
    border: 'border-l-4 border-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    badgeText: '확인 대기',
  },
  VIEWED: {
    border: 'border-l-4 border-gray-300',
    badge: 'bg-gray-100 text-gray-600',
    badgeText: '열람 완료',
  },
  SIGNED: {
    border: 'border-l-4 border-green-500',
    badge: 'bg-green-100 text-green-700',
    badgeText: '서명 완료',
  },
  SEALED: {
    border: 'border-l-4 border-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700',
    badgeText: '봉인됨',
  },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING: FileText,
  VIEWED: Eye,
  SIGNED: CheckCircle,
  SEALED: Lock,
};

/** 조합원 수신 문서 목록 */
export default function MemberDocumentList({
  documents,
  onDocumentClick,
  isLoading,
}: MemberDocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">아직 수신한 문서가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const needsSignature = doc.status === 'PENDING' && doc.requiresSignature;
        const style = needsSignature
          ? { border: 'border-l-4 border-amber-500', badge: 'bg-amber-100 text-amber-700', badgeText: '서명 필요' }
          : STATUS_STYLES[doc.status] || STATUS_STYLES.PENDING;
        const Icon = STATUS_ICONS[doc.status] || FileText;

        return (
          <article
            key={doc.instanceId}
            className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${style.border}`}
            onClick={() => onDocumentClick(doc.documentId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onDocumentClick(doc.documentId)}
            aria-label={`${DOCUMENT_TYPE_LABELS[doc.documentType]} - ${style.badgeText}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {DOCUMENT_TYPE_LABELS[doc.documentType]}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    v{doc.version} · {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${style.badge}`}>
                {style.badgeText}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
