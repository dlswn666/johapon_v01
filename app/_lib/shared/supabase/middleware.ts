import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js Middleware용 세션 업데이트 함수
 *
 * 이 함수는 다음 기능을 수행합니다:
 * 1. Supabase Auth 토큰을 자동으로 갱신 (만료 전)
 * 2. 쿠키를 request와 response 간에 동기화
 * 3. PKCE 흐름에서 code_verifier 쿠키가 올바르게 전달되도록 보장
 *
 * @param request - Next.js request 객체
 * @returns NextResponse 객체
 */
export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // 먼저 request에 쿠키 설정 (Server Component에서 읽을 수 있도록)
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

                    // 새로운 response 생성
                    supabaseResponse = NextResponse.next({
                        request,
                    });

                    // response에 쿠키 설정 (브라우저로 전송되도록)
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // 중요: createServerClient와 supabase.auth.getUser() 사이에 다른 코드를 넣지 마세요.
    // 간단한 실수가 사용자가 무작위로 로그아웃되는 문제를 디버깅하기 어렵게 만들 수 있습니다.

    // Auth 토큰을 갱신하고 세션을 유효성 검사
    // getUser()는 매번 Supabase Auth 서버에 요청을 보내 토큰을 재검증합니다.
    await supabase.auth.getUser();

    // 중요: supabaseResponse 객체를 그대로 반환해야 합니다.
    // NextResponse.next()로 새 response를 생성하는 경우:
    // 1. request를 전달해야 합니다: const myNewResponse = NextResponse.next({ request })
    // 2. 쿠키를 복사해야 합니다: myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. 쿠키를 변경하지 않고 myNewResponse 객체를 수정할 수 있습니다
    // 4. 최종적으로 myNewResponse를 반환합니다
    // 이렇게 하지 않으면 브라우저와 서버가 동기화되지 않아 사용자 세션이 조기에 종료될 수 있습니다!

    return supabaseResponse;
}
