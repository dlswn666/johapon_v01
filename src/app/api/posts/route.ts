export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

function isValidSlug(slug: string): boolean {
    return /^[a-z0-9-_.]+$/i.test(slug);
}

async function resolveUnionIdBySlug(supabase: ReturnType<typeof getSupabaseClient>, slug: string) {
    const { data, error } = await supabase.from('unions').select('id').eq('homepage', slug).maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const slug = (url.searchParams.get('slug') ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '10')));
    const categoryKey = (url.searchParams.get('category_key') ?? '').trim();
    const subcategoryId = (url.searchParams.get('subcategory_id') ?? '').trim();

    if (!slug || !isValidSlug(slug)) return badRequest('invalid_slug');
    if (!Number.isFinite(page) || page < 1) return badRequest('invalid_page');

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return NextResponse.json({ error: 'union_not_found' }, { status: 404 });

    let query = supabase
        .from('posts')
        .select('id, title, content, popup, created_at, category_id, subcategory_id', { count: 'exact' })
        .eq('union_id', unionId)
        .order('created_at', { ascending: false });

    if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
    }
    if (categoryKey) {
        // 카테고리 키를 조인 없이 필터하기 위해 서브쿼리로 ID를 가져와 적용
        const { data: cat, error: catErr } = await supabase
            .from('post_categories')
            .select('id')
            .eq('union_id', unionId)
            .eq('key', categoryKey)
            .maybeSingle();
        if (catErr) return NextResponse.json({ error: 'category_lookup_failed' }, { status: 500 });
        if (cat?.id) {
            query = query.eq('category_id', cat.id);
        } else {
            return NextResponse.json({ items: [], page, page_size: pageSize, total: 0 }, { status: 200 });
        }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);
    if (error) return NextResponse.json({ error: 'query_failed' }, { status: 500 });

    return NextResponse.json({ items: data ?? [], page, page_size: pageSize, total: count ?? 0 }, { status: 200 });
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    if (!body) return badRequest('invalid_body');
    const { slug, category_id: categoryId, subcategory_id: subcategoryId, title, content, popup } = body;

    if (!slug || !isValidSlug(slug)) return badRequest('invalid_slug');
    if (!title || !content) return badRequest('missing_title_or_content');

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return NextResponse.json({ error: 'union_not_found' }, { status: 404 });

    const { data, error } = await supabase
        .from('posts')
        .insert({
            union_id: unionId,
            category_id: categoryId ?? null,
            subcategory_id: subcategoryId ?? null,
            title,
            content,
            popup: Boolean(popup ?? false),
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (error || !data) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
    return NextResponse.json({ id: data.id }, { status: 201 });
}
