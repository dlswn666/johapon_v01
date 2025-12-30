'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';

export interface ConsentStatus {
    pnu: string;
    address: string | null;
    display_status: 'FULL_AGREED' | 'PARTIAL_AGREED' | 'NONE_AGREED' | 'NO_OWNER';
    total_owners: number;
    agreed_count: number;
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

                // 2. RPC 함수로 동의 상태 + GeoJSON 함께 조회
                const { data: mapData, error: mapError } = await supabase.rpc(
                    'get_union_consent_map_data',
                    {
                        p_union_id: unionId,
                        p_stage_id: stageId
                    }
                );

                if (mapError) {
                    console.error('지도 데이터 조회 실패:', mapError);
                    return;
                }

                if (mapData && mapData.length > 0) {
                    // GeoJSON FeatureCollection 생성
                    const features = mapData
                        .filter((item: { boundary_geojson: unknown }) => item.boundary_geojson)
                        .map((item: { 
                            pnu: string; 
                            address: string | null; 
                            boundary_geojson: GeoJSON.Geometry;
                            consent_status: string;
                        }) => ({
                            type: 'Feature' as const,
                            properties: { 
                                name: item.pnu,
                                address: item.address 
                            },
                            geometry: item.boundary_geojson
                        }));

                    setGeoJson({ 
                        type: 'FeatureCollection', 
                        features 
                    });

                    // 동의 상태 데이터 변환
                    const statuses: ConsentStatus[] = mapData.map((item: {
                        pnu: string;
                        address: string | null;
                        consent_status: string;
                        total_owners: number;
                        agreed_count: number;
                    }) => ({
                        pnu: item.pnu,
                        address: item.address,
                        display_status: item.consent_status as ConsentStatus['display_status'],
                        total_owners: Number(item.total_owners) || 0,
                        agreed_count: Number(item.agreed_count) || 0
                    }));

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
