'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FormSkeletonProps {
    /** 추가 스타일 클래스 */
    className?: string;
    /** 입력 필드 개수 */
    inputCount?: number;
    /** 텍스트 에디터 포함 여부 */
    hasEditor?: boolean;
    /** 버튼 영역 포함 여부 */
    hasButtons?: boolean;
}

/**
 * FormSkeleton 위젯
 * 
 * 폼 영역 로딩 시 표시되는 스켈레톤입니다.
 * 입력 필드, 에디터, 버튼 영역을 유동적으로 구성할 수 있습니다.
 */
export function FormSkeleton({
    className,
    inputCount = 2,
    hasEditor = true,
    hasButtons = true,
}: FormSkeletonProps) {
    return (
        <div className={cn('space-y-6', className)}>
            {/* 입력 필드들 */}
            {Array.from({ length: inputCount }).map((_, index) => (
                <div key={index} className="space-y-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-12 w-full rounded-[12px]" />
                </div>
            ))}

            {/* 텍스트 에디터 영역 */}
            {hasEditor && (
                <div className="space-y-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            )}

            {/* 버튼 영역 */}
            {hasButtons && (
                <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                    <Skeleton className="h-12 w-24 rounded-md" />
                    <Skeleton className="h-12 w-24 rounded-md" />
                </div>
            )}
        </div>
    );
}

export default FormSkeleton;

