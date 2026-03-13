import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import { randomUUID } from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const SESSION_ALLOWED_STATUSES = ['IN_PROGRESS', 'VOTING'];

/**
 * 온라인 세션 시작 (출석 기록 생성)
 * POST /api/assemblies/[assemblyId]/online-session/start
 *
 * Body: { channel: string, clientSessionId: string }
 * Response: { logId, sessionId, entryAt, attendanceType, isReentry }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const supabase = await createClient();

    // 요청 본문 파싱
    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { channel, clientSessionId } = body;
    if (!channel || typeof channel !== 'string') {
      return NextResponse.json({ error: 'channel은 필수입니다.' }, { status: 400 });
    }

    // 총회 상태 + 세션 모드 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status, session_mode')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly || !SESSION_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '현재 세션을 시작할 수 없는 총회 상태입니다.' }, { status: 403 });
    }

    if (assembly.session_mode !== 'SESSION') {
      return NextResponse.json({ error: '이 총회는 세션 기반 출석을 사용하지 않습니다.' }, { status: 400 });
    }

    // 스냅샷 확인 (본인확인 + 동의 완료 여부)
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id, proxy_user_id, proxy_authorized_at, identity_verified_at, consent_agreed_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .single();

    // 본인 스냅샷이 없으면 대리인으로 조회
    let isProxy = false;
    let activeSnapshot = snapshot;

    if (!snapshot) {
      const { data: proxySnapshot } = await supabase
        .from('assembly_member_snapshots')
        .select('id, user_id, proxy_user_id, proxy_authorized_at, identity_verified_at, consent_agreed_at')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('proxy_user_id', auth.user.id)
        .eq('is_active', true)
        .single();

      if (!proxySnapshot || !proxySnapshot.proxy_authorized_at) {
        return NextResponse.json({ error: '총회 접근 권한이 없습니다.' }, { status: 403 });
      }
      isProxy = true;
      activeSnapshot = proxySnapshot;
    }

    if (!activeSnapshot!.identity_verified_at) {
      return NextResponse.json({ error: '본인확인이 완료되지 않았습니다.' }, { status: 403 });
    }

    if (!activeSnapshot!.consent_agreed_at) {
      return NextResponse.json({ error: '개인정보 수집·이용 동의가 필요합니다.' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const sessionId = clientSessionId || randomUUID();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    // 기존 활성 세션 확인
    const { data: existingSession } = await supabase
      .from('assembly_attendance_logs')
      .select('id, session_id')
      .eq('assembly_id', assemblyId)
      .eq('user_id', auth.user.id)
      .eq('union_id', unionId)
      .is('exit_at', null)
      .single();

    let isReentry = false;

    if (existingSession) {
      // 기존 세션 종료 처리 (exit_at + exit_reason 기록)
      isReentry = true;
      await supabase
        .from('assembly_attendance_logs')
        .update({
          exit_at: now,
          device_info: { exit_reason: 'reentry', exit_at: now },
        })
        .eq('id', existingSession.id);
    }

    // 새 출석 로그 생성
    const attendanceType = isProxy ? 'WRITTEN_PROXY' : 'ONLINE';
    const { data: newLog, error: insertError } = await supabase
      .from('assembly_attendance_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        snapshot_id: activeSnapshot!.id,
        user_id: auth.user.id,
        attendance_type: attendanceType,
        entry_at: now,
        last_seen_at: now,
        session_id: sessionId,
        ip_address: ip,
        user_agent: userAgent,
        device_info: {
          channel,
          is_reentry: isReentry,
          ...(isReentry && existingSession ? { previous_session_id: existingSession.session_id } : {}),
        },
        identity_verified: true,
        identity_method: 'KAKAO_LOGIN',
        identity_verified_at: activeSnapshot!.identity_verified_at,
      })
      .select('id, session_id, entry_at, attendance_type')
      .single();

    if (insertError) {
      console.error('세션 시작 실패:', insertError);
      return NextResponse.json({ error: '세션 시작에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그 기록 (해시 체인은 DB 트리거가 자동 계산)
    const { error: auditError } = await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'SESSION_START',
        actor_id: auth.user.id,
        actor_role: isProxy ? 'PROXY' : 'MEMBER',
        target_type: 'attendance_log',
        target_id: newLog.id,
        event_data: {
          session_id: sessionId,
          attendance_type: attendanceType,
          is_reentry: isReentry,
          channel,
        },
        ip_address: ip,
        user_agent: userAgent,
      });

    if (auditError) {
      console.error('감사 로그 기록 실패:', auditError);
      // 감사 로그 실패해도 세션은 유지 (비차단)
    }

    return NextResponse.json({
      data: {
        logId: newLog.id,
        sessionId: newLog.session_id,
        entryAt: newLog.entry_at,
        attendanceType: newLog.attendance_type,
        isReentry,
      },
    }, { status: isReentry ? 200 : 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/online-session/start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
