'use client';

import { useEffect, useRef, useState } from 'react';
import { Vote } from 'lucide-react';

export interface VoteNotificationBannerProps {
  activePollIds: string[];
}

/**
 * 투표 알림 배너
 * activePollIds 변화 시 "투표가 시작되었습니다" 표시 (3초 후 자동 숨김)
 */
export default function VoteNotificationBanner({ activePollIds }: VoteNotificationBannerProps) {
  const [visible, setVisible] = useState(false);
  const prevIdsRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevIds = prevIdsRef.current;
    const newIds = activePollIds.filter((id) => !prevIds.includes(id));
    prevIdsRef.current = activePollIds;

    if (newIds.length > 0) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activePollIds]);

  if (!visible) return null;

  return (
    <div
      className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <Vote className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
      <p className="text-sm font-medium text-green-700">투표가 시작되었습니다</p>
    </div>
  );
}
