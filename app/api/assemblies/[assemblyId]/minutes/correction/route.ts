import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 의사록 정정안 생성 (P2-4)
 * POST /api/assemblies/[assemblyId]/minutes/correction
 * Body: { correction_reason: string, corrected_content: string }
 *
 * 확정된 의사록만 정정 가능.
 * 원본 보존 (감사 로그에 원본 해시/서명자 수/확정 시각 기록)
 * 서명 초기화 → 기존 minutes/confirm API로 3인 재서명 후 재확정
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { correction_reason, corrected_content } = body;

    if (!correction_reason || typeof correction_reason !== 'string' || !correction_reason.trim()) {
      return NextResponse.json({ error: '정정 사유를 입력해야 합니다.' }, { status: 400 });
    }

    if (!corrected_content || typeof corrected_content !== 'string') {
      return NextResponse.json({ error: '정정 내용을 입력해야 합니다.' }, { status: 400 });
    }

    // 총회 조회 — 확정된 의사록만 정정 가능
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, minutes_draft, minutes_finalized_at, minutes_confirmed_by, minutes_content_hash')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!assembly.minutes_finalized_at) {
      return NextResponse.json({ error: '확정된 의사록만 정정할 수 있습니다.' }, { status: 400 });
    }

    // XSS 방지: script, iframe, on* 이벤트, javascript: 제거
    let sanitized = corrected_content;
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    const confirmedBy = assembly.minutes_confirmed_by || [];

    // 정정 횟수 확인
    const { count: correctionCount } = await supabase
      .from('minutes_corrections')
      .select('*', { count: 'exact', head: true })
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    const correctionNumber = (correctionCount || 0) + 1;

    // official_documents 기반 정정본 생성 (있으면)
    let originalDocId: string | null = null;
    let correctedDocId: string | null = null;

    const { data: minutesDoc } = await supabase
      .from('official_documents')
      .select('id')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('document_type', 'MINUTES')
      .not('status', 'in', '("SUPERSEDED","VOID")')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (minutesDoc) {
      originalDocId = minutesDoc.id;

      // 정정본 문서 생성
      const { data: newDoc } = await supabase
        .from('official_documents')
        .insert({
          assembly_id: assemblyId,
          union_id: unionId,
          document_type: 'MINUTES',
          version: (await supabase
            .from('official_documents')
            .select('version')
            .eq('assembly_id', assemblyId)
            .eq('document_type', 'MINUTES')
            .order('version', { ascending: false })
            .limit(1)
            .single()).data?.version + 1 || 1,
          previous_version_id: originalDocId,
          status: 'GENERATED',
          source_json: {},
          html_content: sanitized,
          generated_at: new Date().toISOString(),
          created_by: auth.user.id,
        })
        .select()
        .single();

      if (newDoc) {
        correctedDocId = newDoc.id;
        // 원본 SUPERSEDED 처리
        await supabase
          .from('official_documents')
          .update({ status: 'SUPERSEDED' })
          .eq('id', originalDocId);

        // 해시 생성
        await supabase.rpc('generate_document_hash', { p_document_id: correctedDocId });
      }
    }

    // minutes_corrections 테이블 기록
    if (originalDocId && correctedDocId) {
      await supabase.from('minutes_corrections').insert({
        assembly_id: assemblyId,
        union_id: unionId,
        original_document_id: originalDocId,
        corrected_document_id: correctedDocId,
        correction_number: correctionNumber,
        correction_reason_detail: correction_reason.trim(),
        requested_by: auth.user.id,
      });
    }

    // 원본 보존: 감사 로그에 원본 정보 기록
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'MINUTES_CORRECTION',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'assembly',
      target_id: assemblyId,
      event_data: {
        original_content_hash: assembly.minutes_content_hash,
        original_finalized_at: assembly.minutes_finalized_at,
        original_confirmed_by_count: confirmedBy.length,
        correction_reason: correction_reason.trim(),
        correction_number: correctionNumber,
        original_document_id: originalDocId,
        corrected_document_id: correctedDocId,
      },
    });

    // 의사록 갱신 (서명 초기화)
    const { data, error } = await supabase
      .from('assemblies')
      .update({
        minutes_draft: sanitized,
        minutes_finalized_at: null,
        minutes_confirmed_by: [],
        minutes_content_hash: null,
      })
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .select('id, minutes_draft, minutes_finalized_at, minutes_confirmed_by, minutes_content_hash')
      .single();

    if (error || !data) {
      console.error('의사록 정정 실패:', error);
      return NextResponse.json({ error: '의사록 정정에 실패했습니다.' }, { status: 500 });
    }

    // 3회 이상 정정 시 경고
    const warning = correctionNumber >= 3
      ? `의사록이 ${correctionNumber}회 정정되었습니다. 빈번한 정정은 법적 신뢰성에 영향을 줄 수 있습니다.`
      : undefined;

    return NextResponse.json({
      data: {
        minutes_draft: data.minutes_draft,
        minutes_finalized_at: data.minutes_finalized_at,
        minutes_confirmed_by: data.minutes_confirmed_by,
        minutes_content_hash: data.minutes_content_hash,
        correction_reason: correction_reason.trim(),
        correction_number: correctionNumber,
      },
      ...(warning && { warning }),
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/minutes/correction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
