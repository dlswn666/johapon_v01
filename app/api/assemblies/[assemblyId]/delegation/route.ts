import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import type { ProxyRelationship } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 위임 생성
 * POST /api/assemblies/[assemblyId]/delegation
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

    let body: { delegatePhone?: string; delegateName?: string; relationship?: ProxyRelationship };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    if (!body.delegatePhone || !body.delegateName || !body.relationship) {
      return NextResponse.json({ error: '대리인 정보(전화번호, 이름, 관계)를 모두 입력해주세요.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 이미 활성 위임이 있는지 확인
    const { data: existingDelegation } = await supabase
      .from('proxy_registrations')
      .select('id, status')
      .eq('assembly_id', assemblyId)
      .eq('delegator_id', auth.user.id)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle();

    if (existingDelegation) {
      return NextResponse.json(
        { error: '이미 진행 중인 위임이 있습니다. 기존 위임을 취소한 후 다시 시도해주세요.' },
        { status: 409 }
      );
    }

    // 대리인 사용자 조회 (전화번호로 조합원 검색)
    const { data: delegateUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', body.delegatePhone)
      .eq('union_id', unionId)
      .maybeSingle();

    if (!delegateUser) {
      return NextResponse.json(
        { error: '해당 전화번호의 조합원을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (delegateUser.id === auth.user.id) {
      return NextResponse.json({ error: '본인에게 위임할 수 없습니다.' }, { status: 400 });
    }

    // C-04: 대리인 위임 건수 제한 (도시정비법 기준 최대 5건)
    const { count: activeDelegationCount, error: countError } = await supabase
      .from('proxy_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('delegate_user_id', delegateUser.id)
      .eq('assembly_id', assemblyId)
      .in('status', ['pending', 'confirmed']);

    if (countError) {
      console.error('위임 건수 조회 실패:', countError);
      return NextResponse.json({ error: '위임 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }

    if ((activeDelegationCount ?? 0) >= 5) {
      return NextResponse.json(
        { error: '해당 대리인은 이미 최대 위임 건수(5건)에 도달했습니다. 다른 대리인을 지정해주세요.' },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: delegation, error: insertError } = await supabase
      .from('proxy_registrations')
      .insert({
        assembly_id:       assemblyId,
        union_id:          unionId,
        delegator_id:      auth.user.id,
        delegate_user_id:  delegateUser.id,
        proxy_name:        body.delegateName,
        relationship:      body.relationship,
        status:            'pending',
        expires_at:        expiresAt,
      })
      .select('*')
      .single();

    if (insertError || !delegation) {
      console.error('위임 생성 실패:', insertError);
      return NextResponse.json({ error: '위임 생성에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'DELEGATION_CREATE',
      actor_id:     auth.user.id,
      actor_role:   'MEMBER',
      target_type:  'proxy_registration',
      target_id:    delegation.id,
      event_data:   { delegate_user_id: delegateUser.id, relationship: body.relationship },
    });

    return NextResponse.json({ data: delegation }, { status: 201 });
  } catch (error) {
    console.error('POST /delegation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
