'use client';

import React from 'react';
import type { PollOption } from '@/app/_lib/shared/type/assembly.types';

interface BallotElectOptionsProps {
  options: PollOption[];
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
}

/**
 * 선출투표 옵션: 후보자 카드별 라디오 (candidate_name + candidate_info)
 */
export default function BallotElectOptions({
  options,
  selectedOptionId,
  onSelect,
  disabled,
}: BallotElectOptionsProps) {
  const sorted = [...options].sort((a, b) => a.seq_order - b.seq_order);

  return (
    <div className="space-y-2" role="radiogroup" aria-label="선출투표">
      {sorted.map((option) => {
        const isSelected = selectedOptionId === option.id;
        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(option.id)}
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
                  {option.candidate_name || option.label}
                </p>
                {option.candidate_info && (
                  <p className="text-xs text-gray-500 mt-0.5">{option.candidate_info}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
