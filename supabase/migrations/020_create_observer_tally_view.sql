-- Migration 020: observer_tally VIEW (참관인 집계 검증용)
-- 해소 갭: INFRA-10

CREATE OR REPLACE VIEW observer_tally AS
SELECT
  p.assembly_id,
  p.id                              AS poll_id,
  ai.title                          AS agenda_title,
  po.id                             AS option_id,
  po.label                          AS option_label,
  po.option_type,
  po.seq_order,
  COALESCE(agg.vote_count,      0)  AS vote_count,
  COALESCE(agg.weighted_count,  0)  AS weighted_count,
  agg.voting_method
FROM polls p
JOIN agenda_items ai  ON ai.id       = p.agenda_item_id
JOIN poll_options  po ON po.poll_id  = p.id
LEFT JOIN (
  SELECT
    poll_id,
    option_id,
    voting_method,
    COUNT(*)              AS vote_count,
    SUM(voting_weight)    AS weighted_count
  FROM vote_ballots
  WHERE is_superseded = false
  GROUP BY poll_id, option_id, voting_method
) agg ON agg.poll_id = p.id AND agg.option_id = po.id
WHERE p.status IN ('CLOSED', 'CANCELLED')
ORDER BY p.assembly_id, p.id, po.seq_order, agg.voting_method;

GRANT SELECT ON observer_tally TO authenticated;

COMMENT ON VIEW observer_tally IS
  '참관인용 투표 집계 VIEW. 투표 종료(CLOSED) 후에만 접근 가능. 개별 ballot 정보 미포함.';
