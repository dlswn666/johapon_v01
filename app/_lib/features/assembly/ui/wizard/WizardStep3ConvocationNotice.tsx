'use client';

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, RotateCcw, X, Save } from 'lucide-react';
import { TextEditorDynamic } from '@/app/_lib/widgets/common/text-editor/TextEditorDynamic';
import type { Assembly, OfficialDocument, DocumentTemplate } from '@/app/_lib/shared/type/assembly.types';

interface WizardStep3Props {
  assemblyId: string;
  assembly: Assembly | null;
}

/** 기본 머지 필드를 총회 데이터로 치환 */
function resolveMergeFields(html: string, assembly: Assembly | null): string {
  if (!assembly) return html;

  const replacements: Record<string, string> = {
    '{{assembly_title}}': assembly.title || '',
    '{{assembly_date}}': assembly.scheduled_at
      ? new Date(assembly.scheduled_at).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '',
    '{{assembly_time}}': assembly.scheduled_at
      ? new Date(assembly.scheduled_at).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    '{{assembly_type}}': assembly.assembly_type === 'REGULAR'
      ? '정기총회'
      : assembly.assembly_type === 'EXTRAORDINARY'
        ? '임시총회'
        : '서면총회',
    '{{venue_address}}': assembly.venue_address || '',
    '{{legal_basis}}': assembly.legal_basis || '',
  };

  let result = html;
  for (const [field, value] of Object.entries(replacements)) {
    result = result.split(field).join(value);
  }
  return result;
}

export default function WizardStep3ConvocationNotice({ assemblyId, assembly }: WizardStep3Props) {
  const queryClient = useQueryClient();
  const [editorContent, setEditorContent] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [resetCounter, setResetCounter] = useState(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 기존 문서 조회
  const { data: documents, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['official-documents', assemblyId, 'CONVOCATION_NOTICE'],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents?type=CONVOCATION_NOTICE`);
      if (!res.ok) throw new Error('문서 조회 실패');
      const { data } = await res.json();
      return data as OfficialDocument[];
    },
  });

  // 템플릿 조회
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['document-templates', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents/templates`);
      if (!res.ok) throw new Error('템플릿 조회 실패');
      const { data } = await res.json();
      return data as DocumentTemplate[];
    },
  });

  // 초기 콘텐츠 계산 (쿼리 데이터 기반)
  const initialContent = useMemo(() => {
    if (isLoadingDocs || isLoadingTemplates) return null;

    const existingDoc = documents?.find(
      (d) => d.document_type === 'CONVOCATION_NOTICE' && d.status !== 'SUPERSEDED' && d.status !== 'VOID'
    );
    if (existingDoc?.html_content) return existingDoc.html_content;

    const template = templates?.find((t) => t.template_type === 'CONVOCATION_NOTICE');
    if (template?.html_template) {
      return resolveMergeFields(template.html_template, assembly);
    }

    return '';
    // resetCounter를 의존성에 추가하여 초기화 시 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingDocs, isLoadingTemplates, documents, templates, assembly, resetCounter]);

  // 현재 표시할 콘텐츠: 사용자 편집 내용 우선, 없으면 초기 콘텐츠
  const currentContent = editorContent ?? initialContent ?? '';
  const isReady = initialContent !== null;

  // 문서 저장 뮤테이션
  const saveMutation = useMutation({
    mutationFn: async (htmlContent: string) => {
      const existingDoc = documents?.find(
        (d) => d.document_type === 'CONVOCATION_NOTICE' && d.status !== 'SUPERSEDED' && d.status !== 'VOID'
      );

      if (existingDoc) {
        const res = await fetch(
          `/api/assemblies/${assemblyId}/official-documents/${existingDoc.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ htmlContent }),
          }
        );
        if (!res.ok) throw new Error('문서 저장 실패');
        return res.json();
      } else {
        const res = await fetch(
          `/api/assemblies/${assemblyId}/official-documents`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documentType: 'CONVOCATION_NOTICE',
              htmlContent,
            }),
          }
        );
        if (!res.ok) throw new Error('문서 생성 실패');
        return res.json();
      }
    },
    onSuccess: () => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({
        queryKey: ['official-documents', assemblyId, 'CONVOCATION_NOTICE'],
      });
    },
    onError: () => {
      setSaveStatus('idle');
    },
  });

  // 에디터 변경 시 3초 디바운스 저장
  const handleEditorChange = useCallback(
    (content: string) => {
      setEditorContent(content);
      setSaveStatus('idle');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setSaveStatus('saving');
        saveMutation.mutate(content);
      }, 3000);
    },
    [saveMutation]
  );

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 템플릿 초기화
  const handleResetTemplate = () => {
    const confirmed = window.confirm(
      '현재 작성한 내용이 모두 삭제되고 기본 템플릿으로 초기화됩니다. 계속하시겠습니까?'
    );
    if (!confirmed) return;

    const template = templates?.find((t) => t.template_type === 'CONVOCATION_NOTICE');
    if (template?.html_template) {
      const resolved = resolveMergeFields(template.html_template, assembly);
      setEditorContent(resolved);
      setResetCounter((c) => c + 1);
      setSaveStatus('saving');
      saveMutation.mutate(resolved);
    }
  };

  // 수동 저장
  const handleManualSave = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSaveStatus('saving');
    saveMutation.mutate(currentContent);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">소집공고 작성</h2>
        <div className="flex items-center gap-2">
          {/* 저장 상태 */}
          <span className="text-xs text-gray-500">
            {saveStatus === 'saving' && '저장 중...'}
            {saveStatus === 'saved' && '저장됨'}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-1" />
            저장
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            disabled={!currentContent}
          >
            <Eye className="w-4 h-4 mr-1" />
            미리보기
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetTemplate}
            disabled={!templates?.length}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            템플릿 초기화
          </Button>
        </div>
      </div>

      {/* 에디터 */}
      {!isReady ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <TextEditorDynamic
          key={resetCounter}
          content={currentContent}
          onChange={handleEditorChange}
          placeholder="소집공고 내용을 작성하세요..."
          editable={true}
          className="min-h-[400px]"
        />
      )}

      {/* 미리보기 모달 */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPreviewOpen(false);
          }}
        >
          <div className="relative w-full max-w-[210mm] min-h-[297mm] bg-white shadow-xl rounded-lg p-10 my-6">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: currentContent }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
