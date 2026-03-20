'use client';

import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

interface SendReminderResponse {
  sent_count: number;
}

/**
 * 미투표자 리마인더 발송
 */
export const useSendReminder = (evoteId: string | undefined) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/evotes/${evoteId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '리마인더 발송 실패');
      }
      const { data } = await res.json();
      return data as SendReminderResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evote-voters', union?.id, evoteId] });
      queryClient.invalidateQueries({ queryKey: ['evote-notifications', union?.id, evoteId] });

      openAlertModal({
        title: '발송 완료',
        message: `미투표자 ${data.sent_count}명에게 리마인더를 발송했습니다.`,
        type: 'success',
      });
    },
    onError: (error: Error) => {
      console.error('리마인더 발송 실패:', error);
      openAlertModal({
        title: '발송 실패',
        message: error.message || '리마인더 발송에 실패했습니다.',
        type: 'error',
      });
    },
  });
};
