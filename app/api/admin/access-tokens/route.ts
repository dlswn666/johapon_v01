import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { CreateAccessTokenRequest, AccessTokenListItem } from '@/app/_lib/shared/type/accessToken.types';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

/**
 * 접근 토큰 목록 조회
 * GET /api/admin/access-tokens
 */
export async function GET() {
  try {
    // authenticateApiRequest correctly resolves via user_auth_links
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    // Check SYSTEM_ADMIN specifically
    if (auth.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // 토큰 목록 조회 (삭제되지 않은 것만)
    const { data: tokens, error } = await supabase
      .from('access_tokens')
      .select(`
        id,
        key,
        name,
        union_id,
        access_scope,
        expires_at,
        max_usage,
        usage_count,
        created_at,
        unions(name)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access tokens:', error);
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    // UI용 데이터 변환
    const now = new Date();
    const tokenList: AccessTokenListItem[] = (tokens || []).map((token) => {
      const expiresAt = token.expires_at ? new Date(token.expires_at) : null;
      const isExpired = expiresAt && expiresAt < now;
      const isMaxUsageReached = token.max_usage && token.usage_count >= token.max_usage;

      // unions 관계 데이터 처리 (단일 객체 또는 배열)
      let unionName: string | null = null;
      if (token.unions) {
        if (Array.isArray(token.unions)) {
          unionName = token.unions[0]?.name || null;
        } else {
          unionName = (token.unions as { name: string }).name || null;
        }
      }

      return {
        id: token.id,
        key: token.key,
        name: token.name,
        union_id: token.union_id,
        union_name: unionName,
        access_scope: token.access_scope,
        expires_at: token.expires_at,
        max_usage: token.max_usage,
        usage_count: token.usage_count,
        is_active: !isExpired && !isMaxUsageReached,
        created_at: token.created_at,
      };
    });

    return NextResponse.json({ data: tokenList });
  } catch (error) {
    console.error('Error in GET /api/admin/access-tokens:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 접근 토큰 생성
 * POST /api/admin/access-tokens
 */
export async function POST(request: NextRequest) {
  try {
    // authenticateApiRequest correctly resolves via user_auth_links
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    // Check SYSTEM_ADMIN specifically
    if (auth.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    const body: CreateAccessTokenRequest = await request.json();

    // 필수 필드 검증
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Token name is required' }, { status: 400 });
    }

    // 토큰 키 생성 (URL-safe, 32자)
    const tokenKey = nanoid(32);

    // 만료일 계산
    let expiresAt: string | null = null;
    if (body.expires_in_days && body.expires_in_days > 0) {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + body.expires_in_days);
      expiresAt = expireDate.toISOString();
    }

    // 토큰 생성
    const { data: newToken, error } = await supabase
      .from('access_tokens')
      .insert({
        key: tokenKey,
        name: body.name.trim(),
        union_id: body.union_id || null,
        access_scope: body.access_scope || 'all',
        allowed_pages: body.allowed_pages || null,
        expires_at: expiresAt,
        max_usage: body.max_usage || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating access token:', error);
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: newToken.id,
        key: newToken.key,
        name: newToken.name,
        expires_at: newToken.expires_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/access-tokens:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
