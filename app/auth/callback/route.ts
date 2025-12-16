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

    // [DEBUG] OAuth 콜백 시작
    console.log('='.repeat(60));
    console.log('[DEBUG] 🔄 OAuth Callback 시작');
    console.log('='.repeat(60));
    console.log('[DEBUG] Full URL:', request.url);
    console.log('[DEBUG] code:', code ? `${code.substring(0, 20)}...` : 'null');
    console.log('[DEBUG] slug:', slug || '(empty)');
    console.log('[DEBUG] inviteToken:', inviteToken || 'null');
    console.log('[DEBUG] memberInviteToken:', memberInviteToken || 'null');

    if (!code) {
        console.error('[DEBUG] ❌ No code provided');
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
    console.log('[DEBUG] 세션 교환 시작...');
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.session) {
        console.error('[DEBUG] ❌ Session exchange failed:', sessionError);
        return NextResponse.redirect(`${origin}/auth/error?message=session_error`);
    }

    const authUser = sessionData.session.user;
    const provider = authUser.app_metadata.provider as 'kakao' | 'naver';

    // [DEBUG] 세션 교환 성공 - 상세 정보
    console.log('[DEBUG] ✅ 세션 교환 성공');
    console.log('[DEBUG] authUser 상세:', {
        id: authUser.id,
        email: authUser.email,
        provider: provider,
        app_metadata: authUser.app_metadata,
        user_metadata: authUser.user_metadata,
        identities: authUser.identities?.map((i) => ({
            provider: i.provider,
            id: i.id,
            identity_id: i.identity_id,
        })),
    });

    // user_auth_links에서 이미 연결된 public.users가 있는지 확인
    console.log('[DEBUG] user_auth_links 조회 중... (auth_user_id:', authUser.id, ')');
    const { data: authLink, error: authLinkError } = await supabase
        .from('user_auth_links')
        .select('user_id')
        .eq('auth_user_id', authUser.id)
        .single();

    console.log('[DEBUG] user_auth_links 조회 결과:', {
        authLink: authLink || 'null',
        authLinkError: authLinkError?.message || 'null',
    });

    if (authLink) {
        console.log('[DEBUG] ⚠️ 기존 연결된 사용자 발견! user_id:', authLink.user_id);

        // 기존 연결된 사용자가 있음 - 해당 사용자의 상태에 따라 리다이렉트
        // unions 테이블을 JOIN하여 사용자의 조합 slug 정보도 함께 조회
        const { data: existingUser } = await supabase
            .from('users')
            .select('*, union:unions(id, slug)')
            .eq('id', authLink.user_id)
            .single();

        if (existingUser) {
            // 사용자의 조합 slug를 우선 사용, 없으면 URL의 slug 사용
            const userUnionSlug = existingUser.union?.slug || '';
            const redirectUrl = getRedirectByUserStatus(origin, slug, existingUser.user_status, userUnionSlug);
            console.log('[DEBUG] 기존 사용자 리다이렉트:', {
                userId: existingUser.id,
                name: existingUser.name,
                role: existingUser.role,
                userStatus: existingUser.user_status,
                redirectUrl,
            });
            console.log('='.repeat(60));
            return NextResponse.redirect(redirectUrl);
        }
    }

    // 초대 토큰이 있는 경우 - prefill 데이터를 쿠키에 저장하고 메인 페이지로 이동
    console.log('[DEBUG] inviteToken 체크:', !!inviteToken);
    if (inviteToken) {
        console.log('[DEBUG] ✅ inviteToken 있음, handleAdminInvitePrefill 호출...');
        const result = await handleAdminInvitePrefill(supabase, inviteToken, origin, slug);
        console.log('[DEBUG] handleAdminInvitePrefill 결과:', result ? 'success' : 'null');

        if (result) {
            console.log('[DEBUG] prefill 데이터:', result.prefillData);
            console.log('[DEBUG] 리다이렉트 URL:', result.redirectUrl);

            const response = NextResponse.redirect(result.redirectUrl);
            // prefill 데이터를 쿠키에 저장
            response.cookies.set('register-prefill', JSON.stringify(result.prefillData), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60, // 1시간
            });
            console.log('[DEBUG] ✅ register-prefill 쿠키 설정 완료');
            console.log('='.repeat(60));
            return response;
        }
    }

    // 조합원 초대 토큰이 있는 경우 - prefill 데이터를 쿠키에 저장하고 메인 페이지로 이동
    if (memberInviteToken) {
        console.log('[DEBUG] ✅ memberInviteToken 있음, handleMemberInvitePrefill 호출...');
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
            console.log('[DEBUG] ✅ register-prefill 쿠키 설정 완료 (member)');
            console.log('='.repeat(60));
            return response;
        }
    }

    // 연결된 사용자가 없음 - 메인 페이지로 이동 (회원가입 모달이 자동으로 표시됨)
    // 신규 사용자는 프로필 입력이 필요함
    const mainPageUrl = slug ? `${origin}/${slug}` : origin;
    console.log('[DEBUG] 신규 사용자 - 메인 페이지로 이동:', mainPageUrl);
    console.log('[DEBUG] (회원가입 모달이 자동으로 표시될 예정)');
    console.log('='.repeat(60));
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
    console.log('[DEBUG] === handleAdminInvitePrefill 함수 진입 ===');
    console.log('[DEBUG] inviteToken:', inviteToken);
    console.log('[DEBUG] origin:', origin);
    console.log('[DEBUG] slug:', slug);

    try {
        // 초대 정보 조회
        console.log('[DEBUG] admin_invites 테이블에서 초대 정보 조회 중...');
        const { data: invite, error: inviteError } = await supabase
            .from('admin_invites')
            .select('*, union:unions(id, name, slug)')
            .eq('invite_token', inviteToken)
            .eq('status', 'PENDING')
            .single();

        console.log('[DEBUG] 초대 조회 결과:', {
            invite: invite
                ? { id: invite.id, name: invite.name, status: invite.status, union_slug: invite.union?.slug }
                : 'null',
            inviteError: inviteError?.message || 'null',
        });

        if (inviteError || !invite) {
            console.error('[DEBUG] ❌ Invalid invite token:', inviteToken);
            return null;
        }

        // 만료 여부 확인
        const now = new Date();
        const expiresAt = new Date(invite.expires_at);
        console.log('[DEBUG] 만료 체크:', {
            now: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            isExpired: now > expiresAt,
        });

        if (now > expiresAt) {
            console.error('[DEBUG] ❌ Invite token expired:', inviteToken);
            await supabase.from('admin_invites').update({ status: 'EXPIRED' }).eq('id', invite.id);
            return null;
        }

        const unionSlug = invite.union?.slug || slug;
        const mainPageUrl = unionSlug ? `${origin}/${unionSlug}` : origin;

        console.log('[DEBUG] ✅ 초대 정보 유효! prefill 데이터 반환');
        console.log('[DEBUG] unionSlug:', unionSlug);
        console.log('[DEBUG] mainPageUrl:', mainPageUrl);

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
        console.error('[DEBUG] ❌ Error handling admin invite prefill:', error);
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
 * @param origin - 기본 origin URL
 * @param urlSlug - URL 파라미터에서 전달받은 slug
 * @param userStatus - 사용자 상태
 * @param unionSlug - 사용자가 소속된 조합의 slug (선택)
 */
function getRedirectByUserStatus(origin: string, urlSlug: string, userStatus: string, unionSlug?: string): string {
    // APPROVED 상태일 때는 사용자의 조합 slug를 우선 사용
    // 그 외 상태에서는 URL slug 사용 (회원가입 플로우 등)
    const effectiveSlug = userStatus === 'APPROVED' && unionSlug ? unionSlug : urlSlug;
    const basePath = effectiveSlug ? `${origin}/${effectiveSlug}` : origin;

    switch (userStatus) {
        case 'PENDING_PROFILE':
            // 프로필 입력이 필요한 경우 - 메인 페이지로 이동 (모달이 자동으로 열림)
            return basePath;
        case 'PENDING_APPROVAL':
            // 승인 대기 중
            return `${basePath}?status=pending`;
        case 'APPROVED':
            // 승인됨 - 사용자의 조합 홈으로 이동
            return basePath;
        case 'REJECTED':
            // 거부됨
            return `${basePath}?status=rejected`;
        default:
            return basePath;
    }
}
