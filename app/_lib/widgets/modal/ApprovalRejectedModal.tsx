'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

interface ApprovalRejectedModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
    rejectedReason?: string;
}

/**
 * 승인 반려 모달
 * 가입 신청이 반려된 사용자에게 표시
 * 반려 사유와 재신청 버튼 포함
 */
export function ApprovalRejectedModal({
    isOpen,
    onClose,
    userName,
    rejectedReason,
}: ApprovalRejectedModalProps) {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const { slug } = useSlug();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    /**
     * 재신청 처리
     * user_status를 PENDING_PROFILE로 변경하고 회원가입 폼으로 이동
     */
    const handleReapply = async () => {
        if (!user?.id) {
            setError('사용자 정보를 찾을 수 없습니다.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // user_status를 PENDING_PROFILE로 변경
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    user_status: 'PENDING_PROFILE',
                    rejected_reason: null,
                    rejected_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (updateError) {
                throw updateError;
            }

            // 사용자 정보 새로고침
            await refreshUser();

            // 회원가입 폼으로 이동
            onClose();
            router.push(`/${slug}/register`);
        } catch (err) {
            console.error('Reapply error:', err);
            setError('재신청 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* 헤더 */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">
                        승인이 반려되었습니다
                    </h2>
                </div>

                {/* 본문 */}
                <div className="p-6">
                    {userName && (
                        <p className="text-center text-gray-600 mb-4">
                            <strong className="text-gray-900">{userName}</strong>님, 안녕하세요.
                        </p>
                    )}

                    {/* 반려 사유 */}
                    {rejectedReason && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <p className="text-sm font-medium text-red-800 mb-2">반려 사유</p>
                            <p className="text-sm text-red-700">{rejectedReason}</p>
                        </div>
                    )}

                    {!rejectedReason && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-600 text-center">
                                입력하신 정보와 조합 보유 정보가 일치하지 않아
                                <br />
                                승인되지 않았습니다.
                            </p>
                        </div>
                    )}

                    {/* 안내 문구 */}
                    <p className="text-center text-gray-500 text-sm mb-6">
                        정보를 수정하여 다시 신청하시거나,
                        <br />
                        조합 사무실로 문의해주세요.
                    </p>

                    {/* 에러 메시지 */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                            <p className="text-sm text-red-600 text-center">{error}</p>
                        </div>
                    )}

                    {/* 버튼 */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className={cn(
                                'flex-1 h-12 rounded-lg font-medium',
                                'border border-gray-300 text-gray-700',
                                'hover:bg-gray-50',
                                'transition-colors'
                            )}
                        >
                            확인
                        </button>
                        <button
                            onClick={handleReapply}
                            disabled={isLoading}
                            className={cn(
                                'flex-1 h-12 rounded-lg font-medium text-white',
                                'bg-[#4E8C6D] hover:bg-[#3d7058]',
                                'transition-colors',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                                'flex items-center justify-center gap-2'
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>처리 중...</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    <span>재신청하기</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ApprovalRejectedModal;

