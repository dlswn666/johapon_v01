import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

interface ConfirmedByEntry {
  user_id: string;
  name: string;
  role: 'chair' | 'member';
  confirmed_at: string;
  ip: string;
}

/**
 * 의사록 전자서명
 * PATCH /api/assemblies/[assemblyId]/minutes/confirm
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // 관리자가 아닌 일반 사용자도 서명 가능
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { role } = body;
    if (role !== 'chair' && role !== 'member') {
      return NextResponse.json({ error: 'role은 "chair" 또는 "member"여야 합니다.' }, { status: 400 });
    }

    // 출석 자격 검증: assembly_member_snapshots에서 해당 user_id 확인
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, member_name')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: '총회 참석 자격이 없습니다.' }, { status: 403 });
    }

    // 총회 정보 조회
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, minutes_draft, minutes_confirmed_by, minutes_content_hash, minutes_finalized_at')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (assembly.minutes_finalized_at) {
      return NextResponse.json({ error: '이미 확정된 의사록입니다.' }, { status: 400 });
    }

    if (!assembly.minutes_draft) {
      return NextResponse.json({ error: '의사록이 생성되지 않았습니다.' }, { status: 400 });
    }

    // 이미 서명한 사용자인지 확인
    const confirmedBy: ConfirmedByEntry[] = (assembly.minutes_confirmed_by as ConfirmedByEntry[]) || [];
    const alreadySigned = confirmedBy.some((entry) => entry.user_id === auth.user.id);
    if (alreadySigned) {
      return NextResponse.json({ error: '이미 서명하셨습니다.' }, { status: 400 });
    }

    // SHA-256 해시 생성/검증
    const currentHash = crypto.createHash('sha256').update(assembly.minutes_draft).digest('hex');

    if (assembly.minutes_content_hash) {
      // 이후 서명: 해시 비교
      if (currentHash !== assembly.minutes_content_hash) {
        return NextResponse.json({ error: '의사록이 서명 이후 수정되었습니다.' }, { status: 400 });
      }
    }

    // IP 주소 추출
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // 서명 항목 추가
    const newEntry: ConfirmedByEntry = {
      user_id: auth.user.id,
      name: snapshot.member_name,
      role,
      confirmed_at: new Date().toISOString(),
      ip,
    };

    const updatedConfirmedBy = [...confirmedBy, newEntry];

    // 자동 확정 조건: chair 서명 1개 이상 + 전체 서명 3개 이상
    const hasChair = updatedConfirmedBy.some((entry) => entry.role === 'chair');
    const autoFinalize = hasChair && updatedConfirmedBy.length >= 3;

    const update: Record<string, unknown> = {
      minutes_confirmed_by: updatedConfirmedBy,
      minutes_content_hash: currentHash,
    };

    if (autoFinalize) {
      update.minutes_finalized_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('assemblies')
      .update(update)
      .eq('id', assemblyId)
      .eq('union_id', unionId);

    if (updateError) {
      console.error('의사록 서명 저장 실패:', updateError);
      return NextResponse.json({ error: '서명 저장에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase
      .from('assembly_audit_logs')
      .insert({
        assembly_id: assemblyId,
        union_id: unionId,
        event_type: 'MINUTES_CONFIRMED',
        actor_id: auth.user.id,
        actor_role: auth.user.role === 'ADMIN' || auth.user.role === 'SYSTEM_ADMIN' ? 'ADMIN' : 'MEMBER',
        target_type: 'minutes',
        target_id: assemblyId,
        event_data: { role, name: snapshot.member_name },
        ip_address: ip,
      });

    return NextResponse.json({
      data: {
        minutes_confirmed_by: updatedConfirmedBy,
        minutes_content_hash: currentHash,
        minutes_finalized_at: autoFinalize ? update.minutes_finalized_at : null,
      },
    });
  } catch (error) {
    console.error('PATCH /api/assemblies/[id]/minutes/confirm error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
