-- 1. PostGIS 확장 활성화 (필지 경계 데이터 처리용)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. 관련 Enum 타입 생성
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type_enum') THEN
        CREATE TYPE public.business_type_enum AS ENUM ('REDEVELOPMENT', 'RECONSTRUCTION', 'HOUSING_ASSOCIATION');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agreement_status_enum') THEN
        CREATE TYPE public.agreement_status_enum AS ENUM ('AGREED', 'DISAGREED', 'PENDING');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status_enum') THEN
        CREATE TYPE public.sync_status_enum AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');
    END IF;
END $$;

-- 3. consent_stages (사업 유형별 동의 단계 정의)
CREATE TABLE IF NOT EXISTS public.consent_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_type public.business_type_enum NOT NULL,
    stage_code VARCHAR(50) NOT NULL,
    stage_name TEXT NOT NULL,
    required_rate INTEGER NOT NULL DEFAULT 75,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(business_type, stage_code)
);

-- 4. land_lots (필지 정보)
CREATE TABLE IF NOT EXISTS public.land_lots (
    pnu VARCHAR(19) PRIMARY KEY,
    address TEXT NOT NULL,
    area DECIMAL,
    official_price BIGINT,
    boundary GEOMETRY(MultiPolygon, 4326),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. building_units (건물 내 호수 정보)
CREATE TABLE IF NOT EXISTS public.building_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pnu VARCHAR(19) REFERENCES public.land_lots(pnu) ON DELETE CASCADE,
    dong TEXT,
    ho TEXT,
    floor TEXT,
    exclusive_area DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. owners (소유주 정보)
CREATE TABLE IF NOT EXISTS public.owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.building_units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    share TEXT, -- 지분 (예: 1/2)
    is_representative BOOLEAN DEFAULT false,
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. owner_consents (소유주별 단계적 동의 관리)
CREATE TABLE IF NOT EXISTS public.owner_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.consent_stages(id) ON DELETE CASCADE,
    status public.agreement_status_enum DEFAULT 'PENDING' NOT NULL,
    consent_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(owner_id, stage_id)
);

-- 8. sync_jobs (데이터 수집 작업 상태 관리)
CREATE TABLE IF NOT EXISTS public.sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    union_id UUID REFERENCES public.unions(id) ON DELETE CASCADE,
    status public.sync_status_enum DEFAULT 'PROCESSING' NOT NULL,
    progress INTEGER DEFAULT 0 NOT NULL,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. pnu_consent_status (필지별 동의 현황 뷰 - ECharts 렌더링용)
CREATE OR REPLACE VIEW public.v_pnu_consent_status AS
WITH owner_status AS (
    SELECT 
        bu.pnu,
        oc.stage_id,
        o.id as owner_id,
        o.is_representative,
        oc.status
    FROM public.building_units bu
    JOIN public.owners o ON o.unit_id = bu.id
    LEFT JOIN public.owner_consents oc ON oc.owner_id = o.id
)
SELECT 
    pnu,
    stage_id,
    COUNT(*) as total_owners,
    COUNT(*) FILTER (WHERE status = 'AGREED') as agreed_owners,
    CASE 
        WHEN COUNT(*) = COUNT(*) FILTER (WHERE status = 'AGREED') THEN 'FULL_AGREED' -- 초록
        WHEN COUNT(*) FILTER (WHERE status = 'AGREED') > 0 THEN 'PARTIAL_AGREED' -- 노랑
        ELSE 'NONE_AGREED' -- 빨강
    END as display_status
FROM owner_status
GROUP BY pnu, stage_id;

-- 10. 동의율 계산용 펑션
CREATE OR REPLACE FUNCTION public.get_union_consent_rate(p_union_id UUID, p_stage_id UUID)
RETURNS TABLE (
    total_area DECIMAL,
    agreed_area DECIMAL,
    area_rate DECIMAL,
    total_owner_count INTEGER,
    agreed_owner_count INTEGER,
    owner_rate DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH pnu_agreements AS (
        SELECT 
            ll.pnu,
            ll.area,
            v.display_status
        FROM public.land_lots ll
        JOIN public.v_pnu_consent_status v ON v.pnu = ll.pnu
        WHERE v.stage_id = p_stage_id
    ),
    owner_agreements AS (
        SELECT 
            COUNT(DISTINCT o.id) as total_cnt,
            COUNT(DISTINCT o.id) FILTER (WHERE oc.status = 'AGREED') as agreed_cnt
        FROM public.owners o
        JOIN public.building_units bu ON bu.id = o.unit_id
        JOIN public.land_lots ll ON ll.pnu = bu.pnu
        LEFT JOIN public.owner_consents oc ON oc.owner_id = o.id AND oc.stage_id = p_stage_id
    )
    SELECT 
        COALESCE(SUM(area), 0),
        COALESCE(SUM(area) FILTER (WHERE display_status = 'FULL_AGREED'), 0),
        CASE WHEN SUM(area) > 0 THEN (SUM(area) FILTER (WHERE display_status = 'FULL_AGREED') / SUM(area)) * 100 ELSE 0 END,
        (SELECT total_cnt::INTEGER FROM owner_agreements),
        (SELECT agreed_cnt::INTEGER FROM owner_agreements),
        CASE WHEN (SELECT total_cnt FROM owner_agreements) > 0 THEN ((SELECT agreed_cnt FROM owner_agreements)::DECIMAL / (SELECT total_cnt FROM owner_agreements)) * 100 ELSE 0 END
    FROM pnu_agreements;
END;
$$;

-- 인덱스 설정
CREATE INDEX IF NOT EXISTS idx_land_lots_boundary ON public.land_lots USING GIST (boundary);
CREATE INDEX IF NOT EXISTS idx_building_units_pnu ON public.building_units (pnu);
CREATE INDEX IF NOT EXISTS idx_owners_unit_id ON public.owners (unit_id);
CREATE INDEX IF NOT EXISTS idx_owner_consents_owner ON public.owner_consents (owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_consents_stage ON public.owner_consents (stage_id);
