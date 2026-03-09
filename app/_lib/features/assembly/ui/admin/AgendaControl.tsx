'use client';

import React from 'react';
import { Play, Square, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgendaItems } from '@/app/_lib/features/assembly/api/useAgendaHook';
import { useQuorumStatus } from '@/app/_lib/features/assembly/api/useQuorumHook';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import {
  AGENDA_TYPE_LABELS,
  AgendaItemWithPoll,
  PollStatus,
} from '@/app/_lib/shared/type/assembly.types';

interface AgendaControlProps {
  assemblyId: string;
}

const POLL_STATUS_LABELS: Record<PollStatus, string> = {
  SCHEDULED: '예정',
  OPEN: '진행중',
  CLOSED: '마감',
  CANCELLED: '취소',
};

const POLL_STATUS_COLORS: Record<PollStatus, string> = {
  SCHEDULED: 'bg-gray-100 text-gray-600',
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

export default function AgendaControl({ assemblyId }: AgendaControlProps) {
  const { data: agendas, isLoading } = useAgendaItems(assemblyId);
  const { data: quorum } = useQuorumStatus(assemblyId);
  const { openConfirmModal, openAlertModal } = useModalStore();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // 안건 목록을 polls 포함하여 캐스팅
  const agendasWithPolls = (agendas ?? []) as AgendaItemWithPoll[];

  const handleOpenPoll = async (pollId: string, agendaTitle: string) => {
    // 정족수 미달 경고
    if (quorum && !quorum.quorumMet) {
      openConfirmModal({
        title: '정족수 미달 경고',
        message: `현재 정족수가 미달입니다 (${quorum.totalAttendance}/${quorum.totalMembers}명). 그래도 "${agendaTitle}" 투표를 개시하시겠습니까?`,
        confirmText: '투표 개시',
        cancelText: '취소',
        variant: 'danger',
        onConfirm: () => executePollTransition(pollId, 'OPEN'),
      });
      return;
    }

    openConfirmModal({
      title: '투표 개시',
      message: `"${agendaTitle}" 안건의 투표를 개시하시겠습니까?`,
      confirmText: '투표 개시',
      cancelText: '취소',
      onConfirm: () => executePollTransition(pollId, 'OPEN'),
    });
  };

  const handleClosePoll = (pollId: string, agendaTitle: string) => {
    openConfirmModal({
      title: '투표 마감',
      message: `"${agendaTitle}" 안건의 투표를 마감하시겠습니까? 마감 후 추가 투표가 불가능합니다.`,
      confirmText: '투표 마감',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => executePollTransition(pollId, 'CLOSED'),
    });
  };

  const executePollTransition = async (pollId: string, status: 'OPEN' | 'CLOSED') => {
    try {
      const res = await fetch(`/api/assemblies/${assemblyId}/agendas/polls/${pollId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '투표 상태 변경 실패');
      }
      // 쿼리 무효화를 위해 페이지 새로고침 대신 refetch
      openAlertModal({
        title: '상태 변경 완료',
        message: status === 'OPEN' ? '투표가 개시되었습니다.' : '투표가 마감되었습니다.',
        type: 'success',
      });
    } catch (err) {
      openAlertModal({
        title: '상태 변경 실패',
        message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-3">
      {agendasWithPolls.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400">
          등록된 안건이 없습니다
        </div>
      ) : (
        agendasWithPolls.map((agenda) => {
          const poll = agenda.polls?.[0]; // 각 안건의 첫 번째 투표
          const pollStatus = poll?.status as PollStatus | undefined;

          return (
            <div key={agenda.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">#{agenda.seq_order}</span>
                    <h4 className="text-sm font-medium text-gray-900 truncate">{agenda.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {AGENDA_TYPE_LABELS[agenda.agenda_type]}
                    </span>
                    {pollStatus && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${POLL_STATUS_COLORS[pollStatus]}`}>
                        {POLL_STATUS_LABELS[pollStatus]}
                      </span>
                    )}
                    {pollStatus === 'OPEN' && quorum && !quorum.quorumMet && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        정족수 미달
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {pollStatus === 'SCHEDULED' && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenPoll(poll!.id, agenda.title)}
                      className="h-8"
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      투표 개시
                    </Button>
                  )}
                  {pollStatus === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleClosePoll(poll!.id, agenda.title)}
                      className="h-8"
                    >
                      <Square className="w-3.5 h-3.5 mr-1" />
                      투표 마감
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
