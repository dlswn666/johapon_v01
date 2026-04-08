'use client';

import React from 'react';
import type { PollOption } from '@/app/_lib/shared/type/assembly.types';
import { formatKoreanWon } from '@/app/_lib/shared/utils/formatWon';

interface BallotSelectOptionsProps {
  options: PollOption[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

/**
 * 시공사/업체 선정 옵션: 업체 카드별 라디오 (company_name + bid_amount + company_info)
 */
export default function BallotSelectOptions({
  options,
  selectedOptionId,
  onSelect,
  disabled,
}: BallotSelectOptionsProps) {
  const sorted = [...options].sort((a, b) => a.seq_order - b.seq_order);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    const len = sorted.length;
    let nextIdx: number | null = null;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      nextIdx = (idx + 1) % len;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + len) % len;
    }

    if (nextIdx !== null) {
      e.preventDefault();
      onSelect(sorted[nextIdx].id);
      const group = (e.currentTarget.parentElement as HTMLElement);
      const buttons = group.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons[nextIdx]?.focus();
    }
  };

  return (
    <div className="space-y-2" role="radiogroup" aria-label="업체 선정">
      {sorted.map((option, idx) => {
        const isSelected = selectedOptionId === option.id;
        const isRovingTarget = selectedOptionId ? isSelected : idx === 0;
        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isRovingTarget ? 0 : -1}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`w-full text-left px-4 py-3 min-h-[48px] rounded-lg border-2 transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {option.company_name || option.label}
                </p>
                {option.bid_amount && (
                  <p className="text-sm text-blue-600 font-medium mt-0.5">
                    입찰가: {formatKoreanWon(option.bid_amount)}
                  </p>
                )}
                {option.company_info && (
                  <p className="text-xs text-gray-500 mt-0.5">{option.company_info}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
