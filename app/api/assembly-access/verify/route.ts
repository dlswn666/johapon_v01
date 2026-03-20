import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { isSessionMode } from '@/app/_lib/shared/utils/featureFlags';
import type { IdentityMethod } from '@/app/_lib/shared/type/assembly.types';
import crypto from 'crypto';

// 지원되는 본인인증 방법
const SUPPORTED_IDENTITY_METHODS: IdentityMethod[] = ['KAKAO_LOGIN', 'PASS_CERT', 'CERTIFICATE'];

// 입장 허용 총회 상태
const ENTRY_ALLOWED_STATUSES = ['PRE_VOTING', 'CONVENED', 'IN_PROGRESS', 'VOTING', 'VOTING_CLOSED'];

/**
 * 총회 접근 토큰 검증 + 카카오 인증 확인
 * POST /api/assembly-access/verify
 *
 * 플로우:
 * 1. 카카오 로그인된 사용자인지 확인
 * 2. 총회 상태 검증 (입장 가능 상태인지)
 * 3. 토큰 해시 → assembly_member_snapshots 매칭
 * 4. 스냅샷의 user_id가 현재 로그인 사용자와 일치하는지 확인
 * 5. 본인확인 완료 처리 + 출석 기록 생성
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { assemblyId, token } = body;
    // 본인인증 방법 (기본값: 카카오 로그인)
    const identityMethod: IdentityMethod = body.identityMethod || 'KAKAO_LOGIN';

    if (!assemblyId || !token) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // 지원되지 않는 인증 방법 검증
    if (!SUPPORTED_IDENTITY_METHODS.includes(identityMethod)) {
      return NextResponse.json({ error: '지원되지 않는 인증 방법입니다.' }, { status: 400 });
    }

    // PASS 본인인증 / 공동인증서 — 아직 미구현
    if (identityMethod === 'PASS_CERT') {
      return NextResponse.json(
        { error: 'PASS 본인인증은 준비 중입니다.' },
        { status: 501 },
      );
    }
    if (identityMethod === 'CERTIFICATE') {
      return NextResponse.json(
        { error: '공동인증서 인증은 준비 중입니다.' },
        { status: 501 },
      );
    }

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;

    const supabase = await createClient();

    // 총회 상태 검증
    const { data: assemblyCheck } = await supabase
      .from('assemblies')
      .select('status, session_mode')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (!assemblyCheck || !ENTRY_ALLOWED_STATUSES.includes(assemblyCheck.status)) {
      return NextResponse.json({ error: '현재 입장 가능한 총회가 아닙니다.' }, { status: 403 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 토큰 해시로 스냅샷 조회 (access_token_hash 제외)
    const { data: snapshot, error: snapshotError } = await supabase
      .from('assembly_member_snapshots')
      .select('id, assembly_id, union_id, user_id, member_name, member_phone, property_address, voting_weight, member_type, proxy_user_id, proxy_name, proxy_authorized_at, token_expires_at, token_used_at, identity_verified_at, identity_method, consent_agreed_at, is_active, created_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('access_token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json({ error: '유효하지 않은 접근 토큰입니다.' }, { status: 403 });
    }

    // 토큰 만료 확인
    if (snapshot.token_expires_at && new Date(snapshot.token_expires_at) < new Date()) {
      return NextResponse.json({ error: '접근 토큰이 만료되었습니다. 관리자에게 문의하세요.' }, { status: 403 });
    }

    // 카카오 로그인 사용자와 스냅샷 user_id 매칭 확인
    // 대리투표 온라인 접근: proxy_user_id로 인증된 대리인도 허용
    const isOwner = snapshot.user_id === auth.user.id;
    const isProxy = snapshot.proxy_user_id === auth.user.id && !!snapshot.proxy_authorized_at;
    if (!isOwner && !isProxy) {
      return NextResponse.json({ error: '본인의 접근 토큰이 아닙니다.' }, { status: 403 });
    }

    // 이미 본인확인 완료된 경우 (재입장)
    if (snapshot.identity_verified_at) {
      const assemblyData = await getAssemblyWithAgendas(supabase, assemblyId, unionId);
      return NextResponse.json({
        data: {
          snapshot,
          ...assemblyData,
          isReentry: true,
        },
      });
    }

    // 본인확인 완료 처리 — 원자적 조건부 UPDATE (TOCTOU 방지)
    // identity_verified_at IS NULL 조건으로 동시 요청 중 단 한 건만 성공
    const now = new Date().toISOString();
    const { data: updateResult, error: updateError } = await supabase
      .from('assembly_member_snapshots')
      .update({
        token_used_at: now,
        identity_verified_at: now,
        identity_method: identityMethod,
      })
      .eq('id', snapshot.id)
      .is('identity_verified_at', null)
      .select('id');

    if (updateError) {
      console.error('스냅샷 업데이트 실패:', updateError);
      return NextResponse.json({ error: '본인확인 처리에 실패했습니다.' }, { status: 500 });
    }

    // 이미 다른 요청이 먼저 처리된 경우 (재입장으로 처리)
    if (!updateResult || updateResult.length === 0) {
      const assemblyData = await getAssemblyWithAgendas(supabase, assemblyId, unionId);
      return NextResponse.json({
        data: {
          snapshot,
          ...assemblyData,
          isReentry: true,
        },
      });
    }

    // 출석 기록 생성 (SESSION 모드에서는 online-session/start에서 처리)
    if (!isSessionMode(assemblyCheck)) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
      const userAgent = request.headers.get('user-agent') || null;

      const { error: attendanceError } = await supabase
        .from('assembly_attendance_logs')
        .insert({
          assembly_id: assemblyId,
          union_id: unionId,
          snapshot_id: snapshot.id,
          user_id: auth.user.id,
          // 대리인 접근 시 WRITTEN_PROXY로 기록, 본인 접근 시 ONLINE
          attendance_type: isProxy ? 'WRITTEN_PROXY' : 'ONLINE',
          entry_at: now,
          identity_verified: true,
          identity_method: identityMethod,
          identity_verified_at: now,
          ip_address: ip,
          user_agent: userAgent,
        });

      if (attendanceError) {
        // DEF-002: UNIQUE 제약 위반 시 이미 처리된 것으로 간주
        if (attendanceError.code === '23505') {
          const assemblyData = await getAssemblyWithAgendas(supabase, assemblyId, unionId);
          return NextResponse.json({
            data: {
              snapshot: { ...snapshot, identity_verified_at: now },
              ...assemblyData,
              isReentry: true,
            },
          });
        }
        console.error('출석 기록 생성 실패:', attendanceError);
      }
    }

    // 총회 정보 + 안건 조회
    const assemblyData = await getAssemblyWithAgendas(supabase, assemblyId, unionId);

    return NextResponse.json({
      data: {
        snapshot: {
          ...snapshot,
          token_used_at: now,
          identity_verified_at: now,
          identity_method: identityMethod,
        },
        ...assemblyData,
        isReentry: false,
      },
    });
  } catch (error) {
    console.error('POST /api/assembly-access/verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 개인정보 수집·이용 동의 처리
 * PATCH /api/assembly-access/verify
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { assemblyId, consentTextHash, consentVersion } = body;

    if (!assemblyId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }

    const unionId = auth.user.union_id;
    const supabase = await createClient();

    // B2 수정: 본인 + 대리인 폴백 경로
    let snapshot: { id: string; consent_agreed_at: string | null } | null = null;
    let actorRole: 'OWNER' | 'PROXY' = 'OWNER';

    // 1단계: 본인 경로
    const { data: ownerSnapshot } = await supabase
      .from('assembly_member_snapshots')
      .select('id, consent_agreed_at')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (ownerSnapshot) {
      snapshot = ownerSnapshot;
      actorRole = 'OWNER';
    } else {
      // 2단계: 대리인 경로 (B2 버그 수정)
      const { data: proxySnapshot } = await supabase
        .from('assembly_member_snapshots')
        .select('id, consent_agreed_at')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('proxy_user_id', auth.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (proxySnapshot) {
        snapshot = proxySnapshot;
        actorRole = 'PROXY';
      }
    }

    if (!snapshot) {
      return NextResponse.json({ error: '총회 접근 권한이 없습니다.' }, { status: 403 });
    }

    // 이미 동의한 경우
    if (snapshot.consent_agreed_at) {
      return NextResponse.json({ data: { consent_agreed_at: snapshot.consent_agreed_at } });
    }

    // P1-5: 현재 유효한 약관 버전 조회
    const now = new Date().toISOString();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    const { data: currentVersion } = await supabase
      .from('consent_versions')
      .select('version_code')
      .eq('consent_type', 'ASSEMBLY_PRIVACY')
      .lte('effective_from', now)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    const resolvedVersion = consentVersion || currentVersion?.version_code || 'v1.0';

    // 동의 기록 (버전 포함)
    const { error: updateError } = await supabase
      .from('assembly_member_snapshots')
      .update({
        consent_agreed_at: now,
        consent_agreed_version: resolvedVersion,
      })
      .eq('id', snapshot.id);

    if (updateError) {
      console.error('동의 기록 실패:', updateError);
      return NextResponse.json({ error: '동의 처리에 실패했습니다.' }, { status: 500 });
    }

    // 동의 증거 INSERT (assembly_consent_evidences 테이블 존재 시)
    const resolvedHash = consentTextHash || crypto
      .createHash('sha256')
      .update(`CONSENT_V${resolvedVersion}_${assemblyId}`)
      .digest('hex');

    let evidenceId: string | null = null;
    const { data: evidenceData } = await supabase
      .from('assembly_consent_evidences')
      .insert({
        union_id: unionId,
        assembly_id: assemblyId,
        snapshot_id: snapshot.id,
        actor_user_id: auth.user.id,
        actor_role: actorRole,
        consent_type: 'VOTING_CONSENT',
        consent_version: resolvedVersion,
        consent_text_hash: resolvedHash,
        signature_type: 'SIMPLE',
        ip_address: ip,
        user_agent: userAgent,
      })
      .select('id')
      .maybeSingle();

    if (evidenceData) {
      evidenceId = evidenceData.id;
    }

    // 감사 로그
    await supabase.from('assembly_audit_logs').insert({
      assembly_id: assemblyId,
      union_id: unionId,
      event_type: 'CONSENT_AGREED',
      actor_id: auth.user.id,
      actor_role: actorRole,
      target_type: 'snapshot',
      target_id: snapshot.id,
      event_data: {
        consent_type: 'VOTING_CONSENT',
        consent_version: resolvedVersion,
        consent_text_hash: resolvedHash,
        evidence_id: evidenceId,
      },
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({
      data: {
        consent_agreed_at: now,
        consent_evidence_id: evidenceId,
      },
    });
  } catch (error) {
    console.error('PATCH /api/assembly-access/verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 총회 정보 + 안건 + 투표 세션 조회 헬퍼 (내부 운영 데이터 제외)
 */
async function getAssemblyWithAgendas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assemblyId: string,
  unionId: string,
) {
  const { data: assembly } = await supabase
    .from('assemblies')
    .select(`
      id, union_id, title, description, assembly_type, status,
      scheduled_at, opened_at, venue_address, stream_type,
      zoom_meeting_id, youtube_video_id, notice_content,
      quorum_total_members, legal_basis, session_mode
    `)
    .eq('id', assemblyId)
    .eq('union_id', unionId)
    .single();

  const { data: agendaItems } = await supabase
    .from('agenda_items')
    .select('*, polls(*, poll_options(*))')
    .eq('assembly_id', assemblyId)
    .eq('union_id', unionId)
    .order('seq_order', { ascending: true });

  return { assembly, agendaItems: agendaItems || [] };
}
