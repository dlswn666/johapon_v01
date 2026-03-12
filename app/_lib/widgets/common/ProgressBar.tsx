'use client';

import React from 'react';

interface ProgressBarProps {
  /** 0-100 */
  value: number;
  /** 라벨 (예: "2/3") */
  label?: string;
  /** 색상 클래스 */
  colorClass?: string;
  className?: string;
}

/** 서명/발송 진행률 바 */
export default function ProgressBar({
  value,
  label,
  colorClass = 'bg-blue-500',
  className = '',
}: ProgressBarProps) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-xs font-medium text-gray-700">{clampedValue}%</span>
        </div>
      )}
      <div
        className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `${clampedValue}% 완료`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
