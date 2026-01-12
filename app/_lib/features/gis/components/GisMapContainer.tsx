'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useConsentMap } from '../hooks/useConsentMap';
import { useRegistrationMap } from '../hooks/useRegistrationMap';
import EChartsMap, { MapViewMode, MapLegend } from '@/components/map/EChartsMap';
import ParcelDetailModal from './ParcelDetailModal';
import ConsentStatusBar from './ConsentStatusBar';
import { useUnionConsentRate } from '../api/useParcelDetail';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Loader2,
    Info,
    LayoutGrid,
    Search,
    MapPin,
    X,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    Building2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { useUnionMembers } from '../hooks/useUnionMembers';
import { cn } from '@/lib/utils';

// 사업 유형 한글 매핑
const BUSINESS_TYPE_LABELS: Record<string, string> = {
    REDEVELOPMENT: '재개발',
    RECONSTRUCTION: '재건축',
    STREET_HOUSING: '가로주택정비',
    SMALL_RECONSTRUCTION: '소규모재건축',
    HOUSING_ASSOCIATION: '지역주택',
};

// 금액 포맷팅 함수
function formatPrice(price: number | undefined): string {
    if (!price) return '-';
    if (price >= 100000000) {
        return `${(price / 100000000).toFixed(1)}억원`;
    } else if (price >= 10000) {
        return `${(price / 10000).toFixed(0)}만원`;
    }
    return `${price.toLocaleString()}원`;
}

export default function GisMapContainer() {
    const { union } = useSlug();
    const unionId = union?.id;

    // 조회 모드: 'consent' (동의 현황) | 'registration' (가입 현황) | 'address' (지번 현황)
    const [viewMode, setViewMode] = useState<MapViewMode>('address');
    // 조합의 사업 유형을 사용 (없으면 기본값 REDEVELOPMENT)
    const selectedBusinessType = union?.business_type || 'REDEVELOPMENT';
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPnu, setSelectedPnu] = useState<string | null>(null);

    // 주소 검색 상태
    const [searchQuery, setSearchQuery] = useState('');
    const [searchedPnu, setSearchedPnu] = useState<string | null>(null);
    const [hoveredPnu, setHoveredPnu] = useState<string | null>(null);

    // 다중 선택 상태 (클릭한 필지들 리스트)
    const [selectedPnuList, setSelectedPnuList] = useState<string[]>([]);
    const lastClickTime = useRef<number>(0);
    const lastClickPnu = useRef<string | null>(null);

    // 동의 단계 목록 조회
    const { data: stages, isLoading: stagesLoading } = useQuery({
        queryKey: ['consent-stages', selectedBusinessType],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('consent_stages')
                .select('*')
                .eq('business_type', selectedBusinessType)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!selectedBusinessType,
    });

    // 단계 변경 시 자동 선택 - useMemo로 초기값 계산
    const initialStageId = useMemo(() => {
        if (stages && stages.length > 0) {
            return stages[0].id;
        }
        return null;
    }, [stages]);

    // 초기 단계 설정 (최초 한 번만)
    useEffect(() => {
        if (initialStageId && !selectedStageId) {
            // 다음 렌더 사이클에서 setState 호출
            const timer = setTimeout(() => {
                setSelectedStageId(initialStageId);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [initialStageId, selectedStageId, stagesLoading]);

    // stages가 비어있고 로딩이 완료되면 자동으로 registration 모드로 전환
    useEffect(() => {
        if (!stagesLoading && stages && stages.length === 0 && viewMode === 'consent') {
            // 다음 렌더 사이클에서 setState 호출하여 cascading render 방지
            const timer = setTimeout(() => {
                setViewMode('registration');
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [stagesLoading, stages, viewMode]);

    // 동의 현황 데이터
    const {
        geoJson: consentGeoJson,
        consentData,
        loading: consentLoading,
        isPublished,
    } = useConsentMap(unionId, selectedStageId);

    // 가입 현황 데이터
    const {
        geoJson: registrationGeoJson,
        registrationData,
        loading: registrationLoading,
    } = useRegistrationMap(unionId);

    // 조합 전체 동의율 조회
    const { data: consentRate } = useUnionConsentRate(unionId || null, selectedStageId);

    // 가입율 조회
    const { data: registrationRate } = useQuery({
        queryKey: ['union-registration-rate', unionId],
        queryFn: async () => {
            if (!unionId) return null;

            const { data, error } = await supabase.rpc('get_union_registration_rate', {
                p_union_id: unionId,
            });

            if (error) throw error;
            return data?.[0] || null;
        },
        enabled: !!unionId,
    });

    // 현재 모드에 따른 데이터 선택
    const currentGeoJson = useMemo(() => {
        return viewMode === 'registration' ? registrationGeoJson : consentGeoJson;
    }, [viewMode, registrationGeoJson, consentGeoJson]);

    const currentData = useMemo(() => {
        if (viewMode === 'registration') {
            return registrationData.map((d) => ({
                pnu: d.pnu,
                status: d.registration_status,
                address: d.address,
                totalOwners: d.total_owners,
                registeredCount: d.registered_count,
            }));
        }
        return consentData.map((d) => ({
            pnu: d.pnu,
            status: d.display_status,
            address: d.address,
            totalOwners: d.total_owners,
            agreedOwners: d.agreed_count,
        }));
    }, [viewMode, registrationData, consentData]);

    const isLoading = viewMode === 'registration' ? registrationLoading : consentLoading;

    // 조합의 모든 조합원 정보 (초기 로딩, PNU별 그룹화)
    const { getMembersByPnu, isLoading: membersLoading } = useUnionMembers(unionId);

    // 표시할 필지 정보 (검색된 필지 또는 호버된 필지)
    const displayPnu = searchedPnu || hoveredPnu;
    const displayParcelInfo = useMemo(() => {
        if (!displayPnu) return null;

        if (viewMode === 'registration') {
            const found = registrationData.find((d) => d.pnu === displayPnu);
            if (!found) return null;
            return {
                pnu: found.pnu,
                address: found.address,
                status: found.registration_status,
                statusLabel:
                    found.registration_status === 'ALL_REGISTERED'
                        ? '전체 가입'
                        : found.registration_status === 'PARTIAL_REGISTERED'
                        ? '일부 가입'
                        : found.registration_status === 'NONE_REGISTERED'
                        ? '미가입'
                        : '미제출',
                totalOwners: found.total_owners,
                currentCount: found.registered_count,
                currentLabel: '가입',
                area: found.area,
                officialPrice: found.official_price,
            };
        }

        const found = consentData.find((d) => d.pnu === displayPnu);
        if (!found) return null;
        return {
            pnu: found.pnu,
            address: found.address,
            status: found.display_status,
            statusLabel:
                found.display_status === 'FULL_AGREED'
                    ? '동의 완료'
                    : found.display_status === 'PARTIAL_AGREED'
                    ? '일부 동의'
                    : found.display_status === 'NONE_AGREED'
                    ? '미동의'
                    : '미제출',
            totalOwners: found.total_owners,
            currentCount: found.agreed_count,
            currentLabel: '동의',
            area: found.area,
            officialPrice: found.official_price,
        };
    }, [displayPnu, viewMode, registrationData, consentData]);

    // 선택된 필지의 조합원 목록 (로컬 데이터에서 필터링)
    const parcelMembers = useMemo(() => {
        if (!displayPnu) return [];
        return getMembersByPnu(displayPnu);
    }, [displayPnu, getMembersByPnu]);

    // 조합원별 동의 상태 조회 (클릭/검색 시에만 API 호출 - 호버 시에는 호출 안함)
    const { data: memberConsents } = useQuery({
        queryKey: ['member-consents', searchedPnu, unionId, selectedStageId],
        queryFn: async () => {
            if (!searchedPnu || !unionId || parcelMembers.length === 0) return [];

            const memberIds = parcelMembers.map((m) => m.id);
            const { data, error } = await supabase
                .from('user_consents')
                .select('user_id, status')
                .in('user_id', memberIds)
                .eq('stage_id', selectedStageId || '');

            if (error) return [];
            return data || [];
        },
        enabled: !!searchedPnu && !!unionId && parcelMembers.length > 0 && !!selectedStageId,
    });

    // 주소 검색 함수 - 검색 시 이전 선택 취소하고 검색한 값만 표시
    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) {
            setSearchedPnu(null);
            return;
        }

        const query = searchQuery.trim().toLowerCase();

        // 검색 시 이전 선택된 값 초기화
        setSelectedPnuList([]);

        // 동의 현황 데이터에서 검색
        const foundConsent = consentData.find((d) => d.address?.toLowerCase().includes(query) || d.pnu.includes(query));

        if (foundConsent) {
            setSearchedPnu(foundConsent.pnu);
            setSelectedPnuList([foundConsent.pnu]);
            return;
        }

        // 가입 현황 데이터에서 검색
        const foundReg = registrationData.find(
            (d) => d.address?.toLowerCase().includes(query) || d.pnu.includes(query)
        );

        if (foundReg) {
            setSearchedPnu(foundReg.pnu);
            setSelectedPnuList([foundReg.pnu]);
            return;
        }

        // 찾지 못함
        setSearchedPnu(null);
        alert('해당 주소를 찾을 수 없습니다.');
    }, [searchQuery, consentData, registrationData]);

    // 검색 초기화
    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setSearchedPnu(null);
    }, []);

    // 호버 핸들러
    const handleParcelHover = useCallback((pnu: string | null) => {
        setHoveredPnu(pnu);
    }, []);

    // 필지 클릭 핸들러 - 다중 선택 및 더블클릭 취소 기능
    const handleParcelClick = useCallback(
        (pnu: string) => {
            const now = Date.now();
            const isDoubleClick = lastClickPnu.current === pnu && now - lastClickTime.current < 300;

            if (isDoubleClick) {
                // 더블클릭: 해당 필지 선택 취소
                setSelectedPnuList((prev) => prev.filter((p) => p !== pnu));
                if (searchedPnu === pnu) {
                    setSearchedPnu(null);
                }
            } else {
                // 단일 클릭: 리스트에 추가 (이미 있으면 맨 위로 이동)
                setSelectedPnuList((prev) => {
                    const filtered = prev.filter((p) => p !== pnu);
                    return [pnu, ...filtered];
                });
                setSearchedPnu(pnu);
                setSelectedPnu(pnu);
            }

            lastClickTime.current = now;
            lastClickPnu.current = pnu;
        },
        [searchedPnu]
    );

    // 현재 단계의 필수 동의율
    const requiredRate = useMemo(() => {
        if (!stages || !selectedStageId) return 75;
        const stage = stages.find((s) => s.id === selectedStageId);
        return stage?.required_rate || 75;
    }, [stages, selectedStageId]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* 필터 영역 */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                {/* 조회 모드 선택 */}
                <Select value={viewMode} onValueChange={(v: MapViewMode) => setViewMode(v)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="조회 모드" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="address">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                지번 현황
                            </div>
                        </SelectItem>
                        <SelectItem value="consent">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                동의 현황
                            </div>
                        </SelectItem>
                        <SelectItem value="registration">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                가입 현황
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>

                {/* 동의 현황일 때만 사업 유형 및 단계 선택 표시 */}
                {viewMode === 'consent' && (
                    <>
                        {/* 사업 유형: 텍스트로 표시 (수정 불가) */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                            <Building2 className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-semibold text-slate-600">사업 유형:</span>
                            <span className="text-sm font-medium text-slate-800">
                                {BUSINESS_TYPE_LABELS[selectedBusinessType] || selectedBusinessType}
                            </span>
                        </div>

                        {/* 동의 단계: 수정 가능 */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600">동의 단계:</span>
                            <Select value={selectedStageId || ''} onValueChange={setSelectedStageId}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="동의 단계 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages?.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.stage_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {isLoading && (
                    <div className="text-sm text-slate-400 animate-pulse flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> 로딩 중...
                    </div>
                )}
            </div>

            {/* 주소 검색 */}
            <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="지번 또는 도로명 주소로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10 pr-8"
                    />
                    {searchQuery && (
                        <button
                            onClick={handleClearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <Button onClick={handleSearch} size="sm" variant="default">
                    검색
                </Button>
            </div>

            {/* 대시보드 영역 - 지번 현황일 때는 숨김 */}
            {viewMode !== 'address' && (() => {
                // unions.member_count를 분모로 사용
                const memberCount = union?.member_count || 0;
                
                // 동의 현황: 분자 = agreed_owner_count, 분모 = member_count
                const agreedOwnerCount = consentRate?.agreed_owner_count || 0;
                const consentRateCalculated = memberCount > 0 ? (agreedOwnerCount / memberCount) * 100 : 0;
                
                // 가입 현황: 분자 = total_members (APPROVED 수), 분모 = member_count
                const approvedMembers = registrationRate?.total_members || 0;
                const registrationRateCalculated = memberCount > 0 ? (approvedMembers / memberCount) * 100 : 0;
                
                return (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        {viewMode === 'consent' ? (
                            <ConsentStatusBar
                                mode="consent"
                                currentValue={agreedOwnerCount}
                                totalValue={memberCount}
                                requiredRate={requiredRate}
                                currentRate={consentRateCalculated}
                                areaRate={consentRate?.area_rate}
                            />
                        ) : (
                            <ConsentStatusBar
                                mode="registration"
                                currentValue={approvedMembers}
                                totalValue={memberCount}
                                requiredRate={100}
                                currentRate={registrationRateCalculated}
                            />
                        )}
                    </div>
                );
            })()}

            {/* 지도 영역 */}
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative min-h-[500px]">
                {isLoading && !currentGeoJson ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : isPublished === false ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-50 gap-4">
                        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center">
                            <Info className="w-10 h-10 text-slate-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-slate-600 mb-1">데이터 수집 및 배포 준비 중입니다.</p>
                            <p className="text-sm px-6">
                                시스템 관리자의 검토 및 승인이 완료된 후 지도가 활성화됩니다.
                            </p>
                        </div>
                    </div>
                ) : currentGeoJson && currentGeoJson.features.length > 0 ? (
                    <EChartsMap
                        geoJson={currentGeoJson}
                        data={currentData as Parameters<typeof EChartsMap>[0]['data']}
                        mode={viewMode}
                        onParcelClick={handleParcelClick}
                        selectedPnu={searchedPnu}
                        onParcelHover={handleParcelHover}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        지도 데이터를 불러올 수 없습니다. 지번 수집 상태를 확인해 주세요.
                    </div>
                )}
            </div>

            {/* 지도 범례 */}
            <MapLegend mode={viewMode} />

            {/* 선택된 필지 리스트 패널 */}
            {selectedPnuList.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
                    {/* 헤더 */}
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-slate-700">선택된 필지</span>
                            <Badge variant="secondary" className="text-xs">
                                {selectedPnuList.length}개
                            </Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedPnuList([]);
                                setSearchedPnu(null);
                            }}
                            className="text-slate-500 hover:text-slate-700 h-7"
                        >
                            <X className="w-4 h-4 mr-1" />
                            전체 해제
                        </Button>
                    </div>

                    {/* 선택된 필지 목록 */}
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                        {selectedPnuList.map((pnu) => {
                            const parcelInfo =
                                viewMode === 'registration'
                                    ? registrationData.find((d) => d.pnu === pnu)
                                    : consentData.find((d) => d.pnu === pnu);

                            if (!parcelInfo) return null;

                            const statusLabel =
                                viewMode === 'registration'
                                    ? (parcelInfo as (typeof registrationData)[0]).registration_status ===
                                      'ALL_REGISTERED'
                                        ? '전체 가입'
                                        : (parcelInfo as (typeof registrationData)[0]).registration_status ===
                                          'PARTIAL_REGISTERED'
                                        ? '일부 가입'
                                        : (parcelInfo as (typeof registrationData)[0]).registration_status ===
                                          'NONE_REGISTERED'
                                        ? '미가입'
                                        : '미제출'
                                    : (parcelInfo as (typeof consentData)[0]).display_status === 'FULL_AGREED'
                                    ? '동의 완료'
                                    : (parcelInfo as (typeof consentData)[0]).display_status === 'PARTIAL_AGREED'
                                    ? '일부 동의'
                                    : (parcelInfo as (typeof consentData)[0]).display_status === 'NONE_AGREED'
                                    ? '미동의'
                                    : '미제출';

                            const statusColor =
                                viewMode === 'registration'
                                    ? (parcelInfo as (typeof registrationData)[0]).registration_status ===
                                      'ALL_REGISTERED'
                                        ? 'bg-green-100 text-green-700'
                                        : (parcelInfo as (typeof registrationData)[0]).registration_status ===
                                          'PARTIAL_REGISTERED'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : (parcelInfo as (typeof registrationData)[0]).registration_status ===
                                          'NONE_REGISTERED'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-slate-100 text-slate-600'
                                    : (parcelInfo as (typeof consentData)[0]).display_status === 'FULL_AGREED'
                                    ? 'bg-green-100 text-green-700'
                                    : (parcelInfo as (typeof consentData)[0]).display_status === 'PARTIAL_AGREED'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : (parcelInfo as (typeof consentData)[0]).display_status === 'NONE_AGREED'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-600';

                            return (
                                <div
                                    key={pnu}
                                    className={cn(
                                        'p-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition-colors',
                                        searchedPnu === pnu && 'bg-primary/5'
                                    )}
                                    onClick={() => setSearchedPnu(pnu)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-medium text-slate-900 truncate">
                                                {parcelInfo.address || '주소 정보 없음'}
                                            </h4>
                                            {viewMode !== 'address' && (
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                                                >
                                                    {statusLabel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span>면적: {parcelInfo.area?.toLocaleString() || '-'}㎡</span>
                                            <span>공시지가: {formatPrice(parcelInfo.official_price ?? undefined)}</span>
                                            <span>소유주: {parcelInfo.total_owners}명</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPnu(pnu);
                                                setIsModalOpen(true);
                                            }}
                                            className="h-7 text-xs"
                                        >
                                            상세
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPnuList((prev) => prev.filter((p) => p !== pnu));
                                                if (searchedPnu === pnu) setSearchedPnu(null);
                                            }}
                                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 현재 선택/호버된 필지의 조합원 정보 */}
            {displayParcelInfo && parcelMembers && parcelMembers.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">
                            {displayParcelInfo.address} - 등록된 조합원
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {parcelMembers.map((member) => {
                            const consent = memberConsents?.find((c) => c.user_id === member.id);
                            const status = consent?.status || 'PENDING';

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg"
                                >
                                    <span className="text-sm font-medium text-slate-700">{member.name}</span>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs ${
                                            status === 'AGREED'
                                                ? 'text-green-600 border-green-200 bg-green-50'
                                                : status === 'DISAGREED'
                                                ? 'text-red-600 border-red-200 bg-red-50'
                                                : 'text-slate-500 border-slate-200 bg-slate-50'
                                        }`}
                                    >
                                        {status === 'AGREED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                        {status === 'DISAGREED' && <XCircle className="w-3 h-3 mr-1" />}
                                        {status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                                        {status === 'AGREED' ? '동의' : status === 'DISAGREED' ? '미동의' : '미제출'}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {displayParcelInfo && membersLoading && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    조합원 정보 로딩 중...
                </div>
            )}

            {/* 필지 상세 모달 */}
            <ParcelDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                pnu={selectedPnu}
                stageId={selectedStageId}
                unionId={unionId}
                onDeleted={() => setSearchedPnu(null)}
            />
        </div>
    );
}
