import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveTemplate } from '@/app/_lib/features/assembly/services/documentMergeResolver';
import { generateHash } from '@/app/_lib/features/assembly/domain/documentHasher';

interface RouteContext {
  params: Promise<{ assemblyId: string; docId: string }>;
}

/**
 * 개인화 문서 조회 (lazy generation)
 * GET /api/assemblies/[assemblyId]/official-documents/[docId]/personalized
 *
 * 일반 사용자: 자신의 개인화 문서 조회 (스냅샷 기반)
 * 관리자 (?admin=true): 전체 인스턴스 목록 조회
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId, docId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();
    const isAdminQuery = request.nextUrl.searchParams.get('admin') === 'true';

    // 문서 조회
    const { data: doc, error: docError } = await supabase
      .from('official_documents')
      .select('*')
      .eq('id', docId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 관리자 모드: 전체 인스턴스 목록 반환
    if (isAdminQuery) {
      const { data: instances, error: instError } = await supabase
        .from('document_personalized_instances')
        .select('*')
        .eq('document_id', docId)
        .order('created_at', { ascending: false });

      if (instError) {
        return NextResponse.json({ error: '인스턴스 목록 조회 실패' }, { status: 500 });
      }

      return NextResponse.json({ data: instances || [] });
    }

    // 일반 사용자: APPROVED 이상만 접근 가능
    const PUBLISHED_STATUSES = ['APPROVED', 'SIGNED_PARTIAL', 'SIGNED_COMPLETE', 'SEALED'];
    if (!PUBLISHED_STATUSES.includes(doc.status)) {
      return NextResponse.json({ error: '아직 공개되지 않은 문서입니다.' }, { status: 403 });
    }

    // 사용자의 스냅샷 조회
    const { data: snapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('*')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .limit(1)
      .single();

    if (!snapshot) {
      return NextResponse.json({ error: '해당 총회의 조합원 스냅샷을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 기존 인스턴스 확인
    const { data: existing } = await supabase
      .from('document_personalized_instances')
      .select('*')
      .eq('document_id', docId)
      .eq('snapshot_id', snapshot.id)
      .single();

    if (existing) {
      // 최초 열람 시 viewed_at 갱신
      if (!existing.viewed_at) {
        await supabase
          .from('document_personalized_instances')
          .update({ viewed_at: new Date().toISOString(), status: 'VIEWED' })
          .eq('id', existing.id);

        // 감사 로그: 최초 열람만 기록
        await supabase.from('assembly_audit_logs').insert({
          assembly_id: assemblyId,
          union_id: unionId,
          event_type: 'DOCUMENT_VIEWED',
          actor_id: auth.user.id,
          actor_role: 'MEMBER',
          target_type: 'personalized_instance',
          target_id: existing.id,
          event_data: { documentId: docId, documentType: doc.document_type },
        });
      }

      // 서명 가능 여부 판정
      const canSign = PUBLISHED_STATUSES.includes(doc.status) && !existing.has_signed;

      return NextResponse.json({
        data: {
          instanceId: existing.id,
          documentId: doc.id,
          documentType: doc.document_type,
          documentTitle: doc.document_type,
          version: doc.version,
          status: existing.status,
          personalizedHtml: existing.personalized_html,
          contentHash: existing.personalization_hash,
          canSign,
          hasSigned: existing.has_signed,
          signedAt: existing.signed_at,
          signatureThreshold: doc.signature_threshold,
          signerRole: null,
        },
      });
    }

    // Lazy generation: 템플릿 조회 + 병합
    const { data: template } = await supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', doc.document_type)
      .eq('is_active', true)
      .single();

    // 템플릿이 없으면 원본 html_content 사용
    let personalizedHtml = doc.html_content || '';

    if (template) {
      // 조합 정보 조회
      const { data: unionInfo } = await supabase
        .from('unions')
        .select('name, registration_number')
        .eq('id', unionId)
        .single();

      // 총회 정보 조회
      const { data: assembly } = await supabase
        .from('assemblies')
        .select('title, scheduled_at, venue_address, quorum_total_members')
        .eq('id', assemblyId)
        .single();

      const mergeContext = {
        snapshot: snapshot as Record<string, unknown>,
        assembly: assembly as Record<string, unknown>,
        unionInfo: unionInfo as Record<string, unknown>,
        staticData: {
          current_date: new Date().toISOString(),
        },
      };

      const result = resolveTemplate(
        template.html_template,
        template.merge_field_schema || [],
        mergeContext
      );
      personalizedHtml = result.html;
    }

    // 해시 생성
    const personalizationHash = await generateHash(personalizedHtml);

    // 인스턴스 삽입
    const { data: newInstance, error: insertError } = await supabase
      .from('document_personalized_instances')
      .insert({
        document_id: docId,
        assembly_id: assemblyId,
        union_id: unionId,
        snapshot_id: snapshot.id,
        user_id: auth.user.id,
        personalized_html: personalizedHtml,
        personalization_hash: personalizationHash,
        status: 'VIEWED',
        viewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('개인화 인스턴스 생성 실패:', insertError);
      return NextResponse.json({ error: '개인화 문서 생성에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그: 최초 열람
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'DOCUMENT_VIEWED',
      actor_id: auth.user.id,
      actor_role: 'MEMBER',
      target_type: 'personalized_instance',
      target_id: newInstance.id,
      event_data: { documentId: docId, documentType: doc.document_type },
    });

    return NextResponse.json({
      data: {
        instanceId: newInstance.id,
        documentId: doc.id,
        documentType: doc.document_type,
        documentTitle: doc.document_type,
        version: doc.version,
        status: 'VIEWED',
        personalizedHtml,
        contentHash: personalizationHash,
        canSign: true,
        hasSigned: false,
        signedAt: null,
        signatureThreshold: doc.signature_threshold,
        signerRole: null,
      },
    });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/official-documents/[docId]/personalized error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
