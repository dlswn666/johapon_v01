'use client';

import { useEffect, useRef, useState } from 'react';
import { Vote } from 'lucide-react';
import AssemblyPausedBanner from './AssemblyPausedBanner';

export interface VoteNotificationBannerProps {
  activePollIds: string[];
  paused?: boolean;
  pauseReason?: string | null;
  pausedAt?: string | null;
  writtenTransition?: boolean;
}

/**
 * 투표 알림 배너
 * activePollIds 변화 시 "투표가 시작되었습니다" 표시 (3초 후 자동 숨김)
 * heartbeat paused/written_transition 응답 처리
 */
export default function VoteNotificationBanner({
  activePollIds,
  paused = false,
  pauseReason = null,
  pausedAt = null,
  writtenTransition = false,
}: VoteNotificationBannerProps) {
  const [visible, setVisible] = useState(false);
  const prevIdsRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevIds = prevIdsRef.current;
    const newIds = activePollIds.filter((id) => !prevIds.includes(id));
    prevIdsRef.current = activePollIds;

    if (newIds.length > 0) {
      // requestAnimationFrame으로 래핑하여 effect 내 동기 setState 방지
      requestAnimationFrame(() => {
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(false), 3000);
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activePollIds]);

  return (
    <>
      {/* 일시정지 배너 */}
      <AssemblyPausedBanner isVisible={paused} pauseReason={pauseReason} pausedAt={pausedAt} />

      {/* 서면전환 배너 */}
      {writtenTransition && (
        <div
          className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-2"
          role="alert"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-blue-700">
            서면투표로 전환되었습니다. 현장에서 서면투표를 진행해 주세요.
          </p>
        </div>
      )}

      {/* 투표 시작 배너 */}
      {visible && !paused && !writtenTransition && (
        <div
          className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300"
          role="alert"
          aria-live="assertive"
        >
          <Vote className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium text-green-700">투표가 시작되었습니다</p>
        </div>
      )}
    </>
  );
}
