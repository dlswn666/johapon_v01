import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * OAuth 콜백 핸들러 (카카오)
 * Supabase Auth의 OAuth 인증 완료 후 호출됨
 *
 * 1. Authorization code를 세션으로 교환 (PKCE 흐름 - code_verifier 쿠키 사용)
 * 2. auth.users에서 사용자 정보 조회
 * 3. user_auth_links에서 연결된 public.users 조회
 * 4. invite_token이 있으면 관리자로 자동 등록
 * 5. user_status에 따라 적절한 페이지로 리다이렉트
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const slug = searchParams.get('slug') ?? '';
    const inviteToken = searchParams.get('invite_token');
    const memberInviteToken = searchParams.get('member_invite_token');

    if (!code) {
        console.error('OAuth callback: No code provided');
        return NextResponse.redirect(`${origin}/auth/error?message=no_code`);
    }

    // Next.js 쿠키 스토어 가져오기
    const cookieStore = await cookies();

    // Supabase 서버 클라이언트 생성 (PKCE를 위한 쿠키 핸들링)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // setAll이 Server Component에서 호출될 경우 무시
                        // 이 경우는 middleware에서 세션 갱신이 처리됨
                    }
                },
            },
        }
    );

    // Authorization code를 세션으로 교환 (PKCE: 쿠키에서 code_verifier 자동 읽기)
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.session) {
        console.error('OAuth callback: Session exchange failed', sessionError);
        return NextResponse.redirect(`${origin}/auth/error?message=session_error`);
    }

    const authUser = sessionData.session.user;
    const provider = authUser.app_metadata.provider as 'kakao' | 'naver';

    console.log('OAuth callback: Auth user', {
        id: authUser.id,
        email: authUser.email,
        provider,
    });

    // user_auth_links에서 이미 연결된 public.users가 있는지 확인
    const { data: authLink } = await supabase
        .from('user_auth_links')
        .select('user_id')
        .eq('auth_user_id', authUser.id)
        .single();

    if (authLink) {
        // 기존 연결된 사용자가 있음 - 해당 사용자의 상태에 따라 리다이렉트
        const { data: existingUser } = await supabase.from('users').select('*').eq('id', authLink.user_id).single();

        if (existingUser) {
            const redirectUrl = getRedirectByUserStatus(origin, slug, existingUser.user_status);
            return NextResponse.redirect(redirectUrl);
        }
    }

    // 초대 토큰이 있는 경우 - prefill 데이터를 쿠키에 저장하고 메인 페이지로 이동
    if (inviteToken) {
        const result = await handleAdminInvitePrefill(supabase, inviteToken, origin, slug);
        if (result) {
            const response = NextResponse.redirect(result.redirectUrl);
            // prefill 데이터를 쿠키에 저장
            response.cookies.set('register-prefill', JSON.stringify(result.prefillData), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60, // 1시간
            });
            return response;
        }
    }

    // 조합원 초대 토큰이 있는 경우 - prefill 데이터를 쿠키에 저장하고 메인 페이지로 이동
    if (memberInviteToken) {
        const result = await handleMemberInvitePrefill(supabase, memberInviteToken, origin, slug);
        if (result) {
            const response = NextResponse.redirect(result.redirectUrl);
            // prefill 데이터를 쿠키에 저장
            response.cookies.set('register-prefill', JSON.stringify(result.prefillData), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60, // 1시간
            });
            return response;
        }
    }

    // 연결된 사용자가 없음 - 메인 페이지로 이동 (회원가입 모달이 자동으로 표시됨)
    // 신규 사용자는 프로필 입력이 필요함
    const mainPageUrl = slug ? `${origin}/${slug}` : origin;
    return NextResponse.redirect(mainPageUrl);
}

/**
 * 관리자 초대 prefill 데이터 처리 (자동 계정 생성 대신 prefill 데이터만 반환)
 */
async function handleAdminInvitePrefill(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    inviteToken: string,
    origin: string,
    slug: string
): Promise<{ redirectUrl: string; prefillData: object } | null> {
    try {
        // 초대 정보 조회
        const { data: invite, error: inviteError } = await supabase
            .from('admin_invites')
            .select('*, union:unions(id, name, slug)')
            .eq('invite_token', inviteToken)
            .eq('status', 'PENDING')
            .single();

        if (inviteError || !invite) {
            console.error('Invalid invite token:', inviteToken);
            return null;
        }

        // 만료 여부 확인
        const now = new Date();
        const expiresAt = new Date(invite.expires_at);
        if (now > expiresAt) {
            console.error('Invite token expired:', inviteToken);
            await supabase.from('admin_invites').update({ status: 'EXPIRED' }).eq('id', invite.id);
            return null;
        }

        const unionSlug = invite.union?.slug || slug;
        const mainPageUrl = unionSlug ? `${origin}/${unionSlug}` : origin;

        return {
            redirectUrl: mainPageUrl,
            prefillData: {
                name: invite.name || '',
                phone_number: invite.phone_number || '',
                property_address: '',
                invite_type: 'admin',
                invite_token: inviteToken,
            },
        };
    } catch (error) {
        console.error('Error handling admin invite prefill:', error);
        return null;
    }
}

/**
 * 조합원 초대 prefill 데이터 처리 (자동 계정 생성 대신 prefill 데이터만 반환)
 */
async function handleMemberInvitePrefill(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    memberInviteToken: string,
    origin: string,
    slug: string
): Promise<{ redirectUrl: string; prefillData: object } | null> {
    try {
        // 초대 정보 조회
        const { data: invite, error: inviteError } = await supabase
            .from('member_invites')
            .select('*, union:unions(id, name, slug)')
            .eq('invite_token', memberInviteToken)
            .eq('status', 'PENDING')
            .single();

        if (inviteError || !invite) {
            console.error('Invalid member invite token:', memberInviteToken);
            return null;
        }

        // 만료 여부 확인
        const now = new Date();
        const expiresAt = new Date(invite.expires_at);
        if (now > expiresAt) {
            console.error('Member invite token expired:', memberInviteToken);
            await supabase.from('member_invites').update({ status: 'EXPIRED' }).eq('id', invite.id);
            return null;
        }

        const unionSlug = invite.union?.slug || slug;
        const mainPageUrl = unionSlug ? `${origin}/${unionSlug}` : origin;

        return {
            redirectUrl: mainPageUrl,
            prefillData: {
                name: invite.name || '',
                phone_number: invite.phone_number || '',
                property_address: invite.property_address || '',
                invite_type: 'member',
                invite_token: memberInviteToken,
            },
        };
    } catch (error) {
        console.error('Error handling member invite prefill:', error);
        return null;
    }
}

/**
 * 사용자 상태에 따른 리다이렉트 URL 반환
 */
function getRedirectByUserStatus(origin: string, slug: string, userStatus: string): string {
    const basePath = slug ? `${origin}/${slug}` : origin;

    switch (userStatus) {
        case 'PENDING_PROFILE':
            // 프로필 입력이 필요한 경우 - 메인 페이지로 이동 (모달이 자동으로 열림)
            return basePath;
        case 'PENDING_APPROVAL':
            // 승인 대기 중
            return `${basePath}?status=pending`;
        case 'APPROVED':
            // 승인됨 - 홈으로
            return basePath;
        case 'REJECTED':
            // 거부됨
            return `${basePath}?status=rejected`;
        default:
            return basePath;
    }
}
