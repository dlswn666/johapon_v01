import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { MemberAccessLog, AccessType } from '@/app/_lib/shared/type/database.types';

// 접속 로그 + 조합 정보 타입
export interface AccessLogWithUnion extends MemberAccessLog {
    union?: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

// 접속 로그 조회 파라미터
interface UseAccessLogsParams {
    unionId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}

// 접속 로그 목록 조회 (시스템 관리자용)
export function useAccessLogs({
    unionId,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
}: UseAccessLogsParams) {
    return useQuery({
        queryKey: ['access-logs', unionId, startDate, endDate, page, pageSize],
        queryFn: async () => {
            let query = supabase
                .from('member_access_logs')
                .select(
                    `
                    *,
                    union:unions!member_access_logs_union_id_fkey(id, name, slug)
                `,
                    { count: 'exact' }
                )
                .order('accessed_at', { ascending: false });

            // 조합 필터
            if (unionId) {
                query = query.eq('union_id', unionId);
            }

            // 기간 필터
            if (startDate) {
                query = query.gte('accessed_at', startDate);
            }
            if (endDate) {
                // endDate는 해당 날짜의 끝까지 포함
                query = query.lte('accessed_at', `${endDate}T23:59:59.999Z`);
            }

            // 페이지네이션
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                logs: data as AccessLogWithUnion[],
                total: count || 0,
            };
        },
    });
}

// 접속 이벤트 기록
export function useLogAccessEvent() {
    return useMutation({
        mutationFn: async ({
            unionId,
            viewerId,
            viewerName,
            accessType,
        }: {
            unionId: string;
            viewerId: string;
            viewerName: string;
            accessType: AccessType;
        }) => {
            // 클라이언트 정보 수집
            const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : null;

            const { error } = await supabase.from('member_access_logs').insert({
                union_id: unionId,
                viewer_id: viewerId,
                viewer_name: viewerName,
                access_type: accessType,
                user_agent: userAgent,
                // IP 주소는 서버사이드에서 처리해야 하므로 여기서는 null
                ip_address: null,
            });

            if (error) throw error;
        },
    });
}

// 1년 경과 로그 삭제 (시스템 관리자용)
export function useDeleteOldLogs() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (monthsToKeep: number = 12) => {
            const { data, error } = await supabase.rpc('delete_old_access_logs', {
                months_to_keep: monthsToKeep,
            });

            if (error) throw error;
            return data as number;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['access-logs'] });
        },
    });
}

// 접근 유형 레이블 변환
export const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
    LIST_VIEW: '목록 조회',
    DETAIL_VIEW: '상세 조회',
    MEMBER_UPDATE: '정보 수정',
    MEMBER_BLOCK: '회원 차단',
};

// 조합 목록 조회 (필터용)
export function useUnionsForFilter() {
    return useQuery({
        queryKey: ['unions-for-filter'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('unions')
                .select('id, name, slug')
                .order('name', { ascending: true });

            if (error) throw error;
            return data || [];
        },
    });
}
