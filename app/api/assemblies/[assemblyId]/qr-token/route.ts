import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 조합원 QR 토큰 생성 (관리자 전용)
 * GET /api/assemblies/[assemblyId]/qr-token?snapshotId=xxx
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

    const { searchParams } = new URL(request.url);
    const snapshotId = searchParams.get('snapshotId');

    if (!snapshotId) {
      return NextResponse.json({ error: 'snapshotId가 필요합니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    // 스냅샷 존재 확인
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, member_name')
      .eq('id', snapshotId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('is_active', true)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: '유효하지 않은 조합원입니다.' }, { status: 404 });
    }

    const timestamp = Date.now();
    const secret = process.env.QR_TOKEN_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'QR 토큰 시크릿이 설정되지 않았습니다.' }, { status: 500 });
    }
    const payload = `${assemblyId}:${snapshotId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const qrData = { assemblyId, snapshotId, timestamp, hmac };

    return NextResponse.json({ data: qrData });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/qr-token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
