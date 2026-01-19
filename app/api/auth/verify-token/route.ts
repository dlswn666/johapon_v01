import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { TokenValidationResult } from '@/app/_lib/shared/type/accessToken.types';

/**
 * 접근 토큰 검증 및 사용 횟수 증가
 * POST /api/auth/verify-token
 *
 * Body: { tokenKey: string, path?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { tokenKey, path } = await request.json();

    if (!tokenKey || typeof tokenKey !== 'string') {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        reason: 'not_found',
      });
    }

    const supabase = await createClient();

    // 토큰 조회
    const { data: token, error } = await supabase
      .from('access_tokens')
      .select('*')
      .eq('key', tokenKey)
      .single();

    if (error || !token) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        reason: 'not_found',
      });
    }

    // 삭제 여부 확인
    if (token.deleted_at) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        reason: 'deleted',
      });
    }

    // 만료일 확인
    if (token.expires_at) {
      const expiresAt = new Date(token.expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json<TokenValidationResult>({
          valid: false,
          reason: 'expired',
        });
      }
    }

    // 최대 사용 횟수 확인
    if (token.max_usage !== null && token.usage_count >= token.max_usage) {
      return NextResponse.json<TokenValidationResult>({
        valid: false,
        reason: 'max_usage_reached',
      });
    }

    // 토큰 사용 횟수 증가
    await supabase
      .from('access_tokens')
      .update({
        usage_count: token.usage_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', token.id);

    // 접근 로그 기록
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || null;

    await supabase
      .from('access_token_logs')
      .insert({
        token_id: token.id,
        accessed_path: path || null,
        ip_address: ip,
        user_agent: userAgent,
      });

    return NextResponse.json<TokenValidationResult>({
      valid: true,
      token: token,
    });
  } catch (error) {
    console.error('Error in POST /api/auth/verify-token:', error);
    return NextResponse.json<TokenValidationResult>({
      valid: false,
      reason: 'not_found',
    });
  }
}
