'use client';

import { useQuery } from '@tanstack/react-query';
import { getAllUnionMembers } from '../actions/parcelActions';

export interface UnionMember {
    id: string;
    name: string;
    phone_number: string | null;
    property_address_jibun: string | null;
    property_pnu: string | null;
    user_status: string;
}

/**
 * 조합의 모든 승인된 조합원 정보를 초기에 한 번 로드하는 훅
 * PNU별로 조합원을 그룹화하여 반환
 */
export function useUnionMembers(unionId: string | undefined) {
    const { data: members, isLoading, error } = useQuery({
        queryKey: ['union-members-all', unionId],
        queryFn: async () => {
            if (!unionId) return [];
            return getAllUnionMembers(unionId);
        },
        enabled: !!unionId,
        staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
    });

    // PNU별로 조합원 그룹화
    const membersByPnu = new Map<string, UnionMember[]>();
    
    if (members) {
        for (const member of members) {
            if (member.property_pnu) {
                const pnu = member.property_pnu;
                if (!membersByPnu.has(pnu)) {
                    membersByPnu.set(pnu, []);
                }
                membersByPnu.get(pnu)!.push(member as UnionMember);
            }
        }
    }

    // 특정 PNU의 조합원 조회 함수
    const getMembersByPnu = (pnu: string | null): UnionMember[] => {
        if (!pnu) return [];
        return membersByPnu.get(pnu) || [];
    };

    return {
        members: members as UnionMember[] | undefined,
        membersByPnu,
        getMembersByPnu,
        isLoading,
        error,
    };
}
