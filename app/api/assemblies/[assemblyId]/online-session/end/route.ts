import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const VALID_REASONS = ['manual', 'pagehide', 'visibility_timeout', 'network_timeout', 'assembly_closed'];

/**
 * 온라인 세션 종료
 * POST /api/assemblies/[assemblyId]/online-session/end
 *
 * sendBeacon 호환: text/plain + application/json 모두 지원
 *
 * Body: { sessionId: string, reason: string }
 * Response: { ok, exitAt }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // sendBeacon 호환 파싱 (text/plain + application/json)
    let body;
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('text/plain')) {
        const text = await request.text();
        body = JSON.parse(text);
      } else {
        body = await request.json();
      }
    } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { sessionId, reason } = body;
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId는 필수입니다.' }, { status: 400 });
    }

    const exitReason = VALID_REASONS.includes(reason) ? reason : 'unknown';

    // 활성 세션 조회
    const { data: session } = await supabase
      .from('assembly_attendance_logs')
      .select('id, exit_at, device_info')
      .eq('assembly_id', assemblyId)
      .eq('user_id', auth.user.id)
      .eq('session_id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 이미 종료된 세션 (idempotent)
    if (session.exit_at) {
      return new NextResponse(null, { status: 204 });
    }

    const now = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // exit_at 설정 + device_info에 exit_reason 추가
    const updatedDeviceInfo = {
      ...(session.device_info as Record<string, unknown> || {}),
      exit_reason: exitReason,
      exit_at: now,
    };

    const { error: updateError } = await supabase
      .from('assembly_attendance_logs')
      .update({
        exit_at: now,
        device_info: updatedDeviceInfo,
      })
      .eq('id', session.id)
      .is('exit_at', null);

    if (updateError) {
      console.error('세션 종료 실패:', updateError);
      return NextResponse.json({ error: '세션 종료에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그 기록 (해시 체인은 DB 트리거가 자동 계산)
    const { error: auditError } = await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'SESSION_END',
        actor_id: auth.user.id,
        actor_role: 'MEMBER',
        target_type: 'attendance_log',
        target_id: session.id,
        event_data: {
          session_id: sessionId,
          exit_reason: exitReason,
        },
        ip_address: ip,
        user_agent: userAgent,
      });

    if (auditError) {
      console.error('감사 로그 기록 실패:', auditError);
      // 감사 로그 실패해도 세션 종료는 유지 (비차단)
    }

    return NextResponse.json({
      data: {
        ok: true,
        exitAt: now,
      },
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/online-session/end error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
