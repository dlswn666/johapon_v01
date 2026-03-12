'use client';

import React from 'react';
import { Check, X, Minus } from 'lucide-react';

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'complete' | 'incomplete' | 'pending';
  detail?: string;
}

interface ChecklistGroupProps {
  title: string;
  items: ChecklistItem[];
  className?: string;
}

/** 준비 현황 체크리스트 */
export default function ChecklistGroup({ title, items, className = '' }: ChecklistGroupProps) {
  const completedCount = items.filter((i) => i.status === 'complete').length;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">
          {completedCount}/{items.length} 완료
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">
              {item.status === 'complete' && (
                <Check className="w-4 h-4 text-green-500" />
              )}
              {item.status === 'incomplete' && (
                <X className="w-4 h-4 text-red-500" />
              )}
              {item.status === 'pending' && (
                <Minus className="w-4 h-4 text-gray-400" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`text-sm ${
                  item.status === 'complete' ? 'text-gray-600' : 'text-gray-900'
                }`}
              >
                {item.label}
              </p>
              {item.detail && (
                <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
