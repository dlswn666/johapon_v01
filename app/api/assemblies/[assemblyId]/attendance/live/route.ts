import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 실시간 출석 현황 조회 (관리자 전용)
 * GET /api/assemblies/[assemblyId]/attendance/live
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

    // 전체 조합원 수 (스냅샷 기준)
    const { count: totalMembers } = await supabase
      .from('assembly_member_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true);

    // 출석 유형별 현황 (현재 활성 세션 = exit_at IS NULL)
    const { data: activeLogs, error: logsError } = await supabase
      .from('assembly_attendance_logs')
      .select('id, snapshot_id, user_id, attendance_type, entry_at, last_seen_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .is('exit_at', null);

    if (logsError) {
      console.error('실시간 출석 조회 실패:', logsError);
      return NextResponse.json({ error: '출석 현황을 불러올 수 없습니다.' }, { status: 500 });
    }

    const logs = activeLogs || [];

    // 출석 유형별 집계 (snapshot_id 기준 중복 제거)
    const seenSnapshots = new Map<string, typeof logs[0]>();
    for (const log of logs) {
      if (!seenSnapshots.has(log.snapshot_id)) {
        seenSnapshots.set(log.snapshot_id, log);
      }
    }

    let onsiteCount = 0;
    let onlineCount = 0;
    let writtenProxyCount = 0;
    for (const log of seenSnapshots.values()) {
      if (log.attendance_type === 'ONSITE') onsiteCount++;
      else if (log.attendance_type === 'ONLINE') onlineCount++;
      else if (log.attendance_type === 'WRITTEN_PROXY') writtenProxyCount++;
    }

    // 온라인 세션 상세 (snapshot JOIN으로 member_name 포함)
    const onlineLogs = logs.filter((l) => l.attendance_type === 'ONLINE');
    const snapshotIds = [...new Set(onlineLogs.map((l) => l.snapshot_id))];

    const snapshotMap = new Map<string, string>();
    if (snapshotIds.length > 0) {
      const { data: snapshots } = await supabase
        .from('assembly_member_snapshots')
        .select('id, member_name')
        .in('id', snapshotIds);
      if (snapshots) {
        for (const s of snapshots) {
          snapshotMap.set(s.id, s.member_name);
        }
      }
    }

    const now = Date.now();
    let unstableCount = 0;

    const onlineSessions = onlineLogs.map((log) => {
      const lastSeenMs = new Date(log.last_seen_at).getTime();
      const diffSec = (now - lastSeenMs) / 1000;

      let status: 'ACTIVE' | 'UNSTABLE' | 'DISCONNECTED';
      if (diffSec > 90) {
        status = 'DISCONNECTED';
      } else if (diffSec > 60) {
        status = 'UNSTABLE';
      } else {
        status = 'ACTIVE';
      }

      if (status === 'UNSTABLE') unstableCount++;

      return {
        logId: log.id,
        snapshotId: log.snapshot_id,
        memberName: snapshotMap.get(log.snapshot_id) || '',
        entryAt: log.entry_at,
        lastSeenAt: log.last_seen_at,
        status,
        attendanceType: log.attendance_type,
      };
    });

    return NextResponse.json({
      data: {
        totalMembers: totalMembers || 0,
        attendance: {
          onsite: onsiteCount,
          online: onlineCount,
          writtenProxy: writtenProxyCount,
          total: onsiteCount + onlineCount + writtenProxyCount,
        },
        onlineSessions,
        unstableCount,
      },
    });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/attendance/live error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
