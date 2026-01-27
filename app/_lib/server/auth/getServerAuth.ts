import { createClient } from '@/app/_lib/shared/supabase/server';
import { getCachedUserByAuthId, getCachedUnion } from '@/app/_lib/server/cache';
import { User } from '@/app/_lib/shared/type/database.types';

export interface ServerAuthResult {
    isAuthenticated: boolean;
    authUserId: string | null;
    user: User | null;
    isSystemAdmin: boolean;
    isAdmin: boolean;
    isBlocked: boolean;
}

/**
 * 서버에서 인증 상태 확인
 * Layout에서 호출하여 AuthProvider에 초기값 전달
 */
export async function getServerAuth(slug?: string): Promise<ServerAuthResult> {
    const supabase = await createClient();

    try {
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
            return {
                isAuthenticated: false,
                authUserId: null,
                user: null,
                isSystemAdmin: false,
                isAdmin: false,
                isBlocked: false,
            };
        }

        // 조합 ID 조회 (slug가 있는 경우)
        let unionId: string | undefined;
        if (slug) {
            const union = await getCachedUnion(slug);
            unionId = union?.id;
        }

        // 사용자 프로필 조회
        const user = await getCachedUserByAuthId(authUser.id, unionId);

        const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
        const isAdmin = isSystemAdmin || user?.role === 'ADMIN';

        return {
            isAuthenticated: true,
            authUserId: authUser.id,
            user: user as User | null,
            isSystemAdmin,
            isAdmin,
            isBlocked: user?.is_blocked ?? false,
        };
    } catch (error) {
        console.error('[getServerAuth] Error:', error);
        return {
            isAuthenticated: false,
            authUserId: null,
            user: null,
            isSystemAdmin: false,
            isAdmin: false,
            isBlocked: false,
        };
    }
}
