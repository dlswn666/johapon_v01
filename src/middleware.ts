import { NextResponse, type NextRequest } from 'next/server';
import { tenantStore } from '@/shared/store/tenantStore';

/**
 * 멀티테넌트 미들웨어 - 테넌트 슬러그 기반 라우팅
 */

const SYSTEM_PATHS = new Set([
    '_next',
    'api',
    'static',
    'favicon.ico',
    'robots.txt',
    'sitemap.xml',
    'homepage-management',
    'nav-management',
    'base-menu-management',
    'ads-management',
    'health',
]);

function isValidSlug(slug: string): boolean {
    return /^[a-z0-9_-]+$/i.test(slug) && slug.length >= 2 && slug.length <= 50;
}

function isStaticFile(pathname: string): boolean {
    return /\.[a-zA-Z0-9]+$/.test(pathname);
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // 정적 파일, 루트 경로, 시스템 경로는 바로 통과
    if (isStaticFile(pathname) || pathname === '/') {
        return NextResponse.next();
    }

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return NextResponse.next();

    const slug = segments[0];

    // 시스템 경로 확인
    if (SYSTEM_PATHS.has(slug)) {
        return NextResponse.next();
    }

    // 테넌트 슬러그 유효성 검사
    if (!isValidSlug(slug)) {
        return NextResponse.rewrite(new URL('/not-found', request.url));
    }

    // 테넌트 존재 여부 확인 (tenantStore 사용)
    try {
        const tenantInfo = await tenantStore.getOrFetchBySlug(slug);

        if (!tenantInfo) {
            return NextResponse.rewrite(new URL('/not-found', request.url));
        }

        // 테넌트 그룹 라우트로 내부 리다이렉트
        const rewriteResponse = NextResponse.rewrite(new URL(`${pathname}`, request.url));

        // 테넌트 정보를 헤더에 추가
        rewriteResponse.headers.set('x-tenant-slug', slug);
        rewriteResponse.headers.set('x-tenant-id', tenantInfo.id);
        rewriteResponse.headers.set('x-tenant-name', tenantInfo.homepage);

        return rewriteResponse;
    } catch (error) {
        console.error('[MIDDLEWARE] Tenant resolution error:', error);
        return NextResponse.rewrite(new URL('/not-found', request.url));
    }
}

export const config = {
    matcher: [
        // API, Next.js 내부 파일, 정적 파일 제외하고 모든 경로에서 실행
        '/((?!api|_next|static|.*\\.).+)',
    ],
};
