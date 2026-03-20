'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import type { AssemblyMemberSnapshot } from '@/app/_lib/shared/type/assembly.types';

/**
 * 유권자 명부 관리 훅
 */

// 스냅샷 생성 전 자격자 미리보기
export const useVoterRollPreview = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['voterRoll', 'preview', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/snapshots/preview`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '유권자 명부 미리보기 조회 실패');
      }
      const { data } = await res.json();
      return data as { members: AssemblyMemberSnapshot[]; total: number; eligible: number };
    },
    enabled: !!assemblyId,
  });
};

// 스냅샷 목록 조회
export const useSnapshotList = (assemblyId: string | undefined) => {
  return useQuery({
    queryKey: ['snapshots', assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/snapshots`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '스냅샷 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as { id: string; created_at: string; is_locked: boolean; member_count: number }[];
    },
    enabled: !!assemblyId,
  });
};

// 스냅샷 변경분 조회
export const useSnapshotDiff = (assemblyId: string, baseSnapshotId: string | undefined) => {
  return useQuery({
    queryKey: ['snapshots', 'diff', assemblyId, baseSnapshotId],
    queryFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/snapshots/diff?baseId=${baseSnapshotId}`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '스냅샷 비교 조회 실패');
      }
      const { data } = await res.json();
      return data as { added: string[]; removed: string[]; total_changes: number };
    },
    enabled: !!baseSnapshotId,
  });
};

// 스냅샷 생성
export const useCreateSnapshot = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '스냅샷 생성 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots', assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['voterRoll', 'preview', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '스냅샷 생성 실패', message: error.message, type: 'error' });
    },
  });
};

// 스냅샷 확정 (multisig 생성)
export const useLockSnapshot = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ snapshotId }: { snapshotId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/snapshots/${snapshotId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '명부 확정 요청 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots', assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['multisig', 'pending', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '명부 확정 요청 실패', message: error.message, type: 'error' });
    },
  });
};

// CSV 내보내기
export const useExportSnapshotCsv = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/assemblies/${assemblyId}/snapshots/export?format=csv`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'CSV 내보내기 실패');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voters_${assemblyId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (error: Error) => {
      openAlertModal({ title: 'CSV 내보내기 실패', message: error.message, type: 'error' });
    },
  });
};
