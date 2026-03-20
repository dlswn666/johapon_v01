'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type { AssemblyRole, AssemblyRoleType } from '@/app/_lib/shared/type/assembly.types';

/**
 * 총회 역할 관리 훅
 */

// 역할 목록 조회 (활성 역할만)
export const useAssemblyRoles = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['assemblyRoles', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/roles`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '역할 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as AssemblyRole[];
    },
    enabled: !!assemblyId,
  });
};

// 내 역할 조회
export const useMyAssemblyRole = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['assemblyRoles', 'my', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/roles?my=true`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '내 역할 조회 실패');
      }
      const { data } = await res.json();
      return data as AssemblyRole | null;
    },
    enabled: !!assemblyId,
  });
};

// 역할 배정
export const useAssignRole = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { user_id: string; role: AssemblyRoleType }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '역할 배정 실패');
      }
      const { data } = await res.json();
      return data as AssemblyRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblyRoles', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '역할 배정 실패', message: error.message, type: 'error' });
    },
  });
};

// 역할 해제
export const useRevokeRole = (assemblyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { roleId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: body.roleId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '역할 해제 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblyRoles', assemblyId] });
    },
  });
};
