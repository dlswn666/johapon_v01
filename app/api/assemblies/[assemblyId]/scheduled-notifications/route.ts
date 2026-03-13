import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const VALID_NOTIFICATION_TYPES = ['CONVOCATION_NOTICE', 'INDIVIDUAL_NOTICE'] as const;

/**
 * 예약 알림 목록 조회
 * GET /api/assemblies/[assemblyId]/scheduled-notifications
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('예약 알림 목록 조회 실패:', error);
      return NextResponse.json({ error: '예약 알림 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/scheduled-notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 예약 알림 생성
 * POST /api/assemblies/[assemblyId]/scheduled-notifications
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();
    const body = await request.json();
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { notification_type, document_id, scheduled_at } = body;

    if (!notification_type || !VALID_NOTIFICATION_TYPES.includes(notification_type)) {
      return NextResponse.json(
        { error: '유효한 알림 유형을 지정하세요. (CONVOCATION_NOTICE 또는 INDIVIDUAL_NOTICE)' },
        { status: 400 }
      );
    }

    if (!scheduled_at) {
      return NextResponse.json({ error: '발송 예약 일시를 지정하세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        notification_type,
        document_id: document_id || null,
        scheduled_at,
        status: 'PENDING',
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('예약 알림 생성 실패:', error);
      return NextResponse.json({ error: '예약 알림 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/scheduled-notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 예약 알림 취소
 * DELETE /api/assemblies/[assemblyId]/scheduled-notifications
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;
    const supabase = await createClient();
    const body = await request.json();
    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { notification_id } = body;

    if (!notification_id) {
      return NextResponse.json({ error: '취소할 알림 ID를 지정하세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('scheduled_notifications')
      .update({ status: 'CANCELLED' })
      .eq('id', notification_id)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('status', 'PENDING')
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '취소할 수 있는 예약 알림을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('예약 알림 취소 실패:', error);
      return NextResponse.json({ error: '예약 알림 취소에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('DELETE /api/assemblies/[id]/scheduled-notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
