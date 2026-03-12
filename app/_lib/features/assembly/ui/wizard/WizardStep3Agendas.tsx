'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import InfoCard from '@/app/_lib/widgets/common/InfoCard';
import type { AgendaType, NewAgendaItem } from '@/app/_lib/shared/type/assembly.types';
import {
  AGENDA_TYPE_LABELS,
  QUORUM_DEFAULTS,
} from '@/app/_lib/shared/type/assembly.types';

interface Step3Data {
  agendaItems: (NewAgendaItem & { _tempId: string })[];
}

interface WizardStep3Props {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
}

export default function WizardStep3Agendas({ data, onChange }: WizardStep3Props) {
  const addAgenda = () => {
    const newItem: NewAgendaItem & { _tempId: string } = {
      _tempId: crypto.randomUUID(),
      title: '',
      agenda_type: 'GENERAL',
      seq_order: data.agendaItems.length + 1,
    };
    onChange({ agendaItems: [...data.agendaItems, newItem] });
  };

  const removeAgenda = (tempId: string) => {
    onChange({
      agendaItems: data.agendaItems
        .filter((a) => a._tempId !== tempId)
        .map((a, i) => ({ ...a, seq_order: i + 1 })),
    });
  };

  const updateAgenda = (tempId: string, updates: Partial<NewAgendaItem>) => {
    onChange({
      agendaItems: data.agendaItems.map((a) =>
        a._tempId === tempId ? { ...a, ...updates } : a
      ),
    });
  };

  const handleTypeChange = (tempId: string, agendaType: AgendaType) => {
    const defaults = QUORUM_DEFAULTS[agendaType];
    updateAgenda(tempId, {
      agenda_type: agendaType,
      quorum_threshold_pct: defaults.quorumThresholdPct,
      approval_threshold_pct: defaults.approvalThresholdPct,
      quorum_requires_direct: defaults.requiresDirect,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">안건 구성</h2>
        <Button variant="outline" size="sm" onClick={addAgenda}>
          <Plus className="w-4 h-4 mr-1" />
          안건 추가
        </Button>
      </div>

      <InfoCard title="법적 템플릿 자동 적용" variant="default">
        안건 유형 선택 시 법정 정족수와 승인율이 자동으로 설정됩니다. 필요 시 수동으로 변경할 수 있습니다.
      </InfoCard>

      {data.agendaItems.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          등록된 안건이 없습니다. 안건을 추가하세요.
        </div>
      )}

      <div className="space-y-4">
        {data.agendaItems.map((item, index) => (
          <div
            key={item._tempId}
            className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                <span className="text-sm font-medium text-gray-500">
                  #{index + 1}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAgenda(item._tempId)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label>안건 제목 *</Label>
                <Input
                  value={item.title}
                  onChange={(e) => updateAgenda(item._tempId, { title: e.target.value })}
                  placeholder="안건 제목을 입력하세요"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>안건 유형 *</Label>
                <select
                  value={item.agenda_type}
                  onChange={(e) =>
                    handleTypeChange(item._tempId, e.target.value as AgendaType)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {(Object.entries(AGENDA_TYPE_LABELS) as [AgendaType, string][]).map(
                    ([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>정족수 (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.quorum_threshold_pct ?? ''}
                    onChange={(e) =>
                      updateAgenda(item._tempId, {
                        quorum_threshold_pct: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>승인율 (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.approval_threshold_pct ?? ''}
                    onChange={(e) =>
                      updateAgenda(item._tempId, {
                        approval_threshold_pct: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Label>설명</Label>
                <Textarea
                  value={item.description ?? ''}
                  onChange={(e) =>
                    updateAgenda(item._tempId, { description: e.target.value })
                  }
                  placeholder="안건에 대한 설명"
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { Step3Data };
