import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, AuthResult } from '@/app/_lib/shared/api/auth';

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
            return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 });
        }

        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: user, error: fetchError } = await supabaseAdmin
            .from('users')
            .select('user_status')
            .eq('id', memberId)
            .eq('union_id', unionId)
            .single();

        if (fetchError || !user) {
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: unionId,
                user_id: auth.user.id,
                action: 'CANCEL_REJECTION_FAILED',
                action_type: 'WRITE',
                target_user_id: memberId,
                metadata: { error: 'User not found' },
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

        if (user.user_status !== 'REJECTED') {
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: unionId,
                user_id: auth.user.id,
                action: 'CANCEL_REJECTION_FAILED',
                action_type: 'WRITE',
                target_user_id: memberId,
                metadata: { error: 'Invalid user status', previous_status: user.user_status },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: Date.now() - startTime
            }).catch(() => {});

            return NextResponse.json(
                { error: '이 사용자는 현재 반려 취소할 수 없는 상태입니다.' },
                { status: 400 }
            );
        }

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                user_status: 'PENDING_APPROVAL',
                rejected_reason: null,
                rejected_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', memberId)
            .eq('union_id', unionId)
            .eq('user_status', 'REJECTED');

        if (updateError) {
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: unionId,
                user_id: auth.user.id,
                action: 'CANCEL_REJECTION_FAILED',
                action_type: 'WRITE',
                target_user_id: memberId,
                metadata: { error: updateError.message },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: Date.now() - startTime
            }).catch(() => {});

            throw updateError;
        }

        await supabaseAdmin.from('member_access_logs').insert({
            union_id: unionId,
            user_id: auth.user.id,
            action: 'CANCEL_REJECTION',
            action_type: 'WRITE',
            target_user_id: memberId,
            metadata: { previous_status: 'REJECTED', new_status: 'PENDING_APPROVAL' },
            ip_address: clientIp,
            user_agent: userAgent,
            status: 'SUCCESS',
            duration_ms: Date.now() - startTime
        }).catch(() => {});

        return NextResponse.json({ success: true, message: '반려가 취소되었습니다' });

    } catch (error) {
        console.error('[Member Cancel Rejection] API error:', error);

        if (supabaseAdmin && body) {
            await supabaseAdmin.from('member_access_logs').insert({
                union_id: body?.unionId as string | undefined,
                user_id: auth && auth.authenticated ? auth.user.id : undefined,
                action: 'CANCEL_REJECTION_FAILED',
                action_type: 'WRITE',
                target_user_id: body?.memberId as string | undefined,
                metadata: { error: String(error) },
                ip_address: clientIp,
                user_agent: userAgent,
                status: 'FAILURE',
                duration_ms: Date.now() - startTime
            }).catch(() => {});
        }

        return NextResponse.json(
            { error: '반려 취소 처리 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
