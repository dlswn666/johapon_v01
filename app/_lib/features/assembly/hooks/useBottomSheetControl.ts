'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseBottomSheetControlReturn {
  snapPoint: number;
  setSnapPoint: (point: number) => void;
  expandForVote: () => void;
  collapse: () => void;
  expand: () => void;
}

export const useBottomSheetControl = (activePollIds: string[]): UseBottomSheetControlReturn => {
  const [snapPoint, setSnapPoint] = useState(0.5);
  const prevPollIdsRef = useRef<string[]>([]);

  // 새 OPEN 투표 발견 시 자동 확장
  useEffect(() => {
    const prevIds = new Set(prevPollIdsRef.current);
    const hasNewPoll = activePollIds.some((id) => !prevIds.has(id));

    prevPollIdsRef.current = activePollIds;

    if (hasNewPoll && activePollIds.length > 0) {
      // requestAnimationFrame으로 래핑하여 effect 내 동기 setState 방지
      requestAnimationFrame(() => setSnapPoint(0.8));
    }
  }, [activePollIds]);

  const expandForVote = useCallback(() => setSnapPoint(0.8), []);
  const collapse = useCallback(() => setSnapPoint(0.5), []);
  const expand = useCallback(() => setSnapPoint(1.0), []);

  return {
    snapPoint,
    setSnapPoint,
    expandForVote,
    collapse,
    expand,
  };
};
