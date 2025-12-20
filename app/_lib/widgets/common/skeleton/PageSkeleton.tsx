'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
    /** 추가 스타일 클래스 */
    className?: string;
}

/**
 * PageSkeleton 위젯
 * 
 * 페이지 전체 로딩 시 표시되는 스켈레톤입니다.
 * 헤더, 제목, 콘텐츠 영역을 포함합니다.
 */
export function PageSkeleton({ className }: PageSkeletonProps) {
    return (
        <div className={cn('container mx-auto max-w-[1280px] px-4 py-8', className)}>
            <div className="max-w-4xl mx-auto space-y-8">
                {/* 페이지 제목 */}
                <Skeleton className="h-10 w-64" />

                {/* 폼 영역 */}
                <div className="space-y-6">
                    {/* 입력 필드 1 */}
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-12 w-full rounded-[12px]" />
                    </div>

                    {/* 체크박스 영역 */}
                    <div className="flex gap-4">
                        <Skeleton className="h-20 flex-1 rounded-[12px]" />
                        <Skeleton className="h-20 flex-1 rounded-[12px]" />
                    </div>

                    {/* 파일 업로드 영역 */}
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-32 w-full rounded-lg" />
                    </div>

                    {/* 텍스트 에디터 영역 */}
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-64 w-full rounded-lg" />
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-[#CCCCCC]">
                        <Skeleton className="h-12 w-24 rounded-md" />
                        <Skeleton className="h-12 w-24 rounded-md" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PageSkeleton;

