-- ============================================================
-- Auth Users 마이그레이션 스크립트
-- 새 프로젝트: bpdjashtxqrcgxfequgf (Asia-Pacific)
-- 생성일: 2025-12-15
-- ============================================================
-- ⚠️ 주의: 이 스크립트는 auth.users 테이블에 직접 삽입합니다.
-- 새 프로젝트의 SQL Editor에서 실행하세요.
-- ============================================================

-- 1. auth.users 데이터 삽입
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
)
VALUES (
    'b513ab6e-3f62-4edc-a17d-933f46294996',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'injostar@naver.com',
    '$2a$10$ROAM20gViQJ2cvS5JWWuiO0DRCBtgS0DeDvz.Rt31wxZMlCjc8/tS',
    '2025-12-12 08:00:26.127702+00',
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    '2025-12-15 07:03:54.095061+00',
    '{"provider":"email","providers":["email","kakao"]}'::jsonb,
    '{"iss":"https://kapi.kakao.com","sub":"4642379870","name":"정인주","email":"injostar@naver.com","full_name":"정인주","user_name":"정인주","avatar_url":"http://k.kakaocdn.net/dn/YNG3p/dJMcaiIpnsE/jIr3iPFOQ5bOXuc2ggmT31/m1.jpg","provider_id":"4642379870","email_verified":true,"phone_verified":false,"preferred_username":"정인주"}'::jsonb,
    NULL,
    '2025-12-12 08:00:26.041153+00',
    '2025-12-15 07:21:46.409154+00',
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
)
ON CONFLICT (id) DO NOTHING;

-- 2. auth.identities 테이블 삽입 (이메일 + 카카오 연동 정보)
-- ⚠️ email 컬럼은 generated column이므로 제외 (identity_data에서 자동 추출됨)

-- 이메일 identity 삽입
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    'e6753bf3-f50a-42e4-b903-7b1e7164ebac',
    'b513ab6e-3f62-4edc-a17d-933f46294996',
    '{"sub":"b513ab6e-3f62-4edc-a17d-933f46294996","email":"injostar@naver.com","email_verified":false,"phone_verified":false}'::jsonb,
    'email',
    'b513ab6e-3f62-4edc-a17d-933f46294996',
    '2025-12-12 08:00:26.096165+00',
    '2025-12-12 08:00:26.096828+00',
    '2025-12-12 08:00:26.096828+00'
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 카카오 identity 삽입
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES (
    '20739697-b780-44a0-936b-066899812b54',
    'b513ab6e-3f62-4edc-a17d-933f46294996',
    '{"iss":"https://kapi.kakao.com","sub":"4642379870","name":"정인주","email":"injostar@naver.com","full_name":"정인주","user_name":"정인주","avatar_url":"http://k.kakaocdn.net/dn/YNG3p/dJMcaiIpnsE/jIr3iPFOQ5bOXuc2ggmT31/m1.jpg","provider_id":"4642379870","email_verified":true,"phone_verified":false,"preferred_username":"정인주"}'::jsonb,
    'kakao',
    '4642379870',
    '2025-12-15 06:22:57.851324+00',
    '2025-12-15 06:22:57.851382+00',
    '2025-12-15 07:18:23.490181+00'
)
ON CONFLICT (provider, provider_id) DO NOTHING;

-- 3. user_auth_links 데이터 삽입 (public 스키마)
-- auth.users와 public.users 연결

INSERT INTO public.user_auth_links (id, user_id, auth_user_id, provider, created_at)
VALUES (
    '2d42f06c-d6cf-4bf8-b04d-c0b5b2b9b880',
    'b513ab6e-3f62-4edc-a17d-933f46294996',
    'b513ab6e-3f62-4edc-a17d-933f46294996',
    'email',
    '2025-12-12 08:03:32.391128+00'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 마이그레이션 확인 쿼리
-- ============================================================
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'auth.identities', COUNT(*) FROM auth.identities;

-- ============================================================
-- 완료!
-- ============================================================

