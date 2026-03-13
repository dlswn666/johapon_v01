import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 공지사항 목록 조회 (관리자 전용, 최근 20개)
 * GET /api/assemblies/[assemblyId]/announcements
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

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assembly_announcements')
      .select('id, content, created_by, created_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('공지사항 조회 실패:', error);
      return NextResponse.json({ error: '공지사항을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/announcements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 공지사항 등록 (관리자 전용)
 * POST /api/assemblies/[assemblyId]/announcements
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
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { content } = body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: '공지 내용을 입력해주세요.' }, { status: 400 });
    }

    const sanitized = content.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

    if (sanitized.length > 500) {
      return NextResponse.json({ error: '공지사항은 500자 이내로 작성해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assembly_announcements')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        content: sanitized,
        created_by: auth.user.id,
      })
      .select('id, content, created_at')
      .single();

    if (error) {
      console.error('공지사항 등록 실패:', error);
      return NextResponse.json({ error: '공지사항 등록에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그 기록 (해시 체인은 DB 트리거가 자동 계산)
    const { error: auditError } = await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'ANNOUNCEMENT_CREATED',
        actor_id: auth.user.id,
        actor_role: 'ADMIN',
        target_type: 'announcement',
        target_id: data.id,
        event_data: { content: sanitized },
      });

    if (auditError) {
      console.error('감사 로그 기록 실패:', auditError);
    }

    return NextResponse.json({ data: { id: data.id, content: data.content, createdAt: data.created_at } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/announcements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
