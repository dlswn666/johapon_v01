import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';
import { sanitizeRpcError } from '@/app/_lib/shared/utils/sanitizeRpcError';

/**
 * 전자투표 목록 조회
 * GET /api/evotes
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const unionId = auth.user.union_id
      ?? (auth.user.role === 'SYSTEM_ADMIN' ? searchParams.get('union_id') : null);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    if (auth.user.role === 'SYSTEM_ADMIN' && searchParams.get('union_id')) {
      const { data: union } = await supabase
        .from('unions')
        .select('id')
        .eq('id', unionId)
        .single();

      if (!union) {
        return NextResponse.json({ error: '존재하지 않는 조합입니다.' }, { status: 404 });
      }
    }

    let query = supabase
      .from('assemblies')
      .select(`
        id, title, assembly_type, status, quorum_type,
        scheduled_at, pre_vote_start_date, pre_vote_end_date,
        publish_mode, created_at, updated_at, created_by,
        creator:users!assemblies_created_by_fkey(id, name),
        agenda_items(count)
      `)
      .eq('union_id', unionId)
      .order('created_at', { ascending: false });

    // 상태 필터
    const status = searchParams.get('status');
    if (status) {
      query = query.eq('status', status);
    }

    // 검색어 필터
    const search = searchParams.get('search');
    if (search) {
      query = query.ilike('title', `%${escapeLikeWildcards(search)}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('전자투표 목록 조회 실패:', error);
      return NextResponse.json({ error: '전자투표 목록을 불러올 수 없습니다.' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/evotes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 전자투표 생성 (create_evote_wizard RPC 호출)
 * POST /api/evotes
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const supabase = await createClient();
    const body = await request.json();

    // union_id 결정
    const unionId = auth.user.union_id
      ?? (auth.user.role === 'SYSTEM_ADMIN' ? body.union_id : null);

    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    if (auth.user.role === 'SYSTEM_ADMIN' && body.union_id) {
      const { data: union } = await supabase
        .from('unions')
        .select('id')
        .eq('id', unionId)
        .single();

      if (!union) {
        return NextResponse.json({ error: '존재하지 않는 조합입니다.' }, { status: 404 });
      }
    }

    // 필수 필드 검증
    if (!body.title?.trim()) {
      return NextResponse.json({ error: '총회 제목을 입력해주세요.' }, { status: 400 });
    }
    if (!body.scheduled_at) {
      return NextResponse.json({ error: '총회 일시를 설정해주세요.' }, { status: 400 });
    }
    if (!body.agendas?.length) {
      return NextResponse.json({ error: '최소 1개 이상의 안건이 필요합니다.' }, { status: 400 });
    }
    if (!body.selected_voter_ids?.length) {
      return NextResponse.json({ error: '최소 1명 이상의 투표 대상자를 선택해주세요.' }, { status: 400 });
    }
    if (!body.pre_vote_start_at || !body.pre_vote_end_at) {
      return NextResponse.json({ error: '사전투표 기간을 설정해주세요.' }, { status: 400 });
    }

    // 날짜 순서 검증
    if (body.pre_vote_start_at >= body.pre_vote_end_at) {
      return NextResponse.json({ error: '사전투표 시작일은 마감일보다 빨라야 합니다.' }, { status: 400 });
    }
    if (body.pre_vote_end_at > body.scheduled_at) {
      return NextResponse.json({ error: '사전투표 마감일은 총회일 이전이어야 합니다.' }, { status: 400 });
    }

    // SCHEDULED 모드 검증
    if (body.publish_mode === 'SCHEDULED' && !body.publish_at) {
      return NextResponse.json({ error: '예약 게시 시각을 설정해주세요.' }, { status: 400 });
    }

    // 안건별 검증
    for (const agenda of body.agendas) {
      if (!agenda.title?.trim()) {
        return NextResponse.json({ error: '안건 제목은 필수입니다.' }, { status: 400 });
      }
      if (agenda.vote_type === 'ELECT' && (!agenda.elect_count || agenda.elect_count < 1)) {
        return NextResponse.json({ error: '선출 인원수를 1명 이상 설정해주세요.' }, { status: 400 });
      }
      if (agenda.vote_type === 'ELECT' && !agenda.candidates?.length) {
        return NextResponse.json({ error: '후보자를 1명 이상 등록해주세요.' }, { status: 400 });
      }
      if (agenda.vote_type === 'SELECT' && !agenda.companies?.length) {
        return NextResponse.json({ error: '업체를 1개 이상 등록해주세요.' }, { status: 400 });
      }
    }

    // 투표 대상자 정보 조회 (RPC가 member_ids 객체 배열을 요구)
    const { data: members, error: memberError } = await supabase
      .from('users')
      .select('id, name, phone_number, property_address, voting_weight, entity_type')
      .in('id', body.selected_voter_ids)
      .eq('union_id', unionId)
      .eq('is_blocked', false);

    if (memberError) {
      console.error('투표 대상자 조회 실패:', memberError);
      return NextResponse.json({ error: '투표 대상자 정보를 조회할 수 없습니다.' }, { status: 500 });
    }

    // RPC 페이로드 구성 (실제 RPC 시그니처에 맞춤: p_payload)
    const rpcPayload = {
      union_id: unionId,
      actor_id: auth.user.id,
      assembly: {
        title: body.title.trim(),
        description: body.description?.trim() || null,
        assembly_type: body.assembly_type || 'REGULAR',
        scheduled_at: body.scheduled_at,
        quorum_type: body.quorum_type || 'GENERAL',
        session_mode: 'ELECTRONIC_ONLY',
        announcement_date: body.publish_mode === 'IMMEDIATE' ? new Date().toISOString() : (body.publish_at || null),
        pre_vote_start_date: body.pre_vote_start_at,
        pre_vote_end_date: body.pre_vote_end_at,
        final_deadline: body.final_deadline || null,
      },
      agendas: body.agendas.map((a: Record<string, unknown>, i: number) => {
        const agenda: Record<string, unknown> = {
          title: (a.title as string).trim(),
          description: (a.description as string)?.trim() || '',
          vote_type: a.vote_type || 'APPROVE',
          seq_order: i + 1,
          quorum_type_override: a.quorum_type_override || null,
          elect_count: a.elect_count || null,
        };

        // ELECT: 후보자 → options
        if (a.vote_type === 'ELECT' && Array.isArray(a.candidates)) {
          agenda.options = (a.candidates as { name: string; info: string }[]).map((c, j) => ({
            label: c.name,
            option_type: 'CANDIDATE',
            candidate_name: c.name,
            candidate_info: c.info,
            seq_order: j + 1,
          }));
        }

        // SELECT: 업체 → options
        if (a.vote_type === 'SELECT' && Array.isArray(a.companies)) {
          agenda.options = (a.companies as { name: string; bidAmount: string; info: string }[]).map((c, j) => ({
            label: c.name,
            option_type: 'COMPANY',
            company_name: c.name,
            bid_amount: c.bidAmount,
            company_info: c.info,
            seq_order: j + 1,
          }));
        }

        return agenda;
      }),
      member_ids: (members || []).map((m) => ({
        user_id: m.id,
        name: m.name,
        phone: m.phone_number,
        property_address: m.property_address,
        voting_weight: m.voting_weight || 1,
        member_type: m.entity_type === 'CORPORATION' ? 'CORPORATION'
          : m.entity_type === 'GOVERNMENT' ? 'GOVERNMENT' : 'INDIVIDUAL',
        entity_type: m.entity_type || 'INDIVIDUAL',
      })),
    };

    const { data, error } = await supabase.rpc('create_evote_wizard', {
      p_payload: rpcPayload,
    });

    if (error) {
      console.error('전자투표 생성 RPC 실패:', error);
      const message = sanitizeRpcError(error.message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ data: { id: data.assembly_id } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/evotes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
