'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useConsentMap } from '../hooks/useConsentMap';
import { useRegistrationMap } from '../hooks/useRegistrationMap';
import EChartsMap, { MapViewMode } from '@/components/map/EChartsMap';
import ParcelDetailModal from './ParcelDetailModal';
import ConsentStatusBar from './ConsentStatusBar';
import { useUnionConsentRate } from '../api/useParcelDetail';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Info, LayoutGrid } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';

export default function GisMapContainer() {
    const { union } = useSlug();
    const unionId = union?.id;
    
    // 조회 모드: 'consent' (동의 현황) | 'registration' (가입 현황)
    const [viewMode, setViewMode] = useState<MapViewMode>('consent');
    const [selectedBusinessType, setSelectedBusinessType] = useState<string>('REDEVELOPMENT');
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    
    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPnu, setSelectedPnu] = useState<string | null>(null);

    // 동의 단계 목록 조회
    const { data: stages } = useQuery({
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
        enabled: !!selectedBusinessType
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
    }, [initialStageId, selectedStageId]);

    // 동의 현황 데이터
    const { 
        geoJson: consentGeoJson, 
        consentData, 
        loading: consentLoading, 
        isPublished 
    } = useConsentMap(unionId, selectedStageId);
    
    // 가입 현황 데이터
    const { 
        geoJson: registrationGeoJson, 
        registrationData, 
        loading: registrationLoading 
    } = useRegistrationMap(unionId);
    
    // 조합 전체 동의율 조회
    const { data: consentRate } = useUnionConsentRate(unionId || null, selectedStageId);

    // 가입율 조회
    const { data: registrationRate } = useQuery({
        queryKey: ['union-registration-rate', unionId],
        queryFn: async () => {
            if (!unionId) return null;
            const { data, error } = await supabase.rpc('get_union_registration_rate', {
                p_union_id: unionId
            });
            if (error) throw error;
            return data?.[0] || null;
        },
        enabled: !!unionId
    });

    // 현재 모드에 따른 데이터 선택
    const currentGeoJson = useMemo(() => {
        return viewMode === 'registration' ? registrationGeoJson : consentGeoJson;
    }, [viewMode, registrationGeoJson, consentGeoJson]);

    const currentData = useMemo(() => {
        if (viewMode === 'registration') {
            return registrationData.map(d => ({
                pnu: d.pnu,
                status: d.registration_status,
                address: d.address,
                totalOwners: d.total_owners,
                registeredCount: d.registered_count
            }));
        }
        return consentData.map(d => ({
            pnu: d.pnu,
            status: d.display_status,
            address: d.address,
            totalOwners: d.total_owners,
            agreedOwners: d.agreed_count
        }));
    }, [viewMode, registrationData, consentData]);

    const isLoading = viewMode === 'registration' ? registrationLoading : consentLoading;

    // 필지 클릭 핸들러
    const handleParcelClick = useCallback((pnu: string) => {
        setSelectedPnu(pnu);
        setIsModalOpen(true);
    }, []);

    // 현재 단계의 필수 동의율
    const requiredRate = useMemo(() => {
        if (!stages || !selectedStageId) return 75;
        const stage = stages.find(s => s.id === selectedStageId);
        return stage?.required_rate || 75;
    }, [stages, selectedStageId]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* 필터 영역 */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                {/* 조회 모드 선택 */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">조회 모드:</span>
                    <Select value={viewMode} onValueChange={(v: MapViewMode) => setViewMode(v)}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="조회 모드" />
                        </SelectTrigger>
                        <SelectContent>
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
                </div>

                {/* 동의 현황일 때만 사업 유형 및 단계 선택 표시 */}
                {viewMode === 'consent' && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600">사업 유형:</span>
                            <Select value={selectedBusinessType} onValueChange={setSelectedBusinessType}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="사업 유형 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REDEVELOPMENT">재개발</SelectItem>
                                    <SelectItem value="RECONSTRUCTION">재건축</SelectItem>
                                    <SelectItem value="HOUSING_ASSOCIATION">지주택</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600">동의 단계:</span>
                            <Select value={selectedStageId || ''} onValueChange={setSelectedStageId}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="동의 단계 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages?.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>
                                            {stage.stage_name} ({stage.required_rate}%)
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

            {/* 대시보드 영역 */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                {viewMode === 'consent' ? (
                    <ConsentStatusBar
                        mode="consent"
                        currentValue={consentRate?.agreed_owner_count || 0}
                        totalValue={consentRate?.total_owner_count || 0}
                        requiredRate={requiredRate}
                        currentRate={consentRate?.owner_rate || 0}
                        areaRate={consentRate?.area_rate}
                    />
                ) : (
                    <ConsentStatusBar
                        mode="registration"
                        currentValue={registrationRate?.registered_count || 0}
                        totalValue={registrationRate?.total_owners || 0}
                        requiredRate={100}
                        currentRate={registrationRate?.registration_rate || 0}
                    />
                )}
            </div>

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
                            <p className="text-sm px-6">시스템 관리자의 검토 및 승인이 완료된 후 지도가 활성화됩니다.</p>
                        </div>
                    </div>
                ) : currentGeoJson && currentGeoJson.features.length > 0 ? (
                    <EChartsMap 
                        geoJson={currentGeoJson} 
                        data={currentData as Parameters<typeof EChartsMap>[0]['data']}
                        mode={viewMode}
                        onParcelClick={handleParcelClick}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        지도 데이터를 불러올 수 없습니다. 지번 수집 상태를 확인해 주세요.
                    </div>
                )}
            </div>

            {/* 필지 상세 모달 */}
            <ParcelDetailModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                pnu={selectedPnu}
                stageId={selectedStageId}
            />
        </div>
    );
}
