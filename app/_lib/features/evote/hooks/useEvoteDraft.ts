'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  EvoteCreateForm,
  WizardStep,
  AssemblyType,
  QuorumType,
  VoteType,
  PublishMode,
  NotificationChannel,
} from '../types/evote.types';

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

export function useEvoteDbDraft(unionId: string | undefined) {
  const loadDbDraft = useCallback(async () => {
    if (!unionId) return null;
    try {
      const res = await fetch('/api/evotes/draft');
      if (!res.ok) return null;
      const { data } = await res.json();
      return data;
    } catch {
      return null;
    }
  }, [unionId]);

  const deleteDbDraft = useCallback(async (draftId: string) => {
    try {
      await fetch(`/api/evotes/draft?id=${draftId}`, { method: 'DELETE' });
    } catch {
      // 삭제 실패 무시
    }
  }, []);

  return { loadDbDraft, deleteDbDraft };
}

/** DB의 assembly+agenda_items 구조 → EvoteCreateForm 매핑 */
export function mapDbDraftToFormData(dbDraft: Record<string, unknown>): DraftState['formData'] {
  const agendaItems = (dbDraft.agenda_items as Array<Record<string, unknown>>) || [];

  return {
    assemblyType: ((dbDraft.assembly_type as string) || 'REGULAR') as AssemblyType,
    title: (dbDraft.title as string) || '',
    quorumType: ((dbDraft.quorum_type as string) || 'GENERAL') as QuorumType,
    scheduledAt: (dbDraft.scheduled_at as string) || '',
    agendas: agendaItems.map((item) => {
      const polls = (item.polls as Array<Record<string, unknown>>) || [];
      const poll = polls[0] || {};
      const options = (poll.poll_options as Array<Record<string, unknown>>) || [];
      const voteType = ((item.vote_type as string) || 'APPROVE') as VoteType;

      return {
        id: (item.id as string) || crypto.randomUUID(),
        title: (item.title as string) || '',
        description: (item.description as string) || '',
        voteType,
        electCount: (poll.elect_count as number) || 0,
        quorumTypeOverride: ((item.quorum_type_override as string) || null) as QuorumType | null,
        candidates: voteType === 'ELECT'
          ? options.map((o) => ({
              name: (o.candidate_name as string) || '',
              info: (o.candidate_info as string) || '',
            }))
          : [],
        companies: voteType === 'SELECT'
          ? options.map((o) => ({
              name: (o.company_name as string) || '',
              bidAmount: (o.bid_amount as string) || '',
              info: (o.company_info as string) || '',
            }))
          : [],
      };
    }),
    voterFilter: 'ALL' as const,
    publishMode: ((dbDraft.publish_mode as string) || 'IMMEDIATE') as PublishMode,
    publishAt: '',
    preVoteStartAt: (dbDraft.pre_vote_start_date as string) || '',
    preVoteEndAt: (dbDraft.pre_vote_end_date as string) || '',
    finalDeadline: (dbDraft.final_deadline as string) || '',
    autoReminder: true,
    notificationChannels: ['KAKAO_ALIMTALK'] as NotificationChannel[],
  };
}
