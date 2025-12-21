'use client';

import React, { useState, useEffect } from 'react';
import { XCircle, RefreshCw, Clock, User as UserIcon, Phone, Calendar, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';

interface ApprovalRejectedModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
    rejectedReason?: string;
}

type ModalMode = 'rejected' | 'edit' | 'pending';

interface ProfileForm {
    name: string;
    phone_number: string;
    birth_date: string;
    property_zonecode: string;
    property_address_road: string;
    property_address_jibun: string;
    property_address_detail: string;
}

/**
 * 승인 반려 모달 (다단계)
 * 1. rejected: 반려 사유 표시 + 재신청 버튼
 * 2. edit: 사용자 정보 수정 폼
 * 3. pending: 심사중 안내 메시지
 */
export function ApprovalRejectedModal({
    isOpen,
    onClose,
    userName,
    rejectedReason,
}: ApprovalRejectedModalProps) {
    const { user, refreshUser } = useAuth();
    const [mode, setMode] = useState<ModalMode>('rejected');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // 폼 상태
    const [form, setForm] = useState<ProfileForm>({
        name: '',
        phone_number: '',
        birth_date: '',
        property_zonecode: '',
        property_address_road: '',
        property_address_jibun: '',
        property_address_detail: '',
    });

    // 모달 열릴 때 사용자 정보로 폼 초기화
    useEffect(() => {
        if (isOpen && user) {
            setForm({
                name: user.name || '',
                phone_number: user.phone_number || '',
                birth_date: user.birth_date || '',
                property_zonecode: user.property_zonecode || '',
                property_address_road: user.property_address_road || '',
                property_address_jibun: user.property_address_jibun || '',
                property_address_detail: user.property_address_detail || '',
            });
            setMode('rejected');
            setError('');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    // 재신청 버튼 클릭 → 수정 모드로 전환
    const handleStartEdit = () => {
        setMode('edit');
        setError('');
    };

    // Daum 주소 검색 결과 타입
    interface DaumPostcodeData {
        zonecode: string;
        roadAddress: string;
        jibunAddress: string;
        autoJibunAddress: string;
    }

    // 주소 검색
    const handleAddressSearch = () => {
        const windowWithDaum = window as Window & {
            daum?: {
                Postcode: new (options: {
                    oncomplete: (data: DaumPostcodeData) => void;
                }) => { open: () => void };
            };
        };

        if (typeof window !== 'undefined' && windowWithDaum.daum?.Postcode) {
            new windowWithDaum.daum.Postcode({
                oncomplete: (data: DaumPostcodeData) => {
                    setForm(prev => ({
                        ...prev,
                        property_zonecode: data.zonecode,
                        property_address_road: data.roadAddress,
                        property_address_jibun: data.jibunAddress || data.autoJibunAddress,
                    }));
                },
            }).open();
        } else {
            setError('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        }
    };

    // 수정 완료 및 재신청 제출
    const handleSubmit = async () => {
        if (!user?.id) {
            setError('사용자 정보를 찾을 수 없습니다.');
            return;
        }

        // 필수 필드 검증
        if (!form.name.trim()) {
            setError('이름을 입력해주세요.');
            return;
        }
        if (!form.phone_number.trim()) {
            setError('전화번호를 입력해주세요.');
            return;
        }
        if (!form.birth_date) {
            setError('생년월일을 입력해주세요.');
            return;
        }
        if (!form.property_address_road) {
            setError('물건지 주소를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 사용자 정보 업데이트 및 상태를 PENDING_APPROVAL로 변경
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    name: form.name.trim(),
                    phone_number: form.phone_number.trim(),
                    birth_date: form.birth_date,
                    property_zonecode: form.property_zonecode,
                    property_address_road: form.property_address_road,
                    property_address_jibun: form.property_address_jibun,
                    property_address_detail: form.property_address_detail.trim(),
                    property_address: form.property_address_road, // 기존 호환성
                    user_status: 'PENDING_APPROVAL',
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

            // 심사중 모드로 전환
            setMode('pending');
        } catch (err) {
            console.error('Reapply error:', err);
            setError('재신청 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 심사중 모달 확인 버튼
    const handlePendingConfirm = () => {
        onClose();
    };

    // rejected 모드 렌더링
    const renderRejectedMode = () => (
        <>
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
                        onClick={handleStartEdit}
                        className={cn(
                            'flex-1 h-12 rounded-lg font-medium text-white',
                            'bg-[#4E8C6D] hover:bg-[#3d7058]',
                            'transition-colors',
                            'flex items-center justify-center gap-2'
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>재신청하기</span>
                    </button>
                </div>
            </div>
        </>
    );

    // edit 모드 렌더링
    const renderEditMode = () => (
        <>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-[#4E8C6D] to-[#3d7058] p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RefreshCw className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">
                    정보 수정 후 재신청
                </h2>
            </div>

            {/* 본문 */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
                <p className="text-center text-gray-600 mb-6 text-sm">
                    정보를 수정하고 재신청해주세요.
                </p>

                {/* 폼 */}
                <div className="space-y-4">
                    {/* 이름 */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            이름 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="이름을 입력하세요"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-sm"
                        />
                    </div>

                    {/* 전화번호 */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Phone className="w-4 h-4 text-gray-400" />
                            전화번호 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={form.phone_number}
                            onChange={(e) => setForm(prev => ({ ...prev, phone_number: e.target.value }))}
                            placeholder="전화번호를 입력하세요"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-sm"
                        />
                    </div>

                    {/* 생년월일 */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            생년월일 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.birth_date}
                            onChange={(e) => setForm(prev => ({ ...prev, birth_date: e.target.value }))}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-sm"
                        />
                    </div>

                    {/* 물건지 주소 */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            물건지 주소 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={form.property_address_road}
                                readOnly
                                placeholder="주소를 검색해주세요"
                                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleAddressSearch}
                                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                주소 검색
                            </button>
                        </div>
                        {form.property_address_jibun && (
                            <p className="text-xs text-gray-500">(지번) {form.property_address_jibun}</p>
                        )}
                    </div>

                    {/* 상세주소 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">상세주소</label>
                        <input
                            type="text"
                            value={form.property_address_detail}
                            onChange={(e) => setForm(prev => ({ ...prev, property_address_detail: e.target.value }))}
                            placeholder="상세주소를 입력하세요"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent text-sm"
                        />
                    </div>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    </div>
                )}

                {/* 버튼 */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => setMode('rejected')}
                        disabled={isLoading}
                        className={cn(
                            'flex-1 h-12 rounded-lg font-medium',
                            'border border-gray-300 text-gray-700',
                            'hover:bg-gray-50',
                            'transition-colors',
                            'disabled:opacity-50'
                        )}
                    >
                        이전
                    </button>
                    <button
                        onClick={handleSubmit}
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
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>처리 중...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                <span>재신청</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );

    // pending 모드 렌더링
    const renderPendingMode = () => (
        <>
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">
                    재신청이 완료되었습니다
                </h2>
            </div>

            {/* 본문 */}
            <div className="p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-amber-800 text-center">
                        관리자 승인 후 서비스 이용이 가능합니다.
                        <br />
                        승인까지 다소 시간이 소요될 수 있습니다.
                    </p>
                </div>

                <p className="text-center text-gray-500 text-sm mb-6">
                    승인 결과는 별도로 안내드릴 예정입니다.
                    <br />
                    문의사항은 조합 사무실로 연락해주세요.
                </p>

                {/* 버튼 */}
                <button
                    onClick={handlePendingConfirm}
                    className={cn(
                        'w-full h-12 rounded-lg font-medium text-white',
                        'bg-[#4E8C6D] hover:bg-[#3d7058]',
                        'transition-colors'
                    )}
                >
                    확인
                </button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                {mode === 'rejected' && renderRejectedMode()}
                {mode === 'edit' && renderEditMode()}
                {mode === 'pending' && renderPendingMode()}
            </div>
        </div>
    );
}

export default ApprovalRejectedModal;
