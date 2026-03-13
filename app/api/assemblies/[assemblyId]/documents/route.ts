import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// 자료 열람 가능한 총회 상태
const DOC_VIEW_ALLOWED_STATUSES = ['CONVENED', 'IN_PROGRESS', 'VOTING', 'VOTING_CLOSED', 'CLOSED'];

/**
 * 총회 자료(안건 첨부 문서) 목록 조회
 * GET /api/assemblies/[assemblyId]/documents
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 총회 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly || !DOC_VIEW_ALLOWED_STATUSES.includes(assembly.status)) {
      return NextResponse.json({ error: '현재 자료를 열람할 수 없는 상태입니다.' }, { status: 403 });
    }

    // 스냅샷 확인 (본인확인 완료 여부)
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, identity_verified_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .single();

    if (!snapshot || !snapshot.identity_verified_at) {
      return NextResponse.json({ error: '본인인증이 완료되지 않았습니다.' }, { status: 403 });
    }

    // 현재 버전의 문서만 조회
    const { data, error } = await supabase
      .from('agenda_documents')
      .select('id, agenda_item_id, title, file_url, file_type, file_size, uploaded_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_current', true)
      .order('uploaded_at', { ascending: true });

    if (error) {
      console.error('자료 목록 조회 실패:', error);
      return NextResponse.json({ error: '자료 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 자료 열람 기록 저장
 * POST /api/assemblies/[assemblyId]/documents
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

    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }
    const { documentId } = body;

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ error: '문서 ID가 필요합니다.' }, { status: 400 });
    }

    // 문서가 해당 총회에 속하는지 확인
    const { count: docCount } = await supabase
      .from('agenda_documents')
      .select('*', { count: 'exact', head: true })
      .eq('id', documentId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    if (!docCount) {
      return NextResponse.json({ error: '유효하지 않은 문서입니다.' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    const { error } = await supabase
      .from('document_view_logs')
      .insert({
        document_id: documentId,
        assembly_id: assemblyId,
        union_id: unionId,
        user_id: auth.user.id,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (error) {
      console.error('열람 기록 저장 실패:', error);
      // 열람 기록 실패는 사용자에게 에러를 보여주지 않음
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
