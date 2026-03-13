'use client';

import React from 'react';
import {
  FileText, ClipboardList, Smartphone, UserCheck,
  Users, Vote, BookOpen, BarChart3, Package, Mail,
} from 'lucide-react';
import type { OfficialDocumentType, DocumentTemplate } from '@/app/_lib/shared/type/assembly.types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_ICON_COLORS,
  DOCUMENT_TYPE_DESCRIPTIONS,
} from '@/app/_lib/shared/type/assembly.types';

const ICON_MAP: Record<OfficialDocumentType, React.ElementType> = {
  CONVOCATION_NOTICE: FileText,
  INDIVIDUAL_NOTICE: Mail,
  AGENDA_EXPLANATION: ClipboardList,
  E_VOTING_GUIDE: Smartphone,
  CONSENT_FORM: UserCheck,
  PROXY_FORM: Users,
  WRITTEN_RESOLUTION: Vote,
  MINUTES: BookOpen,
  RESULT_PUBLICATION: BarChart3,
  EVIDENCE_PACKAGE_SUMMARY: Package,
};

interface DocumentTemplateSelectorProps {
  templates: DocumentTemplate[];
  selectedType: OfficialDocumentType | null;
  onSelect: (type: OfficialDocumentType) => void;
  isLoading?: boolean;
}

/** 문서 유형 선택 카드 그리드 */
export default function DocumentTemplateSelector({
  templates,
  selectedType,
  onSelect,
  isLoading,
}: DocumentTemplateSelectorProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-40" />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>사용 가능한 문서 템플릿이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="radiogroup" aria-label="문서 유형 선택">
      {templates.map((tmpl) => {
        const type = tmpl.template_type as OfficialDocumentType;
        const Icon = ICON_MAP[type] || FileText;
        const isSelected = selectedType === type;
        const colorClass = DOCUMENT_TYPE_ICON_COLORS[type] || 'bg-gray-50 text-gray-600';

        return (
          <div
            key={tmpl.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => onSelect(type)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(type)}
            className={`rounded-lg p-4 cursor-pointer transition-colors ${
              isSelected
                ? 'border-2 border-blue-500 bg-blue-50'
                : 'border border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="mt-3 font-medium text-gray-900 text-sm">
              {DOCUMENT_TYPE_LABELS[type]}
            </p>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {tmpl.description || DOCUMENT_TYPE_DESCRIPTIONS[type] || ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400">
              <span>서명: {tmpl.requires_signatures ? `${tmpl.signature_threshold}명` : '불필요'}</span>
              {tmpl.legal_basis && <span>법적 근거: {tmpl.legal_basis}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
