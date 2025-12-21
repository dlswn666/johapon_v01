import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase 브라우저 클라이언트 인스턴스
 *
 * @supabase/ssr의 createBrowserClient를 사용하여 쿠키 기반 세션 관리를 지원합니다.
 * PKCE 흐름에서 code_verifier가 쿠키에 올바르게 저장되도록 합니다.
 * 싱글톤 패턴으로 전역에서 하나의 인스턴스만 생성됩니다.
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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('[SUPABASE_DEBUG] Client Initialization:', {
    hasUrl: !!supabaseUrl,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'none',
    hasKey: !!supabaseAnonKey,
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE_DEBUG] ❌ Missing Supabase environment variables!');
}

export const supabase = createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!
);

export default supabase;
