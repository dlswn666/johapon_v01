import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';

const PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

async function generateProxyToken(unionId: string, userId: string): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET 미설정');
  const secret = new TextEncoder().encode(jwtSecret);
  return await new SignJWT({ unionId, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);
}

/**
 * 미투표자 일일 알림 (Vercel Cron)
 * GET /api/evotes/reminders
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. 진행 중인 전자투표 총회 조회
    const { data: assemblies, error: asmError } = await supabase
      .from('assemblies')
      .select('id, union_id, title, final_deadline')
      .in('status', ['VOTING', 'PRE_VOTING'])
      .gt('final_deadline', new Date().toISOString());

    if (asmError || !assemblies?.length) {
      return NextResponse.json({
        message: '진행 중인 전자투표 없음',
        count: 0,
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let totalSent = 0;
    let totalFailed = 0;

    for (const assembly of assemblies) {
      // 2. 투표 대상자 조회
      const { data: snapshots } = await supabase
        .from('assembly_member_snapshots')
        .select('user_id, member_phone, member_name')
        .eq('assembly_id', assembly.id)
        .eq('is_active', true);

      if (!snapshots?.length) continue;

      // 3. 이미 투표한 사람 제외
      const { data: voted } = await supabase
        .from('participation_records')
        .select('user_id')
        .eq('assembly_id', assembly.id)
        .eq('is_superseded', false);

      const votedSet = new Set((voted || []).map((v) => v.user_id));

      // 4. 오늘 이미 알림 보낸 사람 제외
      const { data: sentToday } = await supabase
        .from('evote_reminder_logs')
        .select('user_id')
        .eq('assembly_id', assembly.id)
        .gte('sent_at', todayStart.toISOString());

      const sentSet = new Set((sentToday || []).map((s) => s.user_id));

      // 5. 미투표 + 오늘 미발송 대상
      const targets = snapshots.filter(
        (s) => !votedSet.has(s.user_id) && !sentSet.has(s.user_id) && s.member_phone
      );

      if (targets.length === 0) continue;

      // 6. 프록시 서버로 SMS 발송
      try {
        const token = await generateProxyToken(assembly.union_id, 'system-cron');

        const smsRes = await fetch(`${PROXY_URL}/api/sms/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            unionId: assembly.union_id,
            recipients: targets.map((t) => ({
              name: t.member_name,
              phone: t.member_phone,
            })),
            message: `아직 투표에 참여하지 않으셨습니다. [${assembly.title}] 투표에 참여해주세요.`,
            msgType: 'SMS',
          }),
        });

        const success = smsRes.ok;

        // 7. 발송 이력 기록
        const logs = targets.map((t) => ({
          assembly_id: assembly.id,
          union_id: assembly.union_id,
          user_id: t.user_id,
          channel: 'KAKAO_ALIMTALK',
          status: success ? 'SENT' : 'FAILED',
        }));

        await supabase.from('evote_reminder_logs').insert(logs);

        if (success) {
          totalSent += targets.length;
        } else {
          totalFailed += targets.length;
        }
      } catch (sendError) {
        console.error(`알림 발송 실패 (assembly ${assembly.id}):`, sendError);
        totalFailed += targets.length;

        const failLogs = targets.map((t) => ({
          assembly_id: assembly.id,
          union_id: assembly.union_id,
          user_id: t.user_id,
          channel: 'KAKAO_ALIMTALK',
          status: 'FAILED',
        }));
        await supabase.from('evote_reminder_logs').insert(failLogs);
      }
    }

    return NextResponse.json({
      message: '미투표 알림 발송 완료',
      sent: totalSent,
      failed: totalFailed,
      assemblies: assemblies.length,
    });
  } catch (error) {
    console.error('GET /api/evotes/reminders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
