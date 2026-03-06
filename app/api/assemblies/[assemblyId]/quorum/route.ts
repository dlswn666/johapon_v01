import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 정족수 현황 조회 (관리자 전용)
 * GET /api/assemblies/[assemblyId]/quorum
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // 총회 정보 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('quorum_total_members')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 활성 스냅샷 총 수 및 가중치 합산 (총 조합원 수)
    const { data: activeSnapshots } = await supabase
      .from('assembly_member_snapshots')
      .select('id, voting_weight')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true);

    const totalMembers = activeSnapshots?.length || 0;
    const totalWeight = (activeSnapshots || []).reduce((sum, s) => sum + (Number(s.voting_weight) || 1), 0);
    const effectiveTotalMembers = assembly.quorum_total_members ?? totalMembers;

    // 스냅샷 ID → 가중치 매핑 (L-1: 가중치 기반 정족수)
    const snapshotWeightMap = new Map<string, number>();
    for (const s of activeSnapshots || []) {
      snapshotWeightMap.set(s.id, Number(s.voting_weight) || 1);
    }

    // 출석 유형별 카운트 (중복 없는 현재 체크인 상태)
    const { data: attendanceLogs } = await supabase
      .from('assembly_attendance_logs')
      .select('attendance_type, snapshot_id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .is('exit_at', null); // 아직 퇴장하지 않은 로그만

    // 스냅샷 기준으로 중복 제거 (동일 조합원 최신 로그만)
    const uniqueBySnapshot = new Map<string, string>();
    for (const log of attendanceLogs || []) {
      uniqueBySnapshot.set(log.snapshot_id, log.attendance_type);
    }

    let onsiteCount = 0;
    let onlineCount = 0;
    let writtenProxyCount = 0;
    let onsiteWeight = 0;
    let onlineWeight = 0;
    let writtenProxyWeight = 0;

    for (const [snapshotId, type] of uniqueBySnapshot.entries()) {
      const weight = snapshotWeightMap.get(snapshotId) || 1;
      if (type === 'ONSITE') { onsiteCount++; onsiteWeight += weight; }
      else if (type === 'ONLINE') { onlineCount++; onlineWeight += weight; }
      else if (type === 'WRITTEN_PROXY') { writtenProxyCount++; writtenProxyWeight += weight; }
    }

    // H-3: 직접참석 (현장+온라인) vs 서면/위임 분리
    const directAttendance = onsiteCount + onlineCount;
    const directWeight = onsiteWeight + onlineWeight;
    const totalAttendance = directAttendance + writtenProxyCount;
    const totalAttendanceWeight = directWeight + writtenProxyWeight;

    const quorumThresholdPct = 50; // 기본 50%
    // L-1: 가중치 기반 정족수 충족 여부
    const quorumMet = totalWeight > 0
      ? (totalAttendanceWeight / totalWeight) * 100 >= quorumThresholdPct
      : false;

    // 안건별 정족수 확인
    const { data: agendaItems } = await supabase
      .from('agenda_items')
      .select('id, title, agenda_type, quorum_threshold_pct, quorum_requires_direct')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('seq_order', { ascending: true });

    const perAgenda = (agendaItems || []).map((item) => {
      const requiredThreshold = item.quorum_threshold_pct ?? quorumThresholdPct;
      // H-3: quorum_requires_direct이면 직접참석(현장+온라인) 가중치만 사용
      const effectiveWeight = item.quorum_requires_direct ? directWeight : totalAttendanceWeight;
      const currentPct = totalWeight > 0
        ? (effectiveWeight / totalWeight) * 100
        : 0;
      return {
        agendaId: item.id,
        title: item.title,
        agendaType: item.agenda_type,
        requiredThreshold,
        currentPct: Math.round(currentPct * 10) / 10,
        met: currentPct >= requiredThreshold,
        requiresDirect: item.quorum_requires_direct || false,
        directCount: item.quorum_requires_direct ? directAttendance : undefined,
      };
    });

    const data = {
      totalMembers: effectiveTotalMembers,
      totalWeight,
      onsiteCount,
      onlineCount,
      writtenProxyCount,
      directAttendance,
      totalAttendance,
      onsiteWeight,
      onlineWeight,
      writtenProxyWeight,
      directWeight,
      totalAttendanceWeight,
      quorumMet,
      quorumThresholdPct,
      perAgenda,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/quorum error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
