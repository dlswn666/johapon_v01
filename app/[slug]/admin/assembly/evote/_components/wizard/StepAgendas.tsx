'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import AgendaCard from './AgendaCard';
import type { EvoteCreateForm, AgendaFormData } from '@/app/_lib/features/evote/types/evote.types';

interface StepAgendasProps {
  formData: EvoteCreateForm;
  updateForm: (partial: Partial<EvoteCreateForm>) => void;
}

/** 새 안건의 기본값 */
function createEmptyAgenda(): AgendaFormData {
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    voteType: 'APPROVE',
    electCount: 1,
    quorumTypeOverride: null,
    candidates: [],
    companies: [],
  };
}

export default function StepAgendas({ formData, updateForm }: StepAgendasProps) {
  const { agendas } = formData;

  const addAgenda = useCallback(() => {
    updateForm({ agendas: [...agendas, createEmptyAgenda()] });
  }, [agendas, updateForm]);

  const removeAgenda = useCallback(
    (index: number) => {
      updateForm({ agendas: agendas.filter((_, i) => i !== index) });
    },
    [agendas, updateForm]
  );

  const updateAgenda = useCallback(
    (index: number, updated: AgendaFormData) => {
      const next = agendas.map((a, i) => (i === index ? updated : a));
      updateForm({ agendas: next });
    },
    [agendas, updateForm]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">안건 등록</h2>
          <p className="text-sm text-gray-500 mt-1">투표 안건을 추가하고 설정합니다</p>
        </div>
        <Button type="button" onClick={addAgenda} className="gap-1.5">
          <Plus className="w-4 h-4" />
          안건 추가
        </Button>
      </div>

      {agendas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">등록된 안건이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">안건 추가 버튼을 눌러 시작하세요</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agendas.map((agenda, i) => (
            <AgendaCard
              key={agenda.id}
              agenda={agenda}
              index={i}
              onChange={(updated) => updateAgenda(i, updated)}
              onRemove={() => removeAgenda(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
