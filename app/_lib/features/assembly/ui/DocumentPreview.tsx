'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, ExternalLink } from 'lucide-react';
import StatusBadge from '@/app/_lib/widgets/common/StatusBadge';
import HashDisplay from '@/app/_lib/widgets/common/HashDisplay';
import type { OfficialDocument } from '@/app/_lib/shared/type/assembly.types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/app/_lib/shared/type/assembly.types';

interface DocumentPreviewProps {
  document: OfficialDocument | null;
  open: boolean;
  onClose: () => void;
  assemblyId: string;
}

/** A4 문서 미리보기 (Dialog/Drawer) */
export default function DocumentPreview({
  document: doc,
  open,
  onClose,
  assemblyId,
}: DocumentPreviewProps) {
  if (!doc) return null;

  const handleDownloadPdf = () => {
    window.open(
      `/api/assemblies/${assemblyId}/documents/${doc.id}/pdf`,
      '_blank'
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <DialogTitle className="truncate">
                {DOCUMENT_TYPE_LABELS[doc.document_type]}
              </DialogTitle>
              <StatusBadge
                label={DOCUMENT_STATUS_LABELS[doc.status]}
                colorClass={DOCUMENT_STATUS_COLORS[doc.status]}
              />
              <span className="text-xs text-gray-400">v{doc.version}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {doc.pdf_storage_path && (
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* 메타 정보 */}
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
          {doc.generated_at && (
            <span>
              생성: {new Date(doc.generated_at).toLocaleString('ko-KR')}
            </span>
          )}
          {doc.approved_at && (
            <span>
              승인: {new Date(doc.approved_at).toLocaleString('ko-KR')}
            </span>
          )}
          {doc.sealed_at && (
            <span>
              봉인: {new Date(doc.sealed_at).toLocaleString('ko-KR')}
            </span>
          )}
        </div>

        {/* 해시 */}
        <div className="mt-2">
          <HashDisplay hash={doc.content_hash} label="문서 해시" />
        </div>

        {/* 문서 내용 (A4 비율 프레임) */}
        <div className="mt-4 bg-white border border-gray-300 shadow-sm rounded-lg overflow-hidden">
          <div
            className="p-8 min-h-[400px]"
            style={{ aspectRatio: '210 / 297' }}
          >
            {doc.html_content ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: doc.html_content }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>문서 내용이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 무효 사유 */}
        {doc.status === 'VOID' && doc.void_reason && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-700">무효 사유</p>
            <p className="text-sm text-red-600 mt-1">{doc.void_reason}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
