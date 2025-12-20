'use client';

import React, { useState, useCallback } from 'react';
import { X, Plus, Trash2, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface MemberInput {
    id: string;
    name: string;
    phoneNumber: string;
}

interface ManualInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (members: { name: string; phone_number: string }[]) => Promise<void>;
    isSubmitting: boolean;
}

// 전화번호 포맷팅 함수 (010-1234-5678 형식)
const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');

    // 11자리까지만 허용
    const trimmed = numbers.slice(0, 11);

    // 포맷팅
    if (trimmed.length <= 3) {
        return trimmed;
    } else if (trimmed.length <= 7) {
        return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
    } else {
        return `${trimmed.slice(0, 3)}-${trimmed.slice(3, 7)}-${trimmed.slice(7)}`;
    }
};

// 전화번호에서 하이픈 제거
const stripPhoneNumber = (value: string): string => {
    return value.replace(/[^\d]/g, '');
};

// 고유 ID 생성
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function ManualInviteModal({ isOpen, onClose, onSubmit, isSubmitting }: ManualInviteModalProps) {
    const [members, setMembers] = useState<MemberInput[]>([{ id: generateId(), name: '', phoneNumber: '' }]);

    // 입력값 변경 핸들러
    const handleInputChange = useCallback((id: string, field: 'name' | 'phoneNumber', value: string) => {
        setMembers((prev) =>
            prev.map((member) => {
                if (member.id !== id) return member;

                if (field === 'phoneNumber') {
                    return { ...member, phoneNumber: formatPhoneNumber(value) };
                }
                return { ...member, [field]: value };
            })
        );
    }, []);

    // 행 추가
    const handleAddRow = useCallback(() => {
        setMembers((prev) => [...prev, { id: generateId(), name: '', phoneNumber: '' }]);
    }, []);

    // 행 삭제
    const handleRemoveRow = useCallback((id: string) => {
        setMembers((prev) => {
            // 최소 1개 행은 유지
            if (prev.length <= 1) {
                toast.error('최소 1명 이상 입력해야 합니다.');
                return prev;
            }
            return prev.filter((member) => member.id !== id);
        });
    }, []);

    // 유효성 검사
    const validateMembers = (): boolean => {
        for (const member of members) {
            if (!member.name.trim()) {
                toast.error('이름을 입력해주세요.');
                return false;
            }
            const phone = stripPhoneNumber(member.phoneNumber);
            if (!phone || phone.length < 10 || phone.length > 11) {
                toast.error('올바른 전화번호를 입력해주세요.');
                return false;
            }
        }
        return true;
    };

    // 제출 핸들러
    const handleSubmit = async () => {
        if (!validateMembers()) return;

        const formattedMembers = members.map((member) => ({
            name: member.name.trim(),
            phone_number: stripPhoneNumber(member.phoneNumber),
        }));

        try {
            await onSubmit(formattedMembers);
            // 성공 시 초기화
            setMembers([{ id: generateId(), name: '', phoneNumber: '' }]);
        } catch (error) {
            console.error('회원 등록 오류:', error);
        }
    };

    // 모달 닫기 핸들러
    const handleClose = () => {
        if (!isSubmitting) {
            setMembers([{ id: generateId(), name: '', phoneNumber: '' }]);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-[600px] w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#4E8C6D]/10 rounded-xl flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-[#4E8C6D]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">수동 회원 등록</h3>
                            <p className="text-sm text-gray-500">등록 즉시 알림톡이 발송됩니다</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        {/* 헤더 라벨 */}
                        <div className="grid grid-cols-[1fr_1fr_40px] gap-3 text-sm font-medium text-gray-600">
                            <span>이름</span>
                            <span>전화번호</span>
                            <span></span>
                        </div>

                        {/* 입력 행들 */}
                        {members.map((member) => (
                            <div key={member.id} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center">
                                <input
                                    type="text"
                                    value={member.name}
                                    onChange={(e) => handleInputChange(member.id, 'name', e.target.value)}
                                    placeholder="홍길동"
                                    disabled={isSubmitting}
                                    className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-[14px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                                <input
                                    type="tel"
                                    value={member.phoneNumber}
                                    onChange={(e) => handleInputChange(member.id, 'phoneNumber', e.target.value)}
                                    placeholder="010-1234-5678"
                                    disabled={isSubmitting}
                                    className="h-12 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-[14px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRow(member.id)}
                                    disabled={isSubmitting || members.length <= 1}
                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {/* 추가 버튼 */}
                        <button
                            type="button"
                            onClick={handleAddRow}
                            disabled={isSubmitting}
                            className="w-full h-12 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#4E8C6D] hover:text-[#4E8C6D] hover:bg-[#4E8C6D]/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-medium">추가하기</span>
                        </button>
                    </div>
                </div>

                {/* 푸터 */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 h-12 border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 h-12 bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                등록 중...
                            </>
                        ) : (
                            <>등록하기 ({members.length}명)</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
