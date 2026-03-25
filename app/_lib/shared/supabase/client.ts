import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 브라우저 클라이언트 인스턴스
 * - 프로덕션: createBrowserClient + anon key (RLS 적용, JWT 인증 필요)
 * - localhost 개발: createClient + DEV_SUPABASE_KEY (RLS 우회, 인증 없이 데이터 접근)
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseDevKey = process.env.NEXT_PUBLIC_DEV_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SUPABASE] 필수 환경 변수가 누락되었습니다!');
}

// localhost에서 DEV_SUPABASE_KEY가 있으면 RLS 우회 (dev mock 인증과 함께 사용)
const isDevMode = typeof window !== 'undefined'
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    && supabaseDevKey;

let supabase;

if (isDevMode) {
    // DEV: createClient (일반) — service_role key를 Authorization 헤더로 직접 전송하여 RLS 우회
    console.log('[SUPABASE] DEV 모드: RLS 우회 키 사용 중 (createClient)');
    supabase = createSupabaseClient(supabaseUrl || '', supabaseDevKey || '', {
        auth: { autoRefreshToken: false, persistSession: false },
    });
} else {
    // PROD: createBrowserClient (SSR) — 쿠키 기반 세션 + anon key + RLS 적용
    supabase = createBrowserClient(supabaseUrl || '', supabaseAnonKey || '');
}

// supabase 클라이언트를 SupabaseClient 타입으로 export (조건부 초기화에 의한 implicit any 방지)
const typedSupabase = supabase!;

export { typedSupabase as supabase };
export default typedSupabase;
