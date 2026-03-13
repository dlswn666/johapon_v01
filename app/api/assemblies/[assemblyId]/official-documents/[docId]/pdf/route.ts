import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

interface RouteContext {
  params: Promise<{ assemblyId: string; docId: string }>;
}

/**
 * PDF 생성
 * POST /api/assemblies/[assemblyId]/official-documents/[docId]/pdf
 * Admin only — SEALED 문서만 PDF 생성 가능
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId, docId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // 문서 조회
    const { data: doc } = await supabase
      .from('official_documents')
      .select('*')
      .eq('id', docId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (doc.status !== 'SEALED') {
      return NextResponse.json({ error: 'SEALED 상태의 문서만 PDF를 생성할 수 있습니다.' }, { status: 400 });
    }

    if (doc.pdf_storage_path) {
      return NextResponse.json(
        { error: `PDF가 이미 생성되었습니다. 경로: ${doc.pdf_storage_path}` },
        { status: 409 }
      );
    }

    // Phase 3: Puppeteer PDF 생성 구현 예정
    // 현재는 HTML을 Blob으로 저장하는 placeholder
    const htmlContent = doc.html_content || '<p>문서 내용 없음</p>';
    const pdfBuffer = Buffer.from(htmlContent, 'utf-8');

    // SHA-256 해시 (crypto는 Node.js 빌트인)
    const crypto = await import('crypto');
    const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Storage 업로드
    const storagePath = `unions/${unionId}/assemblies/${assemblyId}/documents/${docId}/pdf/v${doc.version}.html`;

    const { error: uploadError } = await supabase.storage
      .from('assembly-evidence')
      .upload(storagePath, pdfBuffer, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      console.error('PDF 업로드 실패:', uploadError);
      return NextResponse.json({ error: 'PDF 업로드에 실패했습니다.' }, { status: 500 });
    }

    // 문서 업데이트
    await supabase
      .from('official_documents')
      .update({
        pdf_storage_path: storagePath,
        pdf_hash: pdfHash,
      })
      .eq('id', docId);

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'DOCUMENT_PDF_GENERATED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'official_document',
      target_id: docId,
      event_data: { pdfHash, storagePath },
    });

    return NextResponse.json({
      data: {
        pdfStoragePath: storagePath,
        pdfHash,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/official-documents/[docId]/pdf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PDF 다운로드 URL 조회
 * GET /api/assemblies/[assemblyId]/official-documents/[docId]/pdf
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

    // 문서 조회
    const { data: doc } = await supabase
      .from('official_documents')
      .select('id, pdf_storage_path, pdf_hash, version, document_type')
      .eq('id', docId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (!doc.pdf_storage_path) {
      return NextResponse.json({ error: 'PDF가 아직 생성되지 않았습니다.' }, { status: 404 });
    }

    // Signed URL 생성 (60분)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('assembly-evidence')
      .createSignedUrl(doc.pdf_storage_path, 3600);

    if (urlError || !urlData?.signedUrl) {
      return NextResponse.json({ error: 'PDF 다운로드 URL 생성에 실패했습니다.' }, { status: 500 });
    }

    // 다운로드 로그
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || null);

    await supabase.from('document_download_logs').insert({
      document_id: docId,
      user_id: auth.user.id,
      user_role: auth.user.role || 'MEMBER',
      download_type: 'PDF',
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || null,
    });

    return NextResponse.json({
      data: {
        downloadUrl: urlData.signedUrl,
        pdfHash: doc.pdf_hash,
        fileName: `${doc.document_type}_v${doc.version}.pdf`,
      },
    });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/official-documents/[docId]/pdf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
