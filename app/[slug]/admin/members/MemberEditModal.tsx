'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
    Percent,
    Edit3,
    Users,
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
    useCoOwners,
    MemberWithLandInfo,
    CoOwnerInfo,
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
    return `${Number(area).toLocaleString()} ㎡`;
};

// 공시지가 단가 포맷 함수 (원/㎡)
const formatUnitPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '-';
    return `${Number(price).toLocaleString()} 원/㎡`;
};

// 공시지가 총액 계산 및 포맷 함수 (전체 토지면적 기준)
const formatTotalPrice = (area: number | null | undefined, unitPrice: number | null | undefined): string => {
    if (area === null || area === undefined || unitPrice === null || unitPrice === undefined) return '-';
    const total = Number(area) * Number(unitPrice);
    // 억 단위 이상이면 억으로 표시
    if (total >= 100000000) {
        return `${(total / 100000000).toFixed(1)}억원`;
    }
    // 만 단위 이상이면 만으로 표시
    if (total >= 10000) {
        return `${Math.round(total / 10000).toLocaleString()}만원`;
    }
    return `${total.toLocaleString()}원`;
};

// 지분율 포맷 함수 (%)
const formatRatio = (ratio: number | null | undefined): string => {
    if (ratio === null || ratio === undefined) return '100%';
    return `${Number(ratio).toFixed(1)}%`;
};

export default function MemberEditModal({ member: initialMember, onClose, onBlock }: MemberEditModalProps) {
    const { user } = useAuth();
    const { union } = useSlug();
    const unionId = union?.id;

    // 현재 표시 중인 조합원 (공동소유자 전환 시 변경됨)
    const [currentMember, setCurrentMember] = useState<MemberWithLandInfo | CoOwnerInfo>(initialMember);
    
    // 초기 조합원 ID (공동소유자 조회용)
    const initialMemberId = initialMember.id;

    // 조회/수정 모드 상태
    const [isEditMode, setIsEditMode] = useState(false);

    // 수정 가능 필드 상태
    const [birthDate, setBirthDate] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [residentAddress, setResidentAddress] = useState({
        address: '',
        addressDetail: '',
        addressRoad: '',
        addressJibun: '',
        zonecode: '',
    });
    const [notes, setNotes] = useState('');

    // currentMember 변경 시 폼 필드 업데이트
    useEffect(() => {
        const member = currentMember;
        setBirthDate(member.birth_date || '');
        setPhoneNumber(member.phone_number || '');
        setResidentAddress({
            address: member.resident_address || '',
            addressDetail: member.resident_address_detail || '',
            addressRoad: member.resident_address_road || '',
            addressJibun: member.resident_address_jibun || '',
            zonecode: member.resident_zonecode || '',
        });
        setNotes(member.notes || '');
    }, [currentMember]);

    // PNU 매칭 상태
    const [showPnuMatching, setShowPnuMatching] = useState(false);
    const [selectedPnu, setSelectedPnu] = useState('');
    const [manualPnu, setManualPnu] = useState('');

    // 소유유형 수정 상태
    const [editingPropertyUnit, setEditingPropertyUnit] = useState<string | null>(null);
    const [editOwnershipType, setEditOwnershipType] = useState<OwnershipType>('OWNER');

    const [isSaving, setIsSaving] = useState(false);
    const [isPnuSaving, setIsPnuSaving] = useState(false);
    const [isOwnershipSaving, setIsOwnershipSaving] = useState(false);

    // API 호출
    const { mutateAsync: updateMember } = useUpdateMember();
    const { mutateAsync: updateMemberPnu } = useUpdateMemberPnu();
    const { mutateAsync: updateOwnershipType } = useUpdateOwnershipType();
    const { data: unionLandLots } = useUnionLandLots(unionId);
    const { mutate: logAccessEvent } = useLogAccessEvent();

    // 공동 소유자 조회 (초기 조합원 ID 기준으로 모든 공동소유자 로드)
    const { data: allCoOwners = [], isLoading: isCoOwnersLoading } = useCoOwners(initialMemberId);

    // 현재 조회 중인 사용자를 제외한 공동 소유자 목록
    const coOwnersExcludingCurrent = useMemo(() => {
        return allCoOwners.filter((co) => co.id !== currentMember.id);
    }, [allCoOwners, currentMember.id]);

    // 현재 멤버가 공동소유자인지 확인
    const isCoOwner = useMemo(() => {
        return allCoOwners.length > 1;
    }, [allCoOwners]);

    // 조합원 동의 단계별 현황 조회
    const { data: memberConsentStatus, isLoading: isConsentLoading } = useQuery({
        queryKey: ['member-consent-status', currentMember.id, union?.business_type],
        queryFn: async () => {
            if (!currentMember.id || !union?.business_type) return [];

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
                .eq('user_id', currentMember.id);

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
        enabled: !!currentMember.id && !!union?.business_type,
    });

    // 물건지 목록 (initialMember 기준)
    const propertyUnits = initialMember.property_units || [];
    const hasPropertyUnits = propertyUnits.length > 0;

    // 토지/건물 정보 (currentMember 또는 initialMember에서 가져옴)
    const landLotInfo = 'land_lot' in currentMember ? currentMember.land_lot : initialMember.land_lot;
    const landArea = 'land_area' in currentMember ? currentMember.land_area : initialMember.land_area;
    const buildingArea = 'building_area' in currentMember ? currentMember.building_area : initialMember.building_area;
    const landOwnershipRatio = currentMember.land_ownership_ratio;
    const buildingOwnershipRatio = currentMember.building_ownership_ratio;
    const totalLandArea = 'total_land_area' in currentMember ? currentMember.total_land_area : initialMember.total_land_area;
    const totalBuildingArea = 'total_building_area' in currentMember ? currentMember.total_building_area : initialMember.total_building_area;

    // 수정 모드 시작
    const handleStartEdit = () => {
        setIsEditMode(true);
    };

    // 수정 모드 취소
    const handleCancelEdit = () => {
        // 원래 값으로 복원
        setBirthDate(currentMember.birth_date || '');
        setPhoneNumber(currentMember.phone_number || '');
        setResidentAddress({
            address: currentMember.resident_address || '',
            addressDetail: currentMember.resident_address_detail || '',
            addressRoad: currentMember.resident_address_road || '',
            addressJibun: currentMember.resident_address_jibun || '',
            zonecode: currentMember.resident_zonecode || '',
        });
        setNotes(currentMember.notes || '');
        setIsEditMode(false);
    };

    // 저장
    const handleSave = async () => {
        setIsSaving(true);

        try {
            await updateMember({
                memberId: currentMember.id,
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
            setIsEditMode(false);
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
                memberId: currentMember.id,
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
    };

    // 소유유형 수정 취소
    const handleCancelEditOwnership = () => {
        setEditingPropertyUnit(null);
        setEditOwnershipType('OWNER');
    };

    // 소유유형 저장
    const handleSaveOwnership = async () => {
        if (!editingPropertyUnit) return;

        setIsOwnershipSaving(true);
        try {
            await updateOwnershipType({
                propertyUnitId: editingPropertyUnit,
                ownershipType: editOwnershipType,
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

    // 공동 소유자 카드 클릭 핸들러
    const handleCoOwnerClick = (coOwner: CoOwnerInfo) => {
        if (isEditMode) return; // 수정 모드에서는 클릭 불가
        setCurrentMember(coOwner);
    };

    // 현재 멤버 이름 가져오기
    const currentMemberName = 'name' in currentMember ? currentMember.name : '';
    const currentMemberIsBlocked = 'is_blocked' in currentMember ? currentMember.is_blocked : false;
    const currentMemberBlockedReason = 'blocked_reason' in currentMember ? currentMember.blocked_reason : null;
    const currentMemberBlockedAt = 'blocked_at' in currentMember ? currentMember.blocked_at : null;
    const currentMemberPropertyPnu = currentMember.property_pnu;
    const currentMemberPropertyAddress = 'property_address' in currentMember ? currentMember.property_address : null;
    const currentMemberIsPnuMatched = 'isPnuMatched' in currentMember ? currentMember.isPnuMatched : true;

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
                    {/* 이름 + 상태 배지 */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <UserIcon className="w-6 h-6 text-gray-400" />
                        <div className="flex-1">
                            <p className="text-[12px] text-gray-500">이름</p>
                            <div className="flex items-center gap-2">
                                <p className="text-[16px] font-bold text-gray-900">{currentMemberName}</p>
                                {currentMemberIsBlocked ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-red-100 text-red-700">
                                        <Ban className="w-3 h-3 mr-1" />
                                        차단됨
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-green-100 text-green-700">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        정상
                                    </span>
                                )}
                                {!currentMemberIsPnuMatched && currentMemberPropertyPnu && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-amber-100 text-amber-700">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        PNU 미매칭
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 생년월일, 전화번호 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                                <Calendar className="w-4 h-4" />
                                생년월일
                            </label>
                            {isEditMode ? (
                                <Input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="h-12"
                                />
                            ) : (
                                <p className="h-12 flex items-center px-4 bg-gray-50 rounded-xl text-[14px] text-gray-900 select-text">
                                    {birthDate || '-'}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                                <Phone className="w-4 h-4" />
                                전화번호
                            </label>
                            {isEditMode ? (
                                <Input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="010-0000-0000"
                                    className="h-12"
                                />
                            ) : (
                                <p className="h-12 flex items-center px-4 bg-gray-50 rounded-xl text-[14px] text-gray-900 select-text">
                                    {phoneNumber || '-'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 거주지 */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                            <MapPin className="w-4 h-4" />
                            거주지
                        </label>
                        {isEditMode ? (
                            <>
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
                            </>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                <p className="text-[14px] text-gray-900 select-text">
                                    {residentAddress.addressRoad || residentAddress.address || '-'}
                                </p>
                                {residentAddress.addressDetail && (
                                    <p className="text-[13px] text-gray-600 select-text">
                                        {residentAddress.addressDetail}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 특이사항 */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[14px] font-medium text-gray-700">
                            <FileText className="w-4 h-4" />
                            특이사항
                        </label>
                        {isEditMode ? (
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="특이사항을 입력하세요..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4E8C6D] focus:border-transparent resize-none text-[14px]"
                            />
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl min-h-[60px]">
                                <p className="text-[14px] text-gray-900 whitespace-pre-wrap select-text">
                                    {notes || '-'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 공동 소유자 섹션 */}
                    {isCoOwner && coOwnersExcludingCurrent.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                <h4 className="text-[14px] font-semibold text-gray-700">
                                    공동 소유자 ({coOwnersExcludingCurrent.length}명)
                                </h4>
                            </div>
                            {isCoOwnersLoading ? (
                                <div className="flex items-center justify-center py-4 text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    공동 소유자 조회 중...
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {coOwnersExcludingCurrent.map((coOwner) => (
                                        <div
                                            key={coOwner.id}
                                            onClick={() => handleCoOwnerClick(coOwner)}
                                            className={cn(
                                                'p-3 rounded-lg border bg-blue-50 border-blue-200 transition-all',
                                                !isEditMode && 'cursor-pointer hover:bg-blue-100 hover:border-blue-300',
                                                isEditMode && 'opacity-50 cursor-not-allowed'
                                            )}
                                        >
                                            <p className="text-[14px] font-medium text-gray-900 mb-1">
                                                {coOwner.name}
                                            </p>
                                            <div className="text-[12px] text-gray-600 space-y-0.5">
                                                <p>토지지분: {formatRatio(coOwner.land_ownership_ratio)}</p>
                                                <p>건축물지분: {formatRatio(coOwner.building_ownership_ratio)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {isEditMode && (
                                <p className="text-[12px] text-gray-500 text-center">
                                    수정 모드에서는 공동 소유자 전환이 불가합니다.
                                </p>
                            )}
                        </div>
                    )}

                    {/* 면적 정보 (토지/건물 분리) */}
                    <div className="space-y-4">
                        {/* 토지 정보 */}
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-[12px] text-gray-500 mb-2">토지</p>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-[11px] text-gray-400">토지면적</p>
                                    <p className="text-[14px] font-bold text-gray-900">
                                        {formatArea(landLotInfo?.area || totalLandArea)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400">토지소유면적</p>
                                    <p className="text-[14px] font-bold text-gray-900">
                                        {formatArea(landArea)}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] text-gray-400">토지지분</p>
                                    <p className="text-[14px] font-bold text-gray-900">
                                        {formatRatio(landOwnershipRatio)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400">공시지가</p>
                                    <div className="text-[14px] font-bold text-gray-900">
                                        <p>{formatUnitPrice(landLotInfo?.official_price)}</p>
                                        <p className="text-[12px] font-normal text-gray-500">
                                            (총 {formatTotalPrice(landLotInfo?.area || totalLandArea, landLotInfo?.official_price)})
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 건물 정보 */}
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-[12px] text-gray-500 mb-2">건물</p>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-[11px] text-gray-400">건축물면적</p>
                                    <p className="text-[14px] font-bold text-gray-900">
                                        {formatArea(totalBuildingArea || propertyUnits.reduce((sum, pu) => sum + (pu.area || 0), 0))}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400">건축물소유면적</p>
                                    <p className="text-[14px] font-bold text-gray-900">
                                        {formatArea(buildingArea)}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[11px] text-gray-400">건축물지분</p>
                                    <p className="text-[14px] font-bold text-gray-900">
                                        {formatRatio(buildingOwnershipRatio)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400">공시지가</p>
                                    {(() => {
                                        const buildingTotalArea = totalBuildingArea || propertyUnits.reduce((sum, pu) => sum + (pu.area || 0), 0);
                                        const buildingTotalPrice = propertyUnits.reduce((sum, pu) => sum + (pu.official_price || 0), 0);
                                        const buildingUnitPrice = buildingTotalArea ? buildingTotalPrice / buildingTotalArea : 0;
                                        return (
                                            <div className="text-[14px] font-bold text-gray-900">
                                                <p>{formatUnitPrice(buildingUnitPrice || null)}</p>
                                                <p className="text-[12px] font-normal text-gray-500">
                                                    (총 {formatTotalPrice(buildingTotalArea, buildingUnitPrice || null)})
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PNU 매칭 섹션 */}
                    {(!currentMemberPropertyPnu || !currentMemberIsPnuMatched) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start gap-3 mb-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-[14px] font-medium text-amber-800">
                                        물건지 PNU {currentMemberPropertyPnu ? '미매칭' : '없음'}
                                    </p>
                                    <p className="text-[13px] text-amber-700 mt-1">
                                        입력된 주소: {currentMemberPropertyAddress || '없음'}
                                    </p>
                                    {currentMemberPropertyPnu && (
                                        <p className="text-[12px] text-amber-600 mt-1">
                                            현재 PNU: {currentMemberPropertyPnu}
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

                    {/* 차단 정보 */}
                    {currentMemberIsBlocked && currentMemberBlockedReason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            <p className="text-[14px] font-bold text-red-800 mb-2">차단 사유</p>
                            <p className="text-[14px] text-red-700">{currentMemberBlockedReason}</p>
                            {currentMemberBlockedAt && (
                                <p className="text-[12px] text-red-500 mt-2">
                                    차단일: {new Date(currentMemberBlockedAt).toLocaleString('ko-KR')}
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

                    {/* 물건지 목록 (맨 아래) */}
                    {hasPropertyUnits && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Building className="w-5 h-5 text-gray-600" />
                                <h4 className="text-[14px] font-semibold text-gray-700">
                                    물건지 목록 ({propertyUnits.length}건)
                                </h4>
                            </div>
                            <div className="space-y-3 max-h-[280px] overflow-y-auto">
                                {[...propertyUnits]
                                    .sort((a, b) => (a.address || '').localeCompare(b.address || '', 'ko'))
                                    .map((pu) => (
                                        <div
                                            key={pu.id}
                                            className="p-4 rounded-lg border bg-white border-gray-200"
                                        >
                                            {/* 물건지 헤더 */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                                                OWNERSHIP_TYPE_STYLES[pu.ownership_type]
                                                            )}
                                                        >
                                                            {OWNERSHIP_TYPE_LABELS[pu.ownership_type]}
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
                                                        <span>공시지가: {formatUnitPrice(pu.official_price)}</span>
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
                                                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2 justify-end">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleStartEditOwnership(pu)}
                                                        className="text-[12px]"
                                                    >
                                                        소유유형 수정
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                            
                            {/* 강제 탈퇴 버튼 (물건지 목록 아래 오른쪽) */}
                            <div className="mt-4 flex justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onBlock}
                                    className={cn(
                                        "text-[12px]",
                                        initialMember.is_blocked
                                            ? 'border-green-300 text-green-700 hover:bg-green-50'
                                            : 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                                    )}
                                >
                                    <Ban className="w-3 h-3 mr-1" />
                                    {initialMember.is_blocked ? '차단 해제' : '강제 탈퇴'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 물건지가 없는 경우 강제 탈퇴 버튼 표시 */}
                    {!hasPropertyUnits && (
                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onBlock}
                                className={cn(
                                    "text-[12px]",
                                    initialMember.is_blocked
                                        ? 'border-green-300 text-green-700 hover:bg-green-50'
                                        : 'bg-red-500 border-red-500 text-white hover:bg-red-600'
                                )}
                            >
                                <Ban className="w-3 h-3 mr-1" />
                                {initialMember.is_blocked ? '차단 해제' : '강제 탈퇴'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* 버튼 (조회 모드: 수정 버튼, 수정 모드: 취소/저장 버튼) */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 sticky bottom-0">
                    {isEditMode ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="flex-1 h-12 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                                취소
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
                        </>
                    ) : (
                        <Button
                            onClick={handleStartEdit}
                            className="flex-1 h-12 rounded-xl bg-[#4E8C6D] hover:bg-[#3d7058] text-white"
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            수정
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
