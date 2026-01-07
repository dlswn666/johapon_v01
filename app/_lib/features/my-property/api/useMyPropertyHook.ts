import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import useMyPropertyStore, { MyPropertyInfo } from '../model/useMyPropertyStore';

/**
 * 현재 로그인한 사용자의 물건지 공시지가 정보를 조회합니다.
 * @param userId - 사용자 ID
 */
export function useMyProperty(userId: string | undefined) {
    const { setProperties, setLoading, setError } = useMyPropertyStore();

    return useQuery({
        queryKey: ['my-property', userId],
        queryFn: async (): Promise<MyPropertyInfo[]> => {
            if (!userId) return [];

            setLoading(true);
            setError(null);

            try {
                // user_property_units에서 사용자의 물건지 정보 조회 (JOIN으로 상세 정보 포함)
                const { data: propertyUnits, error } = await supabase
                    .from('user_property_units')
                    .select(`
                        id,
                        building_unit_id,
                        ownership_type,
                        is_primary,
                        land_area,
                        land_ownership_ratio,
                        building_area,
                        building_ownership_ratio,
                        building_units!inner (
                            dong,
                            ho,
                            area,
                            official_price,
                            buildings!inner (
                                building_name,
                                pnu,
                                land_lots!inner (
                                    address,
                                    area,
                                    official_price
                                )
                            )
                        )
                    `)
                    .eq('user_id', userId)
                    .order('is_primary', { ascending: false });

                if (error) throw error;

                // 데이터 변환
                const properties: MyPropertyInfo[] = (propertyUnits || []).map((pu) => {
                    // 타입 안전하게 처리
                    const buildingUnit = pu.building_units as unknown as {
                        dong: string | null;
                        ho: string | null;
                        area: number | null;
                        official_price: number | null;
                        buildings: {
                            building_name: string | null;
                            pnu: string;
                            land_lots: {
                                address: string;
                                area: number | null;
                                official_price: number | null;
                            };
                        };
                    };

                    // land_lots에서 공시지가 우선 사용
                    const landLotOfficialPrice = buildingUnit?.buildings?.land_lots?.official_price;
                    
                    // user_property_units의 면적/지분율 사용
                    const landArea = pu.land_area;
                    const landOwnershipRatio = pu.land_ownership_ratio;
                    
                    // 총 공시지가 계산: 면적 x 공시지가 x (지분율/100)
                    let totalLandPrice: number | null = null;
                    if (landArea && landLotOfficialPrice) {
                        const ratio = landOwnershipRatio ? landOwnershipRatio / 100 : 1;
                        totalLandPrice = Math.round(landArea * landLotOfficialPrice * ratio);
                    }

                    return {
                        id: pu.id,
                        building_unit_id: pu.building_unit_id,
                        address: buildingUnit?.buildings?.land_lots?.address || null,
                        dong: buildingUnit?.dong || null,
                        ho: buildingUnit?.ho || null,
                        building_name: buildingUnit?.buildings?.building_name || null,
                        pnu: buildingUnit?.buildings?.pnu || null,
                        land_area: landArea,
                        building_area: pu.building_area,
                        land_ownership_ratio: landOwnershipRatio,
                        building_ownership_ratio: pu.building_ownership_ratio,
                        official_price: landLotOfficialPrice ?? buildingUnit?.official_price ?? null,
                        total_land_price: totalLandPrice,
                        ownership_type: pu.ownership_type,
                        is_primary: pu.is_primary,
                    };
                });

                setProperties(properties);
                return properties;
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '물건지 정보 조회 중 오류가 발생했습니다.';
                setError(errorMessage);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        enabled: !!userId,
    });
}

/**
 * 사용자의 물건지 통계 정보 (총 면적, 총 공시지가 등)
 */
export function useMyPropertySummary(userId: string | undefined) {
    const { data: properties } = useMyProperty(userId);

    // 통계 계산
    const summary = {
        totalCount: properties?.length || 0,
        totalLandArea: properties?.reduce((sum, p) => sum + (p.land_area || 0), 0) || 0,
        totalBuildingArea: properties?.reduce((sum, p) => sum + (p.building_area || 0), 0) || 0,
        totalLandPrice: properties?.reduce((sum, p) => sum + (p.total_land_price || 0), 0) || 0,
    };

    return summary;
}
