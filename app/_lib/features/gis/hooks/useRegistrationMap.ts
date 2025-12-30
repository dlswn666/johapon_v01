import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';

// 가입 상태 타입
type RegistrationStatus = 'ALL_REGISTERED' | 'PARTIAL_REGISTERED' | 'NONE_REGISTERED' | 'NO_OWNER';

interface RegistrationData {
    pnu: string;
    address: string | null;
    total_owners: number;
    registered_count: number;
    registration_status: RegistrationStatus;
}

/**
 * 가입 현황 지도 데이터 조회 훅
 */
export function useRegistrationMap(unionId: string | undefined) {
    // 가입 현황 View 조회
    const { data: registrationStatus, isLoading: statusLoading } = useQuery({
        queryKey: ['registration-status', unionId],
        queryFn: async () => {
            if (!unionId) return [];
            
            const { data, error } = await supabase
                .from('v_parcel_registration_status')
                .select('*')
                .eq('union_id', unionId);
            
            if (error) throw error;
            return data as {
                pnu: string;
                address: string | null;
                total_owners: number;
                registered_count: number;
                registration_status: RegistrationStatus;
            }[];
        },
        enabled: !!unionId,
    });

    // 필지 경계 데이터 조회
    const { data: landLots, isLoading: lotsLoading } = useQuery({
        queryKey: ['land-lots-boundary', unionId],
        queryFn: async () => {
            if (!unionId) return [];
            
            const { data, error } = await supabase
                .from('union_land_lots')
                .select('pnu, land_lots(boundary, address)')
                .eq('union_id', unionId);
            
            if (error) throw error;
            return data;
        },
        enabled: !!unionId,
    });

    // GeoJSON 생성
    const geoJson = useMemo(() => {
        if (!landLots) return null;

        type LotWithLandLots = {
            pnu: string;
            land_lots: { boundary: GeoJSON.Geometry; address: string } | { boundary: GeoJSON.Geometry; address: string }[] | null;
        };

        const features = (landLots as LotWithLandLots[])
            .filter(l => {
                const landLot = Array.isArray(l.land_lots) ? l.land_lots[0] : l.land_lots;
                return landLot?.boundary;
            })
            .map(lot => {
                const landLot = Array.isArray(lot.land_lots) ? lot.land_lots[0] : lot.land_lots;
                return {
                    type: 'Feature' as const,
                    properties: { name: lot.pnu },
                    geometry: landLot!.boundary
                };
            });

        return {
            type: 'FeatureCollection' as const,
            features
        };
    }, [landLots]);

    // 가입 데이터 매핑
    const registrationData: RegistrationData[] = useMemo(() => {
        if (!registrationStatus) return [];
        
        return registrationStatus.map(item => ({
            pnu: item.pnu,
            address: item.address,
            total_owners: Number(item.total_owners) || 0,
            registered_count: Number(item.registered_count) || 0,
            registration_status: item.registration_status as RegistrationStatus
        }));
    }, [registrationStatus]);

    return {
        geoJson,
        registrationData,
        loading: statusLoading || lotsLoading
    };
}

