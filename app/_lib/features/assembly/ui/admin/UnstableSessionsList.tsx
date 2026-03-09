'use client';

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useAttendanceLive } from '@/app/_lib/features/assembly/api/useAttendanceLiveHook';

interface UnstableSessionsListProps {
  assemblyId: string;
}

// 마지막 접속 시각을 "N초/분 전" 형식으로 표시
function formatTimeAgo(lastSeenAt: string): string {
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  return `${Math.floor(diffMin / 60)}시간 전`;
}

export default function UnstableSessionsList({ assemblyId }: UnstableSessionsListProps) {
  const { data, isLoading } = useAttendanceLive(assemblyId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">연결 상태</h3>
        <div className="animate-pulse h-8 bg-gray-100 rounded" />
      </div>
    );
  }

  const unstableSessions = (data?.onlineSessions ?? []).filter(
    (s) => s.status === 'UNSTABLE' || s.status === 'DISCONNECTED'
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">연결 상태</h3>
        {unstableSessions.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            {unstableSessions.length}명 불안정
          </span>
        )}
      </div>

      {unstableSessions.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Wifi className="w-4 h-4" />
          <span>모든 사용자 정상 접속 중</span>
        </div>
      ) : (
        <ul className="space-y-2" aria-live="polite">
          {unstableSessions.map((session) => (
            <li key={session.snapshotId} className="flex items-center gap-2 text-sm">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  session.status === 'UNSTABLE' ? 'bg-yellow-400' : 'bg-red-500'
                }`}
              />
              <span className="flex-1 text-gray-700 truncate">{session.memberName}</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {session.status === 'DISCONNECTED' && <WifiOff className="w-3 h-3" />}
                {formatTimeAgo(session.lastSeenAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
