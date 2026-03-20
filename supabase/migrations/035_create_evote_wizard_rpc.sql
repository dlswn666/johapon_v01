-- Migration 035: create_evote_wizard RPC
-- 전자투표 생성 마법사 — 단일 트랜잭션으로 모든 관련 데이터 일괄 생성
-- 패턴 참조: cast_vote (024), transition_assembly_status (032)

CREATE OR REPLACE FUNCTION create_evote_wizard(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  -- 추출된 최상위 필드
  v_union_id          uuid;
  v_actor_id          varchar;

  -- assembly 데이터
  v_assembly_id       uuid;
  v_assembly          jsonb;

  -- 반복용 변수
  v_agenda            jsonb;
  v_agenda_item_id    uuid;
  v_poll_id           uuid;
  v_option            jsonb;
  v_member            jsonb;
  v_doc               jsonb;

  -- 카운터
  v_agenda_count      int := 0;
  v_poll_count        int := 0;
  v_option_count      int := 0;
  v_member_count      int := 0;
  v_doc_count         int := 0;
BEGIN
  -- ============================================================
  -- [0] 페이로드에서 공통 필드 추출 및 검증
  -- ============================================================
  v_union_id := (p_payload->>'union_id')::uuid;
  v_actor_id := p_payload->>'actor_id';
  v_assembly := p_payload->'assembly';

  IF v_union_id IS NULL THEN
    RAISE EXCEPTION 'union_id는 필수입니다.';
  END IF;
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'actor_id는 필수입니다.';
  END IF;
  IF v_assembly IS NULL THEN
    RAISE EXCEPTION 'assembly 데이터는 필수입니다.';
  END IF;
  IF p_payload->'agendas' IS NULL OR jsonb_array_length(p_payload->'agendas') = 0 THEN
    RAISE EXCEPTION '최소 1개의 안건(agendas)이 필요합니다.';
  END IF;

  -- ============================================================
  -- [1] assemblies INSERT → assembly_id 획득
  -- ============================================================
  INSERT INTO assemblies (
    union_id,
    title,
    description,
    assembly_type,
    status,
    session_mode,
    scheduled_at,
    venue_address,
    announcement_date,
    pre_vote_start_date,
    pre_vote_end_date,
    final_deadline,
    quorum_type,
    created_by
  ) VALUES (
    v_union_id,
    v_assembly->>'title',
    v_assembly->>'description',
    COALESCE(v_assembly->>'assembly_type', 'REGULAR'),
    'DRAFT',
    COALESCE(v_assembly->>'session_mode', 'ELECTRONIC_ONLY'),
    (v_assembly->>'scheduled_at')::timestamptz,
    v_assembly->>'venue_address',
    (v_assembly->>'announcement_date')::timestamptz,
    (v_assembly->>'pre_vote_start_date')::timestamptz,
    (v_assembly->>'pre_vote_end_date')::timestamptz,
    (v_assembly->>'final_deadline')::timestamptz,
    COALESCE(v_assembly->>'quorum_type', 'GENERAL'),
    v_actor_id
  )
  RETURNING id INTO v_assembly_id;

  -- ============================================================
  -- [2] agendas 순회: agenda_items + polls + poll_options INSERT
  -- ============================================================
  FOR v_agenda IN SELECT * FROM jsonb_array_elements(p_payload->'agendas')
  LOOP
    v_agenda_count := v_agenda_count + 1;

    -- 2-1. agenda_items INSERT
    INSERT INTO agenda_items (
      assembly_id,
      union_id,
      seq_order,
      title,
      description,
      agenda_type,
      vote_type,
      quorum_type_override,
      quorum_threshold_pct,
      approval_threshold_pct,
      explanation_html
    ) VALUES (
      v_assembly_id,
      v_union_id,
      COALESCE((v_agenda->>'seq_order')::int, v_agenda_count),
      v_agenda->>'title',
      v_agenda->>'description',
      COALESCE(v_agenda->>'agenda_type', 'GENERAL'),
      COALESCE(v_agenda->>'vote_type', 'APPROVE'),
      v_agenda->>'quorum_type_override',
      (v_agenda->>'quorum_threshold_pct')::numeric,
      (v_agenda->>'approval_threshold_pct')::numeric,
      v_agenda->>'explanation_html'
    )
    RETURNING id INTO v_agenda_item_id;

    -- 2-2. polls INSERT (각 agenda_item에 1:1)
    INSERT INTO polls (
      agenda_item_id,
      assembly_id,
      union_id,
      vote_type,
      elect_count,
      opens_at,
      closes_at,
      allow_vote_revision,
      allow_abstain,
      status
    ) VALUES (
      v_agenda_item_id,
      v_assembly_id,
      v_union_id,
      COALESCE(v_agenda->>'vote_type', 'APPROVE'),
      (v_agenda->>'elect_count')::int,
      COALESCE((v_agenda->>'opens_at')::timestamptz, (v_assembly->>'pre_vote_start_date')::timestamptz, (v_assembly->>'scheduled_at')::timestamptz),
      COALESCE((v_agenda->>'closes_at')::timestamptz, (v_assembly->>'pre_vote_end_date')::timestamptz, (v_assembly->>'final_deadline')::timestamptz),
      COALESCE((v_agenda->>'allow_vote_revision')::boolean, true),
      COALESCE((v_agenda->>'allow_abstain')::boolean, true),
      'SCHEDULED'
    )
    RETURNING id INTO v_poll_id;

    v_poll_count := v_poll_count + 1;

    -- 2-3. poll_options INSERT
    -- vote_type에 따라 기본 옵션 또는 커스텀 옵션 생성
    IF v_agenda->'options' IS NOT NULL AND jsonb_array_length(v_agenda->'options') > 0 THEN
      -- 커스텀 옵션이 제공된 경우
      FOR v_option IN SELECT * FROM jsonb_array_elements(v_agenda->'options')
      LOOP
        v_option_count := v_option_count + 1;

        INSERT INTO poll_options (
          poll_id,
          union_id,
          seq_order,
          label,
          option_type,
          description,
          candidate_name,
          candidate_info,
          company_name,
          bid_amount,
          company_info
        ) VALUES (
          v_poll_id,
          v_union_id,
          COALESCE((v_option->>'seq_order')::int, v_option_count),
          v_option->>'label',
          COALESCE(v_option->>'option_type', 'CUSTOM'),
          v_option->>'description',
          v_option->>'candidate_name',
          v_option->>'candidate_info',
          v_option->>'company_name',
          v_option->>'bid_amount',
          v_option->>'company_info'
        );
      END LOOP;
    ELSE
      -- APPROVE 타입: 기본 찬성/반대/기권 옵션 자동 생성
      IF COALESCE(v_agenda->>'vote_type', 'APPROVE') = 'APPROVE' THEN
        INSERT INTO poll_options (poll_id, union_id, seq_order, label, option_type) VALUES
          (v_poll_id, v_union_id, 1, '찬성', 'APPROVE'),
          (v_poll_id, v_union_id, 2, '반대', 'REJECT'),
          (v_poll_id, v_union_id, 3, '기권', 'ABSTAIN');
        v_option_count := v_option_count + 3;
      END IF;
    END IF;

    -- 2-4. agenda_documents INSERT (안건별 문서)
    IF v_agenda->'documents' IS NOT NULL AND jsonb_array_length(v_agenda->'documents') > 0 THEN
      FOR v_doc IN SELECT * FROM jsonb_array_elements(v_agenda->'documents')
      LOOP
        INSERT INTO agenda_documents (
          agenda_item_id,
          assembly_id,
          union_id,
          title,
          file_url,
          file_type,
          file_size,
          uploaded_by
        ) VALUES (
          v_agenda_item_id,
          v_assembly_id,
          v_union_id,
          v_doc->>'title',
          v_doc->>'file_url',
          v_doc->>'file_type',
          (v_doc->>'file_size')::int,
          v_actor_id
        );
        v_doc_count := v_doc_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- ============================================================
  -- [3] assembly_member_snapshots INSERT (선택된 대상자)
  -- ============================================================
  IF p_payload->'member_ids' IS NOT NULL AND jsonb_array_length(p_payload->'member_ids') > 0 THEN
    INSERT INTO assembly_member_snapshots (
      assembly_id,
      union_id,
      user_id,
      member_name,
      member_phone,
      property_address,
      voting_weight,
      member_type,
      entity_type,
      property_units_snapshot
    )
    SELECT
      v_assembly_id,
      v_union_id,
      m.user_id,
      m.name,
      m.phone,
      m.property_address,
      COALESCE(m.voting_weight, 1.0),
      COALESCE(m.member_type, 'INDIVIDUAL'),
      m.entity_type,
      m.property_units_snapshot
    FROM jsonb_to_recordset(p_payload->'member_ids') AS m(
      user_id varchar,
      name text,
      phone text,
      property_address text,
      voting_weight numeric,
      member_type text,
      entity_type varchar,
      property_units_snapshot jsonb
    );

    GET DIAGNOSTICS v_member_count = ROW_COUNT;
  END IF;

  -- ============================================================
  -- [4] assembly_documents INSERT (총회 레벨 문서)
  -- ============================================================
  IF p_payload->'documents' IS NOT NULL AND jsonb_array_length(p_payload->'documents') > 0 THEN
    FOR v_doc IN SELECT * FROM jsonb_array_elements(p_payload->'documents')
    LOOP
      INSERT INTO assembly_documents (
        assembly_id,
        union_id,
        file_name,
        original_file_name,
        file_url,
        file_type,
        file_size,
        doc_category,
        uploaded_by
      ) VALUES (
        v_assembly_id,
        v_union_id,
        v_doc->>'file_name',
        v_doc->>'original_file_name',
        v_doc->>'file_url',
        v_doc->>'file_type',
        (v_doc->>'file_size')::int,
        COALESCE(v_doc->>'doc_category', 'ETC'),
        v_actor_id
      );
      v_doc_count := v_doc_count + 1;
    END LOOP;
  END IF;

  -- ============================================================
  -- [5] assembly_audit_logs INSERT (EVOTE_CREATED 이벤트)
  -- ============================================================
  INSERT INTO assembly_audit_logs (
    assembly_id, union_id, event_type,
    actor_id, actor_role, target_type, target_id,
    event_data, current_hash
  ) VALUES (
    v_assembly_id, v_union_id, 'EVOTE_CREATED',
    v_actor_id, 'ADMIN', 'assembly', v_assembly_id::text,
    jsonb_build_object(
      'agenda_count',  v_agenda_count,
      'poll_count',    v_poll_count,
      'member_count',  v_member_count,
      'option_count',  v_option_count,
      'document_count', v_doc_count
    ),
    ''
  );

  -- ============================================================
  -- [6] 결과 반환
  -- ============================================================
  RETURN jsonb_build_object(
    'success',       true,
    'assembly_id',   v_assembly_id,
    'agenda_count',  v_agenda_count,
    'poll_count',    v_poll_count,
    'member_count',  v_member_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION create_evote_wizard(jsonb)
  TO authenticated;

COMMENT ON FUNCTION create_evote_wizard IS
  'create_evote_wizard RPC: 전자투표 생성 마법사 — assemblies, agenda_items, polls, poll_options, member_snapshots, documents를 단일 트랜잭션으로 생성';
