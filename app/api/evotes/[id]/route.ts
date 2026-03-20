import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 전자투표 상세 조회 (안건 + 참여현황 + 정족수)
 * GET /api/evotes/[id]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { id } = await context.params;
    const supabase = await createClient();

    const unionId = auth.user.union_id;
    if (!unionId && auth.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // 1. 총회 상세 조회 (안건 + 투표 + 선택지 포함)
    let assemblyQuery = supabase
      .from('assemblies')
      .select(`
        *,
        creator:users!assemblies_created_by_fkey(id, name),
        agenda_items(
          *,
          polls(*, poll_options(*)),
          agenda_documents(*)
        )
      `)
      .eq('id', id);

    if (unionId) {
      assemblyQuery = assemblyQuery.eq('union_id', unionId);
    }

    const { data: assembly, error: assemblyError } = await assemblyQuery.single();

    if (assemblyError) {
      if (assemblyError.code === 'PGRST116') {
        return NextResponse.json({ error: '전자투표를 찾을 수 없습니다.' }, { status: 404 });
      }
      console.error('전자투표 상세 조회 실패:', assemblyError);
      return NextResponse.json({ error: '전자투표 정보를 불러올 수 없습니다.' }, { status: 500 });
    }

    const effectiveUnionId = unionId || assembly.union_id;

    // 2. 대상 인원 수 (활성 스냅샷)
    const { data: snapshots } = await supabase
      .from('assembly_member_snapshots')
      .select('id, voting_weight')
      .eq('assembly_id', id)
      .eq('union_id', effectiveUnionId)
      .eq('is_active', true);

    const eligibleCount = snapshots?.length || 0;
    const totalWeight = (snapshots || []).reduce(
      (sum, s) => sum + (Number(s.voting_weight) || 1), 0
    );

    // 3. 참여현황: participation_records에서 voting_method별 고유 user_id 카운트
    const { data: participations } = await supabase
      .from('participation_records')
      .select('user_id, voting_method')
      .eq('assembly_id', id)
      .eq('union_id', effectiveUnionId);

    // 동일 user_id 중복 제거 (여러 poll에 투표한 경우 1명으로 카운트)
    const uniqueVoters = new Map<string, string>(); // user_id -> voting_method
    for (const p of participations || []) {
      if (!uniqueVoters.has(p.user_id)) {
        uniqueVoters.set(p.user_id, p.voting_method);
      }
    }

    const methodCounts = { electronic: 0, written: 0, onsite: 0, proxy: 0 };
    uniqueVoters.forEach((method) => {
      const key = method?.toLowerCase() as keyof typeof methodCounts;
      if (key in methodCounts) {
        methodCounts[key]++;
      }
    });
    const totalParticipation = uniqueVoters.size;

    // 4. 정족수 계산
    // 직접출석(전자+현장) vs 전체(직접+서면+대리)
    const directCount = methodCounts.electronic + methodCounts.onsite;
    const directAttendancePct = totalWeight > 0
      ? Math.round((directCount / totalWeight) * 1000) / 10
      : 0;
    const approvalPct = totalWeight > 0
      ? Math.round((totalParticipation / totalWeight) * 1000) / 10
      : 0;

    // 기본 정족수 기준 (안건별 override 가능하지만 summary는 총회 기준)
    const defaultQuorumPct = 50;
    const defaultApprovalPct = 50;

    const summary = {
      eligible_count: eligibleCount,
      total_weight: totalWeight,
      participation: {
        electronic: methodCounts.electronic,
        written: methodCounts.written,
        onsite: methodCounts.onsite,
        proxy: methodCounts.proxy,
        total: totalParticipation,
      },
      quorum: {
        direct_attendance_pct: directAttendancePct,
        approval_pct: approvalPct,
        direct_met: directAttendancePct >= defaultQuorumPct,
        approval_met: approvalPct >= defaultApprovalPct,
      },
    };

    return NextResponse.json({
      data: {
        assembly,
        agendas: assembly.agenda_items || [],
        summary,
      },
    });
  } catch (error) {
    console.error('GET /api/evotes/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
