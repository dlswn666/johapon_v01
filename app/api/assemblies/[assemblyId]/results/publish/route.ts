import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

// JSON 키 정렬 replacer (결정론적 해시)
function sortKeysReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.keys(value as Record<string, unknown>).sort().reduce((sorted, k) => {
      sorted[k] = (value as Record<string, unknown>)[k];
      return sorted;
    }, {} as Record<string, unknown>);
  }
  return value;
}

const PUBLISH_ALLOWED = ['VOTING_CLOSED', 'CLOSED', 'ARCHIVED'];

/**
 * 투표 결과 공개
 * POST /api/assemblies/[assemblyId]/results/publish
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // 총회 상태 확인
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, title, status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!PUBLISH_ALLOWED.includes(assembly.status)) {
      return NextResponse.json({ error: '투표 마감 후에만 결과를 공개할 수 있습니다.' }, { status: 400 });
    }

    // 중복 공개 방지
    const { data: existing } = await supabase
      .from('assembly_result_publications')
      .select('id, published_at')
      .eq('assembly_id', assemblyId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '이미 결과가 공개되었습니다.' }, { status: 409 });
    }

    // 안건 + 투표 집계 조회
    const { data: agendaItems } = await supabase
      .from('agenda_items')
      .select('id, title, seq_order, agenda_type, quorum_threshold_pct, approval_threshold_pct')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('seq_order', { ascending: true });

    const { data: tallyResults } = await supabase
      .from('vote_tally_results')
      .select('poll_id, option_id, voting_method, vote_count, vote_weight_sum')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    const { data: polls } = await supabase
      .from('polls')
      .select('id, agenda_item_id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    const { data: pollOptions } = await supabase
      .from('poll_options')
      .select('id, poll_id, label, option_type, seq_order')
      .eq('union_id', unionId);

    // PII 없는 result_json 구성
    const now = new Date().toISOString();
    const agendas = (agendaItems || []).map((agenda) => {
      const agendaPoll = (polls || []).find(p => p.agenda_item_id === agenda.id);
      const pollTally = agendaPoll
        ? (tallyResults || []).filter(t => t.poll_id === agendaPoll.id)
        : [];
      const options = agendaPoll
        ? (pollOptions || []).filter(o => o.poll_id === agendaPoll.id)
        : [];

      const totalVotes = pollTally.reduce((sum, t) => sum + (t.vote_count || 0), 0);
      const approvalThreshold = agenda.approval_threshold_pct || 50;

      // 찬성표 계산 (option_type = 'FOR' 또는 seq_order = 1)
      const forOption = options.find(o => o.option_type === 'FOR') || options[0];
      const forVotes = forOption
        ? pollTally.filter(t => t.option_id === forOption.id).reduce((sum, t) => sum + (t.vote_count || 0), 0)
        : 0;
      const forPct = totalVotes > 0 ? (forVotes / totalVotes) * 100 : 0;

      return {
        agenda_id: agenda.id,
        title: agenda.title,
        seq_order: agenda.seq_order,
        agenda_type: agenda.agenda_type,
        total_votes: totalVotes,
        is_passed: forPct >= approvalThreshold,
        options: options.map(opt => {
          const optTally = pollTally.filter(t => t.option_id === opt.id);
          return {
            label: opt.label,
            option_type: opt.option_type,
            vote_count: optTally.reduce((sum, t) => sum + (t.vote_count || 0), 0),
            vote_weight_sum: optTally.reduce((sum, t) => sum + (t.vote_weight_sum || 0), 0),
          };
        }),
      };
    });

    const resultJson = {
      assembly_id: assemblyId,
      assembly_title: assembly.title,
      published_at: now,
      agendas,
    };

    // SHA-256 해시
    const sortedResultJson = JSON.stringify(resultJson, sortKeysReplacer);
    const resultHash = crypto.createHash('sha256').update(sortedResultJson).digest('hex');
    const sourceTallyHash = crypto.createHash('sha256')
      .update(JSON.stringify(tallyResults || [], sortKeysReplacer))
      .digest('hex');

    // DB INSERT
    const { data: publication, error: insertError } = await supabase
      .from('assembly_result_publications')
      .insert({
        union_id: unionId,
        assembly_id: assemblyId,
        published_by: auth.user.id,
        result_json: resultJson,
        result_hash: resultHash,
        source_tally_hash: sourceTallyHash,
      })
      .select('id, published_at, result_hash')
      .single();

    if (insertError) {
      console.error('결과 공개 INSERT 실패:', insertError);
      return NextResponse.json({ error: '결과 공개에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'RESULTS_PUBLISHED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'result_publication',
      target_id: publication.id,
      event_data: {
        publication_id: publication.id,
        result_hash: resultHash,
        agenda_count: agendas.length,
      },
    });

    return NextResponse.json({
      data: {
        publication_id: publication.id,
        published_at: publication.published_at,
        result_hash: publication.result_hash,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/results/publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
