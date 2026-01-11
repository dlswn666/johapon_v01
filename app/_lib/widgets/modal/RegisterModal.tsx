'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { User, NewUser } from '@/app/_lib/shared/type/database.types';
import { AuthProvider } from '@/app/_lib/shared/type/auth.types';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';
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
import { generatePNU } from '@/app/_lib/shared/utils/pnu-utils';
import { normalizeDong, createNormalizedHo, isBasementHo, extractHoNumber } from '@/app/_lib/shared/utils/dong-ho-utils';

// 거주 유형 타입 정의
type PropertyType = 'DETACHED_HOUSE' | 'VILLA' | 'APARTMENT' | 'COMMERCIAL' | 'MIXED';

// 거주 유형 옵션
const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string; icon: string; description: string }[] = [
    { value: 'DETACHED_HOUSE', label: '단독주택', icon: '🏠', description: '동/호수 입력 불필요' },
    { value: 'VILLA', label: '빌라/다세대', icon: '🏢', description: '호수 입력 필요' },
    { value: 'APARTMENT', label: '아파트', icon: '🏬', description: '동/호수 입력 필요' },
    { value: 'COMMERCIAL', label: '상업용', icon: '🏪', description: '동/호수 선택 입력' },
    { value: 'MIXED', label: '주상복합', icon: '🏙️', description: '동/호수 입력 필요' },
];

// Step 정의
type StepKey = 
    | 'name' 
    | 'birth_date' 
    | 'phone_number' 
    | 'property_address' 
    | 'property_type'
    | 'property_dong'
    | 'property_floor_type'  // 지상/지하 선택
    | 'property_ho'
    | 'resident_address'
    | 'resident_address_detail'
    | 'confirm';

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
        key: 'property_type',
        label: '물건지 유형',
        placeholder: '',
        description: '건물 유형을 선택해주세요.',
        subDescription: '유형에 따라 동/호수 입력이 달라집니다.',
        required: true,
        type: 'text',
        icon: <Building2 className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'property_dong',
        label: '동',
        placeholder: '101',
        description: '동 번호를 입력해주세요.',
        subDescription: '예: 101, A (동 없이 입력)',
        required: false, // 동적으로 변경됨
        type: 'text',
        icon: <Building2 className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'property_floor_type',
        label: '층 구분',
        placeholder: '',
        description: '지상층 또는 지하층을 선택해주세요.',
        subDescription: '호수 입력 전 선택이 필요합니다.',
        required: false,
        type: 'text',  // 실제로는 라디오 버튼으로 렌더링
        icon: <Building2 className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'property_ho',
        label: '호수',
        placeholder: '1001',
        description: '호수를 입력해주세요.',
        subDescription: '숫자만 입력 (예: 101, 1001)',
        required: false, // 동적으로 변경됨
        type: 'text',
        icon: <Building2 className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'resident_address',
        label: '실 거주지 주소',
        placeholder: '지번/도로명 주소를 입력해주세요',
        description: '현재 거주하고 계신 주소입니다.',
        subDescription: '필수 입력 항목입니다.',
        required: true,
        type: 'text',
        icon: <MapPin className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'resident_address_detail',
        label: '실 거주지 상세 주소',
        placeholder: '101동 1001호',
        description: '동/호수 정보를 입력해주세요.',
        subDescription: '상세 정보가 필요합니다.',
        required: true,
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
    property_pnu: string;
    property_type: PropertyType | '';
    property_dong: string;
    property_is_basement: boolean;  // 지하층 여부
    property_ho: string;
    resident_address: string;
    resident_address_detail: string;
    resident_address_road: string;
    resident_address_jibun: string;
    resident_zonecode: string;
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
        property_pnu: '',
        property_type: '',
        property_dong: '',
        property_is_basement: false,
        property_ho: '',
        resident_address: '',
        resident_address_detail: '',
        resident_address_road: '',
        resident_address_jibun: '',
        resident_zonecode: '',
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
                    property_pnu: '',
                    property_type: '',
                    property_dong: '',
                    property_is_basement: false,
                    property_ho: '',
                    resident_address: '',
                    resident_address_detail: '',
                    resident_address_road: '',
                    resident_address_jibun: '',
                    resident_zonecode: '',
                });

                // 초대 데이터가 있어도 거주 유형/동/호수는 입력이 필요하므로 최종 확인으로 바로 이동하지 않음
                setCurrentStep(0);
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
                    property_pnu: '',
                    property_type: '',
                    property_dong: '',
                    property_is_basement: false,
                    property_ho: '',
                    resident_address: '',
                    resident_address_detail: '',
                    resident_address_road: '',
                    resident_address_jibun: '',
                    resident_zonecode: '',
                });
                setCurrentStep(0);
            }
            setAgreedToTerms(false);
            setError('');
            setEditingField(null);
        }
    }, [isOpen, inviteData, prefillName, prefillPhone]);

    // 기존 사용자 정보 로드 (재신청 시) - 수동 등록/일괄 초대/사전 등록 회원의 경우 마지막 확인 단계로 바로 이동
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
                    // user_property_units에서 물건지 정보 조회
                    const { data: propertyUnit } = await supabase
                        .from('user_property_units')
                        .select('*')
                        .eq('user_id', authLink.user_id)
                        .eq('is_primary', true)
                        .single();

                    // 기존 호수에서 지하 여부 판단
                    const existingHo = propertyUnit?.ho || '';
                    const isBasement = isBasementHo(existingHo);
                    const hoNumber = isBasement ? extractHoNumber(existingHo) || '' : existingHo;

                    const loadedFormData = {
                        name: userData.name || '',
                        phone_number: userData.phone_number || '',
                        birth_date: userData.birth_date || '',
                        property_address: userData.property_address || propertyUnit?.property_address_jibun || '',
                        property_address_detail: userData.property_address_detail || '',
                        property_address_road: propertyUnit?.property_address_road || '',
                        property_address_jibun: propertyUnit?.property_address_jibun || '',
                        property_zonecode: userData.property_zonecode || '',
                        property_pnu: propertyUnit?.pnu || '',
                        property_type: (userData.property_type as PropertyType) || '',
                        property_dong: propertyUnit?.dong || '',
                        property_is_basement: isBasement,
                        property_ho: hoNumber,
                        resident_address: userData.resident_address || '',
                        resident_address_detail: userData.resident_address_detail || '',
                        resident_address_road: userData.resident_address_road || '',
                        resident_address_jibun: userData.resident_address_jibun || '',
                        resident_zonecode: userData.resident_zonecode || '',
                    };

                    setFormData(loadedFormData);

                    // 수동 등록/일괄 초대/사전 등록 회원: 필수 정보가 모두 있으면 마지막 확인 단계로 바로 이동
                    // PRE_REGISTERED 상태이거나 초대 데이터가 있는 경우
                    const hasAllRequiredData = 
                        loadedFormData.name && 
                        loadedFormData.phone_number && 
                        loadedFormData.property_address &&
                        loadedFormData.property_type &&
                        loadedFormData.resident_address;
                    
                    if (hasAllRequiredData && (userData.user_status === 'PRE_REGISTERED' || inviteData)) {
                        // 마지막 확인 단계로 이동 (STEPS.length가 confirm step의 인덱스)
                        setCurrentStep(STEPS.length);
                    }
                }
            }
        };

        loadExistingUserData();
    }, [authUserId, isOpen, inviteData]);

    // 카카오 주소 선택 핸들러
    const handleAddressSelect = useCallback((addressData: AddressData) => {
        const pnu = generatePNU({
            b_code: addressData.bcode,
            main_address_no: addressData.main_address_no,
            sub_address_no: addressData.sub_address_no,
            mountain_yn: addressData.mountain_yn,
        });

        setFormData((prev) => ({
            ...prev,
            property_address: addressData.address,
            property_address_road: addressData.roadAddress,
            property_address_jibun: addressData.jibunAddress,
            property_zonecode: addressData.zonecode,
            property_pnu: pnu,
        }));
    }, []);

    // 카카오 실 거주지 주소 선택 핸들러
    const handleResidentAddressSelect = useCallback((addressData: AddressData) => {
        setFormData((prev) => ({
            ...prev,
            resident_address: addressData.address,
            resident_address_road: addressData.roadAddress,
            resident_address_jibun: addressData.jibunAddress,
            resident_zonecode: addressData.zonecode,
        }));
    }, []);

    // 물건지 주소 복사 핸들러
    const handleCopyPropertyAddress = useCallback(() => {
        setFormData((prev) => ({
            ...prev,
            resident_address: prev.property_address,
            resident_address_detail: prev.property_address_detail,
            resident_address_road: prev.property_address_road,
            resident_address_jibun: prev.property_address_jibun,
            resident_zonecode: prev.property_zonecode,
        }));
        // 복사 후 상세 주소 입력 단계로 바로 이동하거나, 
        // 현 단계(주소)가 채워졌으므로 다음으로 넘길 수 있게 함
    }, []);

    // 거주 유형에 따라 스텝을 스킵할지 여부 결정
    const shouldSkipStep = useCallback((stepKey: StepKey): boolean => {
        const propertyType = formData.property_type;
        
        if (stepKey === 'property_dong') {
            // 단독주택은 동 스킵
            if (propertyType === 'DETACHED_HOUSE') return true;
            return false;
        }

        if (stepKey === 'property_floor_type') {
            // 단독주택은 지상/지하 선택 스킵
            if (propertyType === 'DETACHED_HOUSE') return true;
            return false;
        }
        
        if (stepKey === 'property_ho') {
            // 단독주택은 호수 스킵
            if (propertyType === 'DETACHED_HOUSE') return true;
            return false;
        }
        
        return false;
    }, [formData.property_type]);

    // 거주 유형에 따라 필드가 필수인지 결정
    const isFieldRequired = useCallback((stepKey: StepKey): boolean => {
        const propertyType = formData.property_type;
        
        if (stepKey === 'property_dong') {
            // 아파트, 주상복합: 동 필수
            if (propertyType === 'APARTMENT' || propertyType === 'MIXED') return true;
            // 빌라, 상업용: 동 선택
            return false;
        }
        
        if (stepKey === 'property_ho') {
            // 빌라, 아파트, 주상복합: 호수 필수
            if (propertyType === 'VILLA' || propertyType === 'APARTMENT' || propertyType === 'MIXED') return true;
            // 상업용: 호수 선택
            return false;
        }
        
        // 기본 STEPS에 정의된 required 값 사용
        const step = STEPS.find(s => s.key === stepKey);
        return step?.required ?? false;
    }, [formData.property_type]);

    // 현재 스텝의 설정 가져오기
    const getCurrentStepConfig = useCallback((): StepConfig | null => {
        if (currentStep >= STEPS.length) return null;
        return STEPS[currentStep];
    }, [currentStep]);

    // 현재 스텝의 값 가져오기
    const getCurrentValue = useCallback((): string => {
        const config = getCurrentStepConfig();
        if (!config) return '';
        // property_floor_type은 별도로 처리 (boolean 타입이므로)
        if (config.key === 'property_floor_type') return '';
        const value = formData[config.key as keyof FormData];
        return typeof value === 'string' ? value : '';
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

        // 필수 필드 검증 (동적 필수 여부 확인)
        const stepKey = config?.key as StepKey;
        const dynamicRequired = stepKey ? isFieldRequired(stepKey) : config?.required;
        
        if (dynamicRequired && !getCurrentValue().trim()) {
            setError(`${config?.label}은(는) 필수 입력 항목입니다.`);
            return;
        }

        // property_type 선택 시 추가 검증
        if (stepKey === 'property_type' && !formData.property_type) {
            setError('물건지 유형을 선택해주세요.');
            return;
        }

        // property_floor_type 선택 검증 (빌라/아파트/주상복합인 경우 필수)
        if (stepKey === 'property_floor_type') {
            // 층 구분은 빌라/아파트/주상복합에서 표시되므로, 값이 선택되어 있어야 함
            // property_is_basement는 boolean이므로 항상 값이 있음 (기본값 false)
            // 따라서 별도 검증 없이 다음으로 진행
        }

        setError('');
        
        // 다음 스텝 찾기 (스킵해야 할 스텝은 건너뛰기)
        let nextStep = currentStep + 1;
        while (nextStep < STEPS.length) {
            const nextStepKey = STEPS[nextStep].key as StepKey;
            if (!shouldSkipStep(nextStepKey)) {
                break;
            }
            nextStep++;
        }
        
        if (nextStep <= totalSteps - 1) {
            setCurrentStep(nextStep);
        }
    }, [currentStep, totalSteps, getCurrentStepConfig, getCurrentValue, shouldSkipStep, isFieldRequired, formData.property_type]);

    // 이전 스텝으로
    const handlePrev = useCallback(() => {
        setError('');
        
        // 이전 스텝 찾기 (스킵해야 할 스텝은 건너뛰기)
        let prevStep = currentStep - 1;
        while (prevStep >= 0) {
            const prevStepKey = STEPS[prevStep]?.key as StepKey;
            if (!prevStepKey || !shouldSkipStep(prevStepKey)) {
                break;
            }
            prevStep--;
        }
        
        if (prevStep >= 0) {
            setCurrentStep(prevStep);
        }
    }, [currentStep, shouldSkipStep]);

    // 중복 사용자 확인 (같은 조합 내에서만 체크)
    const checkDuplicateUser = async (unionId: string | null): Promise<User | null> => {
        let query = supabase
            .from('users')
            .select('*')
            .eq('phone_number', formData.phone_number)
            .eq('name', formData.name)
            .eq('property_address', formData.property_address);
        
        // union_id가 있으면 같은 조합 내에서만 중복 체크
        if (unionId) {
            query = query.eq('union_id', unionId);
        }

        const { data, error } = await query.single();

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
            // Union ID 먼저 조회 (중복 체크에 필요)
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

            // 중복 사용자 확인 (같은 조합 내에서만)
            const duplicate = await checkDuplicateUser(unionId);
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

            // 초대 링크인 경우 역할 및 상태 결정
            const isInvite = !!inviteData?.invite_token;
            const role = isInvite && inviteData?.invite_type === 'admin' ? 'ADMIN' : isInvite ? 'USER' : 'APPLICANT';
            const userStatus = isInvite ? 'APPROVED' : 'PENDING_APPROVAL';

            // PRE_REGISTERED 사용자 매칭 시도 (이름 + pnu + 동 + 호수 - user_property_units 조인)
            let finalUserId: string | null = null;
            let isExistingPreRegistered = false;

            // 동호수 정규화 적용
            const normalizedDong = normalizeDong(formData.property_dong);
            const normalizedHo = createNormalizedHo(formData.property_is_basement, formData.property_ho);

            if (unionId && formData.property_pnu) {
                // PRE_REGISTERED 사용자 검색 (user_property_units 조인으로 pnu, dong, ho 비교)
                let preRegisteredQuery = supabase
                    .from('user_property_units')
                    .select('*, users!inner(*)')
                    .eq('users.union_id', unionId)
                    .eq('users.name', formData.name)
                    .eq('users.user_status', 'PRE_REGISTERED')
                    .eq('pnu', formData.property_pnu);

                // 동/호수 조건 추가 (정규화된 값 사용)
                if (normalizedDong) {
                    preRegisteredQuery = preRegisteredQuery.eq('dong', normalizedDong);
                } else {
                    preRegisteredQuery = preRegisteredQuery.is('dong', null);
                }

                if (normalizedHo) {
                    preRegisteredQuery = preRegisteredQuery.eq('ho', normalizedHo);
                } else {
                    preRegisteredQuery = preRegisteredQuery.is('ho', null);
                }

                const { data: preRegisteredData } = await preRegisteredQuery.single();

                if (preRegisteredData) {
                    const preRegistered = preRegisteredData.users as { id: string };
                    const propertyUnitId = preRegisteredData.id;

                    // 기존 PRE_REGISTERED 레코드 업데이트 (users - 기본 정보만)
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({
                            phone_number: formData.phone_number,
                            email: `${preRegistered.id}@placeholder.com`,
                            role: role,
                            user_status: userStatus,
                            birth_date: formData.birth_date || null,
                            property_address: formData.property_address,
                            property_address_detail: [normalizedDong, normalizedHo].filter(Boolean).join(' ') || null,
                            property_zonecode: formData.property_zonecode || null,
                            property_type: formData.property_type || null,
                            resident_address: formData.resident_address || null,
                            resident_address_detail: formData.resident_address_detail || null,
                            resident_address_road: formData.resident_address_road || null,
                            resident_address_jibun: formData.resident_address_jibun || null,
                            resident_zonecode: formData.resident_zonecode || null,
                            approved_at: isInvite ? new Date().toISOString() : null,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', preRegistered.id);

                    if (updateError) throw updateError;

                    // user_property_units 업데이트
                    await supabase
                        .from('user_property_units')
                        .update({
                            property_address_jibun: formData.property_address_jibun || null,
                            property_address_road: formData.property_address_road || null,
                            dong: normalizedDong,
                            ho: normalizedHo,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', propertyUnitId);

                    finalUserId = preRegistered.id;
                    isExistingPreRegistered = true;
                    console.log(`[회원가입] PRE_REGISTERED 사용자 매칭 성공: ${preRegistered.id}`);
                }
            }

            // PRE_REGISTERED 매칭이 없으면 새 사용자 생성
            if (!finalUserId) {
                // UUID 생성: crypto.randomUUID() 사용
                const newUserId = crypto.randomUUID();

                // property_address_detail은 정규화된 동/호수를 합쳐서 저장 (하위 호환성)
                const propertyAddressDetail = [normalizedDong, normalizedHo]
                    .filter(Boolean)
                    .join(' ') || null;

                // users 테이블에 기본 정보만 저장 (물건지 정보는 user_property_units로 이동)
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
                    property_address_detail: propertyAddressDetail,
                    property_zonecode: formData.property_zonecode || null,
                    property_type: formData.property_type || null,
                    resident_address: formData.resident_address || null,
                    resident_address_detail: formData.resident_address_detail || null,
                    resident_address_road: formData.resident_address_road || null,
                    resident_address_jibun: formData.resident_address_jibun || null,
                    resident_zonecode: formData.resident_zonecode || null,
                    approved_at: isInvite ? new Date().toISOString() : null,
                };

                const { error: userError } = await supabase.from('users').insert(newUser);
                if (userError) throw userError;

                // user_property_units에 물건지 정보 저장
                const { error: propertyUnitError } = await supabase.from('user_property_units').insert({
                    id: crypto.randomUUID(),
                    user_id: newUserId,
                    pnu: formData.property_pnu || null,
                    property_address_jibun: formData.property_address_jibun || null,
                    property_address_road: formData.property_address_road || null,
                    dong: normalizedDong,
                    ho: normalizedHo,
                    is_primary: true,
                });

                if (propertyUnitError) {
                    console.error('user_property_units insert error:', propertyUnitError);
                    // 실패해도 계속 진행 (critical하지 않음)
                }

                finalUserId = newUserId;
            }

            // 사용자 ID 확인
            const newUserId = finalUserId;
            const _ = isExistingPreRegistered; // ESLint용 변수 사용

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

            if (!isInvite && unionId) {
                try {
                    const { data: admins } = await supabase
                        .from('users')
                        .select('phone_number, name')
                        .eq('union_id', unionId)
                        .eq('role', 'ADMIN')
                        .eq('user_status', 'APPROVED');

                    if (admins && admins.length > 0) {
                        const { data: unionData } = await supabase
                            .from('unions')
                            .select('name')
                            .eq('id', unionId)
                            .single();

                        await sendAlimTalk({
                            unionId: unionId,
                            templateCode: 'UE_3805', // 사용자 승인 요청 알림 템플릿
                            recipients: admins.map((admin) => ({
                                phoneNumber: admin.phone_number,
                                name: admin.name,
                                variables: {
                                    조합명: unionData?.name || '',
                                    신청자명: formData.name,
                                    신청일시: new Date().toLocaleString('ko-KR'),
                                    조합슬러그: slug || '',
                                },
                            })),
                        });
                        console.log(`[승인 요청 알림톡] 관리자 ${admins.length}명에게 발송 요청 완료`);
                    }
                } catch (alimTalkError) {
                    console.error('관리자 알림톡 발송 실패:', alimTalkError);
                }
            }

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
                                        // 스킵된 스텝은 표시하지 않음
                                        if (shouldSkipStep(step.key as StepKey)) return null;

                                        const value = formData[step.key as keyof FormData];
                                        const isEditing = editingField === step.key;

                                        // 주소 표시 값 결정 (도로명 + 지번 둘 다 표시)
                                        let displayValue: string = typeof value === 'string' ? value : '';
                                        if (step.key === 'property_address' && formData.property_address_road) {
                                            displayValue = `${formData.property_address_road}${formData.property_address_jibun ? ` (${formData.property_address_jibun})` : ''}`;
                                        } else if (step.key === 'resident_address' && formData.resident_address_road) {
                                            displayValue = `${formData.resident_address_road}${formData.resident_address_jibun ? ` (${formData.resident_address_jibun})` : ''}`;
                                        } else if (step.key === 'property_type') {
                                            // 물건지 유형은 라벨로 표시
                                            const typeOption = PROPERTY_TYPE_OPTIONS.find(o => o.value === formData.property_type);
                                            displayValue = typeOption ? `${typeOption.icon} ${typeOption.label}` : '';
                                        } else if (step.key === 'property_floor_type') {
                                            // 층 구분: property_is_basement 값으로 표시
                                            displayValue = formData.property_is_basement ? '🅱️ 지하층' : '🏢 지상층';
                                        }

                                        return (
                                            <div 
                                                key={step.key} 
                                                className={cn(
                                                    "bg-gray-50 rounded-xl p-4",
                                                    !isEditing && "cursor-pointer hover:bg-gray-100 transition-colors"
                                                )}
                                                onClick={() => {
                                                    // 수정 모드가 아닐 때만 클릭으로 수정 모드 진입 (모바일 UX 개선)
                                                    if (!isEditing) {
                                                        setEditingField(step.key);
                                                    }
                                                }}
                                            >
                                                    <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-medium text-gray-600">
                                                                        {step.label}
                                                                        {isFieldRequired(step.key as StepKey) && <span className="text-red-500 ml-1">*</span>}
                                                                    </span>
                                                    {!isEditing && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingField(step.key);
                                                            }}
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
                                                            <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex-1">
                                                                    <BirthDatePicker
                                                                        value={typeof value === 'string' ? value : ''}
                                                                        onChange={(date) =>
                                                                            handleConfirmFieldChange(step.key, date)
                                                                        }
                                                                    />
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingField(null);
                                                                    }}
                                                                    className="h-12 px-4 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] flex-shrink-0"
                                                                >
                                                                    <Check className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ) : step.key === 'property_type' ? (
                                                            // 물건지 유형: 카드형 선택 UI
                                                            <div className="space-y-2">
                                                                {PROPERTY_TYPE_OPTIONS.map((option) => (
                                                                    <button
                                                                        key={option.value}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFormData(prev => ({ 
                                                                                ...prev, 
                                                                                property_type: option.value,
                                                                                // 단독주택 선택 시 동/호 초기화
                                                                                ...(option.value === 'DETACHED_HOUSE' ? { property_dong: '', property_ho: '' } : {})
                                                                            }));
                                                                        }}
                                                                        className={cn(
                                                                            'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                                                                            formData.property_type === option.value
                                                                                ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                                                : 'border-gray-200 hover:border-gray-300'
                                                                        )}
                                                                    >
                                                                        <span className="text-xl">{option.icon}</span>
                                                                        <span className="font-medium text-gray-900">{option.label}</span>
                                                                        {formData.property_type === option.value && (
                                                                            <Check className="w-4 h-4 text-[#4E8C6D] ml-auto" />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingField(null);
                                                                    }}
                                                                    className="h-10 px-4 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] w-full mt-2"
                                                                >
                                                                    완료
                                                                </button>
                                                            </div>
                                                        ) : step.key === 'property_floor_type' ? (
                                                            // 층 구분: 라디오 버튼 UI
                                                            <div className="space-y-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFormData(prev => ({ ...prev, property_is_basement: false }));
                                                                    }}
                                                                    className={cn(
                                                                        'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                                                                        !formData.property_is_basement
                                                                            ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                                            : 'border-gray-200 hover:border-gray-300'
                                                                    )}
                                                                >
                                                                    <span className="text-xl">🏢</span>
                                                                    <span className="font-medium text-gray-900">지상층</span>
                                                                    {!formData.property_is_basement && (
                                                                        <Check className="w-4 h-4 text-[#4E8C6D] ml-auto" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setFormData(prev => ({ ...prev, property_is_basement: true }));
                                                                    }}
                                                                    className={cn(
                                                                        'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                                                                        formData.property_is_basement
                                                                            ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                                            : 'border-gray-200 hover:border-gray-300'
                                                                    )}
                                                                >
                                                                    <span className="text-xl">🅱️</span>
                                                                    <span className="font-medium text-gray-900">지하층</span>
                                                                    {formData.property_is_basement && (
                                                                        <Check className="w-4 h-4 text-[#4E8C6D] ml-auto" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingField(null);
                                                                    }}
                                                                    className="h-10 px-4 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] w-full mt-2"
                                                                >
                                                                    완료
                                                                </button>
                                                            </div>
                                                        ) : step.key === 'property_address' ? (
                                                            // 물건지 주소: KakaoAddressSearch 사용
                                                            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <KakaoAddressSearch
                                                                    value={typeof value === 'string' ? value : ''}
                                                                    onAddressSelect={(addressData) => {
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            property_address: addressData.address,
                                                                            property_address_road:
                                                                                addressData.roadAddress,
                                                                            property_address_jibun:
                                                                                addressData.jibunAddress,
                                                                            property_zonecode: addressData.zonecode,
                                                                            property_pnu: generatePNU({
                                                                                b_code: addressData.bcode,
                                                                                main_address_no: addressData.main_address_no,
                                                                                sub_address_no: addressData.sub_address_no,
                                                                                mountain_yn: addressData.mountain_yn,
                                                                            }),
                                                                        }));
                                                                    }}
                                                                    placeholder={step.placeholder}
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingField(null);
                                                                    }}
                                                                    className="h-12 px-4 bg-[#4E8C6D] text-white rounded-lg hover:bg-[#3d7058] w-full"
                                                                >
                                                                    <span className="flex items-center justify-center gap-2">
                                                                        <Check className="w-5 h-5" />
                                                                        완료
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        ) : step.key === 'resident_address' ? (
                                                            // 실 거주지 주소: KakaoAddressSearch 사용
                                                            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <KakaoAddressSearch
                                                                    value={typeof value === 'string' ? value : ''}
                                                                    onAddressSelect={(addressData) => {
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            resident_address: addressData.address,
                                                                            resident_address_road:
                                                                                addressData.roadAddress,
                                                                            resident_address_jibun:
                                                                                addressData.jibunAddress,
                                                                            resident_zonecode: addressData.zonecode,
                                                                        }));
                                                                    }}
                                                                    placeholder={step.placeholder}
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingField(null);
                                                                    }}
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
                                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type={step.type}
                                                                    value={typeof value === 'string' ? value : ''}
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
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingField(null);
                                                                    }}
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
                                <div 
                                    className="mt-6 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors"
                                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                                >
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={agreedToTerms}
                                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#4E8C6D] focus:ring-[#4E8C6D]"
                                        />
                                        <span className="text-base text-gray-700">
                                            개인정보 수집 및 이용에 동의합니다
                                        </span>
                                    </label>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowTermsModal(true);
                                        }}
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
                                        {isFieldRequired(stepConfig.key as StepKey) && <span className="text-red-500 ml-1">*</span>}
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
                                        ) : stepConfig.key === 'property_type' ? (
                                            // 거주 유형 선택: 카드형 UI
                                            <div className="space-y-3">
                                                {PROPERTY_TYPE_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => setFormData(prev => ({ ...prev, property_type: option.value }))}
                                                        className={cn(
                                                            'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
                                                            formData.property_type === option.value
                                                                ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        )}
                                                    >
                                                        <span className="text-2xl">{option.icon}</span>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">{option.label}</p>
                                                            <p className="text-sm text-gray-500">{option.description}</p>
                                                        </div>
                                                        {formData.property_type === option.value && (
                                                            <Check className="w-5 h-5 text-[#4E8C6D]" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : stepConfig.key === 'property_floor_type' ? (
                                            // 지상/지하 선택: 라디오 버튼 UI
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, property_is_basement: false }))}
                                                    className={cn(
                                                        'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
                                                        !formData.property_is_basement
                                                            ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    )}
                                                >
                                                    <span className="text-2xl">🏢</span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">지상층</p>
                                                        <p className="text-sm text-gray-500">1층 이상 (예: 101호, 1001호)</p>
                                                    </div>
                                                    {!formData.property_is_basement && (
                                                        <Check className="w-5 h-5 text-[#4E8C6D]" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, property_is_basement: true }))}
                                                    className={cn(
                                                        'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
                                                        formData.property_is_basement
                                                            ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    )}
                                                >
                                                    <span className="text-2xl">🅱️</span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">지하층</p>
                                                        <p className="text-sm text-gray-500">지하 1층 이하 (예: B101, 비01)</p>
                                                    </div>
                                                    {formData.property_is_basement && (
                                                        <Check className="w-5 h-5 text-[#4E8C6D]" />
                                                    )}
                                                </button>
                                            </div>
                                        ) : stepConfig.key === 'resident_address' ? (
                                            // 실 거주지 주소: KakaoAddressSearch 사용 + 복사 버튼
                                            <div className="space-y-4">
                                                <button
                                                    onClick={handleCopyPropertyAddress}
                                                    className="w-full h-12 rounded-xl border-2 border-[#4E8C6D] text-[#4E8C6D] font-medium hover:bg-[#4E8C6D]/5 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    물건지 주소와 동일
                                                </button>
                                                <KakaoAddressSearch
                                                    value={getCurrentValue()}
                                                    onAddressSelect={handleResidentAddressSelect}
                                                    placeholder={stepConfig.placeholder}
                                                />
                                            </div>
                                        ) : (
                                            // 기본 입력 필드 (동, 호수 포함)
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
                                        {/* 빌라 선택 시 동 입력 안내 문구 */}
                                        {stepConfig.key === 'property_dong' && formData.property_type === 'VILLA' && (
                                            <p className="text-sm text-[#4E8C6D] mt-3 bg-[#4E8C6D]/10 rounded-lg p-3">
                                                💡 한 개동 빌라/다세대 주택은 동을 작성하지 않아도 됩니다.
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
