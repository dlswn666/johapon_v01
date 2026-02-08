'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/app/_lib/shared/hooks/useFocusTrap';

interface ApprovalPendingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
}

/**
 * 승인 대기 모달
 * 회원가입 신청 후 관리자 승인을 기다리는 사용자에게 표시
 */
export function ApprovalPendingModal({ isOpen, onClose, userName }: ApprovalPendingModalProps) {
    const router = useRouter();
    const focusTrapRef = useFocusTrap(isOpen);

    // ESC 키 핸들러
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // 조합온 마케팅 페이지로 이동
    const handleGoToMarketing = () => {
        onClose();
        router.push('/');
    };

    if (!isOpen) return null;

    return (
        <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="pending-modal-title" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-white" />
                    </div>
                    <h2 id="pending-modal-title" className="text-xl font-bold text-white">
                        승인 대기 중입니다
                    </h2>
                </div>

                {/* 본문 */}
                <div className="p-6">
                    {userName && (
                        <p className="text-center text-gray-600 mb-4">
                            <strong className="text-gray-900">{userName}</strong>님, 안녕하세요!
                        </p>
                    )}
                    <p className="text-center text-gray-600 mb-4">
                        관리자가 회원 정보를 확인 중입니다.
                    </p>
                    <p className="text-center text-gray-600 mb-6">
                        승인이 완료되면 알림을 보내드립니다.
                        <br />
                        조금만 기다려주세요.
                    </p>

                    {/* 안내 박스 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-700 text-center">
                            일반적으로 <strong>1~2 영업일</strong> 내에 처리됩니다.
                            <br />
                            문의사항은 조합 사무실로 연락해주세요.
                        </p>
                    </div>

                    {/* 조합온 마케팅 페이지로 이동 버튼 */}
                    <button
                        onClick={handleGoToMarketing}
                        className={cn(
                            'w-full h-12 rounded-lg font-medium text-white',
                            'bg-blue-500 hover:bg-blue-600',
                            'transition-colors',
                            'flex items-center justify-center gap-2'
                        )}
                    >
                        <Home className="w-5 h-5" />
                        메인 페이지로 이동
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ApprovalPendingModal;

