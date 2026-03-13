'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import type { OfficialDocument, OfficialDocumentType, DocumentTemplate } from '@/app/_lib/shared/type/assembly.types';

/** 자동 저장 디바운스 시간(ms) */
const AUTO_SAVE_DEBOUNCE = 3000;

/**
 * 위자드용 문서 에디터 훅
 *
 * 문서 유형별로 기존 문서 또는 템플릿에서 HTML을 로드하고,
 * 3초 디바운스로 자동 저장합니다.
 */
export function useDocumentEditor(assemblyId: string, documentType: OfficialDocumentType) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>('');
  const initializedRef = useRef(false);

  // 기존 문서 조회
  const {
    data: existingDocuments,
    isLoading: isLoadingDoc,
  } = useQuery({
    queryKey: ['official-documents', assemblyId, documentType],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents?type=${documentType}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '문서 조회 실패');
      }
      const { data } = await res.json();
      return data as OfficialDocument[];
    },
    enabled: !!assemblyId && !!documentType,
  });

  // 템플릿 조회
  const {
    data: templates,
    isLoading: isLoadingTemplate,
  } = useQuery({
    queryKey: ['document-templates', assemblyId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/official-documents/templates`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '템플릿 조회 실패');
      }
      const { data } = await res.json();
      return data as DocumentTemplate[];
    },
    enabled: !!assemblyId,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });

  // 현재 타입의 문서 및 템플릿
  const existingDocument = existingDocuments?.[0] || null;
  const template = templates?.find((t) => t.template_type === documentType) || null;
  const templateHtml = template?.html_template || '';

  // 초기 컨텐츠 계산 (effect 대신 useMemo)
  const initialContent = useMemo(() => {
    if (isLoadingDoc || isLoadingTemplate) return '';
    if (existingDocument?.html_content) return existingDocument.html_content;
    if (templateHtml) return templateHtml;
    return '';
  }, [existingDocument, templateHtml, isLoadingDoc, isLoadingTemplate]);

  const [htmlContent, setHtmlContent] = useState<string>('');

  // 초기화: 데이터 로드 완료 시 1회만 설정
  useEffect(() => {
    if (initializedRef.current) return;
    if (isLoadingDoc || isLoadingTemplate) return;
    if (!initialContent && !existingDocuments && !templates) return;

    initializedRef.current = true;
    if (existingDocument?.html_content) {
      lastSavedContent.current = existingDocument.html_content;
    }
    // queueMicrotask로 cascading render 방지
    queueMicrotask(() => {
      setHtmlContent(initialContent);
    });
  }, [initialContent, isLoadingDoc, isLoadingTemplate, existingDocument, existingDocuments, templates]);

  // 저장 뮤테이션
  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/official-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          htmlContent: content,
          sourceJson: {},
        }),
      });
      if (!res.ok) {
        let errorMessage = '문서 저장에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as OfficialDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['official-documents', assemblyId, documentType],
      });
    },
  });

  // 자동 저장 (3초 디바운스)
  const triggerAutoSave = useCallback(
    (content: string) => {
      if (content === lastSavedContent.current) return;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        lastSavedContent.current = content;
        saveMutation.mutate(content);
      }, AUTO_SAVE_DEBOUNCE);
    },
    [saveMutation]
  );

  // htmlContent 변경 시 자동 저장 트리거
  useEffect(() => {
    if (!initializedRef.current) return;
    triggerAutoSave(htmlContent);
  }, [htmlContent, triggerAutoSave]);

  // 디바운스 타이머 정리
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // 템플릿으로 초기화
  const resetToTemplate = useCallback(() => {
    if (templateHtml) {
      setHtmlContent(templateHtml);
    }
  }, [templateHtml]);

  return {
    htmlContent,
    setHtmlContent,
    isLoading: isLoadingDoc || isLoadingTemplate,
    isSaving: saveMutation.isPending,
    templateHtml,
    resetToTemplate,
  };
}
