'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText } from 'lucide-react';

interface DocumentPDFPreviewProps {
  assemblyId: string;
  documentId: string;
  open: boolean;
  onClose: () => void;
}

/** PDF 미리보기 (Phase 3에서 완전 구현 — 현재 placeholder) */
export default function DocumentPDFPreview({
  assemblyId: _assemblyId,
  documentId,
  open,
  onClose,
}: DocumentPDFPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>PDF 미리보기</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center min-h-[400px] text-gray-400">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">PDF 미리보기는 Phase 3에서 구현됩니다.</p>
            <p className="text-xs mt-1 text-gray-300">
              문서 ID: {documentId}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
