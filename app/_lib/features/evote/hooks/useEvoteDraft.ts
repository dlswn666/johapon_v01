'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { EvoteCreateForm, WizardStep } from '../types/evote.types';

export interface DraftState {
  formData: Omit<EvoteCreateForm, 'documentFiles' | 'selectedVoterIds' | 'agendas'> & {
    agendas: Array<Omit<EvoteCreateForm['agendas'][number], 'documentFiles'>>;
  };
  currentStep: WizardStep;
  completedSteps: number[];
  savedAt: string;
}

function getStorageKey(unionId: string): string {
  return `evote-draft-${unionId}`;
}

/** formData에서 직렬화 불가능한 필드 제거 */
function serializeFormData(formData: EvoteCreateForm): DraftState['formData'] {
  const { documentFiles: _documentFiles, selectedVoterIds: _selectedVoterIds, ...rest } = formData;
  return {
    ...rest,
    agendas: formData.agendas.map(({ documentFiles: _df, ...agenda }) => agenda),
  };
}

export function useEvoteLocalDraft(unionId: string | undefined) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const autoSave = useCallback(
    (formData: EvoteCreateForm, currentStep: WizardStep, completedSteps: Set<number>) => {
      if (!unionId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const draft: DraftState = {
          formData: serializeFormData(formData),
          currentStep,
          completedSteps: Array.from(completedSteps),
          savedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(getStorageKey(unionId), JSON.stringify(draft));
        } catch {
          // localStorage 용량 초과 등 무시
        }
      }, 3000);
    },
    [unionId]
  );

  const loadLocal = useCallback((): DraftState | null => {
    if (!unionId) return null;
    try {
      const raw = localStorage.getItem(getStorageKey(unionId));
      if (!raw) return null;
      return JSON.parse(raw) as DraftState;
    } catch {
      return null;
    }
  }, [unionId]);

  const clearLocal = useCallback(() => {
    if (!unionId) return;
    localStorage.removeItem(getStorageKey(unionId));
  }, [unionId]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { autoSave, loadLocal, clearLocal };
}
