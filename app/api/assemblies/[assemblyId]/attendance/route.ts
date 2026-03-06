import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const ATTENDANCE_ALLOWED_STATUSES = ['IN_PROGRESS', 'VOTING'];

/**
 * 출석 로그 목록 조회 (관리자 전용)
 * GET /api/assemblies/[assemblyId]/attendance
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assembly_attendance_logs')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', auth.user.union_id)
      .order('entry_at', { ascending: false });

    if (error) {
      console.error('출석 목록 조회 실패:', error);
      return NextResponse.json({ error: '출석 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 체크인/체크아웃 기록
 * POST /api/assemblies/[assemblyId]/attendance
 * Body: { snapshot_id, attendance_type, action: 'checkin'|'checkout' }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { snapshot_id, attendance_type, action, qr_data } = body;

    if (!snapshot_id || typeof snapshot_id !== 'string') {
      return NextResponse.json({ error: '스냅샷 ID가 필요합니다.' }, { status: 400 });
    }
    if (!attendance_type || !['ONLINE', 'ONSITE', 'WRITTEN_PROXY'].includes(attendance_type)) {
      return NextResponse.json({ error: '유효하지 않은 출석 유형입니다.' }, { status: 400 });
    }
    if (!action || !['checkin', 'checkout'].includes(action)) {
      return NextResponse.json({ error: '유효하지 않은 동작입니다.' }, { status: 400 });
    }

    // 총회 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly || !ATTENDANCE_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '현재 출석 처리를 할 수 없는 상태입니다.' }, { status: 403 });
    }

    // 스냅샷 유효성 확인
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id, member_name')
      .eq('id', snapshot_id)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: '유효하지 않은 조합원입니다.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    if (action === 'checkin') {
      // QR HMAC 서버측 검증 (C-5)
      if (qr_data) {
        const secret = process.env.QR_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
        if (!secret) {
          return NextResponse.json({ error: 'QR 검증 설정이 누락되었습니다.' }, { status: 500 });
        }
        const { assemblyId: qrAssemblyId, snapshotId: qrSnapshotId, timestamp, hmac } = qr_data;
        if (qrAssemblyId !== assemblyId || qrSnapshotId !== snapshot_id) {
          return NextResponse.json({ error: 'QR 데이터가 일치하지 않습니다.' }, { status: 400 });
        }
        // 5분 만료
        if (Date.now() - (timestamp || 0) > 5 * 60 * 1000) {
          return NextResponse.json({ error: 'QR 코드가 만료되었습니다.' }, { status: 400 });
        }
        const payload = `${qrAssemblyId}:${qrSnapshotId}:${timestamp}`;
        const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        const hmacBuffer = Buffer.from(hmac, 'hex');
        const expectedBuffer = Buffer.from(expectedHmac, 'hex');
        if (hmacBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(hmacBuffer, expectedBuffer)) {
          return NextResponse.json({ error: 'QR 코드 검증에 실패했습니다.' }, { status: 403 });
        }
      }

      // 기존 출석 로그 확인 (중복 방지)
      const { data: existing } = await supabase
        .from('assembly_attendance_logs')
        .select('id, entry_at')
        .eq('assembly_id', assemblyId)
        .eq('snapshot_id', snapshot_id)
        .eq('union_id', unionId)
        .is('exit_at', null)
        .single();

      if (existing) {
        return NextResponse.json({ error: '이미 체크인된 조합원입니다.' }, { status: 409 });
      }

      // 전체 체크인 기록 확인 (재체크인 여부 판단) (M-6)
      const { count: totalCheckins } = await supabase
        .from('assembly_attendance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('assembly_id', assemblyId)
        .eq('snapshot_id', snapshot_id)
        .eq('union_id', unionId);

      const isReCheckin = (totalCheckins || 0) > 0;

      const { data, error } = await supabase
        .from('assembly_attendance_logs')
        .insert({
          assembly_id: assemblyId,
          union_id: unionId,
          snapshot_id,
          user_id: snapshot.user_id,
          attendance_type,
          entry_at: now,
          qr_checkin_at: now,
          checkin_by: auth.user.id,
          ip_address: ipAddress,
          user_agent: userAgent,
          identity_verified: false,
          device_info: {
            ...(qr_data ? { qr_verified: true } : {}),
            ...(isReCheckin ? { re_checkin: true, previous_checkin_count: totalCheckins } : {}),
          },
        })
        .select('*')
        .single();

      if (error) {
        console.error('체크인 기록 실패:', error);
        return NextResponse.json({ error: '체크인 처리에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ data }, { status: 201 });
    } else {
      // 체크아웃: 기존 로그 업데이트
      const { data: existing } = await supabase
        .from('assembly_attendance_logs')
        .select('id')
        .eq('assembly_id', assemblyId)
        .eq('snapshot_id', snapshot_id)
        .eq('union_id', unionId)
        .is('exit_at', null)
        .single();

      if (!existing) {
        return NextResponse.json({ error: '체크인 기록을 찾을 수 없습니다.' }, { status: 404 });
      }

      const { data, error } = await supabase
        .from('assembly_attendance_logs')
        .update({ exit_at: now, qr_checkout_at: now })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        console.error('체크아웃 기록 실패:', error);
        return NextResponse.json({ error: '체크아웃 처리에 실패했습니다.' }, { status: 500 });
      }

      return NextResponse.json({ data });
    }
  } catch (error) {
    console.error('POST /api/assemblies/[id]/attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
