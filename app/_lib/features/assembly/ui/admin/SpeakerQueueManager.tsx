'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminSpeakers,
  useApproveSpeaker,
  useRejectSpeaker,
  useCompleteSpeaker,
  useReorderSpeakers,
} from '@/app/_lib/features/assembly/api/useSpeakerManagementHook';
import { SpeakerRequest } from '@/app/_lib/shared/type/assembly.types';

interface SpeakerQueueManagerProps {
  assemblyId: string;
}

// 드래그 가능한 발언자 카드
function SortableSpeakerCard({
  speaker,
  assemblyId,
}: {
  speaker: SpeakerRequest;
  assemblyId: string;
}) {
  const completeMutation = useCompleteSpeaker(assemblyId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: speaker.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-3"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
        aria-label="순서 변경"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {speaker.queue_position != null && (
            <span className="text-xs text-gray-400 mr-1">#{speaker.queue_position}</span>
          )}
          발언자 {speaker.snapshot_id.slice(0, 8)}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(speaker.requested_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => completeMutation.mutate({ requestId: speaker.id })}
        disabled={completeMutation.isPending}
        className="h-7 text-xs"
      >
        <CheckCircle className="w-3.5 h-3.5 mr-1" />
        발언 완료
      </Button>
    </div>
  );
}

export default function SpeakerQueueManager({ assemblyId }: SpeakerQueueManagerProps) {
  const { data: speakers, isLoading } = useAdminSpeakers(assemblyId);
  const approveMutation = useApproveSpeaker(assemblyId);
  const rejectMutation = useRejectSpeaker(assemblyId);
  const reorderMutation = useReorderSpeakers(assemblyId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const pending = (speakers ?? []).filter((s) => s.status === 'PENDING');
  const approved = (speakers ?? [])
    .filter((s) => s.status === 'APPROVED')
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
  const completed = (speakers ?? []).filter((s) => s.status === 'COMPLETED');

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = approved.findIndex((s) => s.id === active.id);
    const newIndex = approved.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(approved, oldIndex, newIndex);
    reorderMutation.mutate({ orderedIds: reordered.map((s) => s.id) });
  };

  return (
    <div className="space-y-6">
      {/* 대기 중 (PENDING) */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-amber-700 mb-2">
            요청 대기 ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center gap-2 bg-yellow-50 rounded-lg border border-yellow-200 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">발언자 {s.snapshot_id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(s.requested_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => approveMutation.mutate({ requestId: s.id })}
                    disabled={approveMutation.isPending}
                    className="h-7 px-2"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate({ requestId: s.id, reason: '관리자 거절' })}
                    disabled={rejectMutation.isPending}
                    className="h-7 px-2 text-red-600 hover:text-red-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 승인 대기 큐 (APPROVED) - 드래그앤드롭 */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2">
          발언 대기 큐 ({approved.length})
        </h4>
        {approved.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">대기 중인 발언자가 없습니다</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={approved.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {approved.map((s) => (
                  <SortableSpeakerCard key={s.id} speaker={s} assemblyId={assemblyId} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 발언 완료 (COMPLETED) */}
      {completed.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2">
            발언 완료 ({completed.length})
          </h4>
          <div className="space-y-1 opacity-60">
            {completed.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-gray-500 px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span>발언자 {s.snapshot_id.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(speakers ?? []).length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          아직 발언 요청이 없습니다
        </div>
      )}
    </div>
  );
}
