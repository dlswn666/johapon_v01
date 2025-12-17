'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { User, NewUser, AuthProvider } from '@/app/_lib/shared/type/database.types';
import {
    MapPin,
    Phone,
    Calendar,
    UserIcon,
    Building2,
    X,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Check,
    AlertTriangle,
} from 'lucide-react';
import { TermsModal } from './TermsModal';
import { BirthDatePicker } from '@/app/_lib/widgets/common/date-picker/BirthDatePicker';
import { KakaoAddressSearch, AddressData } from '@/app/_lib/widgets/common/address/KakaoAddressSearch';

// Step 정의
type StepKey = 'name' | 'birth_date' | 'phone_number' | 'property_address' | 'property_address_detail' | 'confirm';

interface StepConfig {
    key: StepKey;
    label: string;
    placeholder: string;
    description: string;
    subDescription?: string;
    required: boolean;
    type: 'text' | 'tel' | 'date';
    icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
    {
        key: 'name',
        label: '이름 (소유자명)',
        placeholder: '홍길동',
        description: '소유자명(실명)을 정확히 입력해주세요.',
        subDescription: '조합원 명부와 대조하여 확인합니다.',
        required: true,
        type: 'text',
        icon: <UserIcon className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'birth_date',
        label: '생년월일',
        placeholder: '1960-01-01',
        description: '본인 확인을 위해 필요합니다.',
        subDescription: '입력하지 않아도 진행 가능합니다.',
        required: false,
        type: 'date',
        icon: <Calendar className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'phone_number',
        label: '휴대폰 번호',
        placeholder: '010-0000-0000',
        description: '연락 가능한 번호를 입력해주세요.',
        subDescription: '중요한 알림을 보내드립니다.',
        required: true,
        type: 'tel',
        icon: <Phone className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'property_address',
        label: '물건지 주소',
        placeholder: '서울특별시 강남구 테헤란로 123',
        description: '권리 소재지 주소입니다.',
        subDescription: '등기부등본상 주소를 입력해주세요.',
        required: true,
        type: 'text',
        icon: <MapPin className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'property_address_detail',
        label: '상세 주소',
        placeholder: '101동 1001호',
        description: '동/호수를 입력해주세요.',
        subDescription: '입력하지 않아도 진행 가능합니다.',
        required: false,
        type: 'text',
        icon: <Building2 className="w-6 h-6 md:w-7 md:h-7" />,
    },
];

// 초대 데이터 타입
export interface InviteData {
    name?: string;
    phone_number?: string;
    property_address?: string;
    invite_type?: 'member' | 'admin';
    invite_token?: string;
}

interface RegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider?: AuthProvider;
    prefillName?: string;
    prefillPhone?: string;
    inviteData?: InviteData | null;
}

interface FormData {
    name: string;
    phone_number: string;
    birth_date: string;
    property_address: string;
    property_address_detail: string;
    property_address_road: string;
    property_address_jibun: string;
    property_zonecode: string;
}

/**
 * Step-by-Step 회원가입 모달 컴포넌트
 * 디지털 약자 친화적인 한 번에 하나의 입력 필드만 보여주는 방식
 */
export function RegisterModal({
    isOpen,
    onClose,
    provider = 'kakao',
    prefillName = '',
    prefillPhone = '',
    inviteData = null,
}: RegisterModalProps) {
    const router = useRouter();
    const { slug } = useSlug();
    const { authUser, refreshUser } = useAuth();

    const authUserId = authUser?.id;

    // 현재 스텝 (0-5, 5는 최종 확인)
    const [currentStep, setCurrentStep] = useState(0);
    const totalSteps = STEPS.length + 1; // 입력 5단계 + 최종 확인 1단계

    // 폼 상태
    const [formData, setFormData] = useState<FormData>({
        name: '',
        phone_number: '',
        birth_date: '',
        property_address: '',
        property_address_detail: '',
        property_address_road: '',
        property_address_jibun: '',
        property_zonecode: '',
    });

    // 최종 확인 단계에서 수정 중인 필드
    const [editingField, setEditingField] = useState<StepKey | null>(null);

    // 약관 동의
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    // 로딩/에러 상태
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // 중복 사용자 모달
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [existingUser, setExistingUser] = useState<User | null>(null);
    const [existingProvider, setExistingProvider] = useState<string>('');

    // prefill 여부 확인
    const hasPrefillData = !!(inviteData?.name || inviteData?.phone_number || inviteData?.property_address);

    // 초기 데이터 설정
    useEffect(() => {
        if (isOpen) {
            // 초대 데이터가 있으면 우선 적용
            if (inviteData) {
                setFormData({
                    name: inviteData.name || prefillName || '',
                    phone_number: inviteData.phone_number || prefillPhone || '',
                    birth_date: '',
                    property_address: inviteData.property_address || '',
                    property_address_detail: '',
                    property_address_road: '',
                    property_address_jibun: '',
                    property_zonecode: '',
                });
            } else {
                setFormData({
                    name: prefillName || '',
                    phone_number: prefillPhone || '',
                    birth_date: '',
                    property_address: '',
                    property_address_detail: '',
                    property_address_road: '',
                    property_address_jibun: '',
                    property_zonecode: '',
                });
            }
            setCurrentStep(0);
            setAgreedToTerms(false);
            setError('');
            setEditingField(null);
        }
    }, [isOpen, inviteData, prefillName, prefillPhone]);

    // 기존 사용자 정보 로드 (재신청 시)
    useEffect(() => {
        const loadExistingUserData = async () => {
            if (!authUserId || !isOpen) return;

            const { data: authLink } = await supabase
                .from('user_auth_links')
                .select('user_id')
                .eq('auth_user_id', authUserId)
                .single();

            if (authLink) {
                const { data: userData } = await supabase.from('users').select('*').eq('id', authLink.user_id).single();

                if (userData) {
                    setFormData({
                        name: userData.name || '',
                        phone_number: userData.phone_number || '',
                        birth_date: userData.birth_date || '',
                        property_address: userData.property_address || '',
                        property_address_detail: userData.property_address_detail || '',
                        property_address_road: userData.property_address_road || '',
                        property_address_jibun: userData.property_address_jibun || '',
                        property_zonecode: userData.property_zonecode || '',
                    });
                }
            }
        };

        loadExistingUserData();
    }, [authUserId, isOpen]);

    // 카카오 주소 선택 핸들러
    const handleAddressSelect = useCallback((addressData: AddressData) => {
        setFormData((prev) => ({
            ...prev,
            property_address: addressData.address,
            property_address_road: addressData.roadAddress,
            property_address_jibun: addressData.jibunAddress,
            property_zonecode: addressData.zonecode,
        }));
    }, []);

    // 현재 스텝의 설정 가져오기
    const getCurrentStepConfig = useCallback((): StepConfig | null => {
        if (currentStep >= STEPS.length) return null;
        return STEPS[currentStep];
    }, [currentStep]);

    // 현재 스텝의 값 가져오기
    const getCurrentValue = useCallback((): string => {
        const config = getCurrentStepConfig();
        if (!config) return '';
        return formData[config.key as keyof FormData] || '';
    }, [getCurrentStepConfig, formData]);

    // 값 변경 핸들러
    const handleValueChange = useCallback(
        (value: string) => {
            const config = getCurrentStepConfig();
            if (!config) return;
            setFormData((prev) => ({
                ...prev,
                [config.key]: value,
            }));
        },
        [getCurrentStepConfig]
    );

    // 최종 확인에서 필드 값 변경
    const handleConfirmFieldChange = useCallback((key: StepKey, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    // 다음 스텝으로
    const handleNext = useCallback(() => {
        const config = getCurrentStepConfig();

        // 필수 필드 검증
        if (config?.required && !getCurrentValue().trim()) {
            setError(`${config.label}은(는) 필수 입력 항목입니다.`);
            return;
        }

        setError('');
        if (currentStep < totalSteps - 1) {
            setCurrentStep((prev) => prev + 1);
        }
    }, [currentStep, totalSteps, getCurrentStepConfig, getCurrentValue]);

    // 이전 스텝으로
    const handlePrev = useCallback(() => {
        setError('');
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    }, [currentStep]);

    // 중복 사용자 확인
    const checkDuplicateUser = async (): Promise<User | null> => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone_number', formData.phone_number)
            .eq('name', formData.name)
            .eq('property_address', formData.property_address)
            .single();

        if (error || !data) return null;
        return data as User;
    };

    // 기존 사용자에 새 소셜 계정 연결
    const linkExistingUser = async () => {
        if (!existingUser || !authUserId) return;

        setIsLoading(true);
        setError('');

        try {
            const { error: linkError } = await supabase.from('user_auth_links').insert({
                user_id: existingUser.id,
                auth_user_id: authUserId,
                provider,
            });

            if (linkError) throw linkError;

            await refreshUser();
            setShowDuplicateModal(false);
            onClose();

            if (existingUser.user_status === 'APPROVED') {
                router.push(`/${slug}`);
            } else if (existingUser.user_status === 'PENDING_APPROVAL') {
                router.push(`/${slug}?status=pending`);
            } else if (existingUser.user_status === 'REJECTED') {
                router.push(`/${slug}?status=rejected`);
            }
        } catch (err) {
            console.error('Link user error:', err);
            setError('계정 연결 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 최종 제출
    const handleSubmit = async () => {
        setError('');

        // 필수 필드 검증
        if (!formData.name || !formData.phone_number || !formData.property_address) {
            setError('이름, 휴대폰 번호, 물건지 주소는 필수 입력 항목입니다.');
            return;
        }

        // 약관 동의 확인
        if (!agreedToTerms) {
            setError('개인정보 수집 및 이용에 동의해주세요.');
            return;
        }

        if (!authUserId) {
            setError('인증 정보가 없습니다. 다시 로그인해주세요.');
            return;
        }

        setIsLoading(true);

        try {
            // 중복 사용자 확인
            const duplicate = await checkDuplicateUser();
            if (duplicate) {
                const { data: existingLink } = await supabase
                    .from('user_auth_links')
                    .select('provider')
                    .eq('user_id', duplicate.id)
                    .single();

                if (existingLink) {
                    setExistingUser(duplicate);
                    setExistingProvider(existingLink.provider);
                    setShowDuplicateModal(true);
                    setIsLoading(false);
                    return;
                }
            }

            // Union ID 조회
            let unionId = null;

            // 관리자 초대인 경우 admin_invites 테이블에서 union_id 조회
            if (inviteData?.invite_type === 'admin' && inviteData?.invite_token) {
                const { data: inviteInfo } = await supabase
                    .from('admin_invites')
                    .select('union_id')
                    .eq('invite_token', inviteData.invite_token)
                    .single();
                unionId = inviteInfo?.union_id || null;
            }
            // 조합원 초대인 경우 member_invites 테이블에서 union_id 조회
            else if (inviteData?.invite_type === 'member' && inviteData?.invite_token) {
                const { data: inviteInfo } = await supabase
                    .from('member_invites')
                    .select('union_id')
                    .eq('invite_token', inviteData.invite_token)
                    .single();
                unionId = inviteInfo?.union_id || null;
            }
            // 그 외의 경우 slug로 조회
            else if (slug) {
                const { data: unionData } = await supabase.from('unions').select('id').eq('slug', slug).single();
                unionId = unionData?.id || null;
            }

            // 초대 링크인 경우 역할 및 상태 결정
            const isInvite = !!inviteData?.invite_token;
            const role = isInvite && inviteData?.invite_type === 'admin' ? 'ADMIN' : isInvite ? 'USER' : 'APPLICANT';
            const userStatus = isInvite ? 'APPROVED' : 'PENDING_APPROVAL';

            // 새 사용자 생성
            const newUserId = authUserId; // auth.users ID를 public.users ID로 사용
            const newUser: NewUser = {
                id: newUserId,
                name: formData.name,
                email: `${newUserId}@placeholder.com`,
                phone_number: formData.phone_number,
                role: role,
                union_id: unionId,
                user_status: userStatus,
                birth_date: formData.birth_date || null,
                property_address: formData.property_address,
                property_address_detail: formData.property_address_detail || null,
                property_address_road: formData.property_address_road || null,
                property_address_jibun: formData.property_address_jibun || null,
                property_zonecode: formData.property_zonecode || null,
                approved_at: isInvite ? new Date().toISOString() : null,
            };

            const { error: userError } = await supabase.from('users').insert(newUser);

            if (userError) throw userError;

            // user_auth_links에 연결 추가
            const { error: linkError } = await supabase.from('user_auth_links').insert({
                user_id: newUserId,
                auth_user_id: authUserId,
                provider,
            });

            if (linkError) {
                await supabase.from('users').delete().eq('id', newUserId);
                throw linkError;
            }

            // 초대 상태 업데이트
            if (inviteData?.invite_token) {
                const tableName = inviteData.invite_type === 'admin' ? 'admin_invites' : 'member_invites';
                await supabase
                    .from(tableName)
                    .update({
                        status: 'USED',
                        used_at: new Date().toISOString(),
                        ...(inviteData.invite_type === 'member' ? { user_id: newUserId } : {}),
                    })
                    .eq('invite_token', inviteData.invite_token);
            }

            await refreshUser();
            onClose();

            if (isInvite) {
                router.push(`/${slug}`);
            } else {
                router.push(`/${slug}?status=pending`);
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const isConfirmStep = currentStep === STEPS.length;
    const stepConfig = getCurrentStepConfig();

    return (
        <>
            {/* 메인 모달 */}
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div
                    className={cn(
                        'bg-white flex flex-col',
                        // 모바일: 전체 화면
                        'w-full h-full',
                        // 태블릿 이상: 중앙 모달
                        'md:w-full md:max-w-[480px] md:h-auto md:max-h-[90vh] md:rounded-2xl md:m-4'
                    )}
                >
                    {/* 헤더 */}
                    <div className="flex-shrink-0 border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                                    aria-label="이전"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                            )}
                            <Building2 className="w-6 h-6 text-[#4E8C6D]" />
                            <h2 className="text-lg md:text-xl font-bold text-gray-900">조합원 등록</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="닫기"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* 진행 표시기 */}
                    <div className="flex-shrink-0 px-4 md:px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                            {Array.from({ length: totalSteps }).map((_, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        'w-3 h-3 rounded-full transition-colors',
                                        index <= currentStep ? 'bg-[#4E8C6D]' : 'bg-gray-300'
                                    )}
                                />
                            ))}
                        </div>
                        <p className="text-center text-sm text-gray-500 mt-2">
                            {currentStep + 1} / {totalSteps}
                            {isConfirmStep && ' 최종 확인'}
                        </p>
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
                        {isConfirmStep ? (
                            // 최종 확인 단계
                            <div className="space-y-4">
                                <p className="text-base md:text-lg text-gray-600 text-center mb-6">
                                    입력하신 정보를 확인해주세요
                                </p>

                                {/* 입력된 정보 요약 */}
                                <div className="space-y-3">
                                    {STEPS.map((step) => {
                                        const value = formData[step.key as keyof FormData];
                                        const isEditing = editingField === step.key;

                                        // 주소 표시 값 결정 (도로명 + 지번 둘 다 표시)
                                        const displayValue =
                                            step.key === 'property_address' && formData.property_address_road
                                                ? `${formData.property_address_road}${formData.property_address_jibun ? ` (${formData.property_address_jibun})` : ''}`
                                                : value;

                                        return (
                                            <div key={step.key} className="bg-gray-50 rounded-xl p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {step.label}
                                                        {step.required && <span className="text-red-500 ml-1">*</span>}
                                                    </span>
                                                    {!isEditing && (
                                                        <button
                                                            onClick={() => setEditingField(step.key)}
                                                            className="flex items-center gap-1 text-sm text-[#4E8C6D] hover:text-[#3d7058]"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            수정
                                                        </button>
                                                    )}
                                                </div>
                                                {isEditing ? (
                                                    <div className="flex flex-col gap-2">
                                                        {step.key === 'birth_date' ? (
                                                            // 생년월일: BirthDatePicker 사용
                                                            <div className="flex gap-2 items-center">
                                                                <div className="flex-1">
                                                                    <BirthDatePicker
                                                                        value={value}
                                                                        onChange={(date) =>
                                                                            handleConfirmFieldChange(step.key, date)
                                                                        }
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={() => setEditingField(null)}
                                                                    className="h-12 px-4 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] flex-shrink-0"
                                                                >
                                                                    <Check className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ) : step.key === 'property_address' ? (
                                                            // 물건지 주소: KakaoAddressSearch 사용
                                                            <div className="flex flex-col gap-2">
                                                                <KakaoAddressSearch
                                                                    value={value}
                                                                    onAddressSelect={(addressData) => {
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            property_address: addressData.address,
                                                                            property_address_road:
                                                                                addressData.roadAddress,
                                                                            property_address_jibun:
                                                                                addressData.jibunAddress,
                                                                            property_zonecode: addressData.zonecode,
                                                                        }));
                                                                    }}
                                                                    placeholder={step.placeholder}
                                                                />
                                                                <button
                                                                    onClick={() => setEditingField(null)}
                                                                    className="h-12 px-4 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] w-full"
                                                                >
                                                                    <span className="flex items-center justify-center gap-2">
                                                                        <Check className="w-5 h-5" />
                                                                        완료
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            // 기본 입력 필드
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type={step.type}
                                                                    value={value}
                                                                    onChange={(e) =>
                                                                        handleConfirmFieldChange(step.key, e.target.value)
                                                                    }
                                                                    placeholder={step.placeholder}
                                                                    className={cn(
                                                                        'flex-1 h-12 px-4 rounded-lg border border-gray-300',
                                                                        'text-base md:text-lg',
                                                                        'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent'
                                                                    )}
                                                                />
                                                                <button
                                                                    onClick={() => setEditingField(null)}
                                                                    className="h-12 px-4 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058]"
                                                                >
                                                                    <Check className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-base md:text-lg text-gray-900">
                                                        {displayValue || (
                                                            <span className="text-gray-400">입력하지 않음</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 약관 동의 */}
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={agreedToTerms}
                                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#4E8C6D] focus:ring-[#4E8C6D]"
                                        />
                                        <span className="text-base text-gray-700">
                                            개인정보 수집 및 이용에 동의합니다
                                        </span>
                                    </label>
                                    <button
                                        onClick={() => setShowTermsModal(true)}
                                        className="mt-2 ml-8 text-sm text-[#4E8C6D] underline hover:text-[#3d7058]"
                                    >
                                        약관 전문 보기
                                    </button>
                                </div>

                                {/* 경고 문구 */}
                                <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm md:text-base text-amber-700">
                                        <strong>모든 정보가 정확해야 승인이 가능합니다.</strong>
                                        <br />
                                        관리자가 조합원 명부와 대조하여 확인합니다.
                                    </p>
                                </div>

                                {/* 에러 메시지 */}
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-600">{error}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // 입력 단계
                            stepConfig && (
                                <div className="flex flex-col items-center justify-center min-h-[300px] md:min-h-[350px]">
                                    {/* 아이콘 */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-[#4E8C6D]/10 rounded-full flex items-center justify-center mb-6 text-[#4E8C6D]">
                                        {stepConfig.icon}
                                    </div>

                                    {/* 라벨 */}
                                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 text-center">
                                        {stepConfig.label}
                                        {stepConfig.required && <span className="text-red-500 ml-1">*</span>}
                                    </h3>

                                    {/* prefill 안내 */}
                                    {hasPrefillData &&
                                        (stepConfig.key === 'name' ||
                                            stepConfig.key === 'phone_number' ||
                                            stepConfig.key === 'property_address') &&
                                        formData[stepConfig.key as keyof FormData] && (
                                            <p className="text-sm text-[#4E8C6D] mb-4 text-center">
                                                초대 정보가 입력되어 있습니다. 확인 후 다음으로 진행해주세요.
                                            </p>
                                        )}

                                    {/* 입력 필드 */}
                                    <div className="w-full max-w-sm">
                                        {stepConfig.key === 'birth_date' ? (
                                            // 생년월일: BirthDatePicker 사용
                                            <BirthDatePicker
                                                value={getCurrentValue()}
                                                onChange={handleValueChange}
                                            />
                                        ) : stepConfig.key === 'property_address' ? (
                                            // 물건지 주소: KakaoAddressSearch 사용
                                            <KakaoAddressSearch
                                                value={getCurrentValue()}
                                                onAddressSelect={handleAddressSelect}
                                                placeholder={stepConfig.placeholder}
                                            />
                                        ) : (
                                            // 기본 입력 필드
                                            <input
                                                type={stepConfig.type}
                                                value={getCurrentValue()}
                                                onChange={(e) => handleValueChange(e.target.value)}
                                                placeholder={stepConfig.placeholder}
                                                className={cn(
                                                    'w-full h-14 md:h-16 px-5 rounded-xl border-2 border-gray-200',
                                                    'text-lg md:text-xl text-center',
                                                    'placeholder:text-gray-400',
                                                    'focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent',
                                                    'transition-all'
                                                )}
                                                autoFocus
                                            />
                                        )}
                                    </div>

                                    {/* 설명 */}
                                    <div className="mt-6 text-center">
                                        <p className="text-base md:text-lg text-gray-600">{stepConfig.description}</p>
                                        {stepConfig.subDescription && (
                                            <p className="text-sm md:text-base text-gray-400 mt-1">
                                                {stepConfig.subDescription}
                                            </p>
                                        )}
                                    </div>

                                    {/* 에러 메시지 */}
                                    {error && (
                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg w-full max-w-sm">
                                            <p className="text-sm text-red-600 text-center">{error}</p>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    {/* 하단 버튼 */}
                    <div className="flex-shrink-0 border-t border-gray-200 p-4 md:p-6">
                        <div className="flex gap-4">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className={cn(
                                        'flex-1 h-14 md:h-16 rounded-xl border-2 border-gray-300',
                                        'text-base md:text-lg font-medium text-gray-700',
                                        'hover:bg-gray-50 transition-colors',
                                        'flex items-center justify-center gap-2'
                                    )}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                    이전
                                </button>
                            )}
                            {isConfirmStep ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !agreedToTerms}
                                    className={cn(
                                        'flex-1 h-14 md:h-16 rounded-xl',
                                        'text-base md:text-lg font-medium text-white',
                                        'bg-[#4E8C6D] hover:bg-[#3d7058]',
                                        'transition-colors',
                                        'disabled:opacity-50 disabled:cursor-not-allowed',
                                        'flex items-center justify-center gap-2'
                                    )}
                                >
                                    {isLoading ? '처리 중...' : '가입 완료'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className={cn(
                                        'flex-1 h-14 md:h-16 rounded-xl',
                                        'text-base md:text-lg font-medium text-white',
                                        'bg-[#4E8C6D] hover:bg-[#3d7058]',
                                        'transition-colors',
                                        'flex items-center justify-center gap-2'
                                    )}
                                >
                                    다음
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 중복 사용자 모달 */}
            {showDuplicateModal && existingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">기존 계정이 있습니다</h3>
                        <p className="text-gray-600 mb-4">
                            입력하신 정보와 일치하는 계정이 이미 있습니다.
                            <br />
                            <strong className="text-gray-900">
                                {existingProvider === 'kakao' ? '카카오' : '네이버'}
                            </strong>
                            로 가입하셨네요!
                        </p>
                        <p className="text-gray-600 mb-6">
                            현재 {provider === 'kakao' ? '카카오' : '네이버'} 계정도 연결하시겠습니까?
                            <br />
                            연결하시면 두 계정 모두로 로그인할 수 있습니다.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDuplicateModal(false)}
                                className="flex-1 h-12 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={linkExistingUser}
                                disabled={isLoading}
                                className="flex-1 h-12 rounded-lg bg-[#4E8C6D] text-white hover:bg-[#3d7058] transition-colors disabled:opacity-50"
                            >
                                {isLoading ? '연결 중...' : '계정 연결하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 약관 모달 */}
            <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
        </>
    );
}

export default RegisterModal;
