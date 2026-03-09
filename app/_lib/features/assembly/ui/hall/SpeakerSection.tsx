'use client';

import {
  useSpeakerRequests,
  useRequestToSpeak,
} from '@/app/_lib/features/assembly/api/useAssemblyHallHook';
import useVoteStore from '@/app/_lib/features/assembly/model/useVoteStore';
import {
  SPEAKER_REQUEST_STATUS_LABELS,
  SpeakerRequestStatus,
} from '@/app/_lib/shared/type/assembly.types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Hand } from 'lucide-react';

export interface SpeakerSectionProps {
  assemblyId: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

/**
 * 발언요청 섹션
 */
export default function SpeakerSection({ assemblyId }: SpeakerSectionProps) {
  const { assembly } = useVoteStore();
  const isLive = ['IN_PROGRESS', 'VOTING'].includes(assembly?.status || '');
  const { data: requests, isLoading } = useSpeakerRequests(assemblyId, isLive);
  const requestMutation = useRequestToSpeak(assemblyId);

  const hasPending = requests?.some((r) => r.status === 'PENDING');

  return (
    <div className="space-y-4">
      {/* 발언 요청 버튼 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <Hand className="w-8 h-8 text-blue-500 mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm text-gray-600 mb-3">
          의장에게 발언 기회를 요청합니다. 승인 시 발언 순서를 안내해 드립니다.
        </p>
        <Button
          onClick={() => requestMutation.mutate({})}
          disabled={hasPending || requestMutation.isPending}
        >
          <Hand className="w-4 h-4 mr-2" aria-hidden="true" />
          {hasPending ? '발언 요청 대기 중' : requestMutation.isPending ? '요청 중...' : '발언 요청'}
        </Button>
      </div>

      {/* 내 요청 목록 */}
      {isLoading ? (
        <Skeleton className="h-20 rounded-lg" />
      ) : requests && requests.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">내 발언 요청</h3>
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[req.status] || ''}`}>
                {SPEAKER_REQUEST_STATUS_LABELS[req.status as SpeakerRequestStatus] || req.status}
              </span>
              <div className="flex-1">
                <p className="text-xs text-gray-500">
                  {new Date(req.requested_at).toLocaleString('ko-KR')}
                </p>
              </div>
              {req.queue_position && (
                <span className="text-sm font-medium text-blue-600">
                  대기 {req.queue_position}번
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
