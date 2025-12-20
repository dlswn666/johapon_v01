import { type NextRequest } from 'next/server';
import { updateSession } from '@/app/_lib/shared/supabase/middleware';

/**
 * Next.js Middleware
 *
 * 이 middleware는 모든 요청에서 Supabase 세션을 갱신합니다.
 * PKCE OAuth 흐름에서 code_verifier 쿠키가 올바르게 처리되도록 보장합니다.
 *
 * 주요 기능:
 * 1. Auth 토큰 자동 갱신 (만료 전)
 * 2. 쿠키를 request/response 간 동기화
 * 3. OAuth 콜백 시 code_verifier 쿠키 전달 보장
 */
export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

/**
 * Matcher 설정
 *
 * 다음 경로에서는 middleware를 실행하지 않습니다:
 * - _next/static (정적 파일)
 * - _next/image (이미지 최적화 파일)
 * - favicon.ico (파비콘)
 * - 이미지 파일들 (svg, png, jpg, jpeg, gif, webp)
 *
 * 이렇게 하면 불필요한 Supabase 호출을 줄여 성능을 향상시킵니다.
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};





