'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning' | 'success' | 'error';
  className?: string;
}

const VARIANT_STYLES = {
  default: 'bg-blue-50 border-blue-200 text-blue-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  error: 'bg-red-50 border-red-200 text-red-700',
};

/** 맥락 안내 카드 */
export default function InfoCard({
  title,
  children,
  variant = 'default',
  className = '',
}: InfoCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${VARIANT_STYLES[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <h4 className="text-sm font-semibold">{title}</h4>
          <div className="mt-1 text-sm opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}
