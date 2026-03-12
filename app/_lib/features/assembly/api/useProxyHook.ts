'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { supabase } from '@/app/_lib/shared/supabase/client';

export interface ProxySnapshot {
  id: string;
  member_name: string;
  proxy_user_id: string | null;
  proxy_name: string | null;
  proxy_authorized_at: string | null;
  proxy_document_url: string | null;
}

/**
 * 대리인 목록 조회 (proxy 설정된 스냅샷)
 */
export const useProxyList = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['proxyList', union?.id, assemblyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assembly_member_snapshots')
        .select('id, member_name, member_phone, proxy_user_id, proxy_name, proxy_authorized_at, proxy_document_url')
        .eq('assembly_id', assemblyId!)
        .eq('union_id', union!.id)
        .eq('is_active', true)
        .not('proxy_user_id', 'is', null)
        .order('proxy_authorized_at', { ascending: false });

      if (error) throw new Error('대리인 목록 조회 실패');
      return data || [];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 대리인 등록
 */
export const useRegisterProxy = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      snapshotId,
      proxyUserId,
      proxyName,
      proxyDocumentUrl,
    }: {
      snapshotId: string;
      proxyUserId: string;
      proxyName: string;
      proxyDocumentUrl?: string;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/snapshots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_id: snapshotId,
          proxy_user_id: proxyUserId,
          proxy_name: proxyName,
          proxy_document_url: proxyDocumentUrl || null,
        }),
      });
      if (!res.ok) {
        let errorMessage = '대리인 등록에 실패했습니다.';
        try { const err = await res.json(); errorMessage = err.error || errorMessage; } catch { /* 기본 메시지 사용 */ }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as ProxySnapshot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxyList', union?.id, assemblyId] });
      openAlertModal({ title: '대리인 등록', message: '대리인이 등록되었습니다.', type: 'success' });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '대리인 등록 실패', message: error.message, type: 'error' });
    },
  });
};

/**
 * 대리인 해제
 */
export const useRevokeProxy = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({ snapshotId }: { snapshotId: string }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/snapshots`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot_id: snapshotId,
          proxy_user_id: null,
          proxy_name: null,
        }),
      });
      if (!res.ok) {
        let errorMessage = '대리인 해제에 실패했습니다.';
        try { const err = await res.json(); errorMessage = err.error || errorMessage; } catch { /* 기본 메시지 사용 */ }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxyList', union?.id, assemblyId] });
      openAlertModal({ title: '대리인 해제', message: '대리인이 해제되었습니다.', type: 'success' });
    },
    onError: (error: Error) => {
      openAlertModal({ title: '대리인 해제 실패', message: error.message, type: 'error' });
    },
  });
};
