'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import useModalStore from '@/app/_lib/shared/stores/modal/useModalStore';
import { AssemblyAttendanceLog } from '@/app/_lib/shared/type/assembly.types';

export interface QrTokenData {
  assemblyId: string;
  snapshotId: string;
  timestamp: number;
  hmac: string;
}

/**
 * 출석 로그 목록 조회 (관리자용)
 */
export const useAttendanceList = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['attendance', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/attendance`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '출석 목록 조회 실패');
      }
      const { data } = await res.json();
      return data as AssemblyAttendanceLog[];
    },
    enabled: !!assemblyId && !!union?.id,
  });
};

/**
 * 체크인/체크아웃 기록
 */
export const useRecordAttendance = (assemblyId: string) => {
  const queryClient = useQueryClient();
  const { union } = useSlug();
  const openAlertModal = useModalStore((state) => state.openAlertModal);

  return useMutation({
    mutationFn: async ({
      snapshotId,
      attendanceType,
      action,
      qrData,
    }: {
      snapshotId: string;
      attendanceType: 'ONLINE' | 'ONSITE' | 'WRITTEN_PROXY';
      action: 'checkin' | 'checkout';
      qrData?: unknown;
    }) => {
      const res = await fetch(`/api/assemblies/${assemblyId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          qrData
            ? { snapshot_id: snapshotId, attendance_type: attendanceType, action, qr_data: qrData }
            : { snapshot_id: snapshotId, attendance_type: attendanceType, action }
        ),
      });
      if (!res.ok) {
        let errorMessage = '출석 처리에 실패했습니다.';
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      const { data } = await res.json();
      return data as AssemblyAttendanceLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', union?.id, assemblyId] });
      queryClient.invalidateQueries({ queryKey: ['quorum', union?.id, assemblyId] });
    },
    onError: (error: Error) => {
      openAlertModal({
        title: '출석 처리 실패',
        message: error.message,
        type: 'error',
      });
    },
  });
};

/**
 * QR 토큰 생성 (관리자용)
 */
export const useGenerateQrToken = (assemblyId: string | undefined, snapshotId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['qrToken', union?.id, assemblyId, snapshotId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/qr-token?snapshotId=${snapshotId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'QR 토큰 생성 실패');
      }
      const { data } = await res.json();
      return data as QrTokenData;
    },
    enabled: !!assemblyId && !!snapshotId && !!union?.id,
    staleTime: 4 * 60 * 1000, // 4분 (5분 만료 전)
  });
};
