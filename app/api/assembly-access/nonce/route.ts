import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import crypto from 'crypto';

/**
 * PASS 인증 후 auth_nonce 발급
 * POST /api/assembly-access/nonce
 *
 * 목적: Step-up 인증 nonce 발급 (60초 TTL, 1회용)
 * PASS API 미연동 시: Mock 처리 (pass_verification_result.success 클라이언트 전달값 신뢰)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { assembly_id, pass_verification_result } = body as {
      assembly_id: string;
      pass_verification_result: { success: boolean; method?: string };
    };

    if (!assembly_id) {
      return NextResponse.json({ error: 'assembly_id가 필요합니다.' }, { status: 400 });
    }

    if (!pass_verification_result?.success) {
      return NextResponse.json({ error: 'PASS 인증에 실패했습니다.' }, { status: 400 });
    }

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const unionId = auth.user.union_id;

    const supabase = await createClient();

    // 스냅샷 존재 확인
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id')
      .eq('assembly_id', assembly_id)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!snapshot) {
      return NextResponse.json({ error: '총회 접근 권한이 없습니다.' }, { status: 403 });
    }

    // 기존 미사용 nonce 무효화 (동일 사용자/총회)
    await supabase
      .from('auth_nonces')
      .update({ used_at: new Date().toISOString() })
      .eq('assembly_id', assembly_id)
      .eq('user_id', auth.user.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());

    // nonce 생성 (32바이트 hex = 64자)
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60초 TTL

    // auth_nonces INSERT (service_role 클라이언트 사용 — RLS 우회)
    const { error: insertError } = await supabase
      .from('auth_nonces')
      .insert({
        union_id:    unionId,
        assembly_id,
        user_id:    auth.user.id,
        nonce,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('auth_nonce INSERT 실패:', insertError);
      return NextResponse.json({ error: 'Nonce 생성에 실패했습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: { nonce, expires_at: expiresAt } });
  } catch (error) {
    console.error('POST /api/assembly-access/nonce error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
