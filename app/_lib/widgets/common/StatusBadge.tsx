'use client';

import React from 'react';

interface StatusBadgeProps {
  label: string;
  colorClass: string;
  className?: string;
}

/** 범용 상태 뱃지 (문서/알림/서명 등) */
export default function StatusBadge({ label, colorClass, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
