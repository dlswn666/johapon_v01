'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import type { WizardStep } from '@/app/_lib/shared/type/assembly.types';

/** 위자드 자동 저장 디바운스 시간(ms) */
const AUTO_SAVE_DEBOUNCE = 5000;

/**
 * 위자드 스텝별 자동 저장 (diff 기반)
 */
export const useWizardAutoSave = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({ step, data }: { step: WizardStep; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/wizard`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      });
      if (!res.ok) {
        let errorMessage = '자동 저장에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id, assemblyId] });
    },
  });
};

/**
 * 위자드 상태 관리 훅
 */
export function useWizardState(assemblyId: string) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const autoSaveMutation = useWizardAutoSave(assemblyId);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedData = useRef<string>('');

  // 디바운스 정리
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const completeStep = useCallback((step: WizardStep) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => (prev < 5 ? ((prev + 1) as WizardStep) : prev));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  }, []);

  /** 자동 저장 (5초 디바운스) */
  const autoSave = useCallback(
    (step: WizardStep, data: Record<string, unknown>) => {
      const serialized = JSON.stringify({ step, data });
      if (serialized === lastSavedData.current) return;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        lastSavedData.current = serialized;
        autoSaveMutation.mutate({ step, data });
      }, AUTO_SAVE_DEBOUNCE);
    },
    [autoSaveMutation]
  );

  /** 즉시 저장 (스텝 이동 시) */
  const saveNow = useCallback(
    (step: WizardStep, data: Record<string, unknown>) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      const serialized = JSON.stringify({ step, data });
      lastSavedData.current = serialized;
      autoSaveMutation.mutate({ step, data });
    },
    [autoSaveMutation]
  );

  return {
    currentStep,
    completedSteps,
    goToStep,
    completeStep,
    goNext,
    goPrev,
    autoSave,
    saveNow,
    isSaving: autoSaveMutation.isPending,
  };
}
