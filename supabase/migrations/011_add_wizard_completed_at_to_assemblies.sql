-- Migration 011: assemblies에 위자드 완료 시각 컬럼 추가

ALTER TABLE assemblies ADD COLUMN IF NOT EXISTS wizard_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN assemblies.wizard_completed_at IS '위자드 최종 확정 시각';
