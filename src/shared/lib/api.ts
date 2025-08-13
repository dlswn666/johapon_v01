import { NextResponse } from 'next/server';

export type ApiSuccess<T> = {
    success: true;
    data: T;
};

export type ApiError = {
    success: false;
    error: { code: string; message: string };
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
    return NextResponse.json({ success: true, data }, init);
}

export function fail(code: string, message: string, status: number = 400, init?: ResponseInit): NextResponse<ApiError> {
    return NextResponse.json({ success: false, error: { code, message } }, { status, ...(init ?? {}) });
}

export function withNoStore<T extends Response>(resp: T): T {
    resp.headers.set('Cache-Control', 'no-store');
    return resp;
}

export function withSMaxAge<T extends Response>(resp: T, seconds: number): T {
    const value = `s-maxage=${seconds}, stale-while-revalidate=${seconds}`;
    resp.headers.set('Cache-Control', value);
    return resp;
}

export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9-_.]+$/i.test(slug);
}

export function requireAuth(req: Request): { token: string } | null {
    const auth = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!auth) return null;
    const parts = auth.trim().split(/\s+/);
    if (parts.length === 2 && /^bearer$/i.test(parts[0]) && parts[1]) {
        return { token: parts[1] };
    }
    // 임시로 토큰 문자열 전체를 허용
    return { token: auth };
}
