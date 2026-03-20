import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';
import { sendAlimTalk } from '@/app/_lib/features/alimtalk/actions/sendAlimTalk';
import { isSessionMode } from '@/app/_lib/shared/utils/featureFlags';

/**
 * 투표 실행 (cast_vote RPC 호출)
 * POST /api/votes/cast
 *
 * 비밀투표 보장:
 * - participation_records: 누가 투표했는지 (user_id 포함)
 * - vote_ballots: 무엇을 선택했는지 (user_id 없음)
 * - 두 테이블 간 FK 없음 → 조인 불가
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest();
    if (!auth.authenticated) return auth.response;

    const { pollId, assemblyId, optionId, authNonce } = await request.json();

    if (!pollId || !assemblyId || !optionId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
    }

    // authNonce 필수 검증 (PASS Step-up 본인인증 — 도시정비법 본인확인 요건)
    if (!authNonce) {
      return NextResponse.json({ error: '본인인증이 필요합니다. PASS 인증을 완료해주세요.' }, { status: 400 });
    }

    // authNonce 형식 검증 (64자 hex — PASS Step-up 인증 토큰)
    if (!/^[0-9a-f]{64}$/i.test(authNonce)) {
      return NextResponse.json({ error: '인증 토큰 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    if (!auth.user.union_id) {
      return NextResponse.json({ error: '조합 정보를 확인할 수 없습니다.' }, { status: 400 });
    }
    const unionId = auth.user.union_id;

    const supabase = await createClient();

    // 스냅샷 조회 (본인확인 + 개인정보 동의 여부 확인)
    const { data: snapshot, error: snapshotError } = await supabase
      .from('assembly_member_snapshots')
      .select('id, voting_weight, identity_verified_at, consent_agreed_at, is_active')
      .eq('assembly_id', assemblyId)
      .eq('union_id', unionId)
      .eq('user_id', auth.user.id)
      .eq('is_active', true)
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json({ error: '투표 권한이 없습니다. 총회 접근 인증을 먼저 완료해주세요.' }, { status: 403 });
    }

    if (!snapshot.identity_verified_at) {
      return NextResponse.json({ error: '본인확인이 완료되지 않았습니다.' }, { status: 403 });
    }

    // DEF-003: 개인정보 수집·이용 동의 확인
    if (!snapshot.consent_agreed_at) {
      return NextResponse.json({ error: '개인정보 수집·이용 동의가 필요합니다.' }, { status: 403 });
    }

    // 세션 모드: 활성 세션 검증 + last_seen_at 갱신
    const { data: assembly } = await supabase
      .from('assemblies')
      .select('session_mode, status')
      .eq('id', assemblyId)
      .eq('union_id', unionId)
      .single();

    if (assembly && isSessionMode(assembly)) {
      // 출석 유형 확인 (ONSITE는 세션 검증 스킵)
      const { data: attendanceLog } = await supabase
        .from('assembly_attendance_logs')
        .select('id, attendance_type, last_seen_at')
        .eq('assembly_id', assemblyId)
        .eq('union_id', unionId)
        .eq('user_id', auth.user.id)
        .is('exit_at', null)
        .order('entry_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attendanceLog && attendanceLog.attendance_type !== 'ONSITE') {
        // 온라인/서면대리: grace window 검증
        // 투표 중(poll OPEN)에는 180초, 기본 90초
        const graceSeconds = (assembly.status === 'VOTING' || assembly.status === 'PRE_VOTING') ? 180 : 90;
        const graceThreshold = new Date(Date.now() - graceSeconds * 1000).toISOString();

        if (!attendanceLog.last_seen_at || attendanceLog.last_seen_at < graceThreshold) {
          return NextResponse.json(
            { error: '현재 총회장 참여 상태를 확인할 수 없습니다. 총회장에 다시 접속해주세요.' },
            { status: 403 },
          );
        }

        // 투표 행위 = 출석 증거: last_seen_at 갱신
        await supabase
          .from('assembly_attendance_logs')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', attendanceLog.id);
      } else if (!attendanceLog) {
        return NextResponse.json(
          { error: '활성 출석 세션이 없습니다. 총회장에 다시 접속해주세요.' },
          { status: 403 },
        );
      }
    }

    // cast_vote RPC 호출 (DB 함수에서 모든 검증 + 비밀투표 처리)
    const { data, error } = await supabase.rpc('cast_vote', {
      p_poll_id: pollId,
      p_assembly_id: assemblyId,
      p_union_id: unionId,
      p_user_id: auth.user.id,
      p_snapshot_id: snapshot.id,
      p_option_id: optionId,
      p_voting_weight: snapshot.voting_weight,
      p_auth_nonce: authNonce,  // PASS 인증 토큰 (60초 TTL, 필수)
    });

    if (error) {
      console.error('투표 실행 실패:', error);
      // RPC 함수에서 RAISE EXCEPTION으로 반환하는 에러 메시지 전달
      const message = error.message || '투표에 실패했습니다.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // #4: 투표 완료 알림톡 영수증 (fire-and-forget)
    if (data?.receipt_token) {
      // 스냅샷에서 연락처, 총회 정보 조회
      const { data: snapshotInfo } = await supabase
        .from('assembly_member_snapshots')
        .select('member_name, member_phone')
        .eq('id', snapshot.id)
        .single();

      const { data: assemblyInfo } = await supabase
        .from('assemblies')
        .select('title')
        .eq('id', assemblyId)
        .single();

      if (snapshotInfo?.member_phone) {
        const receiptShort = (data.receipt_token as string).substring(0, 8);

        // DEF-017: 카카오 알림톡 템플릿 구분자 제거
        const sanitizeAlimtalk = (value: string) => value.replace(/[\[\]#{}|]/g, '');

        sendAlimTalk({
          unionId,
          templateCode: 'VOTE_RECEIPT',
          recipients: [{
            phoneNumber: snapshotInfo.member_phone,
            name: snapshotInfo.member_name,
            variables: {
              이름: sanitizeAlimtalk(snapshotInfo.member_name || ''),
              총회명: sanitizeAlimtalk(assemblyInfo?.title || ''),
              영수증번호: receiptShort,
            },
          }],
        }).then((result) => {
          if (result.success) {
            console.log(`투표 영수증 알림톡 발송 완료: ${snapshotInfo.member_phone}`);
          } else {
            console.error('투표 영수증 알림톡 발송 실패:', result.error);
          }
        }).catch((err) => {
          console.error('투표 영수증 알림톡 발송 오류:', err);
        });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('POST /api/votes/cast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
