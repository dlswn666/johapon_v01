'use client';

import {
  useAssemblyDocuments,
  useLogDocumentView,
} from '@/app/_lib/features/assembly/api/useAssemblyHallHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download } from 'lucide-react';

export interface DocumentSectionProps {
  assemblyId: string;
}

/**
 * 자료 열람 섹션
 */
export default function DocumentSection({ assemblyId }: DocumentSectionProps) {
  const { data: documents, isLoading } = useAssemblyDocuments(assemblyId);
  const logViewMutation = useLogDocumentView(assemblyId);

  const handleViewDocument = (docId: string, fileUrl: string) => {
    // URL 유효성 + 신뢰 출처 검증
    try {
      const url = new URL(fileUrl);
      if (!url.hostname.endsWith('.supabase.co')) {
        console.warn('신뢰할 수 없는 문서 URL:', fileUrl);
        return;
      }
    } catch {
      console.warn('유효하지 않은 문서 URL:', fileUrl);
      return;
    }
    logViewMutation.mutate({ documentId: docId });
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-gray-500">등록된 자료가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
            <p className="text-xs text-gray-400">
              {doc.file_type && `${doc.file_type.toUpperCase()} · `}
              {formatFileSize(doc.file_size)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDocument(doc.id, doc.file_url)}
          >
            <Download className="w-4 h-4 mr-1" aria-hidden="true" />
            열람
          </Button>
        </div>
      ))}
    </div>
  );
}
