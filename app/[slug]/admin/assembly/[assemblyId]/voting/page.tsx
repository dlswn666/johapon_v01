'use client';

import React, { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useAssembly } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import { useAgendaItems } from '@/app/_lib/features/assembly/api/useAgendaHook';
import { AgendaItemWithPoll, PollStatus, ASSEMBLY_STATUS_LABELS } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Vote } from 'lucide-react';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

const POLL_STATUS_LABELS: Record<PollStatus, string> = {
  SCHEDULED: '예정',
  OPEN: '진행중',
  CLOSED: '마감',
  CANCELLED: '취소',
};

const POLL_STATUS_COLORS: Record<PollStatus, string> = {
  SCHEDULED: 'bg-gray-100 text-gray-700',
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
};

function usePollStatusMutation(assemblyId: string) {
  const { union } = useSlug();
  const { openAlertModal } = useModalStore();

  return useMutation({
    mutationFn: async ({
      agendaId,
      pollId,
      status,
    }: {
      agendaId: string;
      pollId: string;
      status: PollStatus;
    }) => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/agendas/${agendaId}/polls/${pollId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '투표 상태 변경 실패');
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendas', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '투표 상태 변경 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
}

export default function VotingPage({ params }: { params: Promise<{ assemblyId: string }> }) {
  const { assemblyId } = use(params);
  const router = useRouter();
  const { slug, isLoading: isUnionLoading } = useSlug();
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: assembly, isLoading: isAssemblyLoading } = useAssembly(assemblyId);
  const { data: agendaItems, isLoading: isAgendasLoading } = useAgendaItems(assemblyId);
  const { openConfirmModal } = useModalStore();
  const pollMutation = usePollStatusMutation(assemblyId);

  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      router.push(`/${slug}`);
    }
  }, [isAuthLoading, isAdmin, router, slug]);

  const handlePollStatusChange = (
    agendaId: string,
    pollId: string,
    currentStatus: PollStatus,
    title: string
  ) => {
    const nextStatus: PollStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    const actionLabel = nextStatus === 'OPEN' ? '투표 개시' : '투표 마감';

    openConfirmModal({
      title: `${actionLabel} 확인`,
      message: `"${title}" 투표를 ${actionLabel}하시겠습니까?`,
      confirmText: actionLabel,
      cancelText: '취소',
      variant: nextStatus === 'CLOSED' ? 'danger' : 'default',
      onConfirm: () => {
        pollMutation.mutate({ agendaId, pollId, status: nextStatus });
      },
    });
  };

  if (isUnionLoading || isAuthLoading || isAssemblyLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const agendas = (agendaItems as AgendaItemWithPoll[] | undefined) || [];

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(getUnionPath(slug, `/admin/assembly/${assemblyId}`))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">투표 관리</h1>
          <p className="text-sm text-gray-500">
            {assembly?.title} — {assembly ? ASSEMBLY_STATUS_LABELS[assembly.status] : ''}
          </p>
        </div>
      </div>

      {/* 안건 목록 */}
      {isAgendasLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : agendas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Vote className="w-10 h-10 mx-auto mb-2" />
          <p>등록된 안건이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agendas.map((agenda, idx) => (
            <div key={agenda.id} className="bg-white rounded-lg border border-gray-200 p-5">
              {/* 안건 헤더 */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">안건 {idx + 1}</p>
                  <h2 className="text-base font-semibold text-gray-900">{agenda.title}</h2>
                  {agenda.description && (
                    <p className="text-sm text-gray-500 mt-1">{agenda.description}</p>
                  )}
                </div>
              </div>

              {/* 투표 목록 */}
              {!agenda.polls || agenda.polls.length === 0 ? (
                <p className="text-sm text-gray-400">투표가 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {agenda.polls.map((poll) => (
                    <div
                      key={poll.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            POLL_STATUS_COLORS[poll.status]
                          }`}
                        >
                          {POLL_STATUS_LABELS[poll.status]}
                        </span>
                        <div className="text-sm text-gray-600 space-x-2">
                          {poll.allow_electronic && <span>전자투표</span>}
                          {poll.allow_onsite && <span>현장투표</span>}
                          {poll.allow_written && <span>서면투표</span>}
                          {poll.allow_proxy && <span>위임투표</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {poll.status === 'OPEN' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handlePollStatusChange(agenda.id, poll.id, poll.status, agenda.title)
                            }
                            disabled={pollMutation.isPending}
                          >
                            투표 마감
                          </Button>
                        )}
                        {poll.status === 'SCHEDULED' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handlePollStatusChange(agenda.id, poll.id, poll.status, agenda.title)
                            }
                            disabled={pollMutation.isPending}
                          >
                            투표 개시
                          </Button>
                        )}
                        {poll.status === 'CLOSED' && (
                          <span className="text-xs text-gray-400 self-center">마감됨</span>
                        )}
                        {poll.status === 'CANCELLED' && (
                          <span className="text-xs text-gray-400 self-center">취소됨</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
