import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import { useAuth } from '@/app/_lib/app/providers/AuthProvider';

export interface MergeCandidateMember {
    id: string;
    name: string;
    phone_number: string | null;
    user_status: string;
    created_at: string;
    entity_type: 'INDIVIDUAL' | 'CORPORATION' | 'GOVERNMENT';
}

export interface MergeCandidate {
    group_id: string;
    duplicate_count: number;
    match_reason: 'NAME_PHONE' | 'BIZ_NUMBER';
    status: 'PENDING' | 'MERGED' | 'CONFIRMED_SEPARATE';
    members: MergeCandidateMember[];
}

interface MergeCandidatesResponse {
    candidates: MergeCandidate[];
    pending_count: number;
}

export function useMergeCandidates(unionId: string | undefined) {
    const { data, isLoading, refetch } = useQuery<MergeCandidatesResponse>({
        queryKey: ['merge-candidates', unionId],
        queryFn: async () => {
            const res = await fetch(`/api/unions/${unionId}/merge-candidates`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '병합 후보 조회 실패');
            }
            return res.json();
        },
        enabled: !!unionId,
        staleTime: 30_000,
    });

    return {
        candidates: data?.candidates ?? [],
        pendingCount: data?.pending_count ?? 0,
        isLoading,
        refetch,
    };
}

interface MergeUsersParams {
    unionId: string;
    canonicalUserId: string;
    mergedUserId: string;
    entityType: 'INDIVIDUAL' | 'CORPORATION' | 'GOVERNMENT';
    adminUserId: string;
}

export function useMergeUsers() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const mutation = useMutation({
        mutationFn: async (params: MergeUsersParams) => {
            const { error } = await supabase.rpc('merge_duplicate_users', {
                p_canonical_id: params.canonicalUserId,
                p_duplicate_ids: [params.mergedUserId],
                p_admin_id: params.adminUserId || user?.id || '',
                p_merge_reason: null,
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['merge-candidates', variables.unionId] });
            queryClient.invalidateQueries({ queryKey: ['approved-members-infinite', variables.unionId] });
        },
    });

    return {
        mutate: mutation.mutateAsync,
        isPending: mutation.isPending,
    };
}

interface ConfirmSeparateParams {
    unionId: string;
    userIdA: string;
    userIdB: string;
}

export function useConfirmSeparateUsers() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (params: ConfirmSeparateParams) => {
            const res = await fetch(`/api/unions/${params.unionId}/merge-candidates/confirm-separate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id_a: params.userIdA, user_id_b: params.userIdB }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '별도 인물 확정 실패');
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['merge-candidates', variables.unionId] });
        },
    });

    return {
        mutate: mutation.mutateAsync,
        isPending: mutation.isPending,
    };
}
