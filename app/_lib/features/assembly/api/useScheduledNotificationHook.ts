'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import type { ScheduledNotification, ScheduledNotificationType } from '@/app/_lib/shared/type/assembly.types';

/**
 * 예약 알림 목록 조회
 */
export const useScheduledNotifications = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['scheduled-notifications', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/scheduled-notifications`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '예약 알림 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as ScheduledNotification[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 예약 알림 생성
 */
export const useScheduleNotification = (assemblyId: string) => {
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({
      notification_type,
      document_id,
      scheduled_at,
    }: {
      notification_type: ScheduledNotificationType;
      document_id?: string;
      scheduled_at: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/scheduled-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_type, document_id, scheduled_at }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '예약 알림 생성 실패');
      }
      const { data } = await res.json();
      return data as ScheduledNotification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduled-notifications', union?.id, assemblyId],
      });
    },
  });
};

/**
 * 예약 알림 취소
 */
export const useCancelScheduledNotification = (assemblyId: string) => {
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({ notification_id }: { notification_id: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/scheduled-notifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '예약 알림 취소 실패');
      }
      const { data } = await res.json();
      return data as ScheduledNotification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduled-notifications', union?.id, assemblyId],
      });
    },
  });
};
