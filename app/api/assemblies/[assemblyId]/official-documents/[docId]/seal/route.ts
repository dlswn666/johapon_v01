import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import { sealDocument } from '@/app/_lib/features/assembly/services/signatureService';

interface RouteContext {
  params: Promise<{ assemblyId: string; docId: string }>;
}

/**
 * 문서 봉인
 * POST /api/assemblies/[assemblyId]/official-documents/[docId]/seal
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, docId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 문서가 해당 총회에 속하는지 확인
    const { data: doc } = await supabase
      .from('official_documents')
      .select('id')
      .eq('id', docId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    const result = await sealDocument(supabase, docId, auth.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'DOCUMENT_SEALED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'official_document',
      target_id: docId,
      event_data: { sealedAt: result.data?.sealed_at },
    });

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/official-documents/[docId]/seal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
