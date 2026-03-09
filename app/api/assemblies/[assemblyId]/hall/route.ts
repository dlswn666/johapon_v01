import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { isSessionMode } from '@/app/_lib/shared/utils/featureFlags';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 총회장 입장 가능 상태
const HALL_ALLOWED_STATUSES = ['CONVENED', 'IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'];

/**
 * 총회장 부트스트랩 데이터 조회
 * GET /api/assemblies/[assemblyId]/hall
 *
 * 7개 병렬 쿼리로 총회장 렌더링에 필요한 모든 데이터를 한 번에 반환
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // 7개 병렬 쿼리
    const [
      assemblyResult,
      snapshotResult,
      sessionResult,
      agendaResult,
      documentResult,
      questionResult,
      speakerResult,
    ] = await Promise.all([
      // 1. 총회 기본 정보
      supabase
        .from('assemblies')
        .select(`
          id, union_id, title, description, assembly_type, status,
          scheduled_at, opened_at, venue_address, stream_type,
          zoom_meeting_id, youtube_video_id, legal_basis, session_mode
        `)
        .eq('id', assemblyId)
        .eq('union_id', unionId)
        .single(),

      // 2. 스냅샷 정보 (본인확인 완료된 것만)
      supabase
        .from('assembly_member_snapshots')
        .select(`
          id, assembly_id, union_id, user_id, member_name, member_phone,
          property_address, voting_weight, member_type, proxy_user_id,
          proxy_name, proxy_authorized_at, token_expires_at, token_used_at,
          identity_verified_at, identity_method, consent_agreed_at, is_active, created_at
        `)
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .eq('is_active', true)
        .single(),

      // 3. 현재 활성 세션
      supabase
        .from('assembly_attendance_logs')
        .select('id, session_id, entry_at, last_seen_at, attendance_type')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .is('exit_at', null)
        .order('entry_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // 4. 안건 + 투표 + 선택지
      supabase
        .from('agenda_items')
        .select('*, polls(*, poll_options(*))')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .order('seq_order', { ascending: true }),

      // 5. 자료
      supabase
        .from('agenda_documents')
        .select('*')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false }),

      // 6. 내 질문 목록
      supabase
        .from('assembly_questions')
        .select('id, assembly_id, agenda_item_id, snapshot_id, user_id, content, visibility, is_approved, answer, answered_at, is_read_aloud, submitted_at')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .order('submitted_at', { ascending: true }),

      // 7. 내 발언 요청 목록
      supabase
        .from('speaker_requests')
        .select('id, assembly_id, agenda_item_id, snapshot_id, user_id, status, queue_position, requested_at')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .order('requested_at', { ascending: true }),
    ]);

    // 총회 존재 + 상태 확인
    if (assemblyResult.error || !assemblyResult.data) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    const assembly = assemblyResult.data;

    if (!HALL_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '현재 입장 가능한 총회가 아닙니다.' }, { status: 403 });
    }

    // 스냅샷 확인 (본인확인 완료 여부)
    if (snapshotResult.error || !snapshotResult.data) {
      return NextResponse.json({ error: '총회 접근 권한이 없습니다. 본인인증을 먼저 완료해주세요.' }, { status: 403 });
    }

    if (!snapshotResult.data.identity_verified_at) {
      return NextResponse.json({ error: '본인인증이 완료되지 않았습니다.' }, { status: 403 });
    }

    // 기능 플래그 계산
    const featureFlags = {
      canAskQuestion: ['IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'].includes(assembly.status),
      canRequestSpeaker: ['IN_PROGRESS', 'VOTING'].includes(assembly.status),
      canVote: assembly.status === 'VOTING',
      isSessionMode: isSessionMode(assembly),
    };

    return NextResponse.json({
      data: {
        assembly,
        snapshot: snapshotResult.data,
        attendanceSession: sessionResult.data || null,
        agendaItems: agendaResult.data || [],
        documents: documentResult.data || [],
        myQuestions: questionResult.data || [],
        mySpeakerRequests: speakerResult.data || [],
        featureFlags,
      },
    });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/hall error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
