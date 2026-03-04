import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase 브라우저 클라이언트 인스턴스
 *
 * - Production: anon key 사용 (RLS 적용, JWT 인증 필요)
 * - Dev (localhost): service_role key 사용 (RLS 우회, 로그인 없이 작업 가능)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 개발 모드에서만 service_role key 사용 (RLS 우회)
const isDev = process.env.NODE_ENV !== 'production';
const devServiceRoleKey = process.env.NEXT_PUBLIC_DEV_SUPABASE_KEY;
const supabaseKey = isDev && devServiceRoleKey ? devServiceRoleKey : supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
    console.error('[SUPABASE] 필수 환경 변수가 누락되었습니다!');
}



export const supabase = createBrowserClient(
    supabaseUrl || '',
    supabaseKey || ''
);

export default supabase;
