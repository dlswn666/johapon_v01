'use client';

import React from 'react';
import { Check } from 'lucide-react';

export interface WizardStepConfig {
  step: number;
  label: string;
  description?: string;
}

interface StepWizardProps {
  steps: WizardStepConfig[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
  /** 저장 중 표시 */
  isSaving?: boolean;
}

/**
 * 다단계 위자드 프레임 컴포넌트
 * - lg: 사이드바 + 콘텐츠
 * - md: 축약 사이드바
 * - sm: 원형 스테퍼
 */
export default function StepWizard({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  isSaving,
}: StepWizardProps) {
  return (
    <div>
      {/* 데스크톱: 사이드바 형태 */}
      <nav className="hidden lg:block" aria-label="위자드 단계">
        <ol className="space-y-1">
          {steps.map((s) => {
            const isActive = s.step === currentStep;
            const isCompleted = completedSteps.has(s.step);
            const isDisabled = s.step > currentStep && !isCompleted;
            return (
              <li key={s.step}>
                <button
                  onClick={() => onStepClick(s.step)}
                  disabled={isDisabled}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : isCompleted
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : isDisabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.label}</p>
                    {s.description && (
                      <p className="text-xs text-gray-500 truncate">{s.description}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
        {isSaving && (
          <p className="mt-3 px-4 text-xs text-gray-400">저장 중...</p>
        )}
      </nav>

      {/* 태블릿: 축약 사이드바 */}
      <nav className="hidden md:block lg:hidden" aria-label="위자드 단계">
        <ol className="flex flex-col items-center gap-1">
          {steps.map((s) => {
            const isActive = s.step === currentStep;
            const isCompleted = completedSteps.has(s.step);
            const isDisabled = s.step > currentStep && !isCompleted;
            return (
              <li key={s.step}>
                <button
                  onClick={() => onStepClick(s.step)}
                  disabled={isDisabled}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : isDisabled
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  title={s.label}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.step}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* 모바일: 수평 원형 스테퍼 */}
      <nav className="block md:hidden" aria-label="위자드 단계">
        <ol className="flex items-center justify-center gap-2">
          {steps.map((s) => {
            const isActive = s.step === currentStep;
            const isCompleted = completedSteps.has(s.step);
            const isDisabled = s.step > currentStep && !isCompleted;
            return (
              <li key={s.step}>
                <button
                  onClick={() => onStepClick(s.step)}
                  disabled={isDisabled}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : isDisabled
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-600'
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  title={s.label}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : s.step}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-center text-sm font-medium text-gray-700 mt-2">
          {steps.find((s) => s.step === currentStep)?.label}
        </p>
      </nav>
    </div>
  );
}
