'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';

export interface ConsentStatus {
    pnu: string;
    display_status: 'FULL_AGREED' | 'PARTIAL_AGREED' | 'NONE_AGREED';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export function useConsentMap(unionId: string | undefined, stageId: string | null) {
    const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
    const [consentData, setConsentData] = useState<ConsentStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPublished, setIsPublished] = useState<boolean | null>(null);

    useEffect(() => {
        async function fetchMapData() {
            if (!unionId || !stageId) return;
            setLoading(true);

            try {
                // 1. 배포 상태 확인 (가장 최근 완료된 작업 기준)
                const { data: job, error: jobError } = await supabase
                    .from('sync_jobs')
                    .select('is_published')
                    .eq('union_id', unionId)
                    .eq('status', 'COMPLETED')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (jobError || !job?.is_published) {
                    setIsPublished(false);
                    setGeoJson(null);
                    setConsentData([]);
                    return;
                }

                setIsPublished(true);

                // 2. 필지 경계 GeoJSON 조회 (해당 조합의 필지만)
                const { data: lots, error: lotsError } = await supabase
                    .from('union_land_lots')
                    .select('pnu, land_lots(boundary)')
                    .eq('union_id', unionId);
                
                if (lots && !lotsError) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const features = (lots as { pnu: string, land_lots: { boundary: any } | { boundary: any }[] }[])
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .filter(l => Array.isArray(l.land_lots) ? (l.land_lots[0] as any)?.boundary : (l.land_lots as any)?.boundary)
                        .map(lot => ({
                            type: 'Feature' as const,
                            properties: { name: lot.pnu },
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            geometry: Array.isArray(lot.land_lots) ? (lot.land_lots[0] as any).boundary : (lot.land_lots as any).boundary
                        }));
                    setGeoJson({ type: 'FeatureCollection', features });
                }

                // 3. 단계별 동의 상태 조회 (SQL View 활용)
                const { data: statuses, error: statusError } = await supabase
                    .from('v_pnu_consent_status')
                    .select('*')
                    .eq('stage_id', stageId);

                if (statuses && !statusError) {
                    setConsentData(statuses);
                }
            } catch (err) {
                console.error('지도 데이터 로딩 실패:', err);
                setIsPublished(false);
            } finally {
                setLoading(false);
            }
        }

        fetchMapData();
    }, [unionId, stageId]);

    return { geoJson, consentData, loading, isPublished };
}
