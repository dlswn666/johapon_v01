'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { queryClient } from '@/app/_lib/shared/tanstack/queryClient';
import useAssemblyStore from '@/app/_lib/features/assembly/model/useAssemblyStore';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { getUnionPath } from '@/app/_lib/shared/lib/utils/slug';
import { Assembly, NewAssembly, UpdateAssembly, AssemblyStatus } from '@/app/_lib/shared/type/assembly.types';

// ============================================
// Query Hooks (조회)
// ============================================

/**
 * 총회 목록 조회
 */
export const useAssemblies = (enabled: boolean = true) => {
  const setAssemblies = useAssemblyStore((state) => state.setAssemblies);
  const { union } = useSlug();

  const queryResult = useQuery({
    queryKey: ['assemblies', union?.id],
    queryFn: async () => {
      const res = await fetch('/api/assemblies');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '총회 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as Assembly[];
    },
    enabled: enabled && !!union?.id,
  });

  useEffect(() => {
    if (queryResult.data && queryResult.isSuccess) {
      setAssemblies(queryResult.data);
    }
  }, [queryResult.data, queryResult.isSuccess, setAssemblies]);

  return queryResult;
};

/**
 * 총회 상세 조회
 */
export const useAssembly = (assemblyId: string | undefined, enabled: boolean = true) => {
  const setSelectedAssembly = useAssemblyStore((state) => state.setSelectedAssembly);
  const { union } = useSlug();

  const queryResult = useQuery({
    queryKey: ['assemblies', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '총회 상세 조회 실패');
      }
      const { data } = await res.json();
      return data as Assembly;
    },
    enabled: !!assemblyId && !!union?.id && enabled,
    retry: false,
  });

  useEffect(() => {
    if (queryResult.data && queryResult.isSuccess) {
      setSelectedAssembly(queryResult.data);
    }
  }, [queryResult.data, queryResult.isSuccess, setSelectedAssembly]);

  return queryResult;
};

// ============================================
// Mutation Hooks (변경)
// ============================================

/**
 * 총회 생성
 */
export const useCreateAssembly = () => {
  const router = useRouter();
  const addAssembly = useAssemblyStore((state) => state.addAssembly);
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union, slug } = useSlug();

  return useMutation({
    mutationFn: async (newAssembly: NewAssembly) => {
      const res = await fetch('/api/assemblies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssembly),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '총회 생성 실패');
      }
      const { data } = await res.json();
      return data as Assembly;
    },
    onSuccess: (data) => {
      addAssembly(data);
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id] });

      openAlertModal({
        title: '생성 완료',
        message: '총회가 성공적으로 생성되었습니다.',
        type: 'success',
        onOk: () => {
          const path = getUnionPath(slug, `/admin/assembly/${data.id}`);
          router.push(path);
        },
      });
    },
    onError: (error: Error) => {
      console.error('총회 생성 실패:', error);
      openAlertModal({
        title: '생성 실패',
        message: error.message || '총회 생성에 실패했습니다.',
        type: 'error',
      });
    },
  });
};

/**
 * 총회 수정
 */
export const useUpdateAssembly = () => {
  const updateAssembly = useAssemblyStore((state) => state.updateAssembly);
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateAssembly & { updated_at?: string } }) => {
      const res = await fetch(`/api/assemblies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) {
          throw new Error('CONFLICT: ' + err.error);
        }
        throw new Error(err.error || '총회 수정 실패');
      }
      const { data } = await res.json();
      return data as Assembly;
    },
    onSuccess: (data) => {
      updateAssembly(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id, data.id] });

      openAlertModal({
        title: '수정 완료',
        message: '총회 정보가 수정되었습니다.',
        type: 'success',
      });
    },
    onError: (error: Error) => {
      console.error('총회 수정 실패:', error);
      openAlertModal({
        title: '수정 실패',
        message: error.message || '총회 수정에 실패했습니다.',
        type: 'error',
      });
    },
  });
};

/**
 * 총회 상태 전이
 */
export const useTransitionAssemblyStatus = () => {
  const updateAssembly = useAssemblyStore((state) => state.updateAssembly);
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const { union } = useSlug();

  return useMutation({
    mutationFn: async ({ assemblyId, status }: { assemblyId: string; status: AssemblyStatus }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '상태 변경 실패');
      }
      const { data } = await res.json();
      return data as Assembly;
    },
    onSuccess: (data) => {
      updateAssembly(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id] });
      queryClient.invalidateQueries({ queryKey: ['assemblies', union?.id, data.id] });
    },
    onError: (error: Error) => {
      console.error('상태 변경 실패:', error);
      openAlertModal({
        title: '상태 변경 실패',
        message: error.message || '상태 변경에 실패했습니다.',
        type: 'error',
      });
    },
  });
};
