import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { resolveAssemblyUnionId } from '@/app/_lib/shared/api/resolveUnionId';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 서면결의서 스캔 이미지 업로드 (P0-1)
 * POST /api/assemblies/[assemblyId]/onsite-ballot/upload-scan
 * Content-Type: multipart/form-data
 * Body: { ballot_input_id: string, file: File }
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

    const formData = await request.formData();
    const ballotInputId = formData.get('ballot_input_id') as string;
    const file = formData.get('file') as File | null;

    if (!ballotInputId) {
      return NextResponse.json({ error: '투표 입력 ID가 필요합니다.' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
    }

    // 파일 MIME 검증
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'JPG, PNG, PDF 파일만 업로드 가능합니다.' }, { status: 400 });
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '파일 크기는 최대 10MB입니다.' }, { status: 400 });
    }

    // 대상 투표 입력이 해당 총회/조합 소속인지 확인
    const { data: ballot } = await supabase
      .from('written_ballot_inputs')
      .select('id')
      .eq('id', ballotInputId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!ballot) {
      return NextResponse.json({ error: '유효하지 않은 투표 입력입니다.' }, { status: 404 });
    }

    // 파일 확장자 결정
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
    };
    const ext = extMap[file.type] || 'bin';
    const filePath = `${unionId}/${assemblyId}/${ballotInputId}_${Date.now()}.${ext}`;

    // Storage 업로드
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('ballot-scans')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('스캔 이미지 업로드 실패:', uploadError);
      return NextResponse.json({ error: '파일 업로드에 실패했습니다.' }, { status: 500 });
    }

    // Signed URL 생성 (24시간)
    const { data: signedUrlData } = await supabase.storage
      .from('ballot-scans')
      .createSignedUrl(filePath, 60 * 60 * 24);

    const scanImageUrl = signedUrlData?.signedUrl || filePath;

    // scan_image_url 업데이트
    const { error: updateError } = await supabase
      .from('written_ballot_inputs')
      .update({ scan_image_url: scanImageUrl })
      .eq('id', ballotInputId)
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    if (updateError) {
      console.error('스캔 이미지 URL 업데이트 실패:', updateError);
      return NextResponse.json({ error: '파일 정보 저장에 실패했습니다.' }, { status: 500 });
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'BALLOT_SCAN_UPLOADED',
      actor_id: auth.user.id,
      actor_role: 'ADMIN',
      target_type: 'written_ballot_input',
      target_id: ballotInputId,
      event_data: { ballot_input_id: ballotInputId, file_path: filePath },
    });

    return NextResponse.json({
      data: { scan_image_url: scanImageUrl, ballot_input_id: ballotInputId },
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/onsite-ballot/upload-scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
