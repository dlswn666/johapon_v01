'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

export interface Announcement {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

/**
 * 공지사항 목록 조회 (관리자용)
 */
export const useAnnouncements = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['announcements', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/announcements`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '공지사항 조회 실패');
      }
      const { data } = await res.json();
      return (data as Array<{ id: string; content: string; created_by: string; created_at: string }>).map((d) => ({
        id: d.id,
        content: d.content,
        createdBy: d.created_by,
        createdAt: d.created_at,
      })) as Announcement[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 공지사항 등록 (관리자용)
 */
export const useSendAnnouncement = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        let errorMessage = '공지사항 등록에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '공지 등록 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};
