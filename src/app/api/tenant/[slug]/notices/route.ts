export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, withNoStore, requireAuth, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const url = new URL(req.url);
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('page_size') ?? '10')));
    const categoryKey = (url.searchParams.get('category_key') ?? '').trim();
    const subcategoryId = (url.searchParams.get('subcategory_id') ?? '').trim();
    const popupOnly = String(url.searchParams.get('popup') ?? '').trim() === 'true';
    const searchTerm = (url.searchParams.get('search') ?? '').trim();

    if (!slug || !isValidSlug(slug)) return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    if (!Number.isFinite(page) || page < 1) return withSMaxAge(fail('BAD_REQUEST', 'invalid page', 400), 30);

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);

    let query = supabase
        .from('posts')
        .select('id, title, content, popup, created_at, category_id, subcategory_id', { count: 'exact' })
        .eq('union_id', unionId)
        .order('created_at', { ascending: false });

    // 서브카테고리 필터
    if (subcategoryId) {
        query = query.eq('subcategory_id', subcategoryId);
    }

    // 팝업 필터
    if (popupOnly) {
        query = query.eq('popup', true);
    }

    // 검색 기능 구현
    if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    // 카테고리 필터
    if (categoryKey) {
        const { data: cat, error: catErr } = await supabase
            .from('post_categories')
            .select('id')
            .eq('union_id', unionId)
            .eq('key', categoryKey)
            .maybeSingle();

        if (catErr) {
            return withSMaxAge(fail('DB_ERROR', `카테고리 조회 실패: ${catErr.message}`, 500), 30);
        }

        if (cat?.id) {
            query = query.eq('category_id', cat.id);
        } else {
            // 카테고리가 존재하지 않는 경우 명확한 메시지와 함께 빈 결과 반환
            return withSMaxAge(
                ok({
                    items: [],
                    page,
                    page_size: pageSize,
                    total: 0,
                    message: `'${categoryKey}' 카테고리를 찾을 수 없습니다.`,
                }),
                30
            );
        }
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
        return withSMaxAge(fail('DB_ERROR', `게시글 조회 실패: ${error.message}`, 500), 30);
    }

    return withSMaxAge(ok({ items: data ?? [], page, page_size: pageSize, total: count ?? 0 }), 30);
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    if (!slug || !isValidSlug(slug)) return withNoStore(fail('BAD_REQUEST', 'invalid slug', 400));

    // 임시 권한 체크: Authorization 헤더 필수
    const auth = requireAuth(req);
    if (!auth) return withNoStore(fail('UNAUTHORIZED', 'authorization required', 401));

    const body = await req.json().catch(() => null);
    if (!body) return withNoStore(fail('BAD_REQUEST', 'invalid body', 400));

    const {
        category_id: categoryId,
        subcategory_id: subcategoryId,
        title,
        content,
        popup,
        sendNotification,
    } = body as any;

    if (!title || !content) return withNoStore(fail('BAD_REQUEST', 'missing title or content', 400));

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);
    if (!unionId) return withNoStore(fail('NOT_FOUND', 'union not found', 404));

    // 공지사항 카테고리 ID 자동 설정 (category_id가 없는 경우)
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
        const { data: noticeCategory } = await supabase
            .from('post_categories')
            .select('id')
            .eq('key', 'notice')
            .eq('union_id', unionId)
            .maybeSingle();

        if (!noticeCategory) {
            const { data: globalNoticeCategory } = await supabase
                .from('post_categories')
                .select('id')
                .eq('key', 'notice')
                .is('union_id', null)
                .maybeSingle();
            finalCategoryId = globalNoticeCategory?.id ?? null;
        } else {
            finalCategoryId = noticeCategory.id;
        }
    }

    // popup 값을 직접 사용
    const finalPopup = Boolean(popup ?? false);

    const { data, error } = await supabase
        .from('posts')
        .insert({
            union_id: unionId,
            category_id: finalCategoryId,
            subcategory_id: subcategoryId ?? null,
            title,
            content,
            popup: finalPopup,
            created_by: auth.token, // 인증된 사용자 토큰을 텍스트로 저장
            created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

    if (error || !data) {
        return withNoStore(fail('DB_ERROR', `게시글 등록 실패: ${error?.message || '알 수 없는 오류'}`, 500));
    }

    // 알림톡 발송 요청이 있는 경우 처리
    let notificationSent = false;
    if (sendNotification && data.id) {
        try {
            // 알림톡 발송 로직 (실제 발송은 별도 서비스에서 처리)
            await supabase.from('alrimtalk').insert({
                union_id: unionId,
                title: `[공지] ${title}`,
                content: content.replace(/<[^>]*>/g, '').substring(0, 1000), // HTML 태그 제거 후 1000자 제한
                target_group: 'all',
                created_by: auth.token, // 인증된 사용자 토큰을 UUID로 저장 (alrimtalk은 UUID 타입)
            });
            notificationSent = true;
        } catch (alrimError) {
            // 알림톡 발송 실패는 로그만 남기고 전체 요청은 성공 처리
            console.error('알림톡 발송 실패:', alrimError);
            notificationSent = false;
        }
    }

    return withNoStore(
        ok({
            id: data.id,
            message: '게시글이 성공적으로 등록되었습니다.',
            notification_sent: notificationSent,
        })
    );
}
