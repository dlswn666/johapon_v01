'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/_lib/shared/supabase/client';

// 가입 상태 타입
type RegistrationStatus = 'ALL_REGISTERED' | 'PARTIAL_REGISTERED' | 'NONE_REGISTERED' | 'NO_OWNER';

export interface RegistrationData {
    pnu: string;
    address: string | null;
    total_owners: number;
    registered_count: number;
    registration_status: RegistrationStatus;
    area: number | null;
    official_price: number | null;
}

/**
 * 가입 현황 지도 데이터 조회 훅
 */
export function useRegistrationMap(unionId: string | undefined) {
    const [geoJson, setGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
    const [registrationData, setRegistrationData] = useState<RegistrationData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchMapData() {
            if (!unionId) return;
            setLoading(true);

            try {
                // RPC 함수로 가입 상태 + GeoJSON 함께 조회
                const { data: mapData, error: mapError } = await supabase.rpc(
                    'get_union_registration_map_data',
                    {
                        p_union_id: unionId
                    }
                );

                if (mapError) {
                    console.error('가입 현황 지도 데이터 조회 실패:', mapError);
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
                            registration_status: string;
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

                    // 가입 상태 데이터 변환
                    const statuses: RegistrationData[] = mapData.map((item: {
                        pnu: string;
                        address: string | null;
                        registration_status: string;
                        total_owners: number;
                        registered_count: number;
                        area: number | null;
                        official_price: number | null;
                    }) => ({
                        pnu: item.pnu,
                        address: item.address,
                        registration_status: item.registration_status as RegistrationStatus,
                        total_owners: Number(item.total_owners) || 0,
                        registered_count: Number(item.registered_count) || 0,
                        area: item.area,
                        official_price: item.official_price
                    }));

                    setRegistrationData(statuses);
                }
            } catch (err) {
                console.error('가입 현황 지도 데이터 로딩 실패:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchMapData();
    }, [unionId]);

    return { geoJson, registrationData, loading };
}
