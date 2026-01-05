import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { User, UpdateUser } from '@/app/_lib/shared/type/database.types';
import useMemberStore, { BlockedFilter } from '../model/useMemberStore';

// 조합원 + 필지 정보 타입
export interface MemberWithLandInfo extends User {
    land_lot?: {
        area: number | null;
        official_price: number | null;
    } | null;
    isPnuMatched: boolean;
}

// 조합원 목록 조회 파라미터
interface UseApprovedMembersParams {
    unionId: string | undefined;
    searchQuery?: string;
    blockedFilter?: BlockedFilter;
    page?: number;
    pageSize?: number;
}

// 승인된 조합원 목록 조회 (land_lots 조인으로 면적/공시지가 포함)
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

            // 3. 사용자 PNU로 land_lots 정보 조회
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

            // 4. 조합원 정보와 필지 정보 결합
            const membersWithLandInfo: MemberWithLandInfo[] = (users || []).map((user) => ({
                ...user,
                land_lot: user.property_pnu ? landLotsMap[user.property_pnu] || null : null,
                isPnuMatched: user.property_pnu ? unionPnuSet.has(user.property_pnu) : false,
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
