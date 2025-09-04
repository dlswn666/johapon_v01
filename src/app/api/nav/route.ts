import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail } from '@/shared/lib/api';

const querySchema = z.object({
    unionId: z.string().uuid(),
    role: z.enum(['systemadmin', 'admin', 'officer', 'member']).optional().default('member'),
});

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const unionIdParam = searchParams.get('unionId');
    const roleParam = searchParams.get('role');

    console.log('Nav API called with:', { unionId: unionIdParam, role: roleParam });

    const parseResult = querySchema.safeParse({
        unionId: unionIdParam,
        role: roleParam,
    });

    if (!parseResult.success) {
        console.error('Nav API validation failed:', parseResult.error);
        return NextResponse.json(fail('BAD_REQUEST', `Invalid parameters: ${parseResult.error.message}`, 400));
    }

    const { unionId, role } = parseResult.data;
    const supabase = getSupabaseClient();

    try {
        // 1. MAIN_HEADER 메뉴 조회
        const { data: mainHeaderMenu, error: headerError } = await supabase
            .from('nav_menus')
            .select('id')
            .eq('key', 'MAIN_HEADER')
            .single();

        if (headerError || !mainHeaderMenu) {
            return NextResponse.json(fail('DB_ERROR', 'MAIN_HEADER menu not found', 500));
        }

        // 2. 전역 메뉴 카탈로그 조회
        const { data: menuItems, error: menuError } = await supabase
            .from('nav_menu_items')
            .select(
                `
                id,
                key,
                label_default,
                path,
                depth,
                display_order,
                is_admin_area,
                parent_id
            `
            )
            .eq('menu_id', mainHeaderMenu.id)
            .order('depth')
            .order('display_order');

        if (menuError) {
            return NextResponse.json(fail('DB_ERROR', menuError.message, 500));
        }

        // 3. 조합별 메뉴 설정 조회
        const { data: unionMenus, error: unionError } = await supabase
            .from('union_menus')
            .select('menu_item_id, enabled, custom_label, display_order')
            .eq('union_id', unionId);

        if (unionError) {
            return NextResponse.json(fail('DB_ERROR', unionError.message, 500));
        }

        // 4. 역할별 권한 조회 (systemadmin이 아닌 경우에만)
        let permissions: any[] = [];
        if (role !== 'systemadmin') {
            const { data: roleData, error: roleQueryError } = await supabase
                .from('roles')
                .select('id')
                .eq('key', role)
                .single();

            if (roleQueryError) {
                return NextResponse.json(fail('DB_ERROR', 'Role not found', 500));
            }

            const { data: permData, error: permError } = await supabase
                .from('menu_permissions')
                .select('menu_item_id, can_view')
                .eq('union_id', unionId)
                .eq('role_id', roleData.id);

            if (permError) {
                return NextResponse.json(fail('DB_ERROR', permError.message, 500));
            }
            permissions = permData || [];
        }

        // 5. 데이터 조합 및 트리 구성
        const unionMenuMap = new Map(unionMenus?.map((um) => [um.menu_item_id, um]) || []);
        const permissionMap = new Map(permissions.map((p) => [p.menu_item_id, p.can_view]));

        const filteredItems =
            menuItems?.filter((item) => {
                const unionMenu = unionMenuMap.get(item.id);
                const isEnabled = unionMenu?.enabled ?? true;

                if (!isEnabled) return false;

                // systemadmin은 모든 메뉴 접근
                if (role === 'systemadmin') return true;

                // 권한 확인
                const canView = permissionMap.get(item.id) ?? true;
                return canView;
            }) || [];

        // 6. 트리 구조 생성
        const buildMenuTree = (items: any[]) => {
            const itemMap = new Map();
            const rootItems: any[] = [];

            // 아이템 맵 생성
            items.forEach((item) => {
                const unionMenu = unionMenuMap.get(item.id);
                const processedItem = {
                    key: item.key,
                    label: unionMenu?.custom_label || item.label_default,
                    path: item.path,
                    children: [],
                };
                itemMap.set(item.id, processedItem);

                if (item.depth === 1) {
                    rootItems.push(processedItem);
                }
            });

            // 자식 아이템 연결
            items.forEach((item) => {
                if (item.depth === 2 && item.parent_id) {
                    const parent = itemMap.get(item.parent_id);
                    const child = itemMap.get(item.id);
                    if (parent && child) {
                        parent.children.push(child);
                    }
                }
            });

            // 정렬 적용
            const sortItems = (items: any[]) => {
                return items.sort((a, b) => {
                    const aItem = filteredItems.find((fi) => fi.key === a.key);
                    const bItem = filteredItems.find((fi) => fi.key === b.key);
                    const aUnion = unionMenuMap.get(aItem?.id);
                    const bUnion = unionMenuMap.get(bItem?.id);
                    const aOrder = aUnion?.display_order ?? aItem?.display_order ?? 0;
                    const bOrder = bUnion?.display_order ?? bItem?.display_order ?? 0;
                    return aOrder - bOrder;
                });
            };

            rootItems.forEach((item) => {
                item.children = sortItems(item.children);
            });

            return sortItems(rootItems);
        };

        const menuTree = buildMenuTree(filteredItems);

        const responseData = {
            items: menuTree,
            meta: {
                unionId,
                role,
                totalItems: menuTree.length,
            },
        };

        return ok(responseData);
    } catch (error) {
        console.error('Nav API error:', error);
        console.error('Nav API error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            unionId,
            role,
        });
        return fail('INTERNAL_ERROR', 'Internal server error', 500);
    }
}
