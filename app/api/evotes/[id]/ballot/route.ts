import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 전자투표 투표 화면 데이터 조회
 * GET /api/evotes/[id]/ballot
 *
 * 조합원 전용 — 총회 안건 + 내 스냅샷 + 내 투표 기록 반환
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { id } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const unionId = auth.user.union_id;

    const supabase = await createClient();

    // 3개 쿼리 병렬 실행
    const [assemblyResult, snapshotResult, votesResult] = await Promise.all([
      // 1. 총회 + 안건 + 투표 + 선택지 (중첩 select)
      supabase
        .from('assemblies')
        .select(`
          *,
          agenda_items(
            *,
            polls(*, poll_options(*)),
            agenda_documents(*)
          )
        `)
        .eq('id', id)
        .eq('union_id', unionId)
        .single(),

      // 2. 내 스냅샷
      supabase
        .from('assembly_member_snapshots')
        .select('id, voting_weight, identity_verified_at, consent_agreed_at, is_active, member_name')
        .eq('assembly_id', id)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .eq('is_active', true)
        .single(),

      // 3. 내 투표 기록 (is_superseded=false)
      supabase
        .from('participation_records')
        .select('id, poll_id, first_voted_at, last_voted_at, vote_count, receipt_token, voting_method')
        .eq('assembly_id', id)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .eq('is_superseded', false),
    ]);

    // 총회 조회 실패
    if (assemblyResult.error) {
      if (assemblyResult.error.code === 'PGRST116') {
        return NextResponse.json({ error: '전자투표를 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('전자투표 조회 실패:', assemblyResult.error);
      return NextResponse.json({ error: '전자투표 정보를 불러올 수 없습니다.' }, { status: 500 });
    }

    const assembly = assemblyResult.data;

    // 상태 검증: PRE_VOTING 또는 VOTING만 허용
    if (assembly.status !== 'PRE_VOTING' && assembly.status !== 'VOTING') {
      return NextResponse.json(
        { error: '현재 투표를 진행할 수 없는 상태입니다.' },
        { status: 403 },
      );
    }

    // 스냅샷 검증
    if (snapshotResult.error || !snapshotResult.data) {
      return NextResponse.json(
        { error: '투표 권한이 없습니다. 총회 접근 인증을 먼저 완료해주세요.' },
        { status: 403 },
      );
    }

    const snapshot = snapshotResult.data;

    if (!snapshot.identity_verified_at) {
      return NextResponse.json({ error: '본인확인이 완료되지 않았습니다.' }, { status: 403 });
    }

    if (!snapshot.consent_agreed_at) {
      return NextResponse.json({ error: '개인정보 수집·이용 동의가 필요합니다.' }, { status: 403 });
    }

    return NextResponse.json({
      data: {
        assembly,
        agendas: assembly.agenda_items || [],
        my_votes: votesResult.data || [],
        snapshot,
      },
    });
  } catch (error) {
    console.error('GET /api/evotes/[id]/ballot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
