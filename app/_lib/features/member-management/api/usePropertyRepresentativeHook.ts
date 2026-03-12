import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SetRepresentativeParams {
    propertyUnitId: string;
    newRepresentativeUserId: string;
    unionId: string;
}

export function useSetPropertyRepresentative() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (params: SetRepresentativeParams) => {
            const res = await fetch(`/api/property-units/${params.propertyUnitId}/representative`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_representative_user_id: params.newRepresentativeUserId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '대표자 지정 실패');
            }
            return res.json();
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['approved-members-infinite', variables.unionId] });
        },
    });

    return {
        mutate: mutation.mutateAsync,
        isPending: mutation.isPending,
    };
}
