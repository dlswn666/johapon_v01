import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, AuthResult } from '@/app/_lib/shared/api/auth';

/**
 * 멤버 승인 API
 * TASK-S004: 감사 로그 기록 (APPROVE_MEMBER)
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const clientIp = request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    let auth: AuthResult | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseAdmin: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = null;

    try {
        body = await request.json();
        const { unionId, memberId } = body;

        if (!unionId || !memberId) {
            return NextResponse.json(
                { error: '필수 파라미터가 누락되었습니다.' },
                { status: 400 }
            );
        }

        // 인증 검사
        auth = await authenticateApiRequest({
            requireAdmin: true,
            requireUnionId: true,
            unionId
        });

        if (!auth.authenticated) {
            return auth.response;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseServiceKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
            return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 });
        }

        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // 사용자 상태 검증
        const { data: user, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('user_status')
            .eq('id', memberId)
            .eq('union_id', unionId)
            .single();

        if (fetchError || !user) {
            // ✅ 감사 로그: 사용자 찾을 수 없음
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: unionId,
                user_id: auth.user.id,
                action: 'APPROVE_MEMBER_FAILED',
                action_type: 'WRITE',
                target_user_id: memberId,
                metadata: {
                    error: 'User not found',
                    previous_status: null
                },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: Date.now() - startTime
            }).catch(() => {});

            return NextResponse.json(
                { error: '사용자를 찾을 수 없습니다' },
                { status: 404 }
            );
        }

        if (user.user_status !== 'PENDING_APPROVAL') {
            // ✅ 감사 로그: 잘못된 상태
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: unionId,
                user_id: auth.user.id,
                action: 'APPROVE_MEMBER_FAILED',
                action_type: 'WRITE',
                target_user_id: memberId,
                metadata: {
                    error: 'Invalid user status',
                    previous_status: user.user_status
                },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: Date.now() - startTime
            }).catch(() => {});

            return NextResponse.json(
                { error: '이 사용자는 현재 승인할 수 없는 상태입니다.' },
                { status: 400 }
            );
        }

        // 승인 처리
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                user_status: 'APPROVED',
                role: 'USER',
                approved_at: new Date().toISOString(),
                rejected_reason: null,
                rejected_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', memberId)
            .eq('union_id', unionId)
            .eq('user_status', 'PENDING_APPROVAL');

        if (updateError) {
            // ✅ 감사 로그: 승인 실패
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: unionId,
                user_id: auth.user.id,
                action: 'APPROVE_MEMBER_FAILED',
                action_type: 'WRITE',
                target_user_id: memberId,
                metadata: {
                    error: updateError.message,
                    previous_status: 'PENDING_APPROVAL'
                },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: Date.now() - startTime
            }).catch(() => {});

            throw updateError;
        }

        // ✅ 감사 로그: 승인 성공
        await supabaseAdmin.from('member_access_logs').insert({
            union_id: unionId,
            user_id: auth.user.id,
            action: 'APPROVE_MEMBER',
            action_type: 'WRITE',
            target_user_id: memberId,
            metadata: {
                previous_status: 'PENDING_APPROVAL',
                new_status: 'APPROVED'
            },
            ip_address: clientIp,
            user_agent: userAgent,
            status: 'SUCCESS',
            duration_ms: Date.now() - startTime
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            message: '멤버가 승인되었습니다'
        });

    } catch (error) {
        console.error('[Member Approve] API error:', error);

        // ✅ 감사 로그: 예외
        if (supabaseAdmin && body) {
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: body?.unionId as string | undefined,
                user_id: auth && auth.authenticated ? auth.user.id : undefined,
                action: 'APPROVE_MEMBER_FAILED',
                action_type: 'WRITE',
                target_user_id: body?.memberId as string | undefined,
                metadata: {
                    error: String(error),
                    error_type: error instanceof Error ? error.name : 'UnknownError'
                },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: Date.now() - startTime
            }).catch(() => {});
        }

        return NextResponse.json(
            { error: '승인 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
