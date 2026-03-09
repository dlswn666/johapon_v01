'use client';

import { useQuery } from '@tanstack/react-query';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

export interface OnlineSession {
  logId: string;
  snapshotId: string;
  memberName: string;
  entryAt: string;
  lastSeenAt: string;
  status: 'ACTIVE' | 'UNSTABLE' | 'DISCONNECTED';
  attendanceType: string;
}

export interface AttendanceLiveData {
  totalMembers: number;
  attendance: {
    onsite: number;
    online: number;
    writtenProxy: number;
    total: number;
  };
  onlineSessions: OnlineSession[];
  unstableCount: number;
}

/**
 * 실시간 출석 현황 조회 (관리자용, 5초 자동 갱신)
 */
export const useAttendanceLive = (assemblyId: string | undefined) => {
  const { union } = useSlug();

  return useQuery({
    queryKey: ['attendanceLive', union?.id, assemblyId],
    queryFn: async () => {
      const res = await fetch(`/api/assemblies/${assemblyId}/attendance/live`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '실시간 출석 현황 조회 실패');
      }
      const { data } = await res.json();
      return data as AttendanceLiveData;
    },
    enabled: !!assemblyId && !!union?.id,
    refetchInterval: 5000,
  });
};
