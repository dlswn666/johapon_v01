/**
 * 문서 엔진 서비스 — 공식 문서 생성/상태 관리
 * Supabase 클라이언트를 직접 사용
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { OfficialDocumentType, DocumentStatus } from '@/app/_lib/shared/type/assembly.types';
import { canDocTransition, isImmutableStatus } from '../domain/documentStateMachine';
import { getDefaultRequiredSignerRoles, getDefaultSignatureThreshold } from '../domain/signatureRules';

interface GenerateDocumentParams {
  assemblyId: string;
  unionId: string;
  documentType: OfficialDocumentType;
  agendaItemId?: string;
  sourceJson: Record<string, unknown>;
  htmlContent?: string;
  createdBy: string;
}

/** 문서 생성 (DRAFT → GENERATED) */
export async function generateDocument(
  supabase: SupabaseClient,
  params: GenerateDocumentParams
) {
  const {
    assemblyId, unionId, documentType,
    agendaItemId, sourceJson, htmlContent, createdBy,
  } = params;

  // 기존 활성 문서 확인 (같은 type + agenda_item_id)
  const { data: existing } = await supabase
    .from('official_documents')
    .select('id, version')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId)
    .eq('document_type', documentType)
    .is('agenda_item_id', agendaItemId || null)
    .not('status', 'in', '("SUPERSEDED","VOID")')
    .order('version', { ascending: false })
    .limit(1);

  const currentVersion = existing?.[0]?.version || 0;
  const previousVersionId = existing?.[0]?.id || null;

  // 이전 버전 SUPERSEDED 처리
  if (previousVersionId) {
    await supabase
      .from('official_documents')
      .update({ status: 'SUPERSEDED' })
      .eq('id', previousVersionId);
  }

  // 필수 서명자 역할
  const requiredRoles = getDefaultRequiredSignerRoles(documentType);
  const threshold = getDefaultSignatureThreshold(documentType);

  // 문서 삽입
  const { data, error } = await supabase
    .from('official_documents')
    .insert({
      assembly_id: assemblyId,
      union_id: unionId,
      agenda_item_id: agendaItemId || null,
      document_type: documentType,
      version: currentVersion + 1,
      previous_version_id: previousVersionId,
      status: 'GENERATED',
      source_json: sourceJson,
      html_content: htmlContent || null,
      required_signers: requiredRoles.map((role) => ({ signer_id: '', signer_name: '', signer_role: role })),
      signature_threshold: threshold,
      generated_at: new Date().toISOString(),
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: '문서 생성에 실패했습니다.', data: null };
  }

  // 해시 생성 (RPC)
  await supabase.rpc('generate_document_hash', { p_document_id: data.id });

  // 해시 포함 재조회
  const { data: updated } = await supabase
    .from('official_documents')
    .select('*')
    .eq('id', data.id)
    .single();

  return { success: true, error: null, data: updated };
}

/** 문서 상태 전이 */
export async function transitionDocumentStatus(
  supabase: SupabaseClient,
  documentId: string,
  newStatus: DocumentStatus,
  actorId: string,
  options?: { voidReason?: string }
) {
  const { data: doc, error: fetchError } = await supabase
    .from('official_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !doc) {
    return { success: false, error: '문서를 찾을 수 없습니다.' };
  }

  if (isImmutableStatus(doc.status as DocumentStatus)) {
    return { success: false, error: '봉인/무효 처리된 문서는 수정할 수 없습니다.' };
  }

  if (!canDocTransition(doc.status as DocumentStatus, newStatus)) {
    return { success: false, error: `${doc.status}에서 ${newStatus}(으)로 전환할 수 없습니다.` };
  }

  const updateData: Record<string, unknown> = { status: newStatus };

  switch (newStatus) {
    case 'REVIEW':
      updateData.reviewed_at = new Date().toISOString();
      break;
    case 'APPROVED':
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = actorId;
      break;
    case 'SEALED':
      updateData.sealed_at = new Date().toISOString();
      updateData.sealed_by = actorId;
      break;
    case 'VOID':
      updateData.void_at = new Date().toISOString();
      updateData.void_reason = options?.voidReason || null;
      break;
  }

  const { data: updated, error: updateError } = await supabase
    .from('official_documents')
    .update(updateData)
    .eq('id', documentId)
    .select()
    .single();

  if (updateError) {
    return { success: false, error: '문서 상태 변경에 실패했습니다.' };
  }

  return { success: true, data: updated };
}
