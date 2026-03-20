'use client';

import React from 'react';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useEndSession } from '@/app/_lib/features/assembly/api/useOnlineSessionHook';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export interface AttendanceStatusBarProps {
  assemblyId: string;
  votingMethodBreakdown?: {
    electronic: number;
    onsite: number;
    written: number;
    proxy: number;
  } | null;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  ACTIVE: { dot: 'bg-green-500', label: '접속 중' },
  IDLE: { dot: 'bg-yellow-500', label: '대기' },
  RECONNECTING: { dot: 'bg-red-500', label: '재연결 중' },
  ENDED: { dot: 'bg-red-500', label: '종료됨' },
  STARTING: { dot: 'bg-yellow-500', label: '시작 중' },
  INACTIVE: { dot: 'bg-gray-400', label: '미접속' },
};

/**
 * 출석 상태 바
 * 세션 상태 표시 + 입장 시각 + 의결권 수 + 퇴장 버튼
 */
export default function AttendanceStatusBar({ assemblyId, votingMethodBreakdown }: AttendanceStatusBarProps) {
  const { sessionId, sessionStatus, entryAt, snapshot } = useVoteStore();
  const endSession = useEndSession(assemblyId);
  const { openConfirmModal } = useModalStore();

  const config = STATUS_CONFIG[sessionStatus] || STATUS_CONFIG.INACTIVE;

  const handleExit = () => {
    openConfirmModal({
      title: '퇴장 확인',
      message: '퇴장하시겠습니까?\n퇴장 이후 의결권 행사가 불가합니다.',
      confirmText: '퇴장',
      cancelText: '취소',
      variant: 'danger',
      onConfirm: () => {
        if (sessionId) {
          useVoteStore.getState().endSession();
          endSession.mutate({ sessionId, reason: 'manual' });
        }
      },
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-2.5 flex items-center gap-3 z-20 relative" aria-live="polite">
      {/* 세션 상태 인디케이터 */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2.5 h-2.5 rounded-full ${config.dot} animate-pulse`} aria-hidden="true" />
        <span className="text-xs font-medium text-gray-600">{config.label}</span>
      </div>

      {/* 입장 시각 */}
      {entryAt && (
        <span className="text-xs text-gray-400">
          {new Date(entryAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 입장
        </span>
      )}

      {/* 의결권 */}
      {snapshot && (
        <span className="text-xs text-gray-500">
          의결권 {snapshot.voting_weight}
        </span>
      )}

      {/* 투표 방법별 세분화 */}
      {votingMethodBreakdown && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span title="전자투표">💻 {votingMethodBreakdown.electronic}</span>
          <span title="현장투표">🏠 {votingMethodBreakdown.onsite}</span>
          <span title="서면투표">📄 {votingMethodBreakdown.written}</span>
          <span title="대리투표">👤 {votingMethodBreakdown.proxy}</span>
        </div>
      )}

      {/* 퇴장 버튼 */}
      <div className="ml-auto">
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
          onClick={handleExit}
          disabled={sessionStatus === 'ENDED' || !sessionId}
        >
          <LogOut className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          퇴장
        </Button>
      </div>
    </div>
  );
}
