import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AccessToken } from '@/app/_lib/shared/type/accessToken.types';

/**
 * [DEV ONLY] localhost 환경인지 확인하는 유틸리티 함수
 * production 환경에서는 절대 true를 반환하지 않음
 */
function isLocalhostRequest(request: NextRequest): boolean {
    // development 환경에서만 작동
    if (process.env.NODE_ENV !== 'development') return false;

    const host = request.headers.get('host') || '';
    return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

/**
 * 공개 경로 목록 (인증 없이 접근 가능)
 */
const PUBLIC_PATHS = [
    '/', // 메인 랜딩 페이지
    '/contact',
    '/privacy',
    '/terms',
    '/auth',
    '/invite',
    '/member-invite',
    '/swagger',
];

/**
 * 시스템 관리자 공개 경로
 */
const SYSTEM_ADMIN_PUBLIC_PATHS = ['/systemAdmin/login'];

/**
 * 경로가 공개 경로인지 확인
 */
function isPublicPath(pathname: string): boolean {
    // 정확히 일치하거나 해당 경로로 시작하는 경우
    return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * 시스템 관리자 경로인지 확인
 */
function isSystemAdminPath(pathname: string): boolean {
    return pathname.startsWith('/systemAdmin');
}

/**
 * 시스템 관리자 공개 경로인지 확인
 */
function isSystemAdminPublicPath(pathname: string): boolean {
    return SYSTEM_ADMIN_PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * 조합 페이지 경로에서 slug 추출
 * 예: /test-union/dashboard -> test-union
 */
function extractSlugFromPath(pathname: string): string | null {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const firstSegment = segments[0];

    // 공개 경로의 첫 번째 세그먼트는 slug가 아님
    const nonSlugPrefixes = [
        'systemAdmin',
        'admin',
        'auth',
        'api',
        'invite',
        'member-invite',
        'contact',
        'privacy',
        'terms',
        'swagger',
    ];

    if (nonSlugPrefixes.includes(firstSegment)) {
        return null;
    }

    return firstSegment;
}

/**
 * 조합 페이지의 랜딩 페이지인지 확인 (로그인 페이지 역할)
 * 예: /test-union (하위 경로 없음)
 */
function isUnionLandingPage(pathname: string): boolean {
    const slug = extractSlugFromPath(pathname);
    if (!slug) return false;

    // /[slug] 정확히 일치하거나 /[slug]/ 만 있는 경우
    return pathname === `/${slug}` || pathname === `/${slug}/`;
}

/**
 * 조합 페이지의 회원가입 페이지인지 확인
 * 예: /test-union/register
 */
function isUnionRegisterPage(pathname: string): boolean {
    const slug = extractSlugFromPath(pathname);
    if (!slug) return false;

    return pathname === `/${slug}/register` || pathname === `/${slug}/register/`;
}

/**
 * 접근 토큰 유효성 확인 (사용 횟수를 증가시키지 않음)
 * guest_access 쿠키 검증 등 non-consuming 체크에 사용
 */
async function checkAccessTokenValidity(
    supabase: ReturnType<typeof createServerClient>,
    tokenKey: string
): Promise<{ valid: boolean; token?: AccessToken; reason?: string }> {
    try {
        const { data: token, error } = await supabase
            .from('access_tokens')
            .select('*')
            .eq('key', tokenKey)
            .single();

        if (error || !token) {
            return { valid: false, reason: 'not_found' };
        }

        if (token.deleted_at) {
            return { valid: false, reason: 'deleted' };
        }

        if (token.expires_at) {
            const expiresAt = new Date(token.expires_at);
            if (expiresAt < new Date()) {
                return { valid: false, reason: 'expired' };
            }
        }

        return { valid: true, token };
    } catch {
        return { valid: false, reason: 'error' };
    }
}

/**
 * Next.js Middleware용 세션 업데이트 함수
 *
 * 이 함수는 다음 기능을 수행합니다:
 * 1. Supabase Auth 토큰을 자동으로 갱신 (만료 전)
 * 2. 쿠키를 request와 response 간에 동기화
 * 3. PKCE 흐름에서 code_verifier 쿠키가 올바르게 전달되도록 보장
 * 4. 보호된 경로에 대한 인증 검사 및 리다이렉트
 *
 * @param request - Next.js request 객체
 * @returns NextResponse 객체
 */
export async function updateSession(request: NextRequest) {
    // CSRF 검증: 상태 변경 요청에 대해 Origin 헤더 확인
    const method = request.method;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (!isLocalhostRequest(request)) {
            const origin = request.headers.get('origin');
            const host = request.headers.get('host');

            if (!origin) {
                return NextResponse.json(
                    { error: 'Origin header required' },
                    { status: 403 }
                );
            }

            if (!host) {
                return NextResponse.json(
                    { error: 'Host header required' },
                    { status: 403 }
                );
            }

            try {
                const originHost = new URL(origin).host;
                if (originHost !== host) {
                    return NextResponse.json(
                        { error: 'CSRF validation failed' },
                        { status: 403 }
                    );
                }
            } catch {
                return NextResponse.json(
                    { error: 'Invalid origin header' },
                    { status: 403 }
                );
            }
        }
    }

    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // 먼저 request에 쿠키 설정 (Server Component에서 읽을 수 있도록)
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

                    // 새로운 response 생성
                    supabaseResponse = NextResponse.next({
                        request,
                    });

                    // response에 쿠키 설정 (브라우저로 전송되도록)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // 중요: createServerClient와 supabase.auth.getUser() 사이에 다른 코드를 넣지 마세요.
    // 간단한 실수가 사용자가 무작위로 로그아웃되는 문제를 디버깅하기 어렵게 만들 수 있습니다.

    // Auth 토큰을 갱신하고 세션을 유효성 검사
    // getUser()는 매번 Supabase Auth 서버에 요청을 보내 토큰을 재검증합니다.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const tokenKey = request.nextUrl.searchParams.get('tokenKey');

    // 0. tokenKey가 있으면 토큰 기반 접근 처리
    if (tokenKey) {
        // First check token exists and get its metadata (no increment)
        const tokenCheck = await checkAccessTokenValidity(supabase, tokenKey);
        if (!tokenCheck.valid || !tokenCheck.token) {
            const redirectUrl = new URL('/invalid-token', request.url);
            redirectUrl.searchParams.set('reason', tokenCheck.reason || 'invalid');
            return NextResponse.redirect(redirectUrl);
        }

        // Union scope check (before consuming a use)
        if (tokenCheck.token.union_id) {
            const slug = extractSlugFromPath(pathname);
            if (slug) {
                const { data: union } = await supabase
                    .from('unions')
                    .select('id')
                    .eq('slug', slug)
                    .single();

                if (!union || union.id !== tokenCheck.token.union_id) {
                    const redirectUrl = new URL('/invalid-token', request.url);
                    redirectUrl.searchParams.set('reason', 'wrong_union');
                    return NextResponse.redirect(redirectUrl);
                }
            }
        }

        // Atomic: check usage + increment + log in single RPC
        const ip = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') || '0.0.0.0';
        const userAgent = request.headers.get('user-agent') || null;
        const { data: rpcResult, error: rpcError } = await supabase.rpc('use_access_token', {
            p_token_id: tokenCheck.token.id,
            p_accessed_path: pathname,
            p_ip_address: ip,
            p_user_agent: userAgent,
        });

        if (rpcError || !rpcResult?.[0]?.success) {
            const redirectUrl = new URL('/invalid-token', request.url);
            redirectUrl.searchParams.set('reason', 'max_usage_reached');
            return NextResponse.redirect(redirectUrl);
        }

        // guest_access 쿠키 설정
        supabaseResponse.cookies.set('guest_access', tokenKey, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24시간
        });

        // Strip tokenKey from URL to prevent it persisting in browser history
        const cleanUrl = new URL(request.url);
        cleanUrl.searchParams.delete('tokenKey');
        if (cleanUrl.toString() !== request.url) {
            const redirectResponse = NextResponse.redirect(cleanUrl);
            redirectResponse.cookies.set('guest_access', tokenKey, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24,
            });
            return redirectResponse;
        }

        return supabaseResponse;
    }

    // guest_access 쿠키가 있으면 인증 없이 통과 (조합 페이지만)
    const guestAccessCookie = request.cookies.get('guest_access');
    if (guestAccessCookie && extractSlugFromPath(pathname)) {
        // 쿠키의 토큰이 아직 유효한지 확인
        const validation = await checkAccessTokenValidity(supabase, guestAccessCookie.value);
        if (validation.valid) {
            return supabaseResponse;
        } else {
            // 쿠키 삭제
            supabaseResponse.cookies.delete('guest_access');
        }
    }

    // 1. 공개 경로는 인증 검사 없이 통과
    if (isPublicPath(pathname)) {
        return supabaseResponse;
    }

    // [DEV ONLY] localhost 환경에서는 인증 체크 스킵
    if (isLocalhostRequest(request)) {
        return supabaseResponse;
    }

    // 2. 시스템 관리자 경로 처리
    if (isSystemAdminPath(pathname)) {
        // 시스템 관리자 로그인 페이지는 통과
        if (isSystemAdminPublicPath(pathname)) {
            return supabaseResponse;
        }

        // 미인증 시 시스템 관리자 로그인 페이지로 리다이렉트
        if (!user) {
            const redirectUrl = new URL('/systemAdmin/login', request.url);
            redirectUrl.searchParams.set('redirectTo', pathname);
            return NextResponse.redirect(redirectUrl);
        }

        return supabaseResponse;
    }

    // 3. 조합 페이지 처리
    const slug = extractSlugFromPath(pathname);
    if (slug) {
        // 조합 랜딩 페이지 (로그인 페이지)는 통과
        if (isUnionLandingPage(pathname)) {
            return supabaseResponse;
        }

        // 조합 회원가입 페이지는 통과
        if (isUnionRegisterPage(pathname)) {
            return supabaseResponse;
        }

        // 조합 하위 경로는 인증 필요
        if (!user) {
            // 미인증 시 해당 조합의 랜딩 페이지로 리다이렉트
            const redirectUrl = new URL(`/${slug}`, request.url);
            if (pathname.startsWith(`/${slug}/`) && !pathname.includes('://')) {
                redirectUrl.searchParams.set('redirectTo', pathname);
            }
            return NextResponse.redirect(redirectUrl);
        }

        // Admin path authorization check
        if (pathname.includes(`/${slug}/admin/`) || pathname === `/${slug}/admin`) {
            const { data: link } = await supabase
                .from('user_auth_links')
                .select('user_id')
                .eq('auth_user_id', user.id)
                .single();

            if (link) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', link.user_id)
                    .single();

                const isAdminUser = userData?.role === 'ADMIN' ||
                                    userData?.role === 'SUPER_ADMIN' ||
                                    userData?.role === 'SYSTEM_ADMIN';
                if (!isAdminUser) {
                    const redirectUrl = new URL(`/${slug}`, request.url);
                    return NextResponse.redirect(redirectUrl);
                }
            } else {
                const redirectUrl = new URL(`/${slug}`, request.url);
                return NextResponse.redirect(redirectUrl);
            }
        }
    }

    // 중요: supabaseResponse 객체를 그대로 반환해야 합니다.
    // NextResponse.next()로 새 response를 생성하는 경우:
    // 1. request를 전달해야 합니다: const myNewResponse = NextResponse.next({ request })
    // 2. 쿠키를 복사해야 합니다: myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. 쿠키를 변경하지 않고 myNewResponse 객체를 수정할 수 있습니다
    // 4. 최종적으로 myNewResponse를 반환합니다
    // 이렇게 하지 않으면 브라우저와 서버가 동기화되지 않아 사용자 세션이 조기에 종료될 수 있습니다!

    return supabaseResponse;
}
