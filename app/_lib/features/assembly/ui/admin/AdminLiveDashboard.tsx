'use client';

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Assembly, ASSEMBLY_STATUS_LABELS, AssemblyStatus } from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { useTransitionAssemblyStatus } from '@/app/_lib/features/assembly/api/useAssemblyHook';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import QuorumDashboard from '@/app/_lib/features/assembly/ui/QuorumDashboard';
import UnstableSessionsList from './UnstableSessionsList';
import AnnouncementSender from './AnnouncementSender';
import QuestionsModeration from './QuestionsModeration';
import SpeakerQueueManager from './SpeakerQueueManager';
import AgendaControl from './AgendaControl';
import AttendanceList from './AttendanceList';

interface AdminLiveDashboardProps {
  assemblyId: string;
  assembly: Assembly;
}

// 진행 중 상태 전이
const LIVE_STATUS_ACTIONS: Record<string, { nextStatus: AssemblyStatus; label: string; variant: 'default' | 'destructive' | 'outline' }[]> = {
  IN_PROGRESS: [
    { nextStatus: 'VOTING', label: '투표 개시', variant: 'default' },
  ],
  VOTING: [
    { nextStatus: 'VOTING_CLOSED', label: '투표 마감', variant: 'default' },
  ],
  VOTING_CLOSED: [
    { nextStatus: 'CLOSED', label: '총회 종료', variant: 'default' },
  ],
};

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'bg-green-100 text-green-700',
  VOTING: 'bg-yellow-100 text-yellow-700',
  VOTING_CLOSED: 'bg-orange-100 text-orange-700',
};

export default function AdminLiveDashboard({ assemblyId, assembly }: AdminLiveDashboardProps) {
  const transitionMutation = useTransitionAssemblyStatus();
  const { openConfirmModal } = useModalStore();

  const handleStatusTransition = (nextStatus: AssemblyStatus) => {
    const label = ASSEMBLY_STATUS_LABELS[nextStatus];
    openConfirmModal({
      title: '상태 변경 확인',
      message: `총회 상태를 "${label}"(으)로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      variant: nextStatus === 'CANCELLED' ? 'danger' : 'default',
      onConfirm: () => {
        transitionMutation.mutate({ assemblyId, status: nextStatus });
      },
    });
  };

  const statusActions = LIVE_STATUS_ACTIONS[assembly.status] || [];

  return (
    <div className="space-y-4">
      {/* 상단 헤더: 총회명 + 상태 + 전환 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">{assembly.title}</h2>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[assembly.status] || ''}`}>
            {ASSEMBLY_STATUS_LABELS[assembly.status]}
          </span>
        </div>
        {statusActions.length > 0 && (
          <div className="flex gap-2">
            {statusActions.map((action) => (
              <Button
                key={action.nextStatus}
                variant={action.variant}
                size="sm"
                onClick={() => handleStatusTransition(action.nextStatus)}
                disabled={transitionMutation.isPending}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 메인 그리드: 좌측 40% / 우측 60% */}
      <div className="grid grid-cols-1 lg:grid-cols-[40fr_60fr] gap-6">
        {/* 좌측 패널 */}
        <div className="space-y-4">
          <QuorumDashboard assemblyId={assemblyId} />
          <UnstableSessionsList assemblyId={assemblyId} />
          <AnnouncementSender assemblyId={assemblyId} />
        </div>

        {/* 우측 패널: 탭 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <Tabs defaultValue="questions">
            <TabsList className="w-full">
              <TabsTrigger value="questions">질문 관리</TabsTrigger>
              <TabsTrigger value="speakers">발언 관리</TabsTrigger>
              <TabsTrigger value="agendas">안건 컨트롤</TabsTrigger>
              <TabsTrigger value="attendance">출석 목록</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="mt-4">
              <QuestionsModeration assemblyId={assemblyId} />
            </TabsContent>

            <TabsContent value="speakers" className="mt-4">
              <SpeakerQueueManager assemblyId={assemblyId} />
            </TabsContent>

            <TabsContent value="agendas" className="mt-4">
              <AgendaControl assemblyId={assemblyId} />
            </TabsContent>

            <TabsContent value="attendance" className="mt-4">
              <AttendanceList assemblyId={assemblyId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
