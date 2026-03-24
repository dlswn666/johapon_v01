'use client';

import React from 'react';
import type { PollOption } from '@/app/_lib/shared/type/assembly.types';

interface BallotApproveOptionsProps {
  options: PollOption[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

/**
 * 찬반투표 옵션: 찬성 / 반대 / 기권 라디오 버튼 (터치 친화적)
 */
export default function BallotApproveOptions({
  options,
  selectedOptionId,
  onSelect,
  disabled,
}: BallotApproveOptionsProps) {
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
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="찬반투표">
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
            className={`flex flex-col items-center justify-center min-h-[56px] rounded-lg border-2 transition-colors font-medium text-sm ${
              isSelected
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
