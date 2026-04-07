import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/app/_lib/shared/supabase/server';
import { isLocalhostServer } from '@/app/_lib/shared/utils/isLocalhost';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 테스트 로그인 API
 * POST /api/test/login
 *
 * localhost에서만 동작. Supabase Auth 이메일 계정 생성 후 세션 발급.
 *
 * Body:
 *   slug: string - 대상 조합 slug
 *   role?: 'admin' | 'member' - 기본 'member'
 *   email?: string - 특정 테스트 이메일 (없으면 자동 생성)
 */
export async function POST(request: NextRequest) {
    // 프로덕션 차단
    if (!isLocalhostServer()) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!serviceRoleKey) {
        return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 미설정' }, { status: 500 });
    }

    const { slug, role = 'member', email: customEmail } = await request.json();

    if (!slug) {
        return NextResponse.json({ error: 'slug 필수' }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const testEmail = customEmail || `test-${role}-${Date.now()}@test.local`;
    const testPassword = 'test-password-12345';

    // 1. 기존 계정 확인 또는 생성
    let authUserId: string;

    if (customEmail) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(u => u.email === customEmail);
        if (existing) {
            authUserId = existing.id;
        } else {
            const { data: newUser, error } = await adminClient.auth.admin.createUser({
                email: testEmail,
                password: testPassword,
                email_confirm: true,
            });
            if (error || !newUser.user) {
                return NextResponse.json({ error: `계정 생성 실패: ${error?.message}` }, { status: 500 });
            }
            authUserId = newUser.user.id;
        }
    } else {
        const { data: newUser, error } = await adminClient.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true,
        });
        if (error || !newUser.user) {
            return NextResponse.json({ error: `계정 생성 실패: ${error?.message}` }, { status: 500 });
        }
        authUserId = newUser.user.id;
    }

    // 2. unions 테이블에서 union_id 조회
    const { data: unionData } = await adminClient
        .from('unions')
        .select('id')
        .eq('slug', slug)
        .single();

    if (!unionData) {
        return NextResponse.json({ error: `조합을 찾을 수 없습니다: ${slug}` }, { status: 404 });
    }
    const unionId = unionData.id;

    // 3. users + user_auth_links 레코드 생성 (이미 있으면 skip)
    const userId = `test-${authUserId.slice(0, 8)}`;
    const userRole = role === 'admin' ? 'ADMIN' : 'USER';

    // user_auth_links 확인
    const { data: existingLink } = await adminClient
        .from('user_auth_links')
        .select('user_id')
        .eq('auth_user_id', authUserId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!existingLink) {
        // users 레코드 생성
        await adminClient.from('users').upsert({
            id: userId,
            name: role === 'admin' ? '테스트 관리자' : '테스트 조합원',
            email: testEmail,
            phone_number: '010-0000-0000',
            role: userRole,
            user_status: 'APPROVED',
            union_id: unionId,
            created_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        // user_auth_links 레코드 생성
        await adminClient.from('user_auth_links').upsert({
            auth_user_id: authUserId,
            user_id: userId,
            provider: 'email',
        }, { onConflict: 'auth_user_id,user_id' });
    }

    // 4. 서버 Supabase 클라이언트로 로그인 (쿠키 세션 설정)
    const supabase = await createServerClient();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
    });

    if (signInError || !signInData.session) {
        return NextResponse.json({ error: `로그인 실패: ${signInError?.message}` }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        authUserId,
        userId,
        email: testEmail,
        role,
        unionId,
        redirectTo: `/${slug}`,
    });
}
