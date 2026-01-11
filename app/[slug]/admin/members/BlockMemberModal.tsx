'use client';

import React, { useState } from 'react';
import { Ban, AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
    useBlockMember,
    useUnblockMember,
    MemberWithLandInfo,
} from '@/app/_lib/features/member-management/api/useMemberHook';
import { useLogAccessEvent } from '@/app/_lib/features/member-management/api/useAccessLogHook';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

interface BlockMemberModalProps {
    member: MemberWithLandInfo;
    onClose: () => void;
}

export default function BlockMemberModal({ member, onClose }: BlockMemberModalProps) {
    const { user } = useAuth();
    const { union } = useSlug();
    const unionId = union?.id;

    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { mutateAsync: blockMember } = useBlockMember();
    const { mutateAsync: unblockMember } = useUnblockMember();
    const { mutate: logAccessEvent } = useLogAccessEvent();

    const isBlocked = member.is_blocked;

    const handleSubmit = async () => {
        if (!isBlocked && !reason.trim()) {
            toast.error('차단 사유를 입력해주세요.');
            return;
        }

        setIsSubmitting(true);

        try {
            if (isBlocked) {
                // 차단 해제
                await unblockMember(member.id);
                toast.success('차단이 해제되었습니다.');
            } else {
                // 차단 처리
                await blockMember({ memberId: member.id, reason: reason.trim() });
                toast.success('회원이 차단되었습니다.');

                // 차단 로그 기록
                if (unionId && user?.id && user?.name) {
                    logAccessEvent({
                        unionId,
                        viewerId: user.id,
                        viewerName: user.name,
                        accessType: 'MEMBER_BLOCK',
                    });
                }
            }
            onClose();
        } catch (error) {
            console.error('차단 처리 오류:', error);
            toast.error(isBlocked ? '차단 해제에 실패했습니다.' : '차단 처리에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                isBlocked ? 'bg-green-100' : 'bg-red-100'
                            }`}
                        >
                            <Ban className={`w-5 h-5 ${isBlocked ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                        <h3 className="text-[18px] font-bold text-gray-900">
                            {isBlocked ? '차단 해제' : '강제 탈퇴 (차단)'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-6 space-y-4">
                    {/* 회원 정보 */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-[14px] text-gray-500 mb-1">대상 회원</p>
                        <p className="text-[16px] font-bold text-gray-900">{member.name}</p>
                        <p className="text-[14px] text-gray-600 mt-1">
                            {member.property_units?.[0]?.property_address_road ||
                                member.property_units?.[0]?.property_address_jibun ||
                                '주소 없음'}
                        </p>
                    </div>

                    {isBlocked ? (
                        // 차단 해제 안내
                        <>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="text-[14px] font-medium text-amber-800">현재 차단된 회원입니다</p>
                                        <p className="text-[13px] text-amber-700 mt-1">
                                            차단 사유: {member.blocked_reason || '사유 없음'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[14px] text-gray-600">
                                차단을 해제하면 해당 회원이 다시 웹페이지에 접근할 수 있습니다.
                            </p>
                        </>
                    ) : (
                        // 차단 경고 및 사유 입력
                        <>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                                    <div>
                                        <p className="text-[14px] font-medium text-red-800">
                                            차단된 회원은 웹페이지 접근이 제한됩니다
                                        </p>
                                        <p className="text-[13px] text-red-700 mt-1">
                                            차단된 회원이 접속 시 차단 사유와 함께 안내 메시지가 표시됩니다.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[14px] font-medium text-gray-700">
                                    차단 사유 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="차단 사유를 입력하세요..."
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-[14px]"
                                />
                                {reason.trim().length === 0 && (
                                    <p className="text-[12px] text-red-500">차단 사유를 입력해야 차단할 수 있습니다.</p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* 버튼 */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!isBlocked && reason.trim().length === 0)}
                        className={`flex-1 h-12 rounded-xl ${
                            isBlocked
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isBlocked ? (
                            '차단 해제'
                        ) : (
                            '차단하기'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
