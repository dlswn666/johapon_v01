import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase 브라우저 클라이언트 인스턴스
 * - 항상 anon key 사용 (RLS 적용, JWT 인증 필요)
 * - service_role key는 server.ts에서만 사용
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE] 필수 환경 변수가 누락되었습니다!');
}

export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);

export default supabase;
