import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import type { AssemblyRoleType } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 총회 역할 목록 조회
 * GET /api/assemblies/[assemblyId]/roles
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const myOnly = searchParams.get('my') === 'true';

    const supabase = await createClient();

    let query = supabase
      .from('assembly_roles')
      .select('*, users(name, phone)')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .is('revoked_at', null)
      .order('assigned_at', { ascending: true });

    if (myOnly) {
      query = query.eq('user_id', auth.user.id);
    }

    const { data, error } = myOnly ? await query.maybeSingle() : await query;

    if (error) {
      console.error('역할 목록 조회 실패:', error);
      return NextResponse.json({ error: '역할 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? (myOnly ? null : []) });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 역할 배정
 * POST /api/assemblies/[assemblyId]/roles
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

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { user_id, role } = body as { user_id: string; role: AssemblyRoleType };

    if (!user_id || !role) {
      return NextResponse.json({ error: 'user_id, role이 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 해당 조합 소속 확인
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user_id)
      .eq('union_id', unionId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: '해당 조합 소속 조합원이 아닙니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assembly_roles')
      .insert({
        assembly_id: assemblyId,
        union_id:    unionId,
        user_id,
        role,
        assigned_by: auth.user.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('역할 배정 실패:', error);
      // DB 트리거 겸직 금지 위반 에러 전달
      if (error.message?.includes('SR-001')) {
        return NextResponse.json(
          { error: '해당 조합원은 이미 핵심 역할을 맡고 있어 중복 배정이 불가합니다. (SR-001 겸직 금지)' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: '역할 배정에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'STATUS_CHANGE',
      actor_id:     auth.user.id,
      actor_role:   'ADMIN',
      target_type:  'assembly_role',
      target_id:    data.id,
      event_data:   { action: 'ROLE_ASSIGNED', role, user_id },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 역할 해제
 * DELETE /api/assemblies/[assemblyId]/roles
 * Body: { role_id: string }
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { role_id } = body as { role_id: string };
    if (!role_id) {
      return NextResponse.json({ error: 'role_id가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assembly_roles')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', role_id)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .is('revoked_at', null)
      .select('id, role, user_id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '역할 해제에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id:  assemblyId,
      union_id:     unionId,
      event_type:   'STATUS_CHANGE',
      actor_id:     auth.user.id,
      actor_role:   'ADMIN',
      target_type:  'assembly_role',
      target_id:    role_id,
      event_data:   { action: 'ROLE_REVOKED', role: data.role, user_id: data.user_id },
    });

    return NextResponse.json({ data: { revoked: true } });
  } catch (error) {
    console.error('DELETE /api/assemblies/[id]/roles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
