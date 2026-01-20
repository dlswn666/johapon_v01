import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 프록시 서버 설정
const PROXY_SERVER_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3001';
const PROXY_API_TOKEN = process.env.PROXY_API_TOKEN || '';

// Supabase 클라이언트 (서버 사이드)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface Recipient {
  name: string;
  phone: string;
}

interface SendRequest {
  unionId: string;
  recipients: Recipient[];
  message: string;
  msgType: 'SMS' | 'LMS' | 'MMS';
  title?: string;
  startIndex?: number;
}

// 변수 치환 함수
function replaceVariables(template: string, recipient: Recipient): string {
  return template
    .replace(/\{이름\}/g, recipient.name)
    .replace(/\{name\}/g, recipient.name);
}

export async function POST(request: NextRequest) {
  try {
    // 프록시 서버 토큰 체크
    if (!PROXY_API_TOKEN) {
      console.error('Missing PROXY_API_TOKEN');
      return NextResponse.json(
        { error: '프록시 서버 인증 토큰이 설정되어 있지 않습니다.' },
        { status: 500 }
      );
    }

    const body: SendRequest = await request.json();
    const { unionId, recipients, message, msgType, title, startIndex = 0 } = body;

    if (!unionId || !recipients || !message || !msgType) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: '수신자가 없습니다.' },
        { status: 400 }
      );
    }

    // 수신자별 메시지 변수 치환
    const processedRecipients = recipients.map((recipient) => ({
      name: recipient.name,
      phone: recipient.phone,
      message: replaceVariables(message, recipient),
    }));

    // 프록시 서버 API 호출
    const proxyResponse = await fetch(`${PROXY_SERVER_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROXY_API_TOKEN}`,
      },
      body: JSON.stringify({
        recipients: processedRecipients,
        msgType,
        title: msgType === 'LMS' ? title : undefined,
      }),
    });

    const proxyResult = await proxyResponse.json();

    console.log('[SMS 발송 결과 - 프록시]', {
      unionId,
      recipientCount: recipients.length,
      startIndex,
      result: proxyResult,
    });

    if (proxyResponse.ok && proxyResult.success) {
      // 발송 로그 저장
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('sms_send_logs').insert({
          union_id: unionId,
          msg_type: msgType,
          total_count: recipients.length,
          success_count: proxyResult.success_cnt || recipients.length,
          fail_count: proxyResult.error_cnt || 0,
          status: 'completed',
          aligo_msg_id: proxyResult.msg_id,
        });
      } catch (logError) {
        console.error('SMS 로그 저장 실패:', logError);
        // 로그 저장 실패해도 전송은 성공
      }

      return NextResponse.json({
        success: true,
        msg_id: proxyResult.msg_id,
        success_cnt: proxyResult.success_cnt || recipients.length,
        error_cnt: proxyResult.error_cnt || 0,
        message: proxyResult.message,
      });
    } else {
      // 프록시 서버 에러
      return NextResponse.json(
        {
          error: proxyResult.error || proxyResult.message || '프록시 서버 오류',
          result_code: proxyResult.result_code,
          success_cnt: 0,
          error_cnt: recipients.length,
        },
        { status: proxyResponse.status || 400 }
      );
    }
  } catch (error) {
    console.error('SMS 전송 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SMS 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
