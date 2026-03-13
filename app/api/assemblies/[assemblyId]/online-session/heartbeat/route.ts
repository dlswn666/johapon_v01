import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 조건부 UPDATE 최소 간격 (초) — 20초 미만이면 스킵
const MIN_UPDATE_INTERVAL_SECONDS = 20;

/**
 * 온라인 세션 heartbeat (last_seen_at 갱신)
 * POST /api/assemblies/[assemblyId]/online-session/heartbeat
 *
 * Body: { sessionId: string, visibilityState?: string }
 * Response: { ok, lastSeenAt, assemblyStatus, activePollIds }
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

    const { sessionId } = body;
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId는 필수입니다.' }, { status: 400 });
    }

    // 활성 세션 조회
    const { data: session } = await supabase
      .from('assembly_attendance_logs')
      .select('id, last_seen_at, exit_at')
      .eq('assembly_id', assemblyId)
      .eq('user_id', auth.user.id)
      .eq('session_id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 이미 종료된 세션
    if (session.exit_at) {
      return NextResponse.json(
        { error: '이미 종료된 세션입니다.', reason: 'session_ended' },
        { status: 409 }
      );
    }

    const now = new Date();
    let lastSeenAt = now.toISOString();

    // 조건부 UPDATE: 마지막 갱신으로부터 20초 미만이면 스킵
    const shouldUpdate = !session.last_seen_at ||
      (now.getTime() - new Date(session.last_seen_at).getTime()) >= MIN_UPDATE_INTERVAL_SECONDS * 1000;

    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from('assembly_attendance_logs')
        .update({ last_seen_at: lastSeenAt })
        .eq('id', session.id)
        .is('exit_at', null);

      if (updateError) {
        console.error('heartbeat 갱신 실패:', updateError);
        return NextResponse.json({ error: 'heartbeat 갱신에 실패했습니다.' }, { status: 500 });
      }
    } else {
      lastSeenAt = session.last_seen_at!;
    }

    // assemblyStatus + activePollIds 조회 (heartbeat 응답에 포함)
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    const { data: activePolls } = await supabase
      .from('polls')
      .select('id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('status', 'OPEN');

    return NextResponse.json({
      data: {
        ok: true,
        lastSeenAt,
        assemblyStatus: assembly?.status || null,
        activePollIds: (activePolls || []).map((p: { id: string }) => p.id),
      },
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/online-session/heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
