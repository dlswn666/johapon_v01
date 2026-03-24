'use client';

import React from 'react';
import type { PollOption } from '@/app/_lib/shared/type/assembly.types';

interface BallotElectOptionsProps {
  options: PollOption[];
  /** 단일 선출 (electCount=1)일 때 사용 */
  selectedOptionId?: string | null;
  onSelect?: (optionId: string) => void;
  /** 복수 선출 (electCount>1)일 때 사용 */
  electCount?: number;
  selectedOptionIds?: string[];
  onMultiSelect?: (optionIds: string[]) => void;
  disabled?: boolean;
}

/**
 * 선출투표 옵션: electCount=1이면 라디오, electCount>1이면 체크박스 다중선택
 */
export default function BallotElectOptions({
  options,
  selectedOptionId,
  onSelect,
  electCount = 1,
  selectedOptionIds = [],
  onMultiSelect,
  disabled,
}: BallotElectOptionsProps) {
  const sorted = [...options].sort((a, b) => a.seq_order - b.seq_order);
  const isMulti = electCount > 1;

  // --- 단일 선출 (라디오) ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (isMulti) return;
    const len = sorted.length;
    let nextIdx: number | null = null;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      nextIdx = (idx + 1) % len;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + len) % len;
    }

    if (nextIdx !== null) {
      e.preventDefault();
      onSelect?.(sorted[nextIdx].id);
      const group = e.currentTarget.parentElement as HTMLElement;
      const buttons = group.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons[nextIdx]?.focus();
    }
  };

  // --- 복수 선출 (체크박스) ---
  const handleMultiToggle = (optionId: string) => {
    if (!onMultiSelect) return;
    const isSelected = selectedOptionIds.includes(optionId);
    if (isSelected) {
      onMultiSelect(selectedOptionIds.filter((id) => id !== optionId));
    } else {
      if (selectedOptionIds.length >= electCount) return;
      onMultiSelect([...selectedOptionIds, optionId]);
    }
  };

  const maxReached = selectedOptionIds.length >= electCount;

  if (isMulti) {
    return (
      <div className="space-y-2" role="group" aria-label="선출투표">
        <p className="text-sm text-gray-500 mb-1" aria-live="polite" aria-atomic="true">
          {selectedOptionIds.length}/{electCount}명 선택
        </p>
        {sorted.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          const isDisabledOption = disabled || (!isSelected && maxReached);
          return (
            <button
              key={option.id}
              role="checkbox"
              aria-checked={isSelected}
              tabIndex={0}
              disabled={isDisabledOption}
              onClick={() => handleMultiToggle(option.id)}
              className={`w-full text-left px-4 py-3 min-h-[48px] rounded-lg border-2 transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isDisabledOption ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
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

  // --- 단일 선출 (기존 라디오) ---
  return (
    <div className="space-y-2" role="radiogroup" aria-label="선출투표">
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
            onClick={() => onSelect?.(option.id)}
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
