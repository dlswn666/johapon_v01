import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

interface NaverUserResponse {
    resultcode: string;
    message: string;
    response: {
        id: string;
        email?: string;
        name?: string;
        nickname?: string;
        profile_image?: string;
        mobile?: string;
        mobile_e164?: string;
        birthday?: string;
        birthyear?: string;
    };
}

/**
 * 네이버 OAuth 콜백 핸들러
 *
 * 1. Authorization code로 액세스 토큰 발급
 * 2. 액세스 토큰으로 사용자 정보 조회
 * 3. Supabase에 사용자 생성/로그인 처리
 * 4. user_status에 따라 적절한 페이지로 리다이렉트
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 에러 체크
    if (error) {
        console.error('Naver OAuth callback error:', error);
        return NextResponse.redirect(`${origin}/auth/error?message=naver_auth_error`);
    }

    if (!code) {
        console.error('Naver OAuth callback: No code provided');
        return NextResponse.redirect(`${origin}/auth/error?message=no_code`);
    }

    // state 파싱
    let slug = '';
    if (state) {
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            slug = stateData.slug || '';
        } catch (e) {
            console.warn('Failed to parse state:', e);
        }
    }

    const clientId = process.env.NAVER_CLIENT_ID!;
    const clientSecret = process.env.NAVER_CLIENT_SECRET!;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 1. 액세스 토큰 발급
    const tokenUrl = new URL('https://nid.naver.com/oauth2.0/token');
    tokenUrl.searchParams.set('grant_type', 'authorization_code');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('state', state || '');

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
        console.error('Naver token error:', tokenData);
        return NextResponse.redirect(`${origin}/auth/error?message=token_error`);
    }

    const accessToken = tokenData.access_token;

    // 2. 사용자 정보 조회
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const userData: NaverUserResponse = await userResponse.json();

    if (userData.resultcode !== '00') {
        console.error('Naver user info error:', userData);
        return NextResponse.redirect(`${origin}/auth/error?message=user_info_error`);
    }

    const naverUser = userData.response;

    console.log('Naver user info:', {
        id: naverUser.id,
        email: naverUser.email,
        name: naverUser.name,
    });

    // 3. Supabase Admin 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // 4. auth.users에서 네이버 ID로 사용자 조회 또는 생성
    // 네이버는 Supabase 공식 지원이 아니므로 이메일 기반으로 처리
    const email = naverUser.email || `naver_${naverUser.id}@naver.placeholder`;

    // 기존 auth.users 조회
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(
        (u) => u.email === email || u.user_metadata?.naver_id === naverUser.id
    );

    let authUserId: string;

    if (existingAuthUser) {
        authUserId = existingAuthUser.id;
    } else {
        // 새 auth.users 생성
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
                naver_id: naverUser.id,
                name: naverUser.name,
                nickname: naverUser.nickname,
                avatar_url: naverUser.profile_image,
                provider: 'naver',
            },
        });

        if (createError || !newAuthUser.user) {
            console.error('Failed to create auth user:', createError);
            return NextResponse.redirect(`${origin}/auth/error?message=create_user_error`);
        }

        authUserId = newAuthUser.user.id;
    }

    // 5. user_auth_links에서 연결된 public.users 조회
    const { data: authLink } = await supabaseAdmin
        .from('user_auth_links')
        .select('user_id')
        .eq('auth_user_id', authUserId)
        .single();

    // 6. 세션 토큰 생성
    await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
    });

    // 세션 생성을 위한 대체 방법 - signInWithPassword 사용 불가하므로 쿠키에 사용자 정보 저장
    // 실제 운영 환경에서는 JWT 토큰 생성 권장

    if (authLink) {
        // 기존 연결된 사용자가 있음
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', authLink.user_id)
            .single();

        if (existingUser) {
            const redirectUrl = getRedirectByUserStatus(baseUrl, slug, existingUser.user_status);
            const response = NextResponse.redirect(redirectUrl);

            // 사용자 정보를 쿠키에 저장 (임시)
            response.cookies.set('naver-auth-user-id', authUserId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });
            response.cookies.set('naver-user-id', authLink.user_id, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });

            return response;
        }
    }

    // 7. 연결된 사용자가 없음 - 메인 페이지로 이동 (회원가입 모달이 자동으로 표시됨)
    const mainPageUrl = slug ? `${baseUrl}/${slug}` : baseUrl;
    const response = NextResponse.redirect(mainPageUrl);

    // 네이버 인증 정보를 쿠키에 저장 (회원가입 폼에서 사용)
    response.cookies.set('naver-auth-user-id', authUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1시간 (회원가입 완료까지의 시간)
    });

    // prefill 데이터를 쿠키에 저장
    const prefillData = {
        name: naverUser.name || '',
        phone_number: naverUser.mobile || '',
        provider: 'naver',
    };
    response.cookies.set('register-prefill', JSON.stringify(prefillData), {
        httpOnly: false, // 클라이언트에서 읽을 수 있도록
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1시간
    });

    return response;
}

/**
 * 사용자 상태에 따른 리다이렉트 URL 반환
 */
function getRedirectByUserStatus(baseUrl: string, slug: string, userStatus: string): string {
    const basePath = slug ? `${baseUrl}/${slug}` : baseUrl;

    switch (userStatus) {
        case 'PENDING_PROFILE':
            // 프로필 입력이 필요한 경우 - 메인 페이지로 이동 (모달이 자동으로 열림)
            return basePath;
        case 'PENDING_APPROVAL':
            return `${basePath}?status=pending`;
        case 'APPROVED':
            return basePath;
        case 'REJECTED':
            return `${basePath}?status=rejected`;
        default:
            return basePath;
    }
}



