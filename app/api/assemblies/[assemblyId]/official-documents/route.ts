import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { generateDocument } from '@/app/_lib/features/assembly/services/documentService';
import type { OfficialDocumentType } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const VALID_DOC_TYPES: OfficialDocumentType[] = [
  'CONVOCATION_NOTICE', 'AGENDA_EXPLANATION', 'E_VOTING_GUIDE',
  'CONSENT_FORM', 'PROXY_FORM', 'MINUTES',
  'RESULT_PUBLICATION', 'EVIDENCE_PACKAGE_SUMMARY',
];

/**
 * 공식 문서 목록 조회
 * GET /api/assemblies/[assemblyId]/official-documents
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // 총회 존재 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    const documentType = request.nextUrl.searchParams.get('type');
    const includeSuperseded = request.nextUrl.searchParams.get('includeSuperseded') === 'true';

    let query = supabase
      .from('official_documents')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (!includeSuperseded) {
      query = query.not('status', 'in', '("SUPERSEDED","VOID")');
    }

    const { data, error } = await query.order('document_type').order('version', { ascending: false });

    if (error) {
      console.error('문서 목록 조회 실패:', error);
      return NextResponse.json({ error: '문서 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/official-documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 공식 문서 생성
 * POST /api/assemblies/[assemblyId]/official-documents
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

    const { documentType, agendaItemId, sourceJson, htmlContent } = body;

    if (!documentType || !VALID_DOC_TYPES.includes(documentType)) {
      return NextResponse.json({ error: '유효한 문서 유형을 지정하세요.' }, { status: 400 });
    }

    // 총회 존재 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    const result = await generateDocument(supabase, {
      assemblyId,
      unionId,
      documentType,
      agendaItemId,
      sourceJson: sourceJson || {},
      htmlContent,
      createdBy: auth.user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'DOCUMENT_GENERATED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'official_document',
      target_id: result.data?.id || '',
      event_data: { documentType, version: result.data?.version },
    });

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/official-documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
