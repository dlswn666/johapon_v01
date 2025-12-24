'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Notice } from '@/app/_lib/shared/type/database.types';

interface NoticePopupProps {
    notice: Pick<Notice, 'id' | 'title' | 'content'>;
    unionName: string;
    onClose?: () => void;
    className?: string;
    /** 팝업 위치 오프셋 (여러 팝업 중첩 시 사용) */
    offsetIndex?: number;
}

/**
 * 24시간 동안 숨김 여부 확인
 */
const isHiddenFor24Hours = (noticeId: number): boolean => {
    if (typeof window === 'undefined') return false;
    
    const hiddenAt = localStorage.getItem(`notice_popup_hidden_${noticeId}`);
    if (!hiddenAt) return false;
    
    const hiddenTime = parseInt(hiddenAt, 10);
    const now = Date.now();
    const diff = now - hiddenTime;
    
    // 24시간 = 86400000ms
    return diff < 24 * 60 * 60 * 1000;
};

/**
 * 24시간 동안 숨기기
 */
const hideFor24Hours = (noticeId: number): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`notice_popup_hidden_${noticeId}`, Date.now().toString());
};

/**
 * 공지사항 팝업 위젯
 * - 화면에 떠있는 팝업 형태 (모달 아님)
 * - 24시간 동안 안보이기 기능 포함
 */
export function NoticePopup({
    notice,
    unionName,
    onClose,
    className,
    offsetIndex = 0,
}: NoticePopupProps) {
    // 초기 상태를 함수로 설정하여 useEffect 내 setState 회피
    const [isVisible, setIsVisible] = useState(() => {
        if (typeof window === 'undefined') return false;
        return !isHiddenFor24Hours(notice.id);
    });
    const [hideFor24HoursChecked, setHideFor24HoursChecked] = useState(false);

    // 닫기 핸들러
    const handleClose = () => {
        if (hideFor24HoursChecked) {
            hideFor24Hours(notice.id);
        }
        setIsVisible(false);
        onClose?.();
    };

    // 숨김 상태면 렌더링하지 않음
    if (!isVisible) return null;

    // 팝업 위치 계산 (여러 팝업 중첩 시 오프셋 적용)
    // 모바일에서는 중앙 정렬, 데스크탑(sm 이상)에서만 오프셋 적용
    const desktopTopOffset = 100 + offsetIndex * 30;
    const desktopLeftOffset = 100 + offsetIndex * 30;

    return (
        <div
            className={cn(
                'fixed z-50 bg-white rounded-lg shadow-2xl overflow-hidden',
                'w-[calc(100%-32px)] sm:w-[500px]', // 모바일에서는 전체 너비에서 여백 제외, sm 이상부터 고정 너비
                'left-0 right-0 mx-auto sm:left-auto sm:right-auto', // 모바일에서는 수평 중앙 정렬
                'top-4 sm:top-auto', // 모바일에서는 상단 고정
                'animate-in fade-in slide-in-from-top-4 duration-300',
                className
            )}
            style={{
                // sm 미만(모바일)에서는 style의 top, left 무시 (클래스로 제어)
                // sm 이상(데스크탑)에서만 오프셋 적용
                ...(typeof window !== 'undefined' && window.innerWidth >= 640 ? {
                    top: `${desktopTopOffset}px`,
                    left: `${desktopLeftOffset}px`,
                } : {})
            }}
        >
            {/* 팝업 헤더 바 */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-800">
                    {unionName} 공지사항
                </h3>
                <button
                    onClick={handleClose}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                    aria-label="팝업 닫기"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>

            {/* 컨텐트 영역 */}
            <div className="px-4 py-4 max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
                {/* 게시물 타이틀 */}
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    {notice.title}
                </h4>

                {/* 게시물 내용 */}
                <div
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: notice.content }}
                />
            </div>

            {/* 팝업 푸터 바 */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1e2939]">
                {/* 24시간 동안 안보기 체크박스 */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                        checked={hideFor24HoursChecked}
                        onCheckedChange={(checked) => setHideFor24HoursChecked(checked === true)}
                        className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#1e2939]"
                    />
                    <span className="text-sm text-white">24시간 동안 안보기</span>
                </label>

                {/* 닫기 버튼 */}
                <button
                    onClick={handleClose}
                    className="text-sm text-white hover:text-gray-300 transition-colors font-medium cursor-pointer"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}

export default NoticePopup;

