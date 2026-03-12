'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type {
  NotificationBatch,
  NotificationType,
  NotificationDeliveryChannel,
} from '@/app/_lib/shared/type/assembly.types';

/**
 * 알림 발송 이력 조회
 */
export const useNotificationBatches = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['notifications', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/notifications`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '알림 이력 조회 실패');
      }
      const { data } = await res.json();
      return data as NotificationBatch[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 알림 발송 실행
 */
export const useSendNotification = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      notificationType,
      deliveryChannel,
      documentId,
    }: {
      notificationType: NotificationType;
      deliveryChannel?: NotificationDeliveryChannel;
      documentId?: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_type: notificationType,
          delivery_channel: deliveryChannel || 'KAKAO_ALIMTALK',
          document_id: documentId || null,
        }),
      });
      if (!res.ok) {
        let errorMessage = '알림 발송에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          /* 기본 메시지 사용 */
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as NotificationBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', union?.id, assemblyId] });
      openAlertModal({
        title: '발송 완료',
        message: '알림이 발송되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '발송 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};
