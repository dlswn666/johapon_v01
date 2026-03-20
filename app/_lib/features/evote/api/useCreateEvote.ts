'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { Evote, NewEvote } from '@/app/_lib/features/evote/types/evote.types';

/**
 * 전자투표 생성
 */
export const useCreateEvote = () => {
  const router = useRouter();
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union, slug } = useSlug();

  return useMutation({
    mutationFn: async (newEvote: NewEvote) => {
      const res = await fetch('/api/evotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEvote, union_id: union?.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '전자투표 생성 실패');
      }
      const { data } = await res.json();
      return data as Evote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evotes', union?.id] });

      openAlertModal({
        title: '생성 완료',
        message: '전자투표가 생성되었습니다.',
        type: 'success',
        onOk: () => {
          const path = getUnionPath(slug, `/admin/assembly/evote/${data.id}`);
          router.push(path);
        },
      });
    },
    onError: (error: Error) => {
      console.error('전자투표 생성 실패:', error);
      openAlertModal({
        title: '생성 실패',
        message: error.message || '전자투표 생성에 실패했습니다.',
        type: 'error',
      });
    },
  });
};
