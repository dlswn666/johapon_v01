'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useDocumentTemplates, useGenerateDocument } from '@/app/_lib/features/assembly/api/useDocumentHook';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import DocumentTemplateSelector from '@/app/_lib/features/assembly/ui/DocumentTemplateSelector';
import type { OfficialDocumentType } from '@/app/_lib/shared/type/assembly.types';
import { DOCUMENT_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

const STEPS = [
  { step: 1, label: '템플릿 선택', description: '문서 유형을 선택합니다' },
  { step: 2, label: '확인 및 발행', description: '미리보기 후 발행합니다' },
];

export default function DocumentCreatePage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly, isLoading } = useAssembly(assemblyId);
  const { data: templates, isLoading: templatesLoading } = useDocumentTemplates(assemblyId);
  const generateMutation = useGenerateDocument(assemblyId);

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<OfficialDocumentType | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  useEffect(() => {
    if (generateMutation.isSuccess && generateMutation.data) {
      router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/documents/${generateMutation.data.id}`));
    }
  }, [generateMutation.isSuccess, generateMutation.data, router, slug, assemblyId]);

  const handleGenerate = () => {
    if (!selectedType) return;
    generateMutation.mutate({
      documentType: selectedType,
      sourceJson: {},
    });
  };

  if (isUnionLoading || isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin || !assembly) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}/documents`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">새 문서 생성</h1>
          <p className="text-sm text-gray-500">{assembly.title}</p>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.step}>
            <button
              onClick={() => s.step < currentStep && setCurrentStep(s.step)}
              className={`px-3 py-1.5 rounded-full ${
                currentStep === s.step
                  ? 'bg-blue-600 text-white font-medium'
                  : currentStep > s.step
                    ? 'bg-blue-100 text-blue-700 cursor-pointer'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s.step}. {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: 템플릿 선택 */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <DocumentTemplateSelector
            templates={templates || []}
            selectedType={selectedType}
            onSelect={(type) => setSelectedType(type)}
            isLoading={templatesLoading}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedType}
            >
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: 확인 및 발행 */}
      {currentStep === 2 && selectedType && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {DOCUMENT_TYPE_LABELS[selectedType]} 발행 확인
            </h2>
            <p className="text-sm text-gray-600">
              선택한 템플릿을 기반으로 문서를 생성합니다.
              생성 후 내용을 편집할 수 있습니다.
            </p>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              이전
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? '생성 중...' : '문서 생성'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
