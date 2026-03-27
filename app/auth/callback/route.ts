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
        const errorRedirect = slug ? `${origin}/${slug}?auth_error=no_code` : `${origin}?auth_error=no_code`;
        return NextResponse.redirect(errorRedirect);
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
        console.error('[auth/callback] Session exchange failed:', sessionError?.message);
        const errorRedirect = slug ? `${origin}/${slug}?auth_error=session_error` : `${origin}?auth_error=session_error`;
        return NextResponse.redirect(errorRedirect);
    }

    const authUser = sessionData.session.user;

    // 현재 접근 중인 조합(slug)의 union_id 조회
    let currentUnionId: string | null = null;
    if (slug) {
        const { data: currentUnion } = await supabase.from('unions').select('id').eq('slug', slug).single();
        currentUnionId = currentUnion?.id || null;
    }

    // 해당 조합에 대한 멤버십 확인 (auth_user_id + union_id)
    interface ExistingUserType {
        id: string;
        name: string;
        role: string;
        user_status: string;
        union_id: string | null;
        union?: { id: string; slug: string } | null;
    }
    let existingUser: ExistingUserType | null = null;

    if (currentUnionId) {
        // 먼저 auth_user_id로 연결된 user_ids 조회
        const { data: authLinks } = await supabase
            .from('user_auth_links')
            .select('user_id')
            .eq('auth_user_id', authUser.id);

        if (authLinks && authLinks.length > 0) {
            const userIds = authLinks.map((link) => link.user_id);
            // 해당 조합에 속한 user 조회
            const { data: userData } = await supabase
                .from('users')
                .select('id, name, role, user_status, union_id, union:unions(id, slug)')
                .in('id', userIds)
                .eq('union_id', currentUnionId)
                .single();

            if (userData) {
                existingUser = {
                    id: userData.id,
                    name: userData.name,
                    role: userData.role,
                    user_status: userData.user_status,
                    union_id: userData.union_id,
                    union: Array.isArray(userData.union) ? userData.union[0] : userData.union,
                };
            }
        }
    }

    // 관리자 초대 토큰이 있는 경우 - existingUser 체크보다 우선 처리
    // (이미 다른 조합에 가입되어 있어도 새 조합 ADMIN으로 등록)
    if (inviteToken) {
        const result = await handleAdminInviteAutoRegister(supabase, inviteToken, authUser.id, origin);

        if (result) {
            return NextResponse.redirect(result.redirectUrl);
        } else {
            const errorRedirect = slug
                ? `${origin}/${slug}?invite_error=expired`
                : `${origin}?invite_error=expired`;
            return NextResponse.redirect(errorRedirect);
        }
    }

    // 해당 조합에 이미 가입됨 - 사용자 상태에 따라 리다이렉트
    if (existingUser) {
        const userUnionSlug = existingUser.union?.slug || slug;
        const redirectUrl = getRedirectByUserStatus(origin, slug, existingUser.user_status, userUnionSlug);
        return NextResponse.redirect(redirectUrl);
    }

    // 조합원 초대 토큰이 있는 경우 - prefill 데이터를 쿠키에 저장하고 메인 페이지로 이동
    if (memberInviteToken) {
        const result = await handleMemberInvitePrefill(supabase, memberInviteToken, origin, slug);
        if (result) {
            const response = NextResponse.redirect(result.redirectUrl);
            response.cookies.set('register-prefill', JSON.stringify(result.prefillData), {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60, // 1시간
            });
            return response;
        } else {
            // 초대 토큰이 유효하지 않거나 만료됨
            const errorRedirect = slug
                ? `${origin}/${slug}?invite_error=expired`
                : `${origin}?invite_error=expired`;
            return NextResponse.redirect(errorRedirect);
        }
    }

    // 연결된 사용자가 없음 - 메인 페이지로 이동 (회원가입 모달이 자동으로 표시됨)
    const mainPageUrl = slug ? `${origin}/${slug}` : origin;
    return NextResponse.redirect(mainPageUrl);
}

/**
 * 관리자 초대 자동 등록 처리
 * 카카오 로그인 후 바로 ADMIN 계정 생성 → 관리자 페이지로 이동
 */
async function handleAdminInviteAutoRegister(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    inviteToken: string,
    authUserId: string,
    origin: string
): Promise<{ redirectUrl: string } | null> {
    try {
        // 1. 초대 정보 조회
        const { data: invite, error: inviteError } = await supabase
            .from('admin_invites')
            .select('*, union:unions(id, name, slug)')
            .eq('invite_token', inviteToken)
            .eq('status', 'PENDING')
            .single();

        if (inviteError || !invite) {
            console.error('[auth/callback] Admin invite not found or not PENDING:', inviteToken);
            return null;
        }

        // 2. 만료 여부 확인
        const now = new Date();
        const expiresAt = new Date(invite.expires_at);
        if (now > expiresAt) {
            await supabase.from('admin_invites').update({ status: 'EXPIRED' }).eq('id', invite.id);
            return null;
        }

        const unionId = invite.union_id;
        const unionSlug = invite.union?.slug || '';

        // 3. 이미 해당 조합에 user가 있는지 확인
        const { data: existingLinks } = await supabase
            .from('user_auth_links')
            .select('user_id')
            .eq('auth_user_id', authUserId);

        let existingUserId: string | null = null;
        if (existingLinks && existingLinks.length > 0) {
            const userIds = existingLinks.map((l: { user_id: string }) => l.user_id);
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .in('id', userIds)
                .eq('union_id', unionId)
                .single();

            if (existingUser) {
                existingUserId = existingUser.id;
            }
        }

        if (existingUserId) {
            // 이미 존재하면 role만 ADMIN으로 업그레이드
            await supabase
                .from('users')
                .update({ role: 'ADMIN', user_status: 'APPROVED' })
                .eq('id', existingUserId);
        } else {
            // 4. 새 user 생성 (ADMIN, APPROVED)
            const newUserId = authUserId; // auth user id를 user id로 사용
            const { error: insertError } = await supabase.from('users').insert({
                id: newUserId,
                name: invite.name || '관리자',
                email: invite.email || null,
                role: 'ADMIN',
                user_status: 'APPROVED',
                union_id: unionId,
            });

            if (insertError) {
                console.error('[auth/callback] Failed to create admin user:', insertError.message);
                return null;
            }

            // 5. user_auth_links 연결
            const { error: linkError } = await supabase.from('user_auth_links').insert({
                auth_user_id: authUserId,
                user_id: newUserId,
                provider: 'kakao',
            });

            if (linkError) {
                console.error('[auth/callback] Failed to create auth link:', linkError.message);
                // user는 생성되었으므로 계속 진행
            }
        }

        // 6. 초대 상태를 USED로 업데이트
        await supabase
            .from('admin_invites')
            .update({ status: 'USED', used_at: new Date().toISOString() })
            .eq('id', invite.id);

        // 7. 관리자 페이지로 리다이렉트
        const redirectUrl = `${origin}/${unionSlug}/admin/land-lots`;
        console.log(`[auth/callback] Admin auto-registered: ${invite.name} → ${unionSlug} (ADMIN)`);

        return { redirectUrl };
    } catch (error) {
        console.error('[auth/callback] Error in admin auto-register:', error instanceof Error ? error.message : error);
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
