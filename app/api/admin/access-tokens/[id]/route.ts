import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * 접근 토큰 상세 조회
 * GET /api/admin/access-tokens/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // System Admin 권한 확인
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 토큰 조회
    const { data: token, error } = await supabase
      .from('access_tokens')
      .select(`
        *,
        unions(name, slug)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json({ data: token });
  } catch (error) {
    console.error('Error in GET /api/admin/access-tokens/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 접근 토큰 삭제 (소프트 삭제)
 * DELETE /api/admin/access-tokens/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // System Admin 권한 확인
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 소프트 삭제 (deleted_at 설정)
    const { error } = await supabase
      .from('access_tokens')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting access token:', error);
      return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/access-tokens/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
