import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import {
    User,
    UpdateUser,
    MemberPropertyUnitInfo,
    MemberWithProperties,
    OwnershipType,
} from '@/app/_lib/shared/type/database.types';
import useMemberStore, { BlockedFilter } from '../model/useMemberStore';

// 기존 호환성 유지를 위한 타입 (deprecated)
export interface MemberWithLandInfo extends User {
    land_lot?: {
        area: number | null;
        official_price: number | null;
    } | null;
    isPnuMatched: boolean;
    // 새로 추가: 물건지 목록
    property_units?: MemberPropertyUnitInfo[];
}

// 새로운 타입 재export
export type { MemberWithProperties, MemberPropertyUnitInfo };

// 조합원 목록 조회 파라미터
interface UseApprovedMembersParams {
    unionId: string | undefined;
    searchQuery?: string;
    blockedFilter?: BlockedFilter;
    page?: number;
    pageSize?: number;
}

// 승인된 조합원 목록 조회 (land_lots + user_property_units 조인으로 물건지 정보 포함)
export function useApprovedMembers({
    unionId,
    searchQuery = '',
    blockedFilter = 'all',
    page = 1,
    pageSize = 10,
}: UseApprovedMembersParams) {
    const { setMembers, setTotalCount } = useMemberStore();

    return useQuery({
        queryKey: ['approved-members', unionId, searchQuery, blockedFilter, page, pageSize],
        queryFn: async () => {
            if (!unionId) return { members: [], total: 0 };

            // 1. 먼저 사용자 목록 조회
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' })
                .eq('union_id', unionId)
                .in('user_status', ['PRE_REGISTERED', 'APPROVED'])
                .order('created_at', { ascending: false });

            // 차단 필터 적용
            if (blockedFilter === 'normal') {
                query = query.eq('is_blocked', false);
            } else if (blockedFilter === 'blocked') {
                query = query.eq('is_blocked', true);
            }

            // 검색 필터 적용 (이름 또는 물건지 주소)
            if (searchQuery) {
                query = query.or(
                    `name.ilike.%${searchQuery}%,property_address_road.ilike.%${searchQuery}%,property_address_jibun.ilike.%${searchQuery}%`
                );
            }

            // 페이지네이션
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data: users, error, count } = await query;

            if (error) throw error;

            // 2. union_land_lots에서 해당 조합의 PNU 목록 조회
            const { data: unionLandLots } = await supabase
                .from('union_land_lots')
                .select('pnu')
                .eq('union_id', unionId);

            const unionPnuSet = new Set(unionLandLots?.map((l) => l.pnu) || []);

            // 3. 사용자 PNU로 land_lots 정보 조회 (기존 호환성)
            const pnuList = users?.map((u) => u.property_pnu).filter(Boolean) as string[];
            let landLotsMap: Record<string, { area: number | null; official_price: number | null }> = {};

            if (pnuList.length > 0) {
                const { data: landLots } = await supabase
                    .from('land_lots')
                    .select('pnu, area, official_price')
                    .in('pnu', pnuList);

                if (landLots) {
                    landLotsMap = landLots.reduce(
                        (acc, lot) => {
                            acc[lot.pnu] = { area: lot.area, official_price: lot.official_price };
                            return acc;
                        },
                        {} as Record<string, { area: number | null; official_price: number | null }>
                    );
                }
            }

            // 4. user_property_units에서 사용자별 물건지 정보 조회
            const userIds = users?.map((u) => u.id) || [];
            const propertyUnitsMap: Record<string, MemberPropertyUnitInfo[]> = {};

            if (userIds.length > 0) {
                const { data: propertyUnits } = await supabase
                    .from('user_property_units')
                    .select(
                        `
                        id,
                        user_id,
                        building_unit_id,
                        ownership_type,
                        ownership_ratio,
                        is_primary,
                        notes,
                        building_units!inner (
                            dong,
                            ho,
                            area,
                            official_price,
                            buildings!inner (
                                building_name,
                                pnu,
                                land_lots!inner (
                                    address
                                )
                            )
                        )
                    `
                    )
                    .in('user_id', userIds)
                    .order('is_primary', { ascending: false });

                if (propertyUnits) {
                    propertyUnits.forEach((pu) => {
                        const userId = pu.user_id;
                        if (!propertyUnitsMap[userId]) {
                            propertyUnitsMap[userId] = [];
                        }

                        // 타입 안전하게 처리
                        const buildingUnit = pu.building_units as unknown as {
                            dong: string | null;
                            ho: string | null;
                            area: number | null;
                            official_price: number | null;
                            buildings: {
                                building_name: string | null;
                                pnu: string;
                                land_lots: { address: string };
                            };
                        };

                        propertyUnitsMap[userId].push({
                            id: pu.id,
                            building_unit_id: pu.building_unit_id,
                            ownership_type: pu.ownership_type as OwnershipType,
                            ownership_ratio: pu.ownership_ratio,
                            is_primary: pu.is_primary,
                            notes: pu.notes,
                            dong: buildingUnit?.dong || null,
                            ho: buildingUnit?.ho || null,
                            area: buildingUnit?.area || null,
                            official_price: buildingUnit?.official_price || null,
                            building_name: buildingUnit?.buildings?.building_name || null,
                            pnu: buildingUnit?.buildings?.pnu || null,
                            address: buildingUnit?.buildings?.land_lots?.address || null,
                        });
                    });
                }
            }

            // 5. 조합원 정보와 필지/물건지 정보 결합
            const membersWithLandInfo: MemberWithLandInfo[] = (users || []).map((user) => ({
                ...user,
                land_lot: user.property_pnu ? landLotsMap[user.property_pnu] || null : null,
                isPnuMatched: user.property_pnu ? unionPnuSet.has(user.property_pnu) : false,
                property_units: propertyUnitsMap[user.id] || [],
            }));

            setMembers(users || []);
            setTotalCount(count || 0);

            return { members: membersWithLandInfo, total: count || 0 };
        },
        enabled: !!unionId,
    });
}

// 조합원 상세 조회
export function useMemberDetail(memberId: string | undefined) {
    return useQuery({
        queryKey: ['member-detail', memberId],
        queryFn: async () => {
            if (!memberId) return null;

            const { data, error } = await supabase.from('users').select('*').eq('id', memberId).single();

            if (error) throw error;
            return data as User;
        },
        enabled: !!memberId,
    });
}

// 조합원 정보 수정 (생년월일, 전화번호, 거주지, 특이사항)
export function useUpdateMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            memberId,
            updates,
        }: {
            memberId: string;
            updates: Pick<
                UpdateUser,
                | 'birth_date'
                | 'phone_number'
                | 'resident_address'
                | 'resident_address_detail'
                | 'resident_address_road'
                | 'resident_address_jibun'
                | 'resident_zonecode'
                | 'notes'
            >;
        }) => {
            const { error } = await supabase
                .from('users')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-members'] });
            queryClient.invalidateQueries({ queryKey: ['member-detail'] });
        },
    });
}

// 조합원 강제 탈퇴 (차단)
export function useBlockMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ memberId, reason }: { memberId: string; reason: string }) => {
            const { error } = await supabase
                .from('users')
                .update({
                    is_blocked: true,
                    blocked_at: new Date().toISOString(),
                    blocked_reason: reason,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-members'] });
            queryClient.invalidateQueries({ queryKey: ['member-detail'] });
        },
    });
}

// 조합원 차단 해제
export function useUnblockMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (memberId: string) => {
            const { error } = await supabase
                .from('users')
                .update({
                    is_blocked: false,
                    blocked_at: null,
                    blocked_reason: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-members'] });
            queryClient.invalidateQueries({ queryKey: ['member-detail'] });
        },
    });
}

// 물건지 PNU 수동 매칭
export function useUpdateMemberPnu() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ memberId, pnu }: { memberId: string; pnu: string }) => {
            // PNU 유효성 검증 (19자리)
            if (!/^\d{19}$/.test(pnu)) {
                throw new Error('PNU는 19자리 숫자여야 합니다.');
            }

            const { error } = await supabase
                .from('users')
                .update({
                    property_pnu: pnu,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', memberId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-members'] });
            queryClient.invalidateQueries({ queryKey: ['member-detail'] });
        },
    });
}

// 조합 내 필지 목록 조회 (PNU 매칭용)
export function useUnionLandLots(unionId: string | undefined) {
    return useQuery({
        queryKey: ['union-land-lots-for-matching', unionId],
        queryFn: async () => {
            if (!unionId) return [];

            const { data, error } = await supabase
                .from('union_land_lots')
                .select('pnu, address_text')
                .eq('union_id', unionId)
                .order('address_text', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!unionId,
    });
}

// 사용자별 물건지 목록 조회
export function useMemberPropertyUnits(memberId: string | undefined) {
    return useQuery({
        queryKey: ['member-property-units', memberId],
        queryFn: async () => {
            if (!memberId) return [];

            const { data, error } = await supabase
                .from('user_property_units')
                .select(
                    `
                    id,
                    user_id,
                    building_unit_id,
                    ownership_type,
                    ownership_ratio,
                    is_primary,
                    notes,
                    building_units!inner (
                        dong,
                        ho,
                        area,
                        official_price,
                        buildings!inner (
                            building_name,
                            pnu,
                            land_lots!inner (
                                address
                            )
                        )
                    )
                `
                )
                .eq('user_id', memberId)
                .order('is_primary', { ascending: false });

            if (error) throw error;

            // 데이터 변환
            return (data || []).map((pu) => {
                const buildingUnit = pu.building_units as unknown as {
                    dong: string | null;
                    ho: string | null;
                    area: number | null;
                    official_price: number | null;
                    buildings: {
                        building_name: string | null;
                        pnu: string;
                        land_lots: { address: string };
                    };
                };

                return {
                    id: pu.id,
                    building_unit_id: pu.building_unit_id,
                    ownership_type: pu.ownership_type as OwnershipType,
                    ownership_ratio: pu.ownership_ratio,
                    is_primary: pu.is_primary,
                    notes: pu.notes,
                    dong: buildingUnit?.dong || null,
                    ho: buildingUnit?.ho || null,
                    area: buildingUnit?.area || null,
                    official_price: buildingUnit?.official_price || null,
                    building_name: buildingUnit?.buildings?.building_name || null,
                    pnu: buildingUnit?.buildings?.pnu || null,
                    address: buildingUnit?.buildings?.land_lots?.address || null,
                } as MemberPropertyUnitInfo;
            });
        },
        enabled: !!memberId,
    });
}

// 소유유형 수정
export function useUpdateOwnershipType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            propertyUnitId,
            ownershipType,
            ownershipRatio,
        }: {
            propertyUnitId: string;
            ownershipType: OwnershipType;
            ownershipRatio?: number | null;
        }) => {
            const { error } = await supabase
                .from('user_property_units')
                .update({
                    ownership_type: ownershipType,
                    ownership_ratio: ownershipRatio ?? null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', propertyUnitId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-members'] });
            queryClient.invalidateQueries({ queryKey: ['member-property-units'] });
            queryClient.invalidateQueries({ queryKey: ['member-detail'] });
        },
    });
}

// 대표 물건지 변경
export function useSetPrimaryPropertyUnit() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            memberId,
            propertyUnitId,
        }: {
            memberId: string;
            propertyUnitId: string;
        }) => {
            // 1. 해당 사용자의 모든 물건지를 is_primary = false로 설정
            const { error: resetError } = await supabase
                .from('user_property_units')
                .update({ is_primary: false, updated_at: new Date().toISOString() })
                .eq('user_id', memberId);

            if (resetError) throw resetError;

            // 2. 선택된 물건지를 is_primary = true로 설정
            const { error: setError } = await supabase
                .from('user_property_units')
                .update({ is_primary: true, updated_at: new Date().toISOString() })
                .eq('id', propertyUnitId);

            if (setError) throw setError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-members'] });
            queryClient.invalidateQueries({ queryKey: ['member-property-units'] });
        },
    });
}
