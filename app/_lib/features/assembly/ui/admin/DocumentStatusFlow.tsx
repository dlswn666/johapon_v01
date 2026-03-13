'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { DocumentStatus } from '@/app/_lib/shared/type/assembly.types';
import { DOCUMENT_STATUS_LABELS } from '@/app/_lib/shared/type/assembly.types';

interface DocumentStatusFlowProps {
  currentStatus: DocumentStatus;
  className?: string;
}

const STATUS_FLOW: DocumentStatus[] = [
  'DRAFT', 'GENERATED', 'REVIEW', 'APPROVED',
  'SIGNED_PARTIAL', 'SIGNED_COMPLETE', 'SEALED',
];

/** 문서 상태 흐름 시각화 (수평 스텝 바) */
export default function DocumentStatusFlow({ currentStatus, className = '' }: DocumentStatusFlowProps) {
  // VOID/SUPERSEDED 특수 처리
  if (currentStatus === 'VOID') {
    return (
      <div className={`flex items-center justify-center py-3 px-4 bg-red-50 rounded-lg ${className}`}>
        <span className="text-sm font-medium text-red-600">무효 처리됨</span>
      </div>
    );
  }

  if (currentStatus === 'SUPERSEDED') {
    return (
      <div className={`flex items-center justify-center py-3 px-4 bg-gray-100 rounded-lg ${className}`}>
        <span className="text-sm font-medium text-gray-500 line-through">대체됨</span>
      </div>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div
      className={`${className}`}
      role="progressbar"
      aria-valuenow={currentIndex + 1}
      aria-valuemin={1}
      aria-valuemax={STATUS_FLOW.length}
      aria-label={`문서 상태: ${DOCUMENT_STATUS_LABELS[currentStatus]}`}
    >
      <div className="flex items-center">
        {STATUS_FLOW.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <React.Fragment key={status}>
              {/* 노드 */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span
                  className={`hidden md:block text-[10px] mt-1 whitespace-nowrap ${
                    isCurrent ? 'text-blue-600 font-medium' : isCompleted ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {DOCUMENT_STATUS_LABELS[status]}
                </span>
              </div>

              {/* 연결선 */}
              {index < STATUS_FLOW.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 ${
                    index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 모바일: 현재 상태 텍스트 */}
      <p className="md:hidden text-center text-xs text-blue-600 font-medium mt-2">
        {DOCUMENT_STATUS_LABELS[currentStatus]}
      </p>
    </div>
  );
}
