'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import NotificationTimeline from '@/app/_lib/features/assembly/ui/NotificationTimeline';
import {
  useNotificationBatches,
  useSendNotification,
} from '@/app/_lib/features/assembly/api/useNotificationHook';
import type { NotificationType } from '@/app/_lib/shared/type/assembly.types';
import { NOTIFICATION_TYPE_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface NotificationManagerProps {
  assemblyId: string;
}

/** 관리자 알림 관리 컴포넌트 */
export default function NotificationManager({ assemblyId }: NotificationManagerProps) {
  const { data: batches, isLoading } = useNotificationBatches(assemblyId);
  const sendMutation = useSendNotification(assemblyId);

  const handleSend = (type: NotificationType) => {
    sendMutation.mutate({ notificationType: type });
  };

  return (
    <div className="space-y-4">
      {/* 빠른 발송 버튼 */}
      <div className="flex flex-wrap gap-2">
        {(
          ['CONVOCATION_NOTICE', 'VOTE_START', 'VOTE_REMINDER', 'RESULT_PUBLICATION'] as NotificationType[]
        ).map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => handleSend(type)}
            disabled={sendMutation.isPending}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            {NOTIFICATION_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* 이력 */}
      <NotificationTimeline batches={batches || []} isLoading={isLoading} />
    </div>
  );
}
