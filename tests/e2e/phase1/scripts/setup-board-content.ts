import { adminClient } from '../helpers/supabase-admin';
import { getUnionId } from '../helpers/data-setup';
import { ADMIN_ID, USER_IDS } from '../helpers/test-constants';

async function setupBoardContent() {
  const unionId = await getUnionId('test-union');
  console.log(`test-union ID: ${unionId}`);

  // 1. 공지사항 — 관리자 작성 (3건: 기본, 팝업, 알림톡)
  const notices = [
    {
      author_id: ADMIN_ID,
      union_id: unionId,
      title: '[공지] 2026년 3월 조합 정기총회 안내',
      content: '<p>안녕하세요, 테스트 재개발 조합입니다.</p><p>2026년 3월 정기총회를 아래와 같이 개최합니다.</p><ul><li>일시: 2026년 3월 28일 (토) 오후 2시</li><li>장소: 조합 사무실</li></ul><p><strong>많은 참석 부탁드립니다.</strong></p>',
      is_popup: false,
    },
    {
      author_id: ADMIN_ID,
      union_id: unionId,
      title: '[긴급] 주차장 공사 안내',
      content: '<p>주차장 보수 공사가 진행됩니다.</p><p>기간: 2026-03-25 ~ 2026-03-31</p><p>공사 기간 중 지하 1층 주차장 이용이 제한됩니다.</p>',
      is_popup: true,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      author_id: ADMIN_ID,
      union_id: unionId,
      title: '[안내] 관리비 고지서 발송 안내',
      content: '<p>3월 관리비 고지서가 발송되었습니다.</p><p>납부 기한: 2026년 3월 31일</p>',
      is_popup: false,
    },
  ];

  for (const notice of notices) {
    const { data, error } = await adminClient.from('notices').insert(notice).select('id').single();
    if (error) {
      console.error(`공지 생성 실패: ${error.message}`);
    } else {
      console.log(`✅ 공지사항 생성: id=${data.id}, "${notice.title}"`);
    }
  }

  // 2. Q&A 질문 — U01 작성 (일반 1건 + U02 비밀글 1건)
  const questions = [
    {
      author_id: USER_IDS.U01,
      union_id: unionId,
      title: '아파트 관리비 문의입니다',
      content: '<p>101동 501호 김아파트입니다. 이번 달 관리비가 평소보다 높은데 확인 부탁드립니다.</p>',
      is_secret: false,
    },
    {
      author_id: USER_IDS.U02,
      union_id: unionId,
      title: '개인 정보 관련 문의',
      content: '<p>개인 정보 변경 절차에 대해 문의드립니다.</p>',
      is_secret: true,
    },
  ];

  for (const q of questions) {
    const { data, error } = await adminClient.from('questions').insert(q).select('id').single();
    if (error) {
      console.error(`Q&A 생성 실패: ${error.message}`);
    } else {
      console.log(`✅ Q&A 생성: id=${data.id}, "${q.title}" (비밀글: ${q.is_secret})`);
    }
  }

  // 3. 자유게시판 — U01, U02 작성
  const freeBoards = [
    {
      author_id: USER_IDS.U01,
      union_id: unionId,
      title: '반갑습니다! 101동 김아파트입니다',
      content: '<p>안녕하세요, 이번에 새로 입주한 <strong>101동 501호</strong> 김아파트입니다.</p><p>잘 부탁드립니다!</p>',
    },
    {
      author_id: USER_IDS.U02,
      union_id: unionId,
      title: '빌라동 주차 관련 공지',
      content: '<p>빌라동 주차장 이용 규칙 안내드립니다.</p><ul><li>1세대 1주차</li><li>외부 차량 주차 금지</li></ul>',
    },
  ];

  for (const fb of freeBoards) {
    const { data, error } = await adminClient.from('free_boards').insert(fb).select('id').single();
    if (error) {
      console.error(`자유게시판 생성 실패: ${error.message}`);
    } else {
      console.log(`✅ 자유게시판 생성: id=${data.id}, "${fb.title}"`);
    }
  }

  // 4. 조합소식 — 관리자 작성
  const { data: uiData, error: uiError } = await adminClient.from('union_info').insert({
    author_id: ADMIN_ID,
    union_id: unionId,
    title: '2026년 3월 조합 활동 보고',
    content: '<p>3월 조합 활동 내용을 보고드립니다.</p><p>관리비 정산, 시설물 점검 등이 완료되었습니다.</p>',
    has_attachments: false,
  }).select('id').single();

  if (uiError) {
    console.error(`조합소식 생성 실패: ${uiError.message}`);
  } else {
    console.log(`✅ 조합소식 생성: id=${uiData.id}`);
  }

  // 5. 댓글 — 공지에 댓글 + 대댓글
  // 첫 번째 공지의 ID 조회
  const { data: firstNotice } = await adminClient
    .from('notices')
    .select('id')
    .eq('union_id', unionId)
    .like('author_id', 'test_%')
    .order('id', { ascending: true })
    .limit(1)
    .single();

  if (firstNotice) {
    // U01 댓글
    const { data: c1, error: c1Err } = await adminClient.from('comments').insert({
      author_id: USER_IDS.U01,
      union_id: unionId,
      entity_type: 'notice',
      entity_id: firstNotice.id,
      content: '총회 참석하겠습니다. 감사합니다!',
    }).select('id').single();

    if (c1) {
      console.log(`✅ 공지 댓글 생성: id=${c1.id} (U01)`);

      // U02 댓글
      const { data: c2 } = await adminClient.from('comments').insert({
        author_id: USER_IDS.U02,
        union_id: unionId,
        entity_type: 'notice',
        entity_id: firstNotice.id,
        content: '주차 문제도 논의 부탁드립니다.',
      }).select('id').single();
      if (c2) console.log(`✅ 공지 댓글 생성: id=${c2.id} (U02)`);

      // U01 → U02 댓글에 대댓글
      if (c2) {
        const { data: reply } = await adminClient.from('comments').insert({
          author_id: USER_IDS.U01,
          union_id: unionId,
          entity_type: 'notice',
          entity_id: firstNotice.id,
          parent_id: c2.id,
          content: '저도 동의합니다. 주차 문제 꼭 다뤄주세요.',
        }).select('id').single();
        if (reply) console.log(`✅ 대댓글 생성: id=${reply.id} (U01→U02)`);
      }
    } else if (c1Err) {
      console.error(`댓글 생성 실패: ${c1Err.message}`);
    }
  }

  // 6. 자유게시판 댓글
  const { data: firstFB } = await adminClient
    .from('free_boards')
    .select('id')
    .eq('union_id', unionId)
    .eq('author_id', USER_IDS.U01)
    .limit(1)
    .single();

  if (firstFB) {
    const { data: fbc } = await adminClient.from('comments').insert({
      author_id: USER_IDS.U02,
      union_id: unionId,
      entity_type: 'free_board',
      entity_id: firstFB.id,
      content: '환영합니다! 빌라동 이빌라입니다.',
    }).select('id').single();
    if (fbc) console.log(`✅ 자유게시판 댓글 생성: id=${fbc.id} (U02→U01글)`);
  }

  // 7. Q&A 답변 — 관리자가 U01 질문에 답변
  const { data: firstQ } = await adminClient
    .from('questions')
    .select('id')
    .eq('union_id', unionId)
    .eq('author_id', USER_IDS.U01)
    .limit(1)
    .single();

  if (firstQ) {
    const { error: ansErr } = await adminClient.from('questions').update({
      answer_content: '<p>확인 결과 공용전기료 인상분이 반영되었습니다. 자세한 내역은 관리비 고지서를 확인해주세요.</p>',
      answer_author_id: ADMIN_ID,
      answered_at: new Date().toISOString(),
    }).eq('id', firstQ.id);
    if (ansErr) {
      console.error(`Q&A 답변 실패: ${ansErr.message}`);
    } else {
      console.log(`✅ Q&A 답변 작성: question_id=${firstQ.id}`);
    }
  }

  console.log('\n✅ 게시판 콘텐츠 생성 완료');
}

setupBoardContent().catch(console.error);
