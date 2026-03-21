'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useEvoteStatusTransition } from '@/app/_lib/features/evote/api/useEvoteStatusTransition';
import { getNextStates } from '@/app/_lib/features/assembly/domain/assemblyStateMachine';
import { ASSEMBLY_STATUS_LABELS, type AssemblyStatus } from '@/app/_lib/shared/type/assembly.types';

interface StatusTransitionBarProps {
  evoteId: string;
  currentStatus: AssemblyStatus;
}

// 상태별 버튼 variant
function getButtonVariant(status: AssemblyStatus): 'default' | 'destructive' | 'outline' {
  if (status === 'CANCELLED') return 'destructive';
  if (status === 'ARCHIVED') return 'outline';
  return 'default';
}

export default function StatusTransitionBar({ evoteId, currentStatus }: StatusTransitionBarProps) {
  const nextStates = getNextStates(currentStatus);
  const transitionMutation = useEvoteStatusTransition();
  const { openConfirmModal } = useModalStore();

  // 취소 사유 입력 UI 상태
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (nextStates.length === 0) return null;

  const handleTransition = (nextStatus: AssemblyStatus) => {
    // CANCELLED 전환은 사유 입력 UI를 먼저 표시
    if (nextStatus === 'CANCELLED') {
      setShowCancelReason(true);
      setCancelReason('');
      return;
    }

    const label = ASSEMBLY_STATUS_LABELS[nextStatus];
    openConfirmModal({
      title: '상태 변경 확인',
      message: `전자투표 상태를 "${label}"(으)로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      variant: 'default',
      onConfirm: () => {
        transitionMutation.mutate({ evoteId, status: nextStatus });
      },
    });
  };

  const handleCancelConfirm = () => {
    if (!cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.');
      return;
    }
    transitionMutation.mutate(
      { evoteId, status: 'CANCELLED', reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setShowCancelReason(false);
          setCancelReason('');
        },
      },
    );
  };

  const handleCancelDismiss = () => {
    setShowCancelReason(false);
    setCancelReason('');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3 p-4 bg-white rounded-lg border border-gray-200">
        <span className="text-sm text-gray-500 self-center mr-2">다음 단계:</span>
        {nextStates.map((status) => (
          <Button
            key={status}
            variant={getButtonVariant(status)}
            size="sm"
            onClick={() => handleTransition(status)}
            disabled={transitionMutation.isPending}
          >
            {ASSEMBLY_STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

      {/* 취소 사유 입력 영역 */}
      {showCancelReason && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
          <p className="text-sm font-medium text-red-800">
            전자투표를 취소하려면 사유를 입력해주세요.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="취소 사유를 입력하세요"
            rows={3}
            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelDismiss}
              disabled={transitionMutation.isPending}
            >
              돌아가기
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={transitionMutation.isPending}
            >
              {transitionMutation.isPending ? '처리 중...' : '취소 확인'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
