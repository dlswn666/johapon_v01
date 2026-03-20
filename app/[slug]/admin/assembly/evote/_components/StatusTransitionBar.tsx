'use client';

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

  if (nextStates.length === 0) return null;

  const handleTransition = (nextStatus: AssemblyStatus) => {
    const label = ASSEMBLY_STATUS_LABELS[nextStatus];
    openConfirmModal({
      title: '상태 변경 확인',
      message: `전자투표 상태를 "${label}"(으)로 변경하시겠습니까?`,
      confirmText: '변경',
      cancelText: '취소',
      variant: nextStatus === 'CANCELLED' ? 'danger' : 'default',
      onConfirm: () => {
        transitionMutation.mutate({ evoteId, status: nextStatus });
      },
    });
  };

  return (
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
  );
}
