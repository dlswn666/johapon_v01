'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useConsentMap } from '../hooks/useConsentMap';
import EChartsMap from '@/components/map/EChartsMap';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Info } from 'lucide-react';
import { useSlug } from '@/app/_lib/app/providers/SlugProvider';
import { cn } from '@/lib/utils';

export default function GisMapContainer() {
    const { union } = useSlug();
    const unionId = union?.id;
    const [selectedBusinessType, setSelectedBusinessType] = useState<string>('REDEVELOPMENT');
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

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

    // 단계 변경 시 자동 선택
    useEffect(() => {
        if (stages && stages.length > 0 && !selectedStageId) {
            setSelectedStageId(stages[0].id);
        }
    }, [stages, selectedStageId]);

    const { geoJson, consentData, loading, isPublished } = useConsentMap(unionId, selectedStageId);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
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
                            {stages?.map((stage: any) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                    {stage.stage_name} ({stage.required_rate}%)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {loading && <div className="text-sm text-slate-400 animate-pulse flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> 로딩 중...
                </div>}
            </div>

            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative min-h-[600px]">
                {loading && !geoJson ? (
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
                ) : geoJson ? (
                    <EChartsMap 
                        geoJson={geoJson} 
                        data={consentData.map(d => ({ pnu: d.pnu, status: d.display_status }))} 
                        onParcelClick={(pnu) => console.log('필지 클릭:', pnu)}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        지도 데이터를 불러올 수 없습니다. 지번 수집 상태를 확인해 주세요.
                    </div>
                )}
            </div>
        </div>
    );
}
