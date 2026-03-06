'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useAssemblyStore from '@/app/_lib/features/assembly/model/useAssemblyStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { AgendaItem, NewAgendaItem, UpdateAgendaItem } from '@/app/_lib/shared/type/assembly.types';

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 안건 목록 조회 (투표/문서 포함)
 */
export const useAgendaItems = (assemblyId: string | undefined, enabled: boolean = true) => {
  const setAgendaItems = useAssemblyStore((state) => state.setAgendaItems);
  const { union } = useSlug();

  const queryResult = useQuery({
    queryKey: ['agendas', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/agendas`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '안건 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as AgendaItem[];
    },
    enabled: !!assemblyId && !!union?.id && enabled,
  });

  useEffect(() => {
    if (queryResult.data && queryResult.isSuccess) {
      setAgendaItems(queryResult.data);
    }
  }, [queryResult.data, queryResult.isSuccess, setAgendaItems]);

  return queryResult;
};

// ============================================
// Mutation Hooks (변경)
// ============================================

/**
 * 안건 생성 (투표 세션 자동 생성)
 */
export const useCreateAgendaItem = (assemblyId: string | undefined) => {
  const addAgendaItem = useAssemblyStore((state) => state.addAgendaItem);
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async (newAgenda: NewAgendaItem) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/agendas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgenda),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '안건 생성 실패');
      }
      const { data } = await res.json();
      return data as AgendaItem;
    },
    onSuccess: (data) => {
      addAgendaItem(data);
      queryClient.invalidateQueries({ queryKey: ['agendas', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id, assemblyId] });

      openAlertModal({
        title: '안건 등록 완료',
        message: '안건이 성공적으로 등록되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      console.error('안건 생성 실패:', error);
      openAlertModal({
        title: '안건 등록 실패',
        message: error.message || '안건 등록에 실패했습니다.',
        type: 'error',
      });
    },
  });
};

/**
 * 안건 수정
 */
export const useUpdateAgendaItem = (assemblyId: string | undefined) => {
  const updateAgendaItem = useAssemblyStore((state) => state.updateAgendaItem);
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({ agendaId, updates }: { agendaId: string; updates: UpdateAgendaItem }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/agendas/${agendaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '안건 수정 실패');
      }
      const { data } = await res.json();
      return data as AgendaItem;
    },
    onSuccess: (data) => {
      updateAgendaItem(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['agendas', union?.id, assemblyId] });

      openAlertModal({
        title: '수정 완료',
        message: '안건이 수정되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      console.error('안건 수정 실패:', error);
      openAlertModal({
        title: '수정 실패',
        message: error.message || '안건 수정에 실패했습니다.',
        type: 'error',
      });
    },
  });
};

/**
 * 안건 삭제
 */
export const useDeleteAgendaItem = (assemblyId: string | undefined) => {
  const removeAgendaItem = useAssemblyStore((state) => state.removeAgendaItem);
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async (agendaId: string) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/agendas/${agendaId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '안건 삭제 실패');
      }
      return agendaId;
    },
    onSuccess: (agendaId) => {
      removeAgendaItem(agendaId);
      queryClient.invalidateQueries({ queryKey: ['agendas', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id, assemblyId] });

      openAlertModal({
        title: '삭제 완료',
        message: '안건이 삭제되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      console.error('안건 삭제 실패:', error);
      openAlertModal({
        title: '삭제 실패',
        message: error.message || '안건 삭제에 실패했습니다.',
        type: 'error',
      });
    },
  });
};
