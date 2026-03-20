'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';

/**
 * 비상 제어 훅 (일시정지/재개/투표연장/서면전환)
 * 각 액션은 multisig 요청 생성으로 실행됨
 */

// 총회 일시정지
export const usePauseAssembly = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { reason: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/emergency/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '일시정지 요청 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly', assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['multisig', 'pending', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '일시정지 요청 실패', message: error.message, type: 'error' });
    },
  });
};

// 총회 재개
export const useResumeAssembly = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/emergency/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '재개 요청 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '재개 실패', message: error.message, type: 'error' });
    },
  });
};

// 투표 연장
export const useExtendVoting = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { extensionMinutes: number; reason: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/emergency/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '투표 연장 요청 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly', assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['multisig', 'pending', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '투표 연장 요청 실패', message: error.message, type: 'error' });
    },
  });
};

// 서면투표 전환
export const useWrittenTransition = (assemblyId: string) => {
  const openAlertModal = useModalStore((state) => state.openAlertModal);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { reason: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/emergency/written-transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '서면 전환 요청 실패');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly', assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['multisig', 'pending', assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '서면 전환 요청 실패', message: error.message, type: 'error' });
    },
  });
};
