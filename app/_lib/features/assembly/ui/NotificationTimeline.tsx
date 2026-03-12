'use client';

import React from 'react';
import { Bell, CheckCircle, XCircle, Clock, Send, MinusCircle } from 'lucide-react';
import StatusBadge from '@/app/_lib/widgets/common/StatusBadge';
import ProgressBar from '@/app/_lib/widgets/common/ProgressBar';
import type { NotificationBatch } from '@/app/_lib/shared/type/assembly.types';
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_COLORS,
} from '@/app/_lib/shared/type/assembly.types';

interface NotificationTimelineProps {
  batches: NotificationBatch[];
  isLoading: boolean;
  className?: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4 text-gray-400" />,
  SENDING: <Send className="w-4 h-4 text-blue-500" />,
  DELIVERED: <CheckCircle className="w-4 h-4 text-green-500" />,
  PARTIALLY_DELIVERED: <MinusCircle className="w-4 h-4 text-amber-500" />,
  FAILED: <XCircle className="w-4 h-4 text-red-500" />,
  SUPERSEDED: <MinusCircle className="w-4 h-4 text-gray-400" />,
};

/** 알림 발송 이력 타임라인 */
export default function NotificationTimeline({
  batches,
  isLoading,
  className = '',
}: NotificationTimelineProps) {
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
        ))}
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className={`text-center py-8 text-sm text-gray-400 ${className}`}>
        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>발송 이력이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {batches.map((batch) => {
        const deliveryPercent =
          batch.total_recipients > 0
            ? Math.round((batch.delivered_count / batch.total_recipients) * 100)
            : 0;

        return (
          <div
            key={batch.id}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5">{STATUS_ICONS[batch.status]}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">
                      {NOTIFICATION_TYPE_LABELS[batch.notification_type]}
                    </p>
                    <StatusBadge
                      label={NOTIFICATION_STATUS_LABELS[batch.status]}
                      colorClass={NOTIFICATION_STATUS_COLORS[batch.status]}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {batch.delivery_channel} | {batch.total_recipients}명 대상
                    {batch.sent_at && (
                      <> | {new Date(batch.sent_at).toLocaleString('ko-KR')}</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 발송 진행률 */}
            {batch.status !== 'PENDING' && (
              <div className="mt-3">
                <ProgressBar
                  value={deliveryPercent}
                  label={`${batch.delivered_count}/${batch.total_recipients} 발송`}
                  colorClass={
                    batch.status === 'FAILED'
                      ? 'bg-red-500'
                      : batch.status === 'PARTIALLY_DELIVERED'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                  }
                />
              </div>
            )}

            {/* 실패 상세 */}
            {batch.failed_count > 0 && (
              <p className="text-xs text-red-600 mt-2">
                {batch.failed_count}건 발송 실패
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
