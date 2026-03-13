import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import {
  createNotificationBatch,
  updateNotificationBatchResult,
  getNotificationHistory,
} from '@/app/_lib/features/assembly/services/notificationService';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';
import type { NotificationType } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  'CONVOCATION_NOTICE', 'NOTICE_REMINDER', 'VOTE_START',
  'VOTE_REMINDER', 'RESULT_PUBLICATION', 'SIGNATURE_REQUEST',
  'MINUTES_CORRECTION',
];

// 알림 유형 → 알림톡 템플릿 코드 매핑
const TEMPLATE_MAP: Partial<Record<NotificationType, string>> = {
  CONVOCATION_NOTICE: 'ASSEMBLY_NOTICE',
  NOTICE_REMINDER: 'ASSEMBLY_NOTICE',
  VOTE_START: 'VOTE_START',
  VOTE_REMINDER: 'VOTE_REMINDER',
  RESULT_PUBLICATION: 'RESULT_PUBLICATION',
};

/**
 * 알림 이력 조회
 * GET /api/assemblies/[assemblyId]/notifications
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

    const result = await getNotificationHistory(supabase, assemblyId, unionId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 알림 발송
 * POST /api/assemblies/[assemblyId]/notifications
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

    const { notificationType, documentId } = body;

    if (!notificationType || !VALID_NOTIFICATION_TYPES.includes(notificationType)) {
      return NextResponse.json({ error: '유효한 알림 유형을 지정하세요.' }, { status: 400 });
    }

    // 수신자 목록 (스냅샷 기반)
    const { data: snapshots } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id, member_name, member_phone')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true)
      .not('member_phone', 'is', null);

    const recipients = snapshots || [];

    if (recipients.length === 0) {
      return NextResponse.json({ error: '발송 대상이 없습니다.' }, { status: 400 });
    }

    // 문서 해시 조회 (문서 연동 시)
    let docHash: string | undefined;
    let docVersion: number | undefined;
    if (documentId) {
      const { data: doc } = await supabase
        .from('official_documents')
        .select('content_hash, version')
        .eq('id', documentId)
        .single();
      docHash = doc?.content_hash || undefined;
      docVersion = doc?.version || undefined;
    }

    // 배치 기록 생성
    const batchResult = await createNotificationBatch(supabase, {
      assemblyId,
      unionId,
      notificationType,
      documentId,
      documentHash: docHash,
      documentVersion: docVersion,
      sentBy: auth.user.id,
      totalRecipients: recipients.length,
    });

    if (!batchResult.success || !batchResult.data) {
      return NextResponse.json({ error: batchResult.error }, { status: 500 });
    }

    const batchId = batchResult.data.id;

    // 비동기 알림톡 발송
    const templateCode = TEMPLATE_MAP[notificationType as NotificationType];
    if (templateCode) {
      const alimtalkRecipients = recipients
        .filter((r) => r.member_phone)
        .map((r) => ({
          phoneNumber: r.member_phone!,
          name: r.member_name,
          variables: {
            이름: r.member_name,
          },
        }));

      sendAlimTalk({
        unionId,
        templateCode,
        recipients: alimtalkRecipients,
      }).then(async (result) => {
        const deliveredCount = result.success ? alimtalkRecipients.length : 0;
        const failedCount = result.success ? 0 : alimtalkRecipients.length;
        await updateNotificationBatchResult(supabase, batchId, {
          deliveredCount,
          failedCount,
          failureDetails: result.success ? {} : { error: result.error },
        });
      }).catch(async (err) => {
        await updateNotificationBatchResult(supabase, batchId, {
          deliveredCount: 0,
          failedCount: alimtalkRecipients.length,
          failureDetails: { error: String(err) },
        });
      });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'NOTIFICATION_SENT',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'notification_batch',
      target_id: batchId,
      event_data: { notificationType, totalRecipients: recipients.length },
    });

    return NextResponse.json({
      data: batchResult.data,
      totalRecipients: recipients.length,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
