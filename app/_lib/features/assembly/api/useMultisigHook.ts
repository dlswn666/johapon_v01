'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type { MultisigActionType, MultisigApproval, MultisigSignerRole } from '@/app/_lib/shared/type/assembly.types';

/**
 * 다중 승인(Multisig) 훅
 */

// 대기 중인 multisig 목록 조회
export const usePendingMultisig = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['multisig', 'pending', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/multisig`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Multisig 조회 실패');
      }
      const { data } = await res.json();
      return data as MultisigApproval[];
    },
    enabled: !!assemblyId,
  });
};

// 특정 multisig 상세 조회
export const useMultisigDetail = (assemblyId: string, approvalId: string | undefined) => {
  return useQuery({
    queryKey: ['multisig', 'detail', assemblyId, approvalId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/multisig/${approvalId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Multisig 상세 조회 실패');
      }
      const { data } = await res.json();
      return data as MultisigApproval;
    },
    enabled: !!approvalId,
  });
};

// 새 multisig 요청 생성
export const useCreateMultisig = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { action_type: MultisigActionType; payload?: Record<string, unknown> }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/multisig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Multisig 생성 실패');
      }
      const { data } = await res.json();
      return data as { approval_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multisig', 'pending', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '다중 승인 요청 실패', message: error.message, type: 'error' });
    },
  });
};

// multisig 서명
export const useSignMultisig = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      approvalId,
      signerRole,
      signatureHash,
    }: {
      approvalId: string;
      signerRole: MultisigSignerRole;
      signatureHash?: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/multisig/${approvalId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signer_role: signerRole, signature_hash: signatureHash }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '서명 실패');
      }
      const { data } = await res.json();
      return data as { signed: boolean; completed: boolean; current_count: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multisig', 'pending', assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['multisig', 'detail', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '서명 실패', message: error.message, type: 'error' });
    },
  });
};
