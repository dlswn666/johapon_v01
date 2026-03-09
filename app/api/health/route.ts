import { NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';

/**
 * 헬스체크 API (인증 없음)
 * GET /api/health
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // DB 연결 체크
    const { error } = await supabase.from('assemblies').select('id').limit(1);

    const dbStatus = error ? 'error' : 'ok';

    return NextResponse.json({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      checks: { db: dbStatus },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: 'error',
      checks: { db: 'error' },
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
