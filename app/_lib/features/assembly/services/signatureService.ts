/**
 * 서명 서비스 — 문서 서명/봉인 워크플로우
 * sign_document_atomic RPC를 통한 원자적 서명 처리
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SignerRole, SignatureMethod } from '@/app/_lib/shared/type/assembly.types';
import { isSealableStatus } from '../domain/documentStateMachine';

interface SignDocumentParams {
  documentId: string;
  signerId: string;
  signerName: string;
  signerRole: SignerRole;
  signatureMethod: SignatureMethod;
  expectedHash: string;
  threshold: number;
  ipAddress?: string;
  userAgent?: string;
}

/** 문서 서명 (RPC 호출) */
export async function signDocument(
  supabase: SupabaseClient,
  params: SignDocumentParams
) {
  const { data, error } = await supabase.rpc('sign_document_atomic', {
    p_document_id: params.documentId,
    p_signer_id: params.signerId,
    p_signer_name: params.signerName,
    p_signer_role: params.signerRole,
    p_method: params.signatureMethod,
    p_expected_hash: params.expectedHash,
    p_threshold: params.threshold,
    p_ip_address: params.ipAddress || null,
    p_user_agent: params.userAgent || null,
  });

  if (error) {
    return { success: false, error: '서명 처리 중 오류가 발생했습니다.' };
  }

  return data as {
    success: boolean;
    error?: string;
    signatureId?: string;
    thresholdMet?: boolean;
    currentCount?: number;
    requiredCount?: number;
  };
}

/** 서명 목록 조회 */
export async function getDocumentSignatures(
  supabase: SupabaseClient,
  documentId: string
) {
  const { data, error } = await supabase
    .from('document_signatures')
    .select('*')
    .eq('document_id', documentId)
    .eq('status', 'VALID')
    .order('signed_at', { ascending: true });

  if (error) {
    return { success: false, error: '서명 목록 조회에 실패했습니다.', data: null };
  }

  return { success: true, error: null, data: data || [] };
}

/** 문서 봉인 */
export async function sealDocument(
  supabase: SupabaseClient,
  documentId: string,
  actorId: string
) {
  // 문서 상태 확인
  const { data: doc } = await supabase
    .from('official_documents')
    .select('status')
    .eq('id', documentId)
    .single();

  if (!doc) {
    return { success: false, error: '문서를 찾을 수 없습니다.' };
  }

  if (!isSealableStatus(doc.status)) {
    return { success: false, error: `현재 상태(${doc.status})에서는 봉인할 수 없습니다. SIGNED_COMPLETE 상태여야 합니다.` };
  }

  const { data, error } = await supabase
    .from('official_documents')
    .update({
      status: 'SEALED',
      sealed_at: new Date().toISOString(),
      sealed_by: actorId,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    return { success: false, error: '봉인 처리에 실패했습니다.' };
  }

  return { success: true, data };
}
