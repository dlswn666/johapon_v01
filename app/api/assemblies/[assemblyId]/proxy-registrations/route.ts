import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 대리인 등록 목록 조회
 * GET /api/assemblies/[assemblyId]/proxy-registrations
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

    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('proxy_registrations')
      .select('*, assembly_member_snapshots(member_name, member_phone, property_address)')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('대리인 목록 조회 실패:', error);
      return NextResponse.json({ error: '대리인 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/proxy-registrations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 대리인 등록
 * POST /api/assemblies/[assemblyId]/proxy-registrations
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

    const { snapshotId, proxyName, proxyPhone, proxyType, proxyUserId, proxyRelationship, scope, agendaIds, authorizationDocUrl } = body;

    if (!snapshotId || typeof snapshotId !== 'string') {
      return NextResponse.json({ error: '스냅샷 ID가 필요합니다.' }, { status: 400 });
    }
    if (!proxyName || typeof proxyName !== 'string' || !proxyName.trim()) {
      return NextResponse.json({ error: '대리인 이름이 필요합니다.' }, { status: 400 });
    }

    // 스냅샷 확인
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id')
      .eq('id', snapshotId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: '유효한 조합원 스냅샷이 아닙니다.' }, { status: 404 });
    }

    // 중복 등록 확인
    const { count: existingCount } = await supabase
      .from('proxy_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_id', snapshotId)
      .eq('assembly_id', assemblyId)
      .in('status', ['PENDING', 'APPROVED']);

    if (existingCount && existingCount > 0) {
      return NextResponse.json({ error: '이미 대리인이 등록되어 있습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('proxy_registrations')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        snapshot_id: snapshotId,
        delegator_user_id: snapshot.user_id,
        proxy_type: proxyType || 'MEMBER',
        proxy_user_id: proxyUserId || null,
        proxy_name: proxyName.trim(),
        proxy_phone: proxyPhone || null,
        proxy_relationship: proxyRelationship || null,
        authorization_doc_url: authorizationDocUrl || null,
        scope: scope || 'ALL_AGENDAS',
        agenda_ids: agendaIds || null,
      })
      .select()
      .single();

    if (error) {
      console.error('대리인 등록 실패:', error);
      return NextResponse.json({ error: '대리인 등록에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'PROXY_REGISTERED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'proxy_registration',
      target_id: data.id,
      event_data: { delegatorUserId: snapshot.user_id, proxyName: proxyName.trim() },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/proxy-registrations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
