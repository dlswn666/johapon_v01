import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 서버 컴포넌트 및 Route Handler용 Supabase 클라이언트
 *
 * Next.js의 cookies()를 사용하여 쿠키 기반 인증을 지원합니다.
 * PKCE 흐름에서 code_verifier 등의 쿠키를 올바르게 처리합니다.
 *
 * @example
 * ```typescript
 * import { createClient } from '@/app/_lib/shared/supabase/server';
 *
 * export async function GET(request: Request) {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('users').select('*');
 * }
 * ```
 */
export const createClient = async () => {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch (error) {
                        // setAll이 Server Component에서 호출될 경우 무시
                        // 이 경우는 middleware에서 세션 갱신이 처리됨
                        console.warn('Failed to set cookies in server component:', error);
                    }
                },
            },
        }
    );
};
