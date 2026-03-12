/**
 * 알림 서비스 — 알림 발송 기록 관리
 * 실제 발송은 기존 sendAlimTalk 사용, 여기서는 배치 기록 + 증거 보전
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationType, NotificationDeliveryChannel } from '@/app/_lib/shared/type/assembly.types';

interface SendNotificationParams {
  assemblyId: string;
  unionId: string;
  notificationType: NotificationType;
  documentId?: string;
  documentHash?: string;
  documentVersion?: number;
  deliveryChannel?: NotificationDeliveryChannel;
  sentBy: string;
  totalRecipients: number;
}

/** 알림 배치 생성 (발송 시작) */
export async function createNotificationBatch(
  supabase: SupabaseClient,
  params: SendNotificationParams
) {
  const { data, error } = await supabase
    .from('notification_batches')
    .insert({
      assembly_id: params.assemblyId,
      union_id: params.unionId,
      notification_type: params.notificationType,
      document_id: params.documentId || null,
      document_hash: params.documentHash || null,
      document_version: params.documentVersion || null,
      delivery_channel: params.deliveryChannel || 'KAKAO_ALIMTALK',
      status: 'SENDING',
      sent_by: params.sentBy,
      sent_at: new Date().toISOString(),
      total_recipients: params.totalRecipients,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: '알림 배치 생성에 실패했습니다.', data: null };
  }

  return { success: true, error: null, data };
}

/** 알림 배치 완료 업데이트 */
export async function updateNotificationBatchResult(
  supabase: SupabaseClient,
  batchId: string,
  result: {
    deliveredCount: number;
    failedCount: number;
    providerBatchRef?: string;
    failureDetails?: Record<string, unknown>;
  }
) {
  const totalRecipients = result.deliveredCount + result.failedCount;
  let status: string;
  if (result.failedCount === 0) {
    status = 'DELIVERED';
  } else if (result.deliveredCount === 0) {
    status = 'FAILED';
  } else {
    status = 'PARTIALLY_DELIVERED';
  }

  const { error } = await supabase
    .from('notification_batches')
    .update({
      status,
      delivered_count: result.deliveredCount,
      failed_count: result.failedCount,
      completed_at: new Date().toISOString(),
      provider_batch_ref: result.providerBatchRef || null,
      failure_details: result.failureDetails || {},
    })
    .eq('id', batchId);

  if (error) {
    return { success: false, error: '알림 배치 업데이트에 실패했습니다.' };
  }

  return { success: true, status };
}

/** 알림 이력 조회 */
export async function getNotificationHistory(
  supabase: SupabaseClient,
  assemblyId: string,
  unionId: string
) {
  const { data, error } = await supabase
    .from('notification_batches')
    .select('*')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId)
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: '알림 이력 조회에 실패했습니다.', data: null };
  }

  return { success: true, error: null, data: data || [] };
}
