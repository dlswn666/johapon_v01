'use client';

import { useState } from 'react';
import { AGENDA_TYPE_LABELS, QUORUM_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';
import type { EvoteDashboardAgenda } from '@/app/_lib/features/evote/api/useEvoteDashboard';
import AgendaDetailModal from './AgendaDetailModal';

interface AgendaListProps {
  agendas: EvoteDashboardAgenda[];
}

export default function AgendaList({ agendas }: AgendaListProps) {
  const [selectedAgenda, setSelectedAgenda] = useState<EvoteDashboardAgenda | null>(null);

  if (agendas.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">안건 현황</h2>
        <p className="text-sm text-gray-500 text-center py-8">등록된 안건이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        안건 현황 <span className="text-sm font-normal text-gray-500">({agendas.length}건)</span>
      </h2>
      <div className="space-y-2">
        {agendas
          .sort((a, b) => a.seq_order - b.seq_order)
          .map((agenda) => (
            <button
              key={agenda.id}
              onClick={() => setSelectedAgenda(agenda)}
              className="w-full text-left flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600">
                {agenda.seq_order}호
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{agenda.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">
                    {AGENDA_TYPE_LABELS[agenda.agenda_type] || agenda.agenda_type}
                  </span>
                  {agenda.quorum_type_override && (
                    <>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs text-gray-500">
                        {QUORUM_TYPE_LABELS[agenda.quorum_type_override]}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">상세보기</span>
            </button>
          ))}
      </div>

      <AgendaDetailModal
        agenda={selectedAgenda}
        open={!!selectedAgenda}
        onOpenChange={(open) => { if (!open) setSelectedAgenda(null); }}
      />
    </div>
  );
}
