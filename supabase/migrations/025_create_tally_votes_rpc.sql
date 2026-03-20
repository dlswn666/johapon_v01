-- Migration 025: tally_votes RPC 생성 (C-05)
-- 투표 집계 함수: 비대체(non-superseded) 투표만 집계하여 vote_tally_results에 저장

CREATE OR REPLACE FUNCTION tally_votes(
  p_poll_id     uuid,
  p_tallied_by  varchar DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_assembly_id  uuid;
  v_union_id     uuid;
  v_poll_status  text;
  v_result       jsonb;
BEGIN
  -- [1] poll 정보 조회 및 상태 확인
  SELECT assembly_id, union_id, status
    INTO v_assembly_id, v_union_id, v_poll_status
    FROM polls
   WHERE id = p_poll_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 투표를 찾을 수 없습니다. (poll_id: %)', p_poll_id;
  END IF;

  -- [2] 기존 집계 결과 삭제 (재집계 가능하도록)
  DELETE FROM vote_tally_results
   WHERE poll_id = p_poll_id;

  -- [3] 비대체 투표만 집계하여 vote_tally_results에 INSERT
  INSERT INTO vote_tally_results (
    assembly_id, union_id, poll_id, option_id,
    voting_method, vote_count, vote_weight_sum,
    tallied_at, tallied_by
  )
  SELECT
    v_assembly_id,
    v_union_id,
    p_poll_id,
    vb.option_id,
    vb.voting_method,
    COUNT(*)::int              AS vote_count,
    COALESCE(SUM(vb.voting_weight), 0) AS vote_weight_sum,
    now()                      AS tallied_at,
    p_tallied_by               AS tallied_by
  FROM vote_ballots vb
  WHERE vb.poll_id       = p_poll_id
    AND vb.assembly_id   = v_assembly_id
    AND vb.is_superseded = false
  GROUP BY vb.option_id, vb.voting_method;

  -- [4] 집계 결과를 JSON으로 반환
  SELECT jsonb_agg(
    jsonb_build_object(
      'option_id',       vtr.option_id,
      'voting_method',   vtr.voting_method,
      'vote_count',      vtr.vote_count,
      'vote_weight_sum', vtr.vote_weight_sum,
      'tallied_at',      vtr.tallied_at
    )
  )
  INTO v_result
  FROM vote_tally_results vtr
  WHERE vtr.poll_id = p_poll_id;

  -- [5] 감사 로그
  INSERT INTO assembly_audit_logs (
    assembly_id, union_id, event_type,
    actor_id, actor_role, target_type, target_id,
    event_data, current_hash
  ) VALUES (
    v_assembly_id, v_union_id, 'TALLY_COMPUTED',
    COALESCE(p_tallied_by, 'SYSTEM'), 'ADMIN', 'poll', p_poll_id::text,
    jsonb_build_object(
      'poll_id', p_poll_id,
      'result_count', COALESCE(jsonb_array_length(v_result), 0)
    ),
    ''
  );

  RETURN COALESCE(v_result, '[]'::jsonb);

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION tally_votes(uuid, varchar) TO authenticated;

COMMENT ON FUNCTION tally_votes IS
  'tally_votes RPC: poll 단위 투표 집계. 비대체(non-superseded) 투표만 집계하여 vote_tally_results에 저장.';
