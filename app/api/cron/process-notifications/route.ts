import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * 예약 알림 처리 Cron Job
 * GET /api/cron/process-notifications
 *
 * Vercel Cron에 의해 매시간 호출됩니다.
 * CRON_SECRET 헤더로 인증합니다.
 */
export async function GET(request: NextRequest) {
  try {
    // Cron 비밀키 검증
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Service Role 클라이언트 (RLS 우회)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 처리 대상 알림 조회: PENDING 상태 && 예약 시각이 현재 이전
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('예약 알림 조회 실패:', fetchError);
      return NextResponse.json(
        { error: '예약 알림 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({ processed: 0, failed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const notification of pendingNotifications) {
      try {
        // TODO: 실제 AlimTalk 발송 연동
        // 현재는 로그만 기록
        console.log(
          `[Cron] 알림 처리: id=${notification.id}, type=${notification.notification_type}, assembly=${notification.assembly_id}`
        );

        // 상태를 COMPLETED로 업데이트
        const { error: updateError } = await supabase
          .from('scheduled_notifications')
          .update({
            status: 'COMPLETED',
            executed_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        if (updateError) {
          throw updateError;
        }

        processed++;
      } catch (err) {
        console.error(`[Cron] 알림 처리 실패: id=${notification.id}`, err);

        // 상태를 FAILED로 업데이트
        await supabase
          .from('scheduled_notifications')
          .update({
            status: 'FAILED',
            error_message: err instanceof Error ? err.message : '알 수 없는 오류',
          })
          .eq('id', notification.id);

        failed++;
      }
    }

    return NextResponse.json({ processed, failed });
  } catch (error) {
    console.error('[Cron] process-notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
