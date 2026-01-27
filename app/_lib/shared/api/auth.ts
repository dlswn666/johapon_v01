import { createClient } from '@/app/_lib/shared/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/app/_lib/shared/type/database.types';

export type AuthResult =
    | { authenticated: true; user: User; authUserId: string }
    | { authenticated: false; response: NextResponse };

/**
 * API Route 인증 검사 유틸리티
 *
 * @param options - 인증 옵션
 * @param options.requireAdmin - 관리자 권한 필요 여부
 * @param options.requireUnionId - 특정 조합 접근 권한 필요 여부
 * @param options.unionId - 접근하려는 조합 ID (requireUnionId=true일 때 필수)
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const auth = await authenticateApiRequest({ requireAdmin: true });
 *   if (!auth.authenticated) return auth.response;
 *
 *   // auth.user와 auth.authUserId 사용 가능
 * }
 */
export async function authenticateApiRequest(options?: {
    requireAdmin?: boolean;
    requireUnionId?: boolean;
    unionId?: string;
}): Promise<AuthResult> {
    const supabase = await createClient();

    // 1. Supabase Auth 세션 확인
    const {
        data: { user: authUser },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
        return {
            authenticated: false,
            response: NextResponse.json(
                { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
                { status: 401 }
            ),
        };
    }

    // 2. user_auth_links를 통해 User 프로필 조회
    const { data: link, error: linkError } = await supabase
        .from('user_auth_links')
        .select('user_id')
        .eq('auth_user_id', authUser.id)
        .single();

    if (linkError || !link) {
        return {
            authenticated: false,
            response: NextResponse.json(
                { error: '사용자 프로필을 찾을 수 없습니다.', code: 'PROFILE_NOT_FOUND' },
                { status: 403 }
            ),
        };
    }

    // 3. User 프로필 조회
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', link.user_id)
        .single();

    if (userError || !user) {
        return {
            authenticated: false,
            response: NextResponse.json(
                { error: '사용자 정보를 조회할 수 없습니다.', code: 'USER_NOT_FOUND' },
                { status: 403 }
            ),
        };
    }

    // 4. 관리자 권한 검사
    if (options?.requireAdmin) {
        const isAdmin = user.role === 'SYSTEM_ADMIN' || user.role === 'ADMIN';
        if (!isAdmin) {
            return {
                authenticated: false,
                response: NextResponse.json(
                    { error: '관리자 권한이 필요합니다.', code: 'FORBIDDEN' },
                    { status: 403 }
                ),
            };
        }
    }

    // 5. 조합 접근 권한 검사
    if (options?.requireUnionId && options?.unionId) {
        const hasAccess = user.role === 'SYSTEM_ADMIN' || user.union_id === options.unionId;

        if (!hasAccess) {
            return {
                authenticated: false,
                response: NextResponse.json(
                    { error: '해당 조합에 대한 접근 권한이 없습니다.', code: 'UNION_ACCESS_DENIED' },
                    { status: 403 }
                ),
            };
        }
    }

    return {
        authenticated: true,
        user: user as User,
        authUserId: authUser.id,
    };
}

/**
 * 간소화된 인증 검사 (Service Role 사용하는 API용)
 * Service Role Key를 사용하는 내부 API에서 사용
 */
export async function authenticateServiceRequest(request: NextRequest): Promise<AuthResult> {
    // 내부 서비스 호출 확인 (프록시 서버 등)
    const internalApiKey = request.headers.get('x-internal-api-key');
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (internalApiKey && expectedKey && internalApiKey === expectedKey) {
        // 내부 서비스 호출은 시스템 권한 부여
        return {
            authenticated: true,
            user: {
                id: 'system',
                name: 'Internal Service',
                role: 'SYSTEM_ADMIN',
            } as User,
            authUserId: 'system',
        };
    }

    // 일반 사용자 인증으로 폴백
    return authenticateApiRequest();
}
