import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import { transitionDocumentStatus } from '@/app/_lib/features/assembly/services/documentService';
import type { DocumentStatus } from '@/app/_lib/shared/type/assembly.types';

const MAX_SOURCE_JSON_SIZE = 512 * 1024; // 512KB

interface RouteContext {
  params: Promise<{ assemblyId: string; docId: string }>;
}

const VALID_DOC_STATUSES: DocumentStatus[] = [
  'DRAFT', 'GENERATED', 'REVIEW', 'APPROVED',
  'SIGNED_PARTIAL', 'SIGNED_COMPLETE', 'SEALED',
  'SUPERSEDED', 'VOID',
];

// 상태 전이 → 감사 로그 이벤트 매핑
const STATUS_EVENT_MAP: Record<string, string> = {
  REVIEW: 'DOCUMENT_REVIEWED',
  APPROVED: 'DOCUMENT_APPROVED',
  SEALED: 'DOCUMENT_SEALED',
  VOID: 'DOCUMENT_VOIDED',
};

/**
 * 공식 문서 상세 조회
 * GET /api/assemblies/[assemblyId]/official-documents/[docId]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId, docId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('official_documents')
      .select('*')
      .eq('id', docId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/official-documents/[docId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 공식 문서 수정/상태 전이
 * PATCH /api/assemblies/[assemblyId]/official-documents/[docId]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, docId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    // 문서가 해당 총회에 속하는지 확인
    const { data: doc } = await supabase
      .from('official_documents')
      .select('id, status')
      .eq('id', docId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 상태 전이
    if (body.status && VALID_DOC_STATUSES.includes(body.status)) {
      const result = await transitionDocumentStatus(
        supabase, docId, body.status, auth.user.id,
        { voidReason: body.voidReason }
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // 감사 로그
      const eventType = STATUS_EVENT_MAP[body.status] || 'DOCUMENT_STATUS_CHANGE';
      await supabase.from('assembly_audit_logs').insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: eventType,
        actor_id: auth.user.id,
        actor_role: 'ADMIN',
        target_type: 'official_document',
        target_id: docId,
        event_data: { fromStatus: doc.status, toStatus: body.status },
      });

      return NextResponse.json({ data: result.data });
    }

    // SEC-4: sourceJson 크기 제한
    if (body.sourceJson) {
      const sourceJsonStr = JSON.stringify(body.sourceJson);
      if (sourceJsonStr.length > MAX_SOURCE_JSON_SIZE) {
        return NextResponse.json(
          { error: `sourceJson 크기가 제한을 초과합니다.` },
          { status: 400 }
        );
      }
    }

    // 내용 수정 (DRAFT/GENERATED 상태에서만)
    if (body.sourceJson || body.htmlContent) {
      if (!['DRAFT', 'GENERATED'].includes(doc.status)) {
        return NextResponse.json({ error: '현재 상태에서는 내용을 수정할 수 없습니다.' }, { status: 400 });
      }

      const updateData: Record<string, unknown> = {};
      if (body.sourceJson) updateData.source_json = body.sourceJson;
      if (body.htmlContent !== undefined) updateData.html_content = body.htmlContent;
      if (body.requiredSigners) updateData.required_signers = body.requiredSigners;
      if (body.signatureThreshold !== undefined) updateData.signature_threshold = body.signatureThreshold;

      const { data: updated, error: updateError } = await supabase
        .from('official_documents')
        .update(updateData)
        .eq('id', docId)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: '문서 수정에 실패했습니다.' }, { status: 500 });
      }

      // 해시 재생성
      await supabase.rpc('generate_document_hash', { p_document_id: docId });

      const { data: refreshed } = await supabase
        .from('official_documents')
        .select('*')
        .eq('id', docId)
        .single();

      return NextResponse.json({ data: refreshed || updated });
    }

    return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/official-documents/[docId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
