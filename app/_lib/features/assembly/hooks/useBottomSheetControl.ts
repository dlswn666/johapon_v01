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

    if (hasNewPoll && activePollIds.length > 0) {
      setSnapPoint(0.8);
    }

    prevPollIdsRef.current = activePollIds;
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
