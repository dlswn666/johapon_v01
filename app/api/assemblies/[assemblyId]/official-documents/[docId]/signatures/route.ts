import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { getDocumentSignatures } from '@/app/_lib/features/assembly/services/signatureService';

interface RouteContext {
  params: Promise<{ assemblyId: string; docId: string }>;
}

/**
 * 서명 목록 조회
 * GET /api/assemblies/[assemblyId]/official-documents/[docId]/signatures
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId, docId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
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

    const result = await getDocumentSignatures(supabase, docId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/official-documents/[docId]/signatures error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
