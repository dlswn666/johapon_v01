export const runtime = 'nodejs';

import { ok, fail, withSMaxAge, isValidSlug } from '@/shared/lib/api';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
    const params = await context.params;
    const slug = String(params?.slug ?? '').trim();
    const url = new URL(req.url);
    const userRole = (url.searchParams.get('role') ?? 'member').trim(); // member, admin, systemadmin

    if (!slug || !isValidSlug(slug)) {
        return withSMaxAge(fail('BAD_REQUEST', 'invalid slug', 400), 30);
    }

    const supabase = getSupabaseClient();
    const unionId = await getTenantIdBySlug(slug);

    if (!unionId) {
        console.error('Union ID not found for slug:', slug);
        return withSMaxAge(fail('NOT_FOUND', 'union not found', 404), 30);
    }

    try {
        // URL 구성을 더 안전하게 처리
        const baseUrl = new URL(req.url).origin;
        const navApiUrl = `${baseUrl}/api/nav?unionId=${unionId}&role=${userRole}`;

        // 새로운 표준화된 API 사용
        const navResponse = await fetch(navApiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!navResponse.ok) {
            const errorText = await navResponse.text();
            return withSMaxAge(fail('DB_ERROR', `메뉴 데이터 조회 실패: ${navResponse.status}`, 500), 30);
        }

        const navData = await navResponse.json();

        if (!navData.success) {
            return withSMaxAge(fail('DB_ERROR', navData.message || '메뉴 데이터 조회 실패', 500), 30);
        }

        // 응답 형식을 기존 API와 호환되도록 변환
        const convertToLegacyFormat = (items: any[]) => {
            if (!Array.isArray(items)) {
                console.error('Invalid items array for legacy format conversion:', items);
                return [];
            }

            return items.map((item) => ({
                id: item.key, // key를 id로 사용
                key: item.key,
                label: item.label,
                subItems: Array.isArray(item.children)
                    ? item.children.map((child: any) => ({
                          id: child.key,
                          key: child.key,
                          label: child.label,
                          href: child.path,
                      }))
                    : [],
            }));
        };

        if (!navData.data || !navData.data.items) {
            return withSMaxAge(fail('DB_ERROR', '메뉴 데이터 구조가 올바르지 않습니다.', 500), 30);
        }

        const legacyMenus = convertToLegacyFormat(navData.data.items);

        return withSMaxAge(
            ok({
                menus: legacyMenus,
                role: userRole,
                unionId: unionId,
            }),
            300
        ); // 5분 캐시
    } catch (error) {
        return withSMaxAge(fail('INTERNAL_ERROR', '메뉴 데이터 조회 중 오류가 발생했습니다.', 500), 30);
    }
}
