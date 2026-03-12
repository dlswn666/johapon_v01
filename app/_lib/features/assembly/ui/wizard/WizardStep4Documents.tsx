'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Eye, RefreshCw } from 'lucide-react';
import StatusBadge from '@/app/_lib/widgets/common/StatusBadge';
import DocumentPreview from '@/app/_lib/features/assembly/ui/DocumentPreview';
import { useDocuments, useGenerateDocument } from '@/app/_lib/features/assembly/api/useDocumentHook';
import type { OfficialDocument, OfficialDocumentType } from '@/app/_lib/shared/type/assembly.types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
} from '@/app/_lib/shared/type/assembly.types';

interface WizardStep4Props {
  assemblyId: string;
}

const ALL_DOCUMENT_TYPES: OfficialDocumentType[] = [
  'CONVOCATION_NOTICE',
  'AGENDA_EXPLANATION',
  'E_VOTING_GUIDE',
  'CONSENT_FORM',
  'PROXY_FORM',
  'MINUTES',
  'RESULT_PUBLICATION',
  'EVIDENCE_PACKAGE_SUMMARY',
];

export default function WizardStep4Documents({ assemblyId }: WizardStep4Props) {
  const { data: documents, isLoading } = useDocuments(assemblyId);
  const generateMutation = useGenerateDocument(assemblyId);
  const [previewDoc, setPreviewDoc] = useState<OfficialDocument | null>(null);

  const getDocByType = (type: OfficialDocumentType) =>
    documents?.find((d) => d.document_type === type && d.status !== 'SUPERSEDED' && d.status !== 'VOID');

  const handleGenerate = (type: OfficialDocumentType) => {
    generateMutation.mutate({ documentType: type });
  };

  const handleGenerateAll = () => {
    // 아직 생성되지 않은 문서만 일괄 생성
    const missing = ALL_DOCUMENT_TYPES.filter((t) => !getDocByType(t));
    missing.forEach((type) => {
      generateMutation.mutate({ documentType: type });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">문서 생성</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateAll}
          disabled={generateMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
          일괄 생성
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {ALL_DOCUMENT_TYPES.map((type) => {
            const doc = getDocByType(type);
            return (
              <div
                key={type}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {DOCUMENT_TYPE_LABELS[type]}
                    </p>
                    {doc && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge
                          label={DOCUMENT_STATUS_LABELS[doc.status]}
                          colorClass={DOCUMENT_STATUS_COLORS[doc.status]}
                        />
                        <span className="text-xs text-gray-400">v{doc.version}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      미리보기
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleGenerate(type)}
                      disabled={generateMutation.isPending}
                    >
                      생성
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 문서 미리보기 */}
      <DocumentPreview
        document={previewDoc}
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        assemblyId={assemblyId}
      />
    </div>
  );
}
