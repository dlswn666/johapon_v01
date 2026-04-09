import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { sanitizeRpcError } from '@/app/_lib/shared/utils/sanitizeRpcError';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const unionId = auth.user.union_id;
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('assemblies')
      .select(`
        *,
        agenda_items(
          *,
          polls(*, poll_options(*)),
          agenda_documents(*)
        )
      `)
      .eq('union_id', unionId)
      .eq('status', 'DRAFT')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('DRAFT 조회 실패:', error);
      return NextResponse.json({ error: 'DRAFT 조회 실패' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/evotes/draft error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const body = await request.json();

    const unionId = auth.user.union_id;
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    // 기존 DRAFT가 있으면 삭제 후 재생성
    if (body.draft_id) {
      await supabase
        .from('assemblies')
        .delete()
        .eq('id', body.draft_id)
        .eq('union_id', unionId)
        .eq('status', 'DRAFT');
    }

    const rpcPayload = {
      union_id: unionId,
      actor_id: auth.user.id,
      assembly: {
        title: body.title?.trim() || '(임시저장)',
        assembly_type: body.assembly_type || 'REGULAR',
        scheduled_at: body.scheduled_at || new Date().toISOString(),
        quorum_type: 'GENERAL',
        session_mode: 'ELECTRONIC_ONLY',
        pre_vote_start_date: body.pre_vote_start_at || null,
        pre_vote_end_date: body.pre_vote_end_at || null,
        final_deadline: body.final_deadline || null,
      },
      agendas: (body.agendas || []).map((a: Record<string, unknown>, i: number) => {
        const agenda: Record<string, unknown> = {
          title: (a.title as string)?.trim() || '(안건 미입력)',
          description: (a.description as string)?.trim() || '',
          vote_type: a.vote_type || 'APPROVE',
          seq_order: i + 1,
          quorum_type_override: a.quorum_type_override || null,
          elect_count: a.elect_count || null,
        };
        if (a.vote_type === 'ELECT' && Array.isArray(a.candidates)) {
          agenda.options = (a.candidates as { name: string; info: string }[]).map((c, j) => ({
            label: c.name || '', option_type: 'CANDIDATE',
            candidate_name: c.name || '', candidate_info: c.info || '', seq_order: j + 1,
          }));
        }
        if (a.vote_type === 'SELECT' && Array.isArray(a.companies)) {
          agenda.options = (a.companies as { name: string; bidAmount: string; info: string }[]).map((c, j) => ({
            label: c.name || '', option_type: 'COMPANY',
            company_name: c.name || '', bid_amount: c.bidAmount || '', company_info: c.info || '', seq_order: j + 1,
          }));
        }
        return agenda;
      }),
      member_ids: [],
    };

    // agendas가 비어있으면 RPC 검증 실패하므로 빈 안건 추가
    if (rpcPayload.agendas.length === 0) {
      rpcPayload.agendas = [{ title: '(안건 미입력)', vote_type: 'APPROVE', seq_order: 1 }];
    }

    const { data, error } = await supabase.rpc('create_evote_wizard', {
      p_payload: rpcPayload,
    });

    if (error) {
      console.error('DRAFT 저장 RPC 실패:', error);
      return NextResponse.json({ error: sanitizeRpcError(error.message) }, { status: 500 });
    }

    return NextResponse.json({ data: { id: data.assembly_id } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/evotes/draft error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('id');

    if (!draftId) {
      return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('assemblies')
      .delete()
      .eq('id', draftId)
      .eq('union_id', unionId)
      .eq('status', 'DRAFT');

    if (error) {
      console.error('DRAFT 삭제 실패:', error);
      return NextResponse.json({ error: 'DRAFT 삭제 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/evotes/draft error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
