'use client';

import React, { useState } from 'react';
import {
    User as UserIcon,
    Phone,
    Calendar,
    MapPin,
    FileText,
    Save,
    Ban,
    X,
    Loader2,
    AlertTriangle,
    CheckCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Link2,
    Building,
    Star,
    Percent,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
    useUpdateMember,
    useUpdateMemberPnu,
    useUnionLandLots,
    useUpdateOwnershipType,
    useSetPrimaryPropertyUnit,
    MemberWithLandInfo,
} from '@/app/_lib/features/member-management/api/useMemberHook';
import { useLogAccessEvent } from '@/app/_lib/features/member-management/api/useAccessLogHook';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { SelectBox } from '@/app/_lib/widgets/common/select-box';
import { KakaoAddressSearch, AddressData } from '@/app/_lib/widgets/common/address/KakaoAddressSearch';
import {
    OwnershipType,
    OWNERSHIP_TYPE_LABELS,
    OWNERSHIP_TYPE_STYLES,
    MemberPropertyUnitInfo,
} from '@/app/_lib/shared/type/database.types';

interface MemberEditModalProps {
    member: MemberWithLandInfo;
    onClose: () => void;
    onBlock: () => void;
}

// 면적 포맷 함수 (㎡)
const formatArea = (area: number | null | undefined): string => {
    if (area === null || area === undefined) return '-';
    return `${area.toLocaleString()} ㎡`;
};

// 공시지가 포맷 함수 (원)
const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '-';
    return `${price.toLocaleString()} 원`;
};

export default function MemberEditModal({ member, onClose, onBlock }: MemberEditModalProps) {
    const { user } = useAuth();
    const { union } = useSlug();
    const unionId = union?.id;

    // 수정 가능 필드 상태
    const [birthDate, setBirthDate] = useState(member.birth_date || '');
    const [phoneNumber, setPhoneNumber] = useState(member.phone_number || '');
    const [residentAddress, setResidentAddress] = useState({
        address: member.resident_address || '',
        addressDetail: member.resident_address_detail || '',
        addressRoad: member.resident_address_road || '',
        addressJibun: member.resident_address_jibun || '',
        zonecode: member.resident_zonecode || '',
    });
    const [notes, setNotes] = useState(member.notes || '');

    // PNU 매칭 상태
    const [showPnuMatching, setShowPnuMatching] = useState(false);
    const [selectedPnu, setSelectedPnu] = useState('');
    const [manualPnu, setManualPnu] = useState('');

    // 소유유형 수정 상태
    const [editingPropertyUnit, setEditingPropertyUnit] = useState<string | null>(null);
    const [editOwnershipType, setEditOwnershipType] = useState<OwnershipType>('OWNER');
    const [editOwnershipRatio, setEditOwnershipRatio] = useState<string>('');

    const [isSaving, setIsSaving] = useState(false);
    const [isPnuSaving, setIsPnuSaving] = useState(false);
    const [isOwnershipSaving, setIsOwnershipSaving] = useState(false);

    // API 호출
    const { mutateAsync: updateMember } = useUpdateMember();
    const { mutateAsync: updateMemberPnu } = useUpdateMemberPnu();
    const { mutateAsync: updateOwnershipType } = useUpdateOwnershipType();
    const { mutateAsync: setPrimaryPropertyUnit } = useSetPrimaryPropertyUnit();
    const { data: unionLandLots } = useUnionLandLots(unionId);
    const { mutate: logAccessEvent } = useLogAccessEvent();

    // 조합원 동의 단계별 현황 조회
    const { data: memberConsentStatus, isLoading: isConsentLoading } = useQuery({
        queryKey: ['member-consent-status', member.id, union?.business_type],
        queryFn: async () => {
            if (!member.id || !union?.business_type) return [];

            // 1. 해당 사업 유형의 동의 단계 목록 조회
            const { data: stages, error: stagesError } = await supabase
                .from('consent_stages')
                .select('id, stage_name, stage_code, required_rate, sort_order')
                .eq('business_type', union.business_type)
                .order('sort_order', { ascending: true });

            if (stagesError) {
                console.error('동의 단계 조회 오류:', stagesError);
                return [];
            }

            if (!stages || stages.length === 0) return [];

            // 2. 조합원의 동의 현황 조회
            const { data: consents, error: consentsError } = await supabase
                .from('user_consents')
                .select('stage_id, status, consent_date')
                .eq('user_id', member.id);

            if (consentsError) {
                console.error('동의 현황 조회 오류:', consentsError);
            }

            // 3. 단계별 동의 상태 매핑
            return stages.map((stage) => {
                const consent = consents?.find((c) => c.stage_id === stage.id);
                return {
                    stage_id: stage.id,
                    stage_name: stage.stage_name,
                    stage_code: stage.stage_code,
                    required_rate: stage.required_rate,
                    status: (consent?.status as 'AGREED' | 'DISAGREED' | 'PENDING') || 'PENDING',
                    consent_date: consent?.consent_date || null,
                };
            });
        },
        enabled: !!member.id && !!union?.business_type,
    });

    // 물건지 목록
    const propertyUnits = member.property_units || [];
    const hasPropertyUnits = propertyUnits.length > 0;

    // 저장
    const handleSave = async () => {
        setIsSaving(true);

        try {
            await updateMember({
                memberId: member.id,
                updates: {
                    birth_date: birthDate || null,
                    phone_number: phoneNumber,
                    resident_address: residentAddress.address,
                    resident_address_detail: residentAddress.addressDetail,
                    resident_address_road: residentAddress.addressRoad,
                    resident_address_jibun: residentAddress.addressJibun,
                    resident_zonecode: residentAddress.zonecode,
                    notes: notes || null,
                },
            });

            // 수정 로그 기록
            if (unionId && user?.id && user?.name) {
                logAccessEvent({
                    unionId,
                    viewerId: user.id,
                    viewerName: user.name,
                    accessType: 'MEMBER_UPDATE',
                });
            }

            toast.success('조합원 정보가 저장되었습니다.');
            onClose();
        } catch (error) {
            console.error('저장 오류:', error);
            toast.error('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    // PNU 매칭
    const handlePnuMatch = async () => {
        const pnuToApply = selectedPnu || manualPnu;

        if (!pnuToApply) {
            toast.error('PNU를 선택하거나 입력해주세요.');
            return;
        }

        setIsPnuSaving(true);

        try {
            await updateMemberPnu({
                memberId: member.id,
                pnu: pnuToApply,
            });

            // 수정 로그 기록
            if (unionId && user?.id && user?.name) {
                logAccessEvent({
                    unionId,
                    viewerId: user.id,
                    viewerName: user.name,
                    accessType: 'MEMBER_UPDATE',
                });
            }

            toast.success('PNU가 매칭되었습니다.');
            onClose();
        } catch (error) {
            console.error('PNU 매칭 오류:', error);
            toast.error(error instanceof Error ? error.message : 'PNU 매칭에 실패했습니다.');
        } finally {
            setIsPnuSaving(false);
        }
    };

    // 주소 선택 핸들러
    const handleAddressSelect = (data: AddressData) => {
        setResidentAddress({
            address: data.roadAddress || data.jibunAddress,
            addressDetail: residentAddress.addressDetail,
            addressRoad: data.roadAddress,
            addressJibun: data.jibunAddress,
            zonecode: data.zonecode,
        });
    };

    // 소유유형 수정 시작
    const handleStartEditOwnership = (propertyUnit: MemberPropertyUnitInfo) => {
        setEditingPropertyUnit(propertyUnit.id);
        setEditOwnershipType(propertyUnit.ownership_type);
        setEditOwnershipRatio(propertyUnit.ownership_ratio?.toString() || '');
    };

    // 소유유형 수정 취소
    const handleCancelEditOwnership = () => {
        setEditingPropertyUnit(null);
        setEditOwnershipType('OWNER');
        setEditOwnershipRatio('');
    };

    // 소유유형 저장
    const handleSaveOwnership = async () => {
        if (!editingPropertyUnit) return;

        setIsOwnershipSaving(true);
        try {
            await updateOwnershipType({
                propertyUnitId: editingPropertyUnit,
                ownershipType: editOwnershipType,
                ownershipRatio: editOwnershipType === 'CO_OWNER' && editOwnershipRatio 
                    ? parseFloat(editOwnershipRatio) 
                    : null,
            });

            // 수정 로그 기록
            if (unionId && user?.id && user?.name) {
                logAccessEvent({
                    unionId,
                    viewerId: user.id,
                    viewerName: user.name,
                    accessType: 'MEMBER_UPDATE',
                });
            }

            toast.success('소유유형이 저장되었습니다.');
            handleCancelEditOwnership();
        } catch (error) {
            console.error('소유유형 저장 오류:', error);
            toast.error('소유유형 저장에 실패했습니다.');
        } finally {
            setIsOwnershipSaving(false);
        }
    };

    // 대표 물건지 변경
    const handleSetPrimary = async (propertyUnitId: string) => {
        try {
            await setPrimaryPropertyUnit({
                memberId: member.id,
                propertyUnitId,
            });

            toast.success('대표 물건지가 변경되었습니다.');
        } catch (error) {
            console.error('대표 물건지 변경 오류:', error);
            toast.error('대표 물건지 변경에 실패했습니다.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* 헤더 */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h3 className="text-[20px] font-bold text-gray-900">조합원 상세 정보</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-6 space-y-6">
                    {/* 상태 표시 */}
                    <div className="flex items-center justify-between">
                        <span className="text-[14px] text-gray-500">상태</span>
                        <div className="flex gap-2">
                            {member.is_blocked ? (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[14px] font-medium bg-red-100 text-red-700">
                                    <Ban className="w-4 h-4 mr-1" />
                                    차단됨
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[14px] font-medium bg-green-100 text-green-700">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    정상
                                </span>
                            )}
                            {!member.isPnuMatched && member.property_pnu && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[14px] font-medium bg-amber-100 text-amber-700">
                                    <AlertTriangle className="w-4 h-4 mr-1" />
                                    PNU 미매칭
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 읽기 전용 정보 */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                            <UserIcon className="w-6 h-6 text-gray-400" />
                            <div>
                                <p className="text-[12px] text-gray-500">이름</p>
                                <p className="text-[16px] font-bold text-gray-900">{member.name}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                            <MapPin className="w-6 h-6 text-gray-400 mt-1" />
                            <div className="flex-1">
                                <p className="text-[12px] text-gray-500">물건지 (읽기 전용)</p>
                                <p className="text-[16px] font-bold text-gray-900">
                                    {member.property_address_road || member.property_address || '-'}
                                </p>
                                {member.property_address_jibun && (
                                    <p className="text-[13px] text-gray-500 mt-1">
                                        <span className="bg-gray-200 px-1 rounded mr-1 text-[11px]">지번</span>
                                        {member.property_address_jibun}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-[12px] text-gray-500">면적</p>
                                <p className="text-[16px] font-bold text-gray-900">
                                    {formatArea(member.land_lot?.area)}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-[12px] text-gray-500">공시지가</p>
                                <p className="text-[16px] font-bold text-gray-900">
                                    {formatPrice(member.land_lot?.official_price)}
                                </p>
                            </div>
                        </div>

                        {/* 물건지 목록 섹션 (새로운 user_property_units 기반) */}
                        {hasPropertyUnits && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Building className="w-5 h-5 text-gray-600" />
                                    <h4 className="text-[14px] font-semibold text-gray-700">
                                        물건지 목록 ({propertyUnits.length}건)
                                    </h4>
                                </div>
                                <div className="space-y-3">
                                    {propertyUnits.map((pu) => (
                                        <div
                                            key={pu.id}
                                            className={cn(
                                                'p-4 rounded-lg border',
                                                pu.is_primary
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-white border-gray-200'
                                            )}
                                        >
                                            {/* 물건지 헤더 */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {pu.is_primary && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                                <Star className="w-3 h-3 mr-1" />
                                                                대표
                                                            </span>
                                                        )}
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                                                OWNERSHIP_TYPE_STYLES[pu.ownership_type]
                                                            )}
                                                        >
                                                            {OWNERSHIP_TYPE_LABELS[pu.ownership_type]}
                                                            {pu.ownership_type === 'CO_OWNER' &&
                                                                pu.ownership_ratio && (
                                                                    <span className="ml-1">
                                                                        ({pu.ownership_ratio}%)
                                                                    </span>
                                                                )}
                                                        </span>
                                                    </div>
                                                    <p className="text-[14px] font-medium text-gray-900">
                                                        {pu.address || '-'}
                                                    </p>
                                                    {(pu.dong || pu.ho) && (
                                                        <p className="text-[13px] text-gray-600 mt-0.5">
                                                            {pu.building_name && `${pu.building_name} `}
                                                            {pu.dong && `${pu.dong}동 `}
                                                            {pu.ho && `${pu.ho}호`}
                                                        </p>
                                                    )}
                                                    <div className="flex gap-4 mt-1 text-[12px] text-gray-500">
                                                        <span>면적: {formatArea(pu.area)}</span>
                                                        <span>공시지가: {formatPrice(pu.official_price)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 소유유형 수정 폼 */}
                                            {editingPropertyUnit === pu.id ? (
                                                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                                    <div>
                                                        <label className="block text-[13px] font-medium text-gray-700 mb-1">
                                                            소유유형
                                                        </label>
                                                        <SelectBox
                                                            value={editOwnershipType}
                                                            onChange={(value) =>
                                                                setEditOwnershipType(value as OwnershipType)
                                                            }
                                                            options={[
                                                                { value: 'OWNER', label: '소유주' },
                                                                { value: 'CO_OWNER', label: '공동소유' },
                                                                { value: 'FAMILY', label: '소유주 가족' },
                                                            ]}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    {editOwnershipType === 'CO_OWNER' && (
                                                        <div>
                                                            <label className="block text-[13px] font-medium text-gray-700 mb-1">
                                                                지분율 (%)
                                                            </label>
                                                            <Input
                                                                type="number"
                                                                value={editOwnershipRatio}
                                                                onChange={(e) =>
                                                                    setEditOwnershipRatio(e.target.value)
                                                                }
                                                                placeholder="예: 50"
                                                                min={0}
                                                                max={100}
                                                                step={0.01}
                                                                className="h-10"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleCancelEditOwnership}
                                                            className="flex-1"
                                                        >
                                                            취소
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={handleSaveOwnership}
                                                            disabled={isOwnershipSaving}
                                                            className="flex-1 bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                                                        >
                                                            {isOwnershipSaving ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                '저장'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleStartEditOwnership(pu)}
                                                        className="text-[12px]"
                                                    >
                                                        소유유형 수정
                                                    </Button>
                                                    {!pu.is_primary && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSetPrimary(pu.id)}
                                                            className="text-[12px] border-blue-300 text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Star className="w-3 h-3 mr-1" />
                                                            대표로 설정
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* PNU 매칭 섹션 */}
                        {(!member.property_pnu || !member.isPnuMatched) && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-[14px] font-medium text-amber-800">
                                            물건지 PNU {member.property_pnu ? '미매칭' : '없음'}
                                        </p>
                                        <p className="text-[13px] text-amber-700 mt-1">
                                            입력된 주소: {member.property_address || '없음'}
                                        </p>
                                        {member.property_pnu && (
                                            <p className="text-[12px] text-amber-600 mt-1">
                                                현재 PNU: {member.property_pnu}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {!showPnuMatching ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowPnuMatching(true)}
                                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                                    >
                                        <Link2 className="w-4 h-4 mr-2" />
                                        PNU 수동 매칭
                                    </Button>
                                ) : (
                                    <div className="space-y-3 mt-3 pt-3 border-t border-amber-200">
                                        <div>
                                            <label className="block text-[13px] font-medium text-amber-800 mb-1">
                                                구역 내 물건지 선택
                                            </label>
                                            <SelectBox
                                                value={selectedPnu}
                                                onChange={(value) => {
                                                    setSelectedPnu(value);
                                                    setManualPnu('');
                                                }}
                                                options={[
                                                    { value: '', label: '선택하세요' },
                                                    ...(unionLandLots?.map((lot) => ({
                                                        value: lot.pnu,
                                                        label: `${lot.address_text || lot.pnu}`,
                                                    })) || []),
                                                ]}
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="text-center text-[12px] text-gray-500">또는</div>

                                        <div>
                                            <label className="block text-[13px] font-medium text-amber-800 mb-1">
                                                PNU 직접 입력 (19자리)
                                            </label>
                                            <Input
                                                value={manualPnu}
                                                onChange={(e) => {
                                                    setManualPnu(e.target.value);
                                                    setSelectedPnu('');
                                                }}
                                                placeholder="19자리 PNU 코드"
                                                maxLength={19}
                                                className="font-mono"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowPnuMatching(false)}
                                                className="flex-1"
                                            >
                                                취소
                                            </Button>
                                            <Button
                                                onClick={handlePnuMatch}
                                                disabled={isPnuSaving || (!selectedPnu && !manualPnu)}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                                            >
                                                {isPnuSaving ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    'PNU 적용'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 수정 가능 필드 */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h4 className="text-[16px] font-semibold text-gray-900">수정 가능 정보</h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                                    <Calendar className="w-4 h-4" />
                                    생년월일
                                </label>
                                <Input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                                    <Phone className="w-4 h-4" />
                                    전화번호
                                </label>
                                <Input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="010-0000-0000"
                                    className="h-12"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                                <MapPin className="w-4 h-4" />
                                거주지
                            </label>
                            <KakaoAddressSearch
                                value={residentAddress.addressRoad || residentAddress.address}
                                onAddressSelect={handleAddressSelect}
                                placeholder="거주지 주소 검색"
                            />
                            {residentAddress.address && (
                                <Input
                                    value={residentAddress.addressDetail}
                                    onChange={(e) =>
                                        setResidentAddress((prev) => ({
                                            ...prev,
                                            addressDetail: e.target.value,
                                        }))
                                    }
                                    placeholder="상세 주소"
                                    className="h-12"
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                                <FileText className="w-4 h-4" />
                                특이사항
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="특이사항을 입력하세요..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent resize-none text-[14px]"
                            />
                        </div>
                    </div>

                    {/* 차단 정보 */}
                    {member.is_blocked && member.blocked_reason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-[14px] font-bold text-red-800 mb-2">차단 사유</p>
                            <p className="text-[14px] text-red-700">{member.blocked_reason}</p>
                            {member.blocked_at && (
                                <p className="text-[12px] text-red-500 mt-2">
                                    차단일: {new Date(member.blocked_at).toLocaleString('ko-KR')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* 동의 단계별 현황 */}
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                        <h4 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                            <Percent className="w-4 h-4" />
                            동의 단계별 현황
                        </h4>
                        
                        {isConsentLoading ? (
                            <div className="flex items-center justify-center py-4 text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                동의 현황 조회 중...
                            </div>
                        ) : memberConsentStatus && memberConsentStatus.length > 0 ? (
                            <div className="space-y-2">
                                {memberConsentStatus.map((stage) => {
                                    const statusConfig = {
                                        AGREED: { 
                                            icon: CheckCircle2, 
                                            color: 'text-green-600', 
                                            bg: 'bg-green-50 border-green-200', 
                                            label: '동의' 
                                        },
                                        DISAGREED: { 
                                            icon: XCircle, 
                                            color: 'text-red-600', 
                                            bg: 'bg-red-50 border-red-200', 
                                            label: '미동의' 
                                        },
                                        PENDING: { 
                                            icon: Clock, 
                                            color: 'text-gray-500', 
                                            bg: 'bg-gray-50 border-gray-200', 
                                            label: '미제출' 
                                        },
                                    };
                                    const config = statusConfig[stage.status];
                                    const StatusIcon = config.icon;

                                    return (
                                        <div 
                                            key={stage.stage_id}
                                            className={cn(
                                                "p-3 rounded-lg border flex items-center justify-between",
                                                config.bg
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <StatusIcon className={cn("w-5 h-5", config.color)} />
                                                <div>
                                                    <p className="text-[14px] font-medium text-gray-900">
                                                        {stage.stage_name}
                                                    </p>
                                                    <p className="text-[12px] text-gray-500">
                                                        필요 동의율: {stage.required_rate}%
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={cn("text-[14px] font-bold", config.color)}>
                                                    {config.label}
                                                </span>
                                                {stage.consent_date && (
                                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                                        {new Date(stage.consent_date).toLocaleDateString('ko-KR')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-[14px]">
                                등록된 동의 단계가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* 버튼 */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 sticky bottom-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        닫기
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onBlock}
                        className={`flex-1 h-12 rounded-xl ${
                            member.is_blocked
                                ? 'border-green-300 text-green-700 hover:bg-green-50'
                                : 'border-red-300 text-red-700 hover:bg-red-50'
                        }`}
                    >
                        <Ban className="w-4 h-4 mr-2" />
                        {member.is_blocked ? '차단 해제' : '강제 탈퇴'}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 h-12 rounded-xl bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        저장
                    </Button>
                </div>
            </div>
        </div>
    );
}
