import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// 프록시 서버 설정
const PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

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
}

// JWT 토큰 생성 (프록시 서버 인증용)
async function generateProxyToken(unionId: string, userId: string): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  }

  const secret = new TextEncoder().encode(jwtSecret);

  return await new SignJWT({ unionId, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);
}

export async function POST(request: NextRequest) {
  try {
    // JWT_SECRET 체크
    if (!process.env.JWT_SECRET) {
      console.error('Missing JWT_SECRET');
      return NextResponse.json(
        { error: 'JWT_SECRET 환경변수가 설정되어 있지 않습니다.' },
        { status: 500 }
      );
    }

    const body: SendRequest = await request.json();
    const { unionId, recipients, message, msgType, title } = body;

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

    // JWT 토큰 생성
    const token = await generateProxyToken(unionId, 'system-admin');

    // 프록시 서버 API 호출
    // 프록시 서버가 {이름} 변수 치환을 처리함
    const proxyResponse = await fetch(`${PROXY_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        unionId,
        senderId: 'system-admin',
        message,
        msgType,
        title: (msgType === 'LMS' || msgType === 'MMS') ? title : undefined,
        recipients: recipients.map((r) => ({
          name: r.name,
          phone: r.phone,
        })),
      }),
    });

    const proxyResult = await proxyResponse.json();

    console.log('[SMS 발송 결과 - 프록시]', {
      unionId,
      recipientCount: recipients.length,
      status: proxyResponse.status,
      result: proxyResult,
    });

    if (proxyResponse.ok && proxyResult.success) {
      return NextResponse.json({
        success: true,
        msg_id: proxyResult.data?.msgIds?.[0],
        success_cnt: proxyResult.data?.successCount || recipients.length,
        error_cnt: proxyResult.data?.failCount || 0,
        message: '발송 완료',
      });
    } else {
      return NextResponse.json(
        {
          error: proxyResult.error || proxyResult.message || '프록시 서버 오류',
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
