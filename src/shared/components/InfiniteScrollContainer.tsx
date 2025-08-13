'use client';

import React, { ReactNode } from 'react';

interface InfiniteScrollContainerProps {
    /** 렌더링할 아이템들 */
    children: ReactNode;
    /** 더 많은 데이터가 있는지 여부 */
    hasMore: boolean;
    /** 로딩 상태 */
    loading: boolean;
    /** 에러 상태 */
    error?: string | null;
    /** 무한 스크롤 감지를 위한 ref */
    observerRef: (node: HTMLElement | null) => void;
    /** 로딩 중일 때 표시할 메시지 */
    loadingMessage?: string;
    /** 모든 데이터를 불러왔을 때 표시할 메시지 */
    endMessage?: string;
    /** 스크롤 안내 메시지 */
    scrollHintMessage?: string;
    /** 컨테이너 클래스명 */
    className?: string;
}

export default function InfiniteScrollContainer({
    children,
    hasMore,
    loading,
    error,
    observerRef,
    loadingMessage = '더 많은 데이터를 불러오는 중...',
    endMessage = '모든 데이터를 불러왔습니다.',
    scrollHintMessage = '스크롤하여 더 많은 데이터 보기',
    className = 'space-y-4',
}: InfiniteScrollContainerProps) {
    // 에러가 있는 경우 children만 표시 (에러는 상위에서 처리)
    if (error) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div className={className}>
            {children}

            {/* 무한 스크롤 트리거 */}
            {hasMore && (
                <div ref={observerRef} className="flex justify-center py-8">
                    {loading ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                            <span>{loadingMessage}</span>
                        </div>
                    ) : (
                        <div className="text-gray-400 text-sm">{scrollHintMessage}</div>
                    )}
                </div>
            )}

            {/* 더 이상 데이터가 없을 때 */}
            {!hasMore && React.Children.count(children) > 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">{endMessage}</div>
            )}
        </div>
    );
}
