'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type { DelegationRecord, ProxyRelationship } from '@/app/_lib/shared/type/assembly.types';

/**
 * 조합원용 위임 상태 머신 훅
 */

// 내가 위임한 기록 조회
export const useMyDelegation = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['delegation', 'my', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/delegation/my`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '위임 조회 실패');
      }
      const { data } = await res.json();
      return data as DelegationRecord | null;
    },
    enabled: !!assemblyId,
  });
};

// 내게 온 위임 요청 (PENDING 상태)
export const usePendingDelegationsForMe = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['delegation', 'incoming', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/delegation/incoming`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '위임 요청 조회 실패');
      }
      const { data } = await res.json();
      return data as DelegationRecord[];
    },
    enabled: !!assemblyId,
  });
};

// 위임 생성
export const useCreateDelegation = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      delegatePhone: string;
      delegateName: string;
      relationship: ProxyRelationship;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/delegation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '위임 생성 실패');
      }
      const { data } = await res.json();
      return data as DelegationRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation', 'my', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '위임 생성 실패', message: error.message, type: 'error' });
    },
  });
};

// 위임 수락
export const useAcceptDelegation = (assemblyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { delegationId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/delegation/${body.delegationId}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '위임 수락 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation', 'incoming', assemblyId] });
    },
  });
};

// 위임 취소/철회
export const useRevokeDelegation = (assemblyId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { delegationId: string; reason?: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/delegation/${body.delegationId}/revoke`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: body.reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '위임 취소 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegation', 'my', assemblyId] });
    },
  });
};

// 관리자용 위임 전체 현황 조회
export const useAdminDelegationList = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['delegation', 'admin', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/delegation/admin`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '위임 현황 조회 실패');
      }
      const { data } = await res.json();
      return data as DelegationRecord[];
    },
    enabled: !!assemblyId,
  });
};
