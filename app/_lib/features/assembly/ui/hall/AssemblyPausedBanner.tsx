'use client';

import React, { useState, useEffect } from 'react';

interface AssemblyPausedBannerProps {
  isVisible: boolean;
  pauseReason: string | null;
  pausedAt: string | null;
  maxPauseDuration?: number; // 분 단위, 기본 120
}

export default function AssemblyPausedBanner({
  isVisible,
  pauseReason,
  pausedAt,
  maxPauseDuration = 120,
}: AssemblyPausedBannerProps) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!isVisible || !pausedAt) return;

    const start = new Date(pausedAt).getTime();
    const update = () => {
      const diff = Math.max(0, Date.now() - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isVisible, pausedAt]);

  if (!isVisible) return null;

  const resumeEta = pausedAt
    ? new Date(new Date(pausedAt).getTime() + maxPauseDuration * 60000).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-3">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏸</span>
          <div>
            <p className="font-bold text-sm">총회가 일시적으로 중지되었습니다.</p>
            {pauseReason && (
              <p className="text-xs text-orange-100">사유: {pauseReason}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono text-orange-100">경과: {elapsed}</span>
          {resumeEta && (
            <span className="text-orange-100">{resumeEta} 이내 재개 예정</span>
          )}
        </div>
      </div>
    </div>
  );
}
