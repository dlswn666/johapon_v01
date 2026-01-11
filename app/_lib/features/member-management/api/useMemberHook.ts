import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    // 동일인 그룹핑 관련 필드
    grouped_user_ids?: string[];
    total_property_count?: number;
    // 토지/건물 면적 및 지분율 (users 테이블 필드 확장)
    land_area?: number | null;
    building_area?: number | null;
    land_ownership_ratio?: number | null;
    building_ownership_ratio?: number | null;
    // 공동소유자 합계 필드 (DB 함수에서 계산)
    total_land_area?: number | null;
    total_building_area?: number | null;
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

            // 1. 먼저 사용자 목록 조회 (물건지 주소 오름차순 정렬)
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' })
                .eq('union_id', unionId)
                .in('user_status', ['PRE_REGISTERED', 'APPROVED'])
                .order('property_address', { ascending: true, nullsFirst: false });

            // 차단 필터 적용
            if (blockedFilter === 'normal') {
                query = query.eq('is_blocked', false);
            } else if (blockedFilter === 'blocked') {
                query = query.eq('is_blocked', true);
            }

            // 검색 필터 적용 (이름 또는 물건지 주소)
            if (searchQuery) {
                query = query.or(
                    `name.ilike.%${searchQuery}%,property_address.ilike.%${searchQuery}%`
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

            // 3. user_property_units에서 사용자별 물건지 정보 조회
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
                                    address,
                                    area,
                                    official_price
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
                                land_lots: { 
                                    address: string;
                                    area: number | null;
                                    official_price: number | null;
                                };
                            };
                        };

                        // land_lots에서 면적/공시지가 우선 사용 (building_units에 데이터가 없음)
                        const landLotArea = buildingUnit?.buildings?.land_lots?.area;
                        const landLotPrice = buildingUnit?.buildings?.land_lots?.official_price;

                        propertyUnitsMap[userId].push({
                            id: pu.id,
                            building_unit_id: pu.building_unit_id,
                            ownership_type: pu.ownership_type as OwnershipType,
                            is_primary: pu.is_primary,
                            notes: pu.notes,
                            dong: buildingUnit?.dong || null,
                            ho: buildingUnit?.ho || null,
                            area: landLotArea ?? buildingUnit?.area ?? null,
                            official_price: landLotPrice ?? buildingUnit?.official_price ?? null,
                            building_name: buildingUnit?.buildings?.building_name || null,
                            pnu: buildingUnit?.buildings?.pnu || null,
                            address: buildingUnit?.buildings?.land_lots?.address || null,
                        });
                    });
                }
            }

            // 5. 조합원 정보와 필지/물건지 정보 결합
            // property_pnu는 user_property_units에서 가져오므로 propertyUnitsMap 활용
            const membersWithLandInfo: MemberWithLandInfo[] = (users || []).map((user) => {
                const units = propertyUnitsMap[user.id] || [];
                const primaryUnit = units.find((u) => u.is_primary) || units[0];
                const primaryPnu = primaryUnit?.pnu || null;
                
                return {
                    ...user,
                    land_lot: primaryUnit ? {
                        area: primaryUnit.land_area || null,
                        official_price: primaryUnit.official_price || null,
                    } : null,
                    isPnuMatched: primaryPnu ? unionPnuSet.has(primaryPnu) : false,
                    property_units: units,
                };
            });

            setMembers(users || []);
            setTotalCount(count || 0);

            return { members: membersWithLandInfo, total: count || 0 };
        },
        enabled: !!unionId,
    });
}

// 무한 스크롤용 조합원 목록 조회 파라미터
interface UseApprovedMembersInfiniteParams {
    unionId: string | undefined;
    searchQuery?: string;
    blockedFilter?: BlockedFilter;
    pageSize?: number;
}

// 무한 스크롤용 응답 타입
interface InfiniteMembersResponse {
    members: MemberWithLandInfo[];
    total: number;
    nextPage: number | undefined;
}

// DB 함수 반환 타입 (get_grouped_members) - User 타입의 모든 필드 포함
interface GroupedMemberRow {
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    role: string;
    created_at: string;
    union_id: string;
    user_status: string;
    birth_date: string | null;
    property_address: string | null;
    property_address_detail: string | null;
    property_address_road: string | null;
    property_address_jibun: string | null;
    property_zonecode: string | null;
    property_pnu: string | null;
    property_type: string | null;
    property_dong: string | null;
    property_ho: string | null;
    resident_address: string | null;
    resident_address_detail: string | null;
    resident_address_road: string | null;
    resident_address_jibun: string | null;
    resident_zonecode: string | null;
    notes: string | null;
    is_blocked: boolean | null;
    blocked_at: string | null;
    blocked_reason: string | null;
    land_area: number | null;
    land_ownership_ratio: number | null;
    building_area: number | null;
    building_ownership_ratio: number | null;
    updated_at: string | null;
    // User 타입에 있지만 DB 함수에서 반환하지 않는 필드들 (null로 처리)
    rejected_reason?: string | null;
    approved_at?: string | null;
    rejected_at?: string | null;
    executive_title?: string | null;
    is_executive?: boolean | null;
    executive_sort_order?: number | null;
    property_unit_id?: string | null;
    // 그룹핑 관련 필드
    group_key: string;
    grouped_user_ids: string[];
    total_property_count: number;
    total_count: number;
    // 공동소유자 합계 필드
    total_land_area: number | null;
    total_building_area: number | null;
}

// 승인된 조합원 목록 조회 (무한 스크롤) - DB 함수로 그룹핑/정렬 처리
export function useApprovedMembersInfinite({
    unionId,
    searchQuery = '',
    blockedFilter = 'all',
    pageSize = 50, // 50개씩 조회로 변경
}: UseApprovedMembersInfiniteParams) {
    const { setMembers, setTotalCount } = useMemberStore();

    return useInfiniteQuery<InfiniteMembersResponse>({
        queryKey: ['approved-members-infinite', unionId, searchQuery, blockedFilter, pageSize],
        queryFn: async ({ pageParam }): Promise<InfiniteMembersResponse> => {
            if (!unionId) return { members: [], total: 0, nextPage: undefined };

            const page = pageParam as number;

            // 1. DB 함수로 그룹핑된 조합원 목록 조회 (단일 RPC 호출)
            const { data: groupedMembers, error } = await supabase.rpc('get_grouped_members', {
                p_union_id: unionId,
                p_search_query: searchQuery,
                p_blocked_filter: blockedFilter,
                p_page: page,
                p_page_size: pageSize,
            });

            if (error) throw error;

            const members = (groupedMembers as GroupedMemberRow[]) || [];
            const totalCount = members.length > 0 ? members[0].total_count : 0;

            // 2. union_land_lots에서 PNU 목록 조회 (PNU 매칭 확인용)
            const { data: unionLandLots } = await supabase
                .from('union_land_lots')
                .select('pnu')
                .eq('union_id', unionId);

            const unionPnuSet = new Set(unionLandLots?.map((l) => l.pnu) || []);

            // 3. 대표 사용자들의 land_lots 정보 조회
            const pnuList = members.map((u) => u.property_pnu).filter(Boolean) as string[];
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

            // 4. 대표 사용자들의 property_units 정보 조회
            const userIds = members.map((u) => u.id);
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
                                    address,
                                    area,
                                    official_price
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

                        const landLotArea = buildingUnit?.buildings?.land_lots?.area;
                        const landLotPrice = buildingUnit?.buildings?.land_lots?.official_price;

                        propertyUnitsMap[userId].push({
                            id: pu.id,
                            building_unit_id: pu.building_unit_id,
                            ownership_type: pu.ownership_type as OwnershipType,
                            is_primary: pu.is_primary,
                            notes: pu.notes,
                            dong: buildingUnit?.dong || null,
                            ho: buildingUnit?.ho || null,
                            area: landLotArea ?? buildingUnit?.area ?? null,
                            official_price: landLotPrice ?? buildingUnit?.official_price ?? null,
                            building_name: buildingUnit?.buildings?.building_name || null,
                            pnu: buildingUnit?.buildings?.pnu || null,
                            address: buildingUnit?.buildings?.land_lots?.address || null,
                        });
                    });
                }
            }

            // 5. MemberWithLandInfo 형태로 변환 (그룹핑 정보 포함)
            const membersWithLandInfo = members.map((member) => ({
                ...member,
                land_lot: member.property_pnu ? landLotsMap[member.property_pnu] || null : null,
                isPnuMatched: member.property_pnu ? unionPnuSet.has(member.property_pnu) : false,
                property_units: propertyUnitsMap[member.id] || [],
                // 그룹핑 정보는 DB에서 이미 처리됨
                grouped_user_ids: member.grouped_user_ids,
                total_property_count: member.total_property_count,
                // 공동소유자 합계 필드 (DB에서 계산됨)
                total_land_area: member.total_land_area,
                total_building_area: member.total_building_area,
            })) as unknown as MemberWithLandInfo[];

            // Store 업데이트는 첫 페이지에서만
            if (page === 1) {
                setMembers(members as unknown as User[]);
                setTotalCount(totalCount);
            }

            const totalPages = Math.ceil(totalCount / pageSize);
            const hasNextPage = page < totalPages;

            return {
                members: membersWithLandInfo,
                total: totalCount,
                nextPage: hasNextPage ? page + 1 : undefined,
            };
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.nextPage,
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
        }: {
            propertyUnitId: string;
            ownershipType: OwnershipType;
        }) => {
            const { error } = await supabase
                .from('user_property_units')
                .update({
                    ownership_type: ownershipType,
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

// 공동 소유자 정보 타입
export interface CoOwnerInfo {
    id: string;
    name: string;
    phone_number: string | null;
    birth_date: string | null;
    land_area: number | null;
    land_ownership_ratio: number | null;
    building_area: number | null;
    building_ownership_ratio: number | null;
    resident_address: string | null;
    resident_address_detail: string | null;
    resident_address_road: string | null;
    resident_address_jibun: string | null;
    resident_zonecode: string | null;
    notes: string | null;
    is_blocked: boolean | null;
    blocked_at: string | null;
    blocked_reason: string | null;
    property_pnu: string | null;
    property_address: string | null;
    property_address_jibun: string | null;
    building_unit_id: string;
    ownership_type: OwnershipType;
}

// 공동 소유자 조회 (동일한 building_unit_id를 가진 모든 사용자)
export function useCoOwners(memberId: string | undefined) {
    return useQuery({
        queryKey: ['co-owners', memberId],
        queryFn: async (): Promise<CoOwnerInfo[]> => {
            if (!memberId) return [];

            // 1. 해당 사용자의 building_unit_id 목록 조회
            const { data: memberUnits, error: memberUnitsError } = await supabase
                .from('user_property_units')
                .select('building_unit_id')
                .eq('user_id', memberId);

            if (memberUnitsError) throw memberUnitsError;
            if (!memberUnits || memberUnits.length === 0) return [];

            const buildingUnitIds = memberUnits.map((u) => u.building_unit_id);

            // 2. 동일한 building_unit_id를 가진 모든 사용자의 property_units 조회 (현재 사용자 포함)
            const { data: coOwnerUnits, error: coOwnerUnitsError } = await supabase
                .from('user_property_units')
                .select(
                    `
                    user_id,
                    building_unit_id,
                    ownership_type,
                    land_area,
                    land_ownership_ratio,
                    building_area,
                    building_ownership_ratio
                `
                )
                .in('building_unit_id', buildingUnitIds);

            if (coOwnerUnitsError) throw coOwnerUnitsError;
            if (!coOwnerUnits || coOwnerUnits.length === 0) return [];

            // 3. 공동 소유자들의 상세 정보 조회
            const coOwnerUserIds = [...new Set(coOwnerUnits.map((u) => u.user_id))];
            const { data: coOwnerUsers, error: coOwnerUsersError } = await supabase
                .from('users')
                .select(
                    `
                    id,
                    name,
                    phone_number,
                    birth_date,
                    resident_address,
                    resident_address_detail,
                    resident_address_road,
                    resident_address_jibun,
                    resident_zonecode,
                    notes,
                    is_blocked,
                    blocked_at,
                    blocked_reason,
                    property_pnu,
                    property_address,
                    property_address_jibun
                `
                )
                .in('id', coOwnerUserIds);

            if (coOwnerUsersError) throw coOwnerUsersError;
            if (!coOwnerUsers) return [];

            // 4. 사용자 정보와 물건지 정보 결합
            const userMap = new Map(coOwnerUsers.map((u) => [u.id, u]));
            const result: CoOwnerInfo[] = coOwnerUnits.map((unit) => {
                const user = userMap.get(unit.user_id);
                return {
                    id: unit.user_id,
                    name: user?.name || '',
                    phone_number: user?.phone_number || null,
                    birth_date: user?.birth_date || null,
                    land_area: unit.land_area,
                    land_ownership_ratio: unit.land_ownership_ratio,
                    building_area: unit.building_area,
                    building_ownership_ratio: unit.building_ownership_ratio,
                    resident_address: user?.resident_address || null,
                    resident_address_detail: user?.resident_address_detail || null,
                    resident_address_road: user?.resident_address_road || null,
                    resident_address_jibun: user?.resident_address_jibun || null,
                    resident_zonecode: user?.resident_zonecode || null,
                    notes: user?.notes || null,
                    is_blocked: user?.is_blocked || null,
                    blocked_at: user?.blocked_at || null,
                    blocked_reason: user?.blocked_reason || null,
                    property_pnu: user?.property_pnu || null,
                    property_address: user?.property_address || null,
                    property_address_jibun: user?.property_address_jibun || null,
                    building_unit_id: unit.building_unit_id,
                    ownership_type: unit.ownership_type as OwnershipType,
                };
            });

            return result;
        },
        enabled: !!memberId,
    });
}
