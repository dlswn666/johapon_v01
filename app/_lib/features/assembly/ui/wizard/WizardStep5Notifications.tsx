'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, Calendar } from 'lucide-react';
import NotificationTimeline from '@/app/_lib/features/assembly/ui/NotificationTimeline';
import {
  useNotificationBatches,
  useSendNotification,
} from '@/app/_lib/features/assembly/api/useNotificationHook';
import type { Assembly, NotificationType } from '@/app/_lib/shared/type/assembly.types';
import { NOTIFICATION_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface WizardStep5Props {
  assemblyId: string;
  assembly: Assembly | null;
}

/** 법정 14일 기한 계산 */
function calculateNoticeDays(scheduledAt: string): { days: number; deadlineDate: string } {
  const scheduled = new Date(scheduledAt);
  const deadline = new Date(scheduled.getTime() - 14 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );
  return {
    days: daysUntilDeadline,
    deadlineDate: deadline.toLocaleDateString('ko-KR'),
  };
}

const SENDABLE_TYPES: { type: NotificationType; desc: string }[] = [
  { type: 'CONVOCATION_NOTICE', desc: '소집공고문을 전체 조합원에게 발송합니다.' },
  { type: 'NOTICE_REMINDER', desc: '소집통지 리마인더를 발송합니다.' },
  { type: 'VOTE_START', desc: '투표 시작 안내를 발송합니다.' },
  { type: 'VOTE_REMINDER', desc: '투표 리마인더를 발송합니다.' },
];

export default function WizardStep5Notifications({
  assemblyId,
  assembly,
}: WizardStep5Props) {
  const { data: batches, isLoading } = useNotificationBatches(assemblyId);
  const sendMutation = useSendNotification(assemblyId);

  const noticeDays = assembly
    ? calculateNoticeDays(assembly.scheduled_at)
    : null;

  const handleSend = (type: NotificationType) => {
    sendMutation.mutate({ notificationType: type });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">알림 계획</h2>

      {/* 기한 안내 */}
      {noticeDays && (
        <div className="flex items-start gap-3 bg-white rounded-lg border border-gray-200 p-4">
          <Calendar className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              소집통지 기한: {noticeDays.deadlineDate}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              총회일로부터 14일 전까지 소집통지를 발송해야 합니다.
            </p>
            {noticeDays.days <= 0 ? (
              <p className="text-xs text-red-600 mt-1 font-medium">
                기한이 이미 경과했습니다!
              </p>
            ) : noticeDays.days <= 3 ? (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                기한까지 {noticeDays.days}일 남았습니다.
              </p>
            ) : (
              <p className="text-xs text-green-600 mt-1">
                기한까지 {noticeDays.days}일 남았습니다.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 발송 버튼 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">알림 발송</h3>
        {SENDABLE_TYPES.map(({ type, desc }) => {
          const alreadySent = batches?.some(
            (b) =>
              b.notification_type === type &&
              ['DELIVERED', 'PARTIALLY_DELIVERED', 'SENDING'].includes(b.status)
          );
          return (
            <div
              key={type}
              className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {NOTIFICATION_TYPE_LABELS[type]}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <Button
                variant={alreadySent ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleSend(type)}
                disabled={sendMutation.isPending}
                className="flex-shrink-0"
              >
                <Send className="w-4 h-4 mr-1" />
                {alreadySent ? '재발송' : '발송'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* 발송 이력 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">발송 이력</h3>
        <NotificationTimeline batches={batches || []} isLoading={isLoading} />
      </div>
    </div>
  );
}
