import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import crypto from 'crypto';

interface RouteContext {
  params: Promise<{ assemblyId: string }>;
}

/**
 * 증거 패키지 다운로드
 * GET /api/assemblies/[assemblyId]/evidence-package
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await authenticateApiRequest({ requireAdmin: true });
    if (!auth.authenticated) return auth.response;

    const { assemblyId } = await context.params;

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    const { data: assembly } = await supabase
      .from('assemblies')
      .select('id, title, evidence_package_url, evidence_packaged_at')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    // M-2: signed URL 재생성 (GET에서도 인증된 접근)
    if (assembly.evidence_package_url) {
      const dirPath = `evidence/${unionId}/${assemblyId}`;
      const { data: files } = await supabase.storage
        .from('assembly-evidence')
        .list(dirPath);

      if (files && files.length > 0) {
        const latestFile = files[files.length - 1];
        const filePath = `${dirPath}/${latestFile.name}`;
        const { data: signedUrlData } = await supabase.storage
          .from('assembly-evidence')
          .createSignedUrl(filePath, 3600);

        return NextResponse.json({
          data: {
            evidence_package_url: signedUrlData?.signedUrl || null,
            evidence_packaged_at: assembly.evidence_packaged_at,
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        evidence_package_url: null,
        evidence_packaged_at: assembly.evidence_packaged_at,
      },
    });
  } catch (error) {
    console.error('GET /api/assemblies/[id]/evidence-package error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 증거 패키지 생성
 * POST /api/assemblies/[assemblyId]/evidence-package
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

    // 총회 정보
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('*')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assembly) {
      return NextResponse.json({ error: '총회를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 스냅샷 목록
    const { data: snapshots } = await supabase
      .from('assembly_member_snapshots')
      .select('id, user_id, member_name, member_phone, property_address, voting_weight, member_type, proxy_user_id, proxy_name, identity_verified_at, is_active, created_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    // 출석 로그
    const { data: attendanceLogs } = await supabase
      .from('assembly_attendance_logs')
      .select('id, snapshot_id, user_id, attendance_type, entry_at, exit_at, qr_checkin_at, identity_verified, identity_verified_at, created_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('created_at');

    // 투표 집계 결과
    const { data: tallyResults } = await supabase
      .from('vote_tally_results')
      .select('id, poll_id, option_id, voting_method, vote_count, vote_weight_sum, tallied_at, tallied_by')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId);

    // Q&A 기록
    const { data: questions } = await supabase
      .from('assembly_questions')
      .select('id, agenda_item_id, user_id, content, visibility, is_approved, answer, submitted_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('submitted_at');

    // 발언 요청
    const { data: speakerRequests } = await supabase
      .from('speaker_requests')
      .select('id, agenda_item_id, user_id, status, approved_by, approved_at, queue_position, requested_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('requested_at');

    // M-7: 투표 참여 기록
    const { data: participationRecords } = await supabase
      .from('participation_records')
      .select('id, poll_id, snapshot_id, user_id, voting_method, first_voted_at, last_voted_at, vote_count')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('first_voted_at');

    // 자료 열람 로그
    const { data: documentViewLogs } = await supabase
      .from('document_view_logs')
      .select('id, document_id, user_id, viewed_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('viewed_at');

    // 감사 로그 (해시 체인 포함)
    const { data: auditLogs } = await supabase
      .from('assembly_audit_logs')
      .select('id, event_type, actor_id, actor_role, target_type, target_id, event_data, ip_address, user_agent, prev_hash, current_hash, created_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .order('created_at');

    // 해시 체인 무결성 검증
    let chainIntegrity = true;
    const chainErrors: string[] = [];
    const logs = auditLogs || [];
    for (let i = 1; i < logs.length; i++) {
      const prevLog = logs[i - 1];
      const currLog = logs[i];
      if (currLog.prev_hash !== prevLog.current_hash) {
        chainIntegrity = false;
        chainErrors.push(`감사 로그 #${currLog.id}: prev_hash 불일치`);
      }
    }

    // 증거 패키지 JSON 구성
    const packagedAt = new Date().toISOString();
    const evidencePackage = {
      meta: {
        package_version: '1.0',
        generated_at: packagedAt,
        generated_by: auth.user.id,
        assembly_id: assemblyId,
        union_id: unionId,
        chain_integrity: chainIntegrity,
        chain_errors: chainErrors,
      },
      assembly,
      snapshots: snapshots || [],
      attendance_logs: attendanceLogs || [],
      participation_records: participationRecords || [],
      tally_results: tallyResults || [],
      questions: questions || [],
      speaker_requests: speakerRequests || [],
      document_view_logs: documentViewLogs || [],
      audit_logs: logs,
    };

    // 패키지 해시 (무결성 확인용)
    const packageJson = JSON.stringify(evidencePackage);
    const packageHash = crypto.createHash('sha256').update(packageJson).digest('hex');
    (evidencePackage.meta as Record<string, unknown>).package_hash = packageHash;

    // Supabase Storage에 업로드
    const fileName = `evidence/${unionId}/${assemblyId}/evidence_${Date.now()}.json`;
    const fileBuffer = Buffer.from(JSON.stringify(evidencePackage, null, 2), 'utf-8');

    const { error: uploadError } = await supabase.storage
      .from('assembly-evidence')
      .upload(fileName, fileBuffer, {
        contentType: 'application/json',
        upsert: false,
      });

    let evidenceUrl: string | null = null;

    if (uploadError) {
      console.error('증거 패키지 업로드 실패:', uploadError);
      // 업로드 실패해도 JSON 직접 반환 (폴백)
    } else {
      // M-2: signed URL 사용 (24시간 유효) — 공개 URL 대신 인증된 접근
      const { data: urlData, error: signedUrlError } = await supabase.storage
        .from('assembly-evidence')
        .createSignedUrl(fileName, 60 * 60 * 24);
      if (signedUrlError) {
        console.error('증거 패키지 signed URL 생성 실패:', signedUrlError);
      } else {
        evidenceUrl = urlData.signedUrl;
      }
    }

    // assemblies 테이블에 URL 저장
    const { error: updateError } = await supabase
      .from('assemblies')
      .update({
        evidence_package_url: evidenceUrl,
        evidence_packaged_at: packagedAt,
      })
      .eq('id', assemblyId)
      .eq('union_id', unionId);

    if (updateError) {
      console.error('증거 패키지 URL 저장 실패:', updateError);
    }

    if (evidenceUrl) {
      return NextResponse.json({
        data: {
          evidence_package_url: evidenceUrl,
          evidence_packaged_at: packagedAt,
          chain_integrity: chainIntegrity,
          chain_errors: chainErrors,
        },
      });
    }

    // Storage 업로드 실패 시 JSON 직접 반환
    return new NextResponse(JSON.stringify(evidencePackage, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="evidence_${assemblyId}.json"`,
      },
    });
  } catch (error) {
    console.error('POST /api/assemblies/[id]/evidence-package error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
