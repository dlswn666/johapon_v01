import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';
import { signDocument } from '@/app/_lib/features/assembly/services/signatureService';
import type { SignerRole, SignatureMethod } from '@/app/_lib/shared/type/assembly.types';

interface RouteContext {
  params: Promise<{ assemblyId: string; docId: string }>;
}

const VALID_SIGNER_ROLES: SignerRole[] = ['CHAIRPERSON', 'DIRECTOR', 'AUDITOR', 'MEMBER', 'ADMIN'];
const VALID_SIG_METHODS: SignatureMethod[] = ['SIMPLE_HASH', 'PASS_VERIFIED', 'CERTIFIED'];

/**
 * 문서 서명
 * POST /api/assemblies/[assemblyId]/official-documents/[docId]/sign
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { assemblyId, docId } = await context.params;

    const unionId = auth.user.union_id || await resolveAssemblyUnionId(assemblyId);
    if (!unionId) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const supabase = await createClient();

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: '요청 본문이 유효하지 않습니다.' }, { status: 400 });
    }

    const { signerRole, signatureMethod, expectedHash } = body;

    if (!signerRole || !VALID_SIGNER_ROLES.includes(signerRole)) {
      return NextResponse.json({ error: '유효한 서명자 역할을 지정하세요.' }, { status: 400 });
    }
    if (!signatureMethod || !VALID_SIG_METHODS.includes(signatureMethod)) {
      return NextResponse.json({ error: '유효한 서명 방법을 지정하세요.' }, { status: 400 });
    }
    if (!expectedHash || typeof expectedHash !== 'string') {
      return NextResponse.json({ error: '문서 해시가 필요합니다.' }, { status: 400 });
    }

    // 문서가 해당 총회에 속하는지 확인
    const { data: doc } = await supabase
      .from('official_documents')
      .select('id, signature_threshold')
      .eq('id', docId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || undefined);
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await signDocument(supabase, {
      documentId: docId,
      signerId: auth.user.id,
      signerName: auth.user.name || '',
      signerRole,
      signatureMethod,
      expectedHash,
      threshold: doc.signature_threshold,
      ipAddress: ip,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'DOCUMENT_SIGNED',
      actor_id: auth.user.id,
      actor_role: signerRole,
      target_type: 'official_document',
      target_id: docId,
      event_data: {
        signatureId: result.signatureId,
        signerRole,
        signatureMethod,
        thresholdMet: result.thresholdMet,
        currentCount: result.currentCount,
        requiredCount: result.requiredCount,
      },
      ip_address: ip || null,
      user_agent: userAgent || null,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/official-documents/[docId]/sign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
