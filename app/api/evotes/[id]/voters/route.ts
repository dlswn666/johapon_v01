import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

type VoterFilter = 'ALL' | 'VOTED' | 'NOT_VOTED';

/**
 * 투표 대상자 + 투표 여부 조회
 * GET /api/evotes/[id]/voters?filter=ALL|VOTED|NOT_VOTED
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { id } = await context.params;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get('filter')?.toUpperCase() || 'ALL') as VoterFilter;

    if (!['ALL', 'VOTED', 'NOT_VOTED'].includes(filter)) {
      return NextResponse.json({ error: '유효하지 않은 filter 값입니다. (ALL, VOTED, NOT_VOTED)' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    if (!unionId && auth.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // 총회 존재 확인 + union_id 결정
    let assemblyQuery = supabase
      .from('assemblies')
      .select('id, union_id')
      .eq('id', id);

    if (unionId) {
      assemblyQuery = assemblyQuery.eq('union_id', unionId);
    }

    const { data: assembly } = await assemblyQuery.single();
    if (!assembly) {
      return NextResponse.json({ error: '전자투표를 찾을 수 없습니다.' }, { status: 404 });
    }

    const effectiveUnionId = unionId || assembly.union_id;

    // 1. 활성 스냅샷 조회 (투표 대상자 목록, users.is_executive 조인)
    const { data: snapshots, error: snapshotError } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id, member_name, member_phone, member_type, voting_weight, users!assembly_member_snapshots_user_id_fkey(is_executive)')
      .eq('assembly_id', id)
      .eq('union_id', effectiveUnionId)
      .eq('is_active', true)
      .order('member_name', { ascending: true });

    if (snapshotError) {
      console.error('스냅샷 조회 실패:', snapshotError);
      return NextResponse.json({ error: '투표 대상자 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    if (!snapshots || snapshots.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. 참여 기록 조회 (user_id 기준 최초 투표 정보)
    const { data: participations } = await supabase
      .from('participation_records')
      .select('user_id, first_voted_at, voting_method')
      .eq('assembly_id', id)
      .eq('union_id', effectiveUnionId);

    // user_id → 참여 정보 매핑 (동일 user가 여러 poll에 투표 시 최초 기록)
    const participationMap = new Map<string, { voted_at: string; voting_method: string }>();
    for (const p of participations || []) {
      if (!participationMap.has(p.user_id)) {
        participationMap.set(p.user_id, {
          voted_at: p.first_voted_at,
          voting_method: p.voting_method,
        });
      }
    }

    // 3. 스냅샷 + 참여 기록 병합
    const voters = snapshots.map((s) => {
      const participation = participationMap.get(s.user_id);
      const usersData = Array.isArray(s.users) ? s.users[0] : s.users as { is_executive: boolean | null } | null;
      return {
        user_id: s.user_id,
        member_name: s.member_name,
        member_phone: s.member_phone,
        member_type: s.member_type,
        voting_weight: s.voting_weight,
        is_executive: usersData?.is_executive ?? false,
        has_voted: !!participation,
        voted_at: participation?.voted_at || null,
        voting_method: participation?.voting_method || null,
      };
    });

    // 4. 필터 적용
    const filtered = filter === 'ALL'
      ? voters
      : filter === 'VOTED'
        ? voters.filter((v) => v.has_voted)
        : voters.filter((v) => !v.has_voted);

    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error('GET /api/evotes/[id]/voters error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
