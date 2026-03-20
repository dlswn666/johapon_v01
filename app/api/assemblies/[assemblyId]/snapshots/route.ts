import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 스냅샷 생성 가능한 총회 상태
const SNAPSHOT_ALLOWED_STATUSES = ['DRAFT', 'NOTICE_SENT', 'CONVENED'];

/**
 * 조합원 스냅샷 목록 조회 (관리자 전용)
 * GET /api/assemblies/[assemblyId]/snapshots
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assembly_member_snapshots')
      .select('id, member_name, member_phone, property_address, voting_weight, member_type, access_token, identity_verified_at, token_used_at, is_active, created_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true)
      .order('member_name', { ascending: true });

    if (error) {
      console.error('스냅샷 목록 조회 실패:', error);
      return NextResponse.json({ error: '스냅샷 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/snapshots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 조합원 스냅샷 일괄 생성 (관리자 전용)
 * POST /api/assemblies/[assemblyId]/snapshots
 *
 * 조합 소속 멤버(APPROVED, PRE_REGISTERED) → 스냅샷 + 접근 토큰 생성
 * 이미 스냅샷이 존재하면 중복 생성하지 않음
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // body를 읽어 action 확인 (confirm 액션은 multisig 완료 필수)
    let requestBody: { action?: string } = {};
    try { requestBody = await request.json(); } catch { /* body 없는 경우 허용 */ }

    const supabase = await createClient();

    // [신규] SNAPSHOT_CONFIRM multisig 완료 확인 (SEC-02, 합의 1)
    if (requestBody.action === 'confirm') {
      const { data: multisig } = await supabase
        .from('multisig_approvals')
        .select('id, status')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('action_type', 'SNAPSHOT_CONFIRM')
        .eq('status', 'COMPLETED')
        .maybeSingle();

      if (!multisig) {
        return NextResponse.json(
          { error: '스냅샷 확정을 위한 다중 서명(조합장 + 선관위원장 2/2)이 완료되지 않았습니다.' },
          { status: 403 }
        );
      }
    }

    // 총회 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, status, title')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!SNAPSHOT_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json(
        { error: `현재 상태(${assembly.status})에서는 스냅샷을 생성할 수 없습니다. 초안/소집공고/소집완료 상태에서만 가능합니다.` },
        { status: 400 }
      );
    }

    // 기존 스냅샷 확인
    const { count: existingCount } = await supabase
      .from('assembly_member_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true);

    if (existingCount && existingCount > 0) {
      return NextResponse.json(
        { error: `이미 ${existingCount}명의 스냅샷이 생성되어 있습니다. 재생성하려면 기존 스냅샷을 먼저 비활성화하세요.` },
        { status: 409 }
      );
    }

    // get_snapshot_eligible_members RPC로 의결권 기준 대상 조회
    // (1인 1의결권, 공동소유 대표자만, 병합된 중복 제외)
    const { data: eligibleMembers, error: membersError } = await supabase
      .rpc('get_snapshot_eligible_members', { p_union_id: unionId });

    if (membersError) {
      console.error('멤버 조회 실패:', membersError);
      return NextResponse.json({ error: '조합원 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    if (!eligibleMembers || eligibleMembers.length === 0) {
      return NextResponse.json({ error: '투표 가능한 조합원이 없습니다.' }, { status: 400 });
    }

    // 토큰 만료: 총회일 + 24시간 (여유)
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30일

    // 스냅샷 + 토큰 일괄 생성 (도시정비법 1인 1의결권 고정)
    const snapshots = eligibleMembers.map((member: {
      user_id: string;
      member_name: string;
      entity_type: string;
      primary_address: string | null;
    }) => {
      const rawToken = nanoid(32); // URL-safe 32자 토큰
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const memberType =
        member.entity_type === 'CORPORATION' ? 'CORPORATION'
        : member.entity_type === 'GOVERNMENT' ? 'GOVERNMENT'
        : 'INDIVIDUAL';

      return {
        assembly_id: assemblyId,
        union_id: unionId,
        user_id: member.user_id,
        member_name: member.member_name || '이름 없음',
        property_address: member.primary_address || null,
        voting_weight: 1, // 도시정비법 §45 1인 1의결권
        entity_type: member.entity_type || 'INDIVIDUAL',
        member_type: memberType,
        access_token: rawToken,
        access_token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
        is_active: true,
      };
    });

    // Supabase는 한번에 최대 1000건 insert 가능 — 배치 처리
    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      const batch = snapshots.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('assembly_member_snapshots')
        .insert(batch);

      if (insertError) {
        console.error(`스냅샷 배치 삽입 실패 (${i}~${i + batch.length}):`, insertError);
        return NextResponse.json(
          { error: `스냅샷 생성 중 오류가 발생했습니다. (${totalInserted}건 생성됨)` },
          { status: 500 }
        );
      }
      totalInserted += batch.length;
    }

    return NextResponse.json({
      data: {
        totalCreated: totalInserted,
        assemblyTitle: assembly.title,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/snapshots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 대리인 등록/해제 가능한 총회 상태
const PROXY_ALLOWED_STATUSES = ['DRAFT', 'NOTICE_SENT', 'CONVENED'];

/**
 * 대리인 등록/해제 (P0-2, 도정법 §45⑤)
 * PATCH /api/assemblies/[assemblyId]/snapshots
 * Body: {
 *   snapshot_id: string,
 *   proxy_user_id: string | null,  // null이면 위임 해제
 *   proxy_name: string | null,
 *   proxy_relation?: string,
 *   proxy_document_url?: string | null
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { snapshot_id, proxy_user_id, proxy_name, proxy_document_url } = body;

    if (!snapshot_id || typeof snapshot_id !== 'string') {
      return NextResponse.json({ error: '스냅샷 ID가 필요합니다.' }, { status: 400 });
    }

    // 총회 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!PROXY_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({
        error: `현재 상태(${assembly.status})에서는 대리인을 등록/해제할 수 없습니다.`,
      }, { status: 400 });
    }

    // 스냅샷 존재 확인
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id')
      .eq('id', snapshot_id)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: '스냅샷을 찾을 수 없습니다.' }, { status: 404 });
    }

    let update: Record<string, unknown>;
    let eventType: string;
    let eventData: Record<string, unknown>;

    if (proxy_user_id) {
      // 대리인 등록
      if (typeof proxy_user_id !== 'string') {
        return NextResponse.json({ error: '대리인 사용자 ID가 유효하지 않습니다.' }, { status: 400 });
      }

      // 본인 지정 불가
      if (snapshot.user_id === proxy_user_id) {
        return NextResponse.json({ error: '본인을 대리인으로 지정할 수 없습니다.' }, { status: 400 });
      }

      // 같은 조합 소속 확인
      const { data: proxyUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', proxy_user_id)
        .eq('union_id', unionId)
        .single();

      if (!proxyUser) {
        return NextResponse.json({ error: '대리인이 같은 조합 소속이 아닙니다.' }, { status: 400 });
      }

      update = {
        proxy_user_id,
        proxy_name: proxy_name || null,
        proxy_authorized_at: new Date().toISOString(),
        proxy_document_url: proxy_document_url || null,
      };
      eventType = 'PROXY_REGISTERED';
      eventData = { snapshot_id, proxy_user_id, proxy_name };
    } else {
      // 위임 해제
      update = {
        proxy_user_id: null,
        proxy_name: null,
        proxy_authorized_at: null,
        proxy_document_url: null,
      };
      eventType = 'PROXY_REVOKED';
      eventData = { snapshot_id, prev_proxy_user_id: snapshot.user_id };
    }

    const { data, error } = await supabase
      .from('assembly_member_snapshots')
      .update(update)
      .eq('id', snapshot_id)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .select('id, member_name, proxy_user_id, proxy_name, proxy_authorized_at, proxy_document_url')
      .single();

    if (error || !data) {
      console.error('대리인 등록/해제 실패:', error);
      return NextResponse.json({ error: '대리인 처리에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: eventType,
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'assembly_member_snapshot',
      target_id: snapshot_id,
      event_data: eventData,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/snapshots error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
