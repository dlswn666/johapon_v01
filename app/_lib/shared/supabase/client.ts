import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 인스턴스
 *
 * 환경 변수를 통해 Supabase URL과 Anon Key를 설정합니다.
 * 싱글톤 패턴으로 전역에서 하나의 인스턴스만 생성됩니다.
 */

// 환경 변수 검증
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
/**
 * Supabase 클라이언트 인스턴스
 *
 * @example
 * ```typescript
 * import { supabase } from '@/app/_lib/shared/supabase/client';
 *
 * // 데이터 조회
 * const { data, error } = await supabase
 *   .from('users')
 *   .select('*');
 *
 * // 데이터 추가
 * const { data, error } = await supabase
 *   .from('users')
 *   .insert({ name: 'John' });
 * ```
 */
export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
        /**
         * persistSession: 세션을 브라우저 로컬 스토리지에 저장하여 페이지 새로고침 시에도 로그인 상태 유지
         */
        persistSession: true,

        /**
         * autoRefreshToken: 토큰 만료 전 자동으로 갱신하여 사용자가 로그아웃되지 않도록 함
         */
        autoRefreshToken: true,

        /**
         * detectSessionInUrl: URL의 해시 프래그먼트에서 세션 정보를 감지 (OAuth 콜백 처리용)
         */
        detectSessionInUrl: true,
    },
});

export default supabase;
