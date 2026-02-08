'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { User, NewUser } from '@/app/_lib/shared/type/database.types';
import { AuthProvider } from '@/app/_lib/shared/type/auth.types';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';
import { searchAddress } from '@/app/_lib/features/gis/actions/manualAddAddress';
import {
    MapPin,
    Phone,
    Calendar,
    UserIcon,
    Building2,
    X,
    ChevronLeft,
    ChevronRight,
    Check,
    AlertTriangle,
    Plus,
    Trash2,
    Info,
} from 'lucide-react';
import { TermsModal } from './TermsModal';
import { BirthDatePicker } from '@/app/_lib/widgets/common/date-picker/BirthDatePicker';
import { KakaoAddressSearch, AddressData } from '@/app/_lib/widgets/common/address/KakaoAddressSearch';
import { generatePNU } from '@/app/_lib/shared/utils/pnu-utils';
import {
    normalizeDong,
    createNormalizedHo,
    isBasementHo,
    extractHoNumber,
} from '@/app/_lib/shared/utils/dong-ho-utils';
import { checkAndMergeDuplicateUsers } from '@/app/_lib/features/user-dedup/actions/mergeUsers';
import { FloorIndicator } from '@/components/ui/FloorIndicator';
import { useFocusTrap } from '@/app/_lib/shared/hooks/useFocusTrap';

// 거주 유형 타입 정의
type PropertyType = 'DETACHED_HOUSE' | 'MULTI_FAMILY' | 'VILLA' | 'APARTMENT' | 'COMMERCIAL' | 'MIXED';

// 거주 유형 옵션
interface PropertyTypeOption {
    value: PropertyType;
    label: string;
    icon: string;
    description: string;
    example: string;
    requiresDong: boolean;
    requiresHo: boolean;
}

const PROPERTY_TYPE_OPTIONS: PropertyTypeOption[] = [
    {
        value: 'APARTMENT',
        label: '아파트',
        icon: '🏬',
        description: '다층 건물, 복도/공용 시설 공유',
        example: '강남 아파트 1206호',
        requiresDong: true,
        requiresHo: true,
    },
    {
        value: 'VILLA',
        label: '빌라/다세대',
        icon: '🏘️',
        description: '2~5층 규모의 소규모 주택',
        example: '강남 빌라 3층',
        requiresDong: false,
        requiresHo: true,
    },
    {
        value: 'MIXED',
        label: '주상복합',
        icon: '🏗️',
        description: '상가와 주거가 함께 있는 건물',
        example: '강남 주상복합 5층',
        requiresDong: true,
        requiresHo: true,
    },
    {
        value: 'MULTI_FAMILY',
        label: '다가구 주택',
        icon: '🏠',
        description: '2~4가구의 소규모 주택',
        example: '강남 다가구 주택 3층',
        requiresDong: false,
        requiresHo: true,
    },
    {
        value: 'DETACHED_HOUSE',
        label: '단독주택',
        icon: '🏡',
        description: '1가구 1건물 형태',
        example: '강남 단독주택',
        requiresDong: false,
        requiresHo: false,
    },
    {
        value: 'COMMERCIAL',
        label: '상업용',
        icon: '🏢',
        description: '상업 시설 및 사무실',
        example: '강남 빌딩 5층',
        requiresDong: false,
        requiresHo: false,
    },
];

// 최대 물건지 개수
const MAX_PROPERTIES = 5;

// Step 정의
type StepKey =
    | 'name'
    | 'birth_date'
    | 'phone_number'
    | 'property_address'
    | 'property_type'
    | 'property_dong'
    | 'property_floor_type' // 지상/지하 선택
    | 'property_ho'
    | 'add_property_confirm' // 추가 물건지 확인
    | 'resident_address'
    | 'resident_address_detail'
    | 'confirm';

// 물건지 데이터 타입
interface PropertyData {
    property_address: string;
    property_address_detail: string;
    property_address_road: string;
    property_address_jibun: string;
    property_zonecode: string;
    property_pnu: string;
    property_type: PropertyType | '';
    property_dong: string;
    property_is_basement: boolean;
    property_ho: string;
}

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
        type: 'text', // 실제로는 라디오 버튼으로 렌더링
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
        key: 'add_property_confirm',
        label: '추가 물건지',
        placeholder: '',
        description: '추가 물건지를 입력하시겠습니까?',
        subDescription: '다물건자인 경우 추가 물건지를 등록할 수 있습니다.',
        required: false,
        type: 'text',
        icon: <Plus className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'resident_address',
        label: '실 거주지 주소',
        placeholder: '지번/도로명 주소를 입력해주세요',
        description: '현재 거주하고 계신 주소입니다.',
        subDescription: '등기 및 주요 우편물을 보내드립니다.',
        required: true,
        type: 'text',
        icon: <MapPin className="w-6 h-6 md:w-7 md:h-7" />,
    },
    {
        key: 'resident_address_detail',
        label: '실 거주지 상세 주소',
        placeholder: '101동 1001호',
        description: '추가 상세 주소를 입력해주세요.',
        subDescription: '등기 및 주요 우편물을 보내드립니다.',
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

// 빈 물건지 데이터 생성 함수
const createEmptyProperty = (): PropertyData => ({
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
});

interface FormData {
    name: string;
    phone_number: string;
    birth_date: string;
    // 다물건자 지원: 물건지 배열
    properties: PropertyData[];
    // 하위 호환성을 위한 단일 물건지 필드 (첫 번째 물건지와 동기화)
    property_address: string;
    property_address_detail: string;
    property_address_road: string;
    property_address_jibun: string;
    property_zonecode: string;
    property_pnu: string;
    property_type: PropertyType | '';
    property_dong: string;
    property_is_basement: boolean; // 지하층 여부
    property_ho: string;
    // 실 거주지
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
    const totalSteps = STEPS.length + 1; // 입력 단계 + 최종 확인 1단계

    // 현재 편집 중인 물건지 인덱스 (다물건자 지원)
    const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);

    // 폼 상태
    const [formData, setFormData] = useState<FormData>({
        name: '',
        phone_number: '',
        birth_date: '',
        properties: [createEmptyProperty()],
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

    // 최종 확인 단계에서 수정 중인 필드 (현재 사용하지 않음 - 향후 수정 기능 추가 시 사용)
    const [_editingField, setEditingField] = useState<StepKey | null>(null);

    // 약관 동의
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    // 로딩/에러 상태
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const isSubmittingRef = useRef(false);

    // 중복 사용자 모달
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [existingUser, setExistingUser] = useState<User | null>(null);
    const [existingProvider, setExistingProvider] = useState<string>('');

    // ARIA: Focus Trap
    const focusTrapRef = useFocusTrap(isOpen);

    // ESC 키 핸들러
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (currentStep > 0) {
                    if (window.confirm('입력한 정보가 모두 사라집니다. 닫으시겠습니까?')) {
                        onClose();
                    }
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose, currentStep]);

    // prefill 여부 확인
    const hasPrefillData = !!(inviteData?.name || inviteData?.phone_number || inviteData?.property_address);

    // 초기 데이터 설정
    useEffect(() => {
        if (isOpen) {
            // 초대 데이터가 있으면 우선 적용
            const initialProperty: PropertyData = {
                property_address: inviteData?.property_address || '',
                property_address_detail: '',
                property_address_road: '',
                property_address_jibun: '',
                property_zonecode: '',
                property_pnu: '',
                property_type: '',
                property_dong: '',
                property_is_basement: false,
                property_ho: '',
            };

            if (inviteData) {
                setFormData({
                    name: inviteData.name || prefillName || '',
                    phone_number: inviteData.phone_number || prefillPhone || '',
                    birth_date: '',
                    properties: [initialProperty],
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
                    properties: [createEmptyProperty()],
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
            setCurrentPropertyIndex(0);
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
                    // user_property_units에서 모든 물건지 정보 조회
                    const { data: propertyUnits } = await supabase
                        .from('user_property_units')
                        .select('*')
                        .eq('user_id', authLink.user_id)
                        .order('is_primary', { ascending: false });

                    // 첫 번째 (primary) 물건지
                    const primaryPropertyUnit = propertyUnits?.find((p) => p.is_primary) || propertyUnits?.[0];

                    // 기존 호수에서 지하 여부 판단 (첫 번째 물건지)
                    const existingHo = primaryPropertyUnit?.ho || '';
                    const isBasement = isBasementHo(existingHo);
                    const hoNumber = isBasement ? extractHoNumber(existingHo) || '' : existingHo;

                    // 모든 물건지를 PropertyData 배열로 변환
                    const loadedProperties: PropertyData[] = (propertyUnits || []).map((unit) => {
                        const unitIsBasement = isBasementHo(unit.ho || '');
                        const unitHoNumber = unitIsBasement ? extractHoNumber(unit.ho || '') || '' : unit.ho || '';
                        return {
                            property_address: unit.property_address_jibun || unit.property_address_road || '',
                            property_address_detail: '',
                            property_address_road: unit.property_address_road || '',
                            property_address_jibun: unit.property_address_jibun || '',
                            property_zonecode: '',
                            property_pnu: unit.pnu || '',
                            property_type: (userData.property_type as PropertyType) || '',
                            property_dong: unit.dong || '',
                            property_is_basement: unitIsBasement,
                            property_ho: unitHoNumber,
                        };
                    });

                    // 물건지가 없으면 빈 물건지 하나 추가
                    if (loadedProperties.length === 0) {
                        loadedProperties.push(createEmptyProperty());
                    }

                    const loadedFormData: FormData = {
                        name: userData.name || '',
                        phone_number: userData.phone_number || '',
                        birth_date: userData.birth_date || '',
                        properties: loadedProperties,
                        property_address:
                            userData.property_address || primaryPropertyUnit?.property_address_jibun || '',
                        property_address_detail: userData.property_address_detail || '',
                        property_address_road: primaryPropertyUnit?.property_address_road || '',
                        property_address_jibun: primaryPropertyUnit?.property_address_jibun || '',
                        property_zonecode: userData.property_zonecode || '',
                        property_pnu: primaryPropertyUnit?.pnu || '',
                        property_type: (userData.property_type as PropertyType) || '',
                        property_dong: primaryPropertyUnit?.dong || '',
                        property_is_basement: isBasement,
                        property_ho: hoNumber,
                        resident_address: userData.resident_address || '',
                        resident_address_detail: userData.resident_address_detail || '',
                        resident_address_road: userData.resident_address_road || '',
                        resident_address_jibun: userData.resident_address_jibun || '',
                        resident_zonecode: userData.resident_zonecode || '',
                    };

                    setFormData(loadedFormData);
                    setCurrentPropertyIndex(0);

                    // 수동 등록/일괄 초대/사전 등록 회원: 필수 정보가 모두 있으면 마지막 확인 단계로 바로 이동
                    // PRE_REGISTERED 상태이거나 초대 데이터가 있는 경우
                    const hasAllRequiredData =
                        loadedFormData.name &&
                        loadedFormData.phone_number &&
                        loadedFormData.properties[0]?.property_address &&
                        loadedFormData.properties[0]?.property_type &&
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

    // 현재 편집 중인 물건지 데이터 가져오기
    const getCurrentProperty = useCallback((): PropertyData => {
        return formData.properties[currentPropertyIndex] || createEmptyProperty();
    }, [formData.properties, currentPropertyIndex]);

    // 현재 물건지 데이터 업데이트
    const updateCurrentProperty = useCallback(
        (updates: Partial<PropertyData>) => {
            setFormData((prev) => {
                const newProperties = [...prev.properties];
                newProperties[currentPropertyIndex] = {
                    ...newProperties[currentPropertyIndex],
                    ...updates,
                };
                // 첫 번째 물건지는 하위 호환성을 위해 단일 필드와도 동기화
                const syncFields =
                    currentPropertyIndex === 0
                        ? {
                              property_address: newProperties[0].property_address,
                              property_address_detail: newProperties[0].property_address_detail,
                              property_address_road: newProperties[0].property_address_road,
                              property_address_jibun: newProperties[0].property_address_jibun,
                              property_zonecode: newProperties[0].property_zonecode,
                              property_pnu: newProperties[0].property_pnu,
                              property_type: newProperties[0].property_type,
                              property_dong: newProperties[0].property_dong,
                              property_is_basement: newProperties[0].property_is_basement,
                              property_ho: newProperties[0].property_ho,
                          }
                        : {};
                return {
                    ...prev,
                    properties: newProperties,
                    ...syncFields,
                };
            });
        },
        [currentPropertyIndex]
    );

    // 카카오 주소 선택 핸들러
    const handleAddressSelect = useCallback(
        async (addressData: AddressData) => {
            // 먼저 기본 주소 정보 업데이트 (PNU는 나중에 설정)
            updateCurrentProperty({
                property_address: addressData.address,
                property_address_road: addressData.roadAddress,
                property_address_jibun: addressData.jibunAddress,
                property_zonecode: addressData.zonecode,
                property_pnu: '', // 임시로 빈 값
            });

            let pnu = '';

            // 1차: 지번 주소가 있으면 서버 API로 정확한 PNU 조회
            if (addressData.jibunAddress) {
                try {
                    const result = await searchAddress(addressData.jibunAddress);
                    if (result.success && result.data?.pnu) {
                        pnu = result.data.pnu;
                    }
                } catch (error) {
                    console.warn('[RegisterModal] PNU API 호출 실패, 클라이언트 생성 시도', error);
                }
            }

            // 2차: API 실패 시 클라이언트 측 fallback
            if (!pnu && addressData.bcode && addressData.main_address_no) {
                pnu = generatePNU({
                    b_code: addressData.bcode,
                    main_address_no: addressData.main_address_no,
                    sub_address_no: addressData.sub_address_no,
                    mountain_yn: addressData.mountain_yn,
                });
            }

            // PNU 업데이트
            if (pnu) {
                updateCurrentProperty({
                    property_pnu: pnu,
                });
            }
        },
        [updateCurrentProperty]
    );

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
    const shouldSkipStep = useCallback(
        (stepKey: StepKey): boolean => {
            const currentProp = formData.properties[currentPropertyIndex];
            const propertyType = currentProp?.property_type || '';

            if (stepKey === 'property_dong') {
                // 단독주택, 다가구 주택은 동 스킵
                if (propertyType === 'DETACHED_HOUSE' || propertyType === 'MULTI_FAMILY') return true;
                return false;
            }

            if (stepKey === 'property_floor_type') {
                // 단독주택, 다가구 주택은 지상/지하 선택 스킵
                if (propertyType === 'DETACHED_HOUSE' || propertyType === 'MULTI_FAMILY') return true;
                return false;
            }

            if (stepKey === 'property_ho') {
                // 단독주택, 다가구 주택은 호수 스킵
                if (propertyType === 'DETACHED_HOUSE' || propertyType === 'MULTI_FAMILY') return true;
                return false;
            }

            return false;
        },
        [formData.properties, currentPropertyIndex]
    );

    // 거주 유형에 따라 필드가 필수인지 결정
    const isFieldRequired = useCallback(
        (stepKey: StepKey): boolean => {
            const currentProp = formData.properties[currentPropertyIndex];
            const propertyType = currentProp?.property_type || '';

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
            const step = STEPS.find((s) => s.key === stepKey);
            return step?.required ?? false;
        },
        [formData.properties, currentPropertyIndex]
    );

    // 현재 스텝의 설정 가져오기
    const getCurrentStepConfig = useCallback((): StepConfig | null => {
        if (currentStep >= STEPS.length) return null;
        return STEPS[currentStep];
    }, [currentStep]);

    // 물건지 관련 필드인지 확인
    const isPropertyField = (key: string): boolean => {
        return ['property_address', 'property_type', 'property_dong', 'property_floor_type', 'property_ho'].includes(
            key
        );
    };

    // 현재 스텝의 값 가져오기
    const getCurrentValue = useCallback((): string => {
        const config = getCurrentStepConfig();
        if (!config) return '';
        // property_floor_type은 별도로 처리 (boolean 타입이므로)
        if (config.key === 'property_floor_type') return '';
        // add_property_confirm은 별도 처리
        if (config.key === 'add_property_confirm') return '';

        // 물건지 관련 필드는 현재 물건지에서 가져옴
        if (isPropertyField(config.key)) {
            const currentProp = formData.properties[currentPropertyIndex];
            if (!currentProp) return '';
            const propKey = config.key as keyof PropertyData;
            const value = currentProp[propKey];
            return typeof value === 'string' ? value : '';
        }

        const value = formData[config.key as keyof FormData];
        return typeof value === 'string' ? value : '';
    }, [getCurrentStepConfig, formData, currentPropertyIndex]);

    // 값 변경 핸들러
    const handleValueChange = useCallback(
        (value: string) => {
            const config = getCurrentStepConfig();
            if (!config) return;

            // 물건지 관련 필드는 현재 물건지를 업데이트
            if (isPropertyField(config.key)) {
                updateCurrentProperty({ [config.key]: value });
            } else {
                setFormData((prev) => ({
                    ...prev,
                    [config.key]: value,
                }));
            }
        },
        [getCurrentStepConfig, updateCurrentProperty]
    );

    // 최종 확인에서 필드 값 변경 (현재 사용하지 않음 - 향후 수정 기능 추가 시 사용)
    const _handleConfirmFieldChange = useCallback((key: StepKey, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);
    void _handleConfirmFieldChange; // ESLint 경고 방지

    // 추가 물건지 추가 핸들러
    const handleAddProperty = useCallback(() => {
        if (formData.properties.length >= MAX_PROPERTIES) {
            setError(
                `물건지는 최대 ${MAX_PROPERTIES}개까지 입력 가능합니다. 추가 물건지가 있으시면 조합에 연락해주세요.`
            );
            return;
        }

        // 새 물건지 추가
        const newIndex = formData.properties.length;
        setFormData((prev) => ({
            ...prev,
            properties: [...prev.properties, createEmptyProperty()],
        }));
        setCurrentPropertyIndex(newIndex);

        // 물건지 주소 입력 스텝으로 이동
        const propertyAddressStepIndex = STEPS.findIndex((s) => s.key === 'property_address');
        if (propertyAddressStepIndex >= 0) {
            setCurrentStep(propertyAddressStepIndex);
        }
    }, [formData.properties.length]);

    // 다음 스텝으로
    const handleNext = useCallback(() => {
        const config = getCurrentStepConfig();
        const stepKey = config?.key as StepKey;
        const currentProp = formData.properties[currentPropertyIndex];

        // 필수 필드 검증 (동적 필수 여부 확인)
        const dynamicRequired = stepKey ? isFieldRequired(stepKey) : config?.required;

        if (dynamicRequired && !getCurrentValue().trim()) {
            setError(`${config?.label}은(는) 필수 입력 항목입니다.`);
            return;
        }

        // property_type 선택 시 추가 검증
        if (stepKey === 'property_type' && !currentProp?.property_type) {
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
    }, [
        currentStep,
        totalSteps,
        getCurrentStepConfig,
        getCurrentValue,
        shouldSkipStep,
        isFieldRequired,
        formData.properties,
        currentPropertyIndex,
    ]);

    // 추가 물건지 건너뛰기 (실 거주지로 이동)
    const handleSkipAddProperty = useCallback(() => {
        setError('');
        // 실 거주지 주소 스텝으로 이동
        const residentAddressStepIndex = STEPS.findIndex((s) => s.key === 'resident_address');
        if (residentAddressStepIndex >= 0) {
            setCurrentStep(residentAddressStepIndex);
        }
    }, []);

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

    // 물건지 삭제 핸들러 (최종 확인 단계에서 사용)
    const handleDeleteProperty = useCallback(
        (indexToDelete: number) => {
            // 최소 1개 물건지는 유지
            if (formData.properties.length <= 1) {
                setError('최소 1개의 물건지는 유지해야 합니다.');
                return;
            }

            setFormData((prev) => {
                const newProperties = prev.properties.filter((_, idx) => idx !== indexToDelete);
                // 첫 번째 물건지와 단일 필드 동기화
                const firstProp = newProperties[0];
                const syncFields: Partial<FormData> = {
                    property_address: firstProp?.property_address || '',
                    property_address_detail: firstProp?.property_address_detail || '',
                    property_address_road: firstProp?.property_address_road || '',
                    property_address_jibun: firstProp?.property_address_jibun || '',
                    property_zonecode: firstProp?.property_zonecode || '',
                    property_pnu: firstProp?.property_pnu || '',
                    property_type: firstProp?.property_type || ('' as PropertyType | ''),
                    property_dong: firstProp?.property_dong || '',
                    property_is_basement: firstProp?.property_is_basement || false,
                    property_ho: firstProp?.property_ho || '',
                };
                return {
                    ...prev,
                    properties: newProperties,
                    ...syncFields,
                };
            });

            // 인덱스 조정
            if (currentPropertyIndex >= indexToDelete && currentPropertyIndex > 0) {
                setCurrentPropertyIndex(currentPropertyIndex - 1);
            }
        },
        [formData.properties.length, currentPropertyIndex]
    );

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
        if (isSubmittingRef.current) return;
        setError('');

        // 필수 필드 검증
        if (!formData.name || !formData.phone_number) {
            setError('이름, 휴대폰 번호는 필수 입력 항목입니다.');
            return;
        }

        // 물건지 검증 (최소 1개 필요)
        if (formData.properties.length === 0 || !formData.properties[0].property_address) {
            setError('최소 1개의 물건지 주소를 입력해주세요.');
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

        isSubmittingRef.current = true;
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

            // 첫 번째 물건지 데이터 가져오기
            const primaryProperty = formData.properties[0];

            // 동호수 정규화 적용 (첫 번째 물건지 기준)
            const normalizedDong = normalizeDong(primaryProperty.property_dong);
            const normalizedHo = createNormalizedHo(primaryProperty.property_is_basement, primaryProperty.property_ho);

            // 항상 새 사용자 생성 (이름 + 거주지 지번 기준 중복 병합은 생성 후 수행)
            // UUID 생성: crypto.randomUUID() 사용
            const newUserId = crypto.randomUUID();

            // property_address_detail은 정규화된 동/호수를 합쳐서 저장 (하위 호환성)
            const propertyAddressDetail = [normalizedDong, normalizedHo].filter(Boolean).join(' ') || null;

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
                property_address: primaryProperty.property_address,
                property_address_detail: propertyAddressDetail,
                property_zonecode: primaryProperty.property_zonecode || null,
                property_type: primaryProperty.property_type || null,
                resident_address: formData.resident_address || null,
                resident_address_detail: formData.resident_address_detail || null,
                resident_address_road: formData.resident_address_road || null,
                resident_address_jibun: formData.resident_address_jibun || null,
                resident_zonecode: formData.resident_zonecode || null,
                approved_at: isInvite ? new Date().toISOString() : null,
            };

            const { error: userError } = await supabase.from('users').insert(newUser);
            if (userError) throw userError;

            // 모든 물건지를 user_property_units에 저장
            const propertyUnitsToInsert = formData.properties.map((prop, index) => {
                const propNormalizedDong = normalizeDong(prop.property_dong);
                const propNormalizedHo = createNormalizedHo(prop.property_is_basement, prop.property_ho);
                return {
                    id: crypto.randomUUID(),
                    user_id: newUserId,
                    pnu: prop.property_pnu || null,
                    property_address_jibun: prop.property_address_jibun || null,
                    property_address_road: prop.property_address_road || null,
                    dong: propNormalizedDong,
                    ho: propNormalizedHo,
                    is_primary: index === 0, // 첫 번째 물건지만 primary
                };
            });

            const { error: propertyUnitError } = await supabase
                .from('user_property_units')
                .insert(propertyUnitsToInsert);

            if (propertyUnitError) {
                console.error('user_property_units insert error:', propertyUnitError);
                // 실패해도 계속 진행 (critical하지 않음)
            }

            // 이름 + 거주지 지번 기준으로 중복 사용자 검사 및 병합 (새 사용자가 keeper)
            if (unionId && formData.resident_address_jibun) {
                try {
                    await checkAndMergeDuplicateUsers(
                        newUserId,
                        unionId,
                        formData.name,
                        formData.resident_address_jibun
                    );
                } catch (mergeError) {
                    // 병합 실패는 치명적이지 않으므로 로깅만 수행
                    console.error('[회원가입] 중복 사용자 병합 실패:', mergeError);
                }
            }

            // user_auth_links에 연결 추가
            const { error: linkError } = await supabase.from('user_auth_links').insert({
                user_id: newUserId,
                auth_user_id: authUserId,
                provider,
            });

            if (linkError) {
                await supabase.from('user_property_units').delete().eq('user_id', newUserId);
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
            isSubmittingRef.current = false;
        }
    };

    if (!isOpen) return null;

    const isConfirmStep = currentStep === STEPS.length;
    const stepConfig = getCurrentStepConfig();

    return (
        <>
            {/* 메인 모달 */}
            <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-labelledby="register-modal-title" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                            <Building2 className="w-6 h-6 text-[#4E8C6D]" />
                            <h2 id="register-modal-title" className="text-lg md:text-xl font-bold text-gray-900">조합원 등록</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
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
                            {isConfirmStep ? ' 최종 확인' : getCurrentStepConfig()?.label ? ` ${getCurrentStepConfig()!.label}` : ''}
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

                                {/* 기본 정보 섹션 */}
                                <div className="space-y-3">
                                    {/* 이름 */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">
                                                이름 (소유자명) <span className="text-red-500">*</span>
                                            </span>
                                        </div>
                                        <p className="text-base md:text-lg text-gray-900">{formData.name}</p>
                                    </div>

                                    {/* 생년월일 */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">생년월일</span>
                                        </div>
                                        <p className="text-base md:text-lg text-gray-900">
                                            {formData.birth_date || (
                                                <span className="text-gray-500">입력하지 않음</span>
                                            )}
                                        </p>
                                    </div>

                                    {/* 휴대폰 번호 */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">
                                                휴대폰 번호 <span className="text-red-500">*</span>
                                            </span>
                                        </div>
                                        <p className="text-base md:text-lg text-gray-900">{formData.phone_number}</p>
                                    </div>
                                </div>

                                {/* 물건지 정보 섹션들 */}
                                <div className="space-y-4">
                                    {formData.properties.map((property, propIndex) => {
                                        const typeOption = PROPERTY_TYPE_OPTIONS.find(
                                            (o) => o.value === property.property_type
                                        );
                                        const isSkipDongHo =
                                            property.property_type === 'DETACHED_HOUSE' ||
                                            property.property_type === 'MULTI_FAMILY';

                                        return (
                                            <div
                                                key={propIndex}
                                                className="border-2 border-[#4E8C6D]/30 rounded-xl overflow-hidden"
                                            >
                                                {/* 물건지 헤더 */}
                                                <div className="bg-[#4E8C6D]/10 px-4 py-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-5 h-5 text-[#4E8C6D]" />
                                                        <span className="font-semibold text-[#4E8C6D]">
                                                            물건지 {propIndex + 1}
                                                        </span>
                                                    </div>
                                                    {formData.properties.length > 1 && (
                                                        <button
                                                            onClick={() => handleDeleteProperty(propIndex)}
                                                            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            삭제
                                                        </button>
                                                    )}
                                                </div>

                                                {/* 물건지 내용 */}
                                                <div className="p-4 space-y-3 bg-white">
                                                    {/* 물건지 주소 */}
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <span className="text-sm font-medium text-gray-600">
                                                            물건지 주소 <span className="text-red-500">*</span>
                                                        </span>
                                                        <p className="text-base text-gray-900 mt-1">
                                                            {property.property_address_road
                                                                ? `${property.property_address_road}${
                                                                      property.property_address_jibun
                                                                          ? ` (${property.property_address_jibun})`
                                                                          : ''
                                                                  }`
                                                                : property.property_address}
                                                        </p>
                                                    </div>

                                                    {/* 물건지 유형 */}
                                                    <div className="bg-gray-50 rounded-lg p-3">
                                                        <span className="text-sm font-medium text-gray-600">
                                                            물건지 유형 <span className="text-red-500">*</span>
                                                        </span>
                                                        <p className="text-base text-gray-900 mt-1">
                                                            {typeOption
                                                                ? `${typeOption.icon} ${typeOption.label}`
                                                                : '미선택'}
                                                        </p>
                                                    </div>

                                                    {/* 동 (스킵하지 않는 경우) */}
                                                    {!isSkipDongHo && (
                                                        <div className="bg-gray-50 rounded-lg p-3">
                                                            <span className="text-sm font-medium text-gray-600">
                                                                동
                                                            </span>
                                                            <p className="text-base text-gray-900 mt-1">
                                                                {property.property_dong || (
                                                                    <span className="text-gray-500">입력하지 않음</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* 층 구분 (스킵하지 않는 경우) */}
                                                    {!isSkipDongHo && (
                                                        <div className="bg-gray-50 rounded-lg p-3">
                                                            <span className="text-sm font-medium text-gray-600">
                                                                층 구분
                                                            </span>
                                                            <div className="mt-1">
                                                                <FloorIndicator
                                                                  isBasement={property.property_is_basement}
                                                                  size="md"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* 호수 (스킵하지 않는 경우) */}
                                                    {!isSkipDongHo && (
                                                        <div className="bg-gray-50 rounded-lg p-3">
                                                            <span className="text-sm font-medium text-gray-600">
                                                                호수
                                                                {(property.property_type === 'VILLA' ||
                                                                    property.property_type === 'APARTMENT' ||
                                                                    property.property_type === 'MIXED') && (
                                                                    <span className="text-red-500 ml-1">*</span>
                                                                )}
                                                            </span>
                                                            <p className="text-base text-gray-900 mt-1">
                                                                {property.property_ho || (
                                                                    <span className="text-gray-500">입력하지 않음</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 실 거주지 정보 섹션 */}
                                <div className="space-y-3">
                                    {/* 실 거주지 주소 */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">
                                                실 거주지 주소 <span className="text-red-500">*</span>
                                            </span>
                                        </div>
                                        <p className="text-base md:text-lg text-gray-900">
                                            {formData.resident_address_road
                                                ? `${formData.resident_address_road}${
                                                      formData.resident_address_jibun
                                                          ? ` (${formData.resident_address_jibun})`
                                                          : ''
                                                  }`
                                                : formData.resident_address}
                                        </p>
                                    </div>

                                    {/* 실 거주지 상세 주소 */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-600">
                                                실 거주지 상세 주소 <span className="text-red-500">*</span>
                                            </span>
                                        </div>
                                        <p className="text-base md:text-lg text-gray-900">
                                            {formData.resident_address_detail || (
                                                <span className="text-gray-500">입력하지 않음</span>
                                            )}
                                        </p>
                                    </div>
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
                                    <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg">
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
                                    <h3 id="register-step-label" className="text-lg md:text-xl font-semibold text-gray-900 mb-2 text-center">
                                        {stepConfig.label}
                                        {isFieldRequired(stepConfig.key as StepKey) && (
                                            <span className="text-red-500 ml-1">*</span>
                                        )}
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
                                            <BirthDatePicker value={getCurrentValue()} onChange={handleValueChange} />
                                        ) : stepConfig.key === 'property_address' ? (
                                            // 물건지 주소: KakaoAddressSearch 사용
                                            <KakaoAddressSearch
                                                value={getCurrentValue()}
                                                onAddressSelect={handleAddressSelect}
                                                placeholder={stepConfig.placeholder}
                                            />
                                        ) : stepConfig.key === 'property_type' ? (
                                            // 거주 유형 선택: 카드형 UI
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    {PROPERTY_TYPE_OPTIONS.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                // 단독주택/다가구 주택 선택 시 동/호 초기화
                                                                const shouldClearDongHo =
                                                                    option.value === 'DETACHED_HOUSE' ||
                                                                    option.value === 'MULTI_FAMILY';
                                                                updateCurrentProperty({
                                                                    property_type: option.value,
                                                                    ...(shouldClearDongHo
                                                                        ? { property_dong: '', property_ho: '' }
                                                                        : {}),
                                                                });
                                                            }}
                                                            className={cn(
                                                                'p-4 border-2 rounded-lg text-left transition-all hover:shadow-md active:scale-95',
                                                                getCurrentProperty().property_type === option.value
                                                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                            )}
                                                        >
                                                            {/* 아이콘 */}
                                                            <div className="text-3xl mb-2">{option.icon}</div>

                                                            {/* 레이블 */}
                                                            <h3 className="font-bold text-gray-900 mb-1">{option.label}</h3>

                                                            {/* 설명 */}
                                                            <p className="text-sm text-gray-600 mb-2">{option.description}</p>

                                                            {/* 예시 */}
                                                            <p className="text-xs text-gray-500">예: {option.example}</p>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* 선택 후 추가 정보 - 조건부 렌더링 */}
                                                {getCurrentProperty().property_type && (
                                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <p className="text-sm font-medium text-blue-900 mb-2">
                                                            ✅ {
                                                                PROPERTY_TYPE_OPTIONS.find((o) => o.value === getCurrentProperty().property_type)
                                                                    ?.label
                                                            }
                                                            을 선택하셨습니다
                                                        </p>
                                                        <p className="text-xs text-blue-700">
                                                            {(() => {
                                                                const selected = PROPERTY_TYPE_OPTIONS.find(
                                                                    (o) => o.value === getCurrentProperty().property_type
                                                                );
                                                                if (selected?.requiresDong && selected?.requiresHo) {
                                                                    return '동/호수 입력이 필요합니다 (예: 103동 1206호)';
                                                                } else if (selected?.requiresHo) {
                                                                    return '호수 입력이 필요합니다 (예: 3층 또는 101호)';
                                                                } else {
                                                                    return '동/호수 입력이 불필요합니다';
                                                                }
                                                            })()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : stepConfig.key === 'property_floor_type' ? (
                                            // 지상/지하 선택: 라디오 버튼 UI
                                            <div className="space-y-3">
                                                <button
                                                    onClick={() =>
                                                        updateCurrentProperty({ property_is_basement: false })
                                                    }
                                                    className={cn(
                                                        'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 cursor-pointer',
                                                        !getCurrentProperty().property_is_basement
                                                            ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'bg-blue-500 text-white rounded px-2 py-1 text-sm font-bold w-7 h-7 flex items-center justify-center'
                                                        )}
                                                    >
                                                        ↑
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">지상층</p>
                                                        <p className="text-sm text-gray-500">
                                                            1층 이상 (예: 101호, 1001호)
                                                        </p>
                                                    </div>
                                                    {!getCurrentProperty().property_is_basement && (
                                                        <Check className="w-5 h-5 text-[#4E8C6D]" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        updateCurrentProperty({ property_is_basement: true })
                                                    }
                                                    className={cn(
                                                        'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 cursor-pointer',
                                                        getCurrentProperty().property_is_basement
                                                            ? 'border-[#4E8C6D] bg-[#4E8C6D]/5'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'bg-gray-800 text-white rounded px-2 py-1 text-sm font-bold'
                                                        )}
                                                    >
                                                        B
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">지하층</p>
                                                        <p className="text-sm text-gray-500">
                                                            지하 1층 이하 (예: B101, 비01)
                                                        </p>
                                                    </div>
                                                    {getCurrentProperty().property_is_basement && (
                                                        <Check className="w-5 h-5 text-[#4E8C6D]" />
                                                    )}
                                                </button>
                                            </div>
                                        ) : stepConfig.key === 'add_property_confirm' ? (
                                            // 추가 물건지 확인: 예/아니오 선택 UI
                                            <div className="space-y-4">
                                                {/* 현재 등록된 물건지 개수 표시 */}
                                                <div className="p-4 bg-[#4E8C6D]/10 rounded-xl">
                                                    <div className="flex items-center gap-2 text-[#4E8C6D]">
                                                        <Info className="w-5 h-5" />
                                                        <span className="font-medium">
                                                            현재 {formData.properties.length}개의 물건지가
                                                            등록되었습니다.
                                                        </span>
                                                    </div>
                                                    {formData.properties.length >= MAX_PROPERTIES && (
                                                        <p className="mt-2 text-sm text-amber-600">
                                                            물건지는 최대 {MAX_PROPERTIES}개까지 입력 가능합니다.
                                                            <br />
                                                            추가 물건지가 있으시면 조합에 연락해주세요.
                                                        </p>
                                                    )}
                                                </div>

                                                {/* 예/아니오 버튼 */}
                                                <div className="space-y-3">
                                                    {formData.properties.length < MAX_PROPERTIES && (
                                                        <button
                                                            onClick={handleAddProperty}
                                                            className={cn(
                                                                'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 cursor-pointer',
                                                                'border-[#4E8C6D] hover:bg-[#4E8C6D]/5'
                                                            )}
                                                        >
                                                            <span className="text-2xl">➕</span>
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">
                                                                    예, 추가 물건지가 있습니다
                                                                </p>
                                                                <p className="text-sm text-gray-500">
                                                                    다른 물건지 정보를 입력합니다
                                                                </p>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-[#4E8C6D]" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={handleSkipAddProperty}
                                                        className={cn(
                                                            'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 cursor-pointer',
                                                            'border-gray-300 hover:bg-gray-50'
                                                        )}
                                                    >
                                                        <span className="text-2xl">✅</span>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-900">
                                                                아니오, 다음 단계로
                                                            </p>
                                                            <p className="text-sm text-gray-500">
                                                                실 거주지 주소를 입력합니다
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                                    </button>
                                                </div>
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
                                                aria-labelledby="register-step-label"
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
                                            <p className="text-sm md:text-base text-gray-500 mt-1">
                                                {stepConfig.subDescription}
                                            </p>
                                        )}
                                        {/* 빌라 선택 시 동 입력 안내 문구 */}
                                        {stepConfig.key === 'property_dong' &&
                                            getCurrentProperty().property_type === 'VILLA' && (
                                                <p className="text-sm text-[#4E8C6D] mt-3 bg-[#4E8C6D]/10 rounded-lg p-3">
                                                    💡 한 개동 빌라/다세대 주택은 동을 작성하지 않아도 됩니다.
                                                </p>
                                            )}
                                        {/* 다물건자 안내 문구 */}
                                        {stepConfig.key === 'property_address' && currentPropertyIndex > 0 && (
                                            <p className="text-sm text-[#4E8C6D] mt-3 bg-[#4E8C6D]/10 rounded-lg p-3">
                                                📍 {currentPropertyIndex + 1}번째 물건지를 입력하고 있습니다.
                                            </p>
                                        )}
                                    </div>

                                    {/* 에러 메시지 */}
                                    {error && (
                                        <div role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg w-full max-w-sm">
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
                                        'hover:bg-gray-50 transition-colors cursor-pointer',
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
                                        'transition-colors cursor-pointer',
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
                                        'transition-colors cursor-pointer',
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
