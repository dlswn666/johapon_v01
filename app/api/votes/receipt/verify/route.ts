import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import crypto from 'crypto';

/**
 * 투표 영수증 검증 (공개 엔드포인트)
 * POST /api/votes/receipt/verify
 *
 * 비밀투표 보호: 선택 옵션 절대 미포함
 * 토큰 소지 = 권한 증명
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { assemblyId, pollId, receiptToken } = body;

    if (!assemblyId || !pollId || !receiptToken) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    if (!receiptToken || receiptToken.length > 128) {
      return NextResponse.json({ error: '유효하지 않은 영수증입니다.' }, { status: 400 });
    }
    if (!assemblyId || assemblyId.length > 36 || !pollId || pollId.length > 36) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다.' }, { status: 400 });
    }

    const supabase = await createClient();
    const tokenHash = crypto.createHash('sha256').update(receiptToken).digest('hex');

    const { data: registry } = await supabase
      .from('vote_receipt_registry')
      .select('id, assembly_id, poll_id, issued_at, revoked_at, verify_count')
      .eq('receipt_token_hash', tokenHash)
      .eq('assembly_id', assemblyId)
      .eq('poll_id', pollId)
      .maybeSingle();

    if (!registry) {
      return NextResponse.json({
        valid: false,
        issuedAt: null,
        revokedAt: null,
        verifyCount: 0,
      });
    }

    // 검증 카운트 증가
    await supabase
      .from('vote_receipt_registry')
      .update({
        verify_count: registry.verify_count + 1,
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', registry.id);

    return NextResponse.json({
      valid: registry.revoked_at === null,
      issuedAt: registry.issued_at,
      revokedAt: registry.revoked_at,
      verifyCount: registry.verify_count + 1,
    });
  } catch (error) {
    console.error('POST /api/votes/receipt/verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
