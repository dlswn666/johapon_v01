export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { tenantStore } from '@/shared/store/tenantStore';

function isValidSlug(slug: string): boolean {
    return /^[a-z0-9-_.]+$/i.test(slug);
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const slug = (url.searchParams.get('slug') ?? '').trim();

    console.log('[TENANT_RESOLVE] Request received for slug:', slug);

    if (!slug || !isValidSlug(slug)) {
        console.log('[TENANT_RESOLVE] Invalid slug:', slug);
        return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
    }

    try {
        // tenantStore의 getOrFetchBySlug 메서드를 사용하여 캐시와 DB 조회를 한번에 처리
        console.log('[TENANT_RESOLVE] Fetching tenant info for slug:', slug);
        const tenantInfo = await tenantStore.getOrFetchBySlug(slug);

        if (!tenantInfo) {
            console.log('[TENANT_RESOLVE] Tenant not found for slug:', slug);
            return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }

        console.log('[TENANT_RESOLVE] Tenant found:', tenantInfo);
        return NextResponse.json(tenantInfo, {
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        console.error('[TENANT_RESOLVE] Failed to resolve tenant:', error);
        return NextResponse.json({ error: 'query_failed' }, { status: 500 });
    }
}
