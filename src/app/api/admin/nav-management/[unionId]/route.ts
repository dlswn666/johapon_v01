import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';

// GET: 특정 조합의 nav 상세 정보 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ unionId: string }> }) {
    try {
        const { unionId } = await params;

        if (!unionId) {
            return NextResponse.json(
                {
                    success: false,
                    message: '조합 ID가 필요합니다.',
                },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();

        // 1. 조합 정보 조회
        const { data: union, error: unionError } = await supabase
            .from('unions')
            .select('id, name, homepage, address, phone, email, union_chairman, area, union_members')
            .eq('id', unionId)
            .single();

        if (unionError || !union) {
            console.error('Union query error:', unionError);
            return NextResponse.json(
                {
                    success: false,
                    message: '조합을 찾을 수 없습니다.',
                },
                { status: 404 }
            );
        }

        // 2. MAIN_HEADER 메뉴만 조회 (MAIN_HEADER 메뉴 그룹)
        const { data: headerMenuData, error: headerMenuError } = await supabase
            .from('nav_menus')
            .select('id')
            .eq('key', 'MAIN_HEADER')
            .single();

        if (headerMenuError) {
            console.error('Main header menu query error:', headerMenuError);
            return NextResponse.json(
                {
                    success: false,
                    message: 'MAIN_HEADER 메뉴 정보를 찾을 수 없습니다.',
                },
                { status: 500 }
            );
        }

        // 3. 모든 MAIN_HEADER 메뉴 항목 조회 (depth와 parent_id 포함)
        const { data: allMenuItems, error: allMenuError } = await supabase
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
            .eq('menu_id', headerMenuData.id)
            .order('depth, display_order');

        if (allMenuError) {
            console.error('All menu items query error:', allMenuError);
            return NextResponse.json(
                {
                    success: false,
                    message: '메뉴 항목 조회에 실패했습니다.',
                },
                { status: 500 }
            );
        }

        // 4. 조합의 메뉴 설정 조회
        const { data: unionMenus, error: unionMenuError } = await supabase
            .from('union_menus')
            .select(
                `
                menu_item_id,
                enabled,
                custom_label,
                display_order
            `
            )
            .eq('union_id', unionId);

        if (unionMenuError) {
            console.error('Union menus query error:', unionMenuError);
        }

        // 5. 조합의 메뉴 권한 조회
        const { data: permissions, error: permissionError } = await supabase
            .from('menu_permissions')
            .select(
                `
                menu_item_id,
                role_id,
                can_view,
                roles (
                    id,
                    key,
                    name
                )
            `
            )
            .eq('union_id', unionId);

        if (permissionError) {
            console.error('Permission query error:', permissionError);
        }

        // 6. 데이터 조합
        const menuDetails =
            allMenuItems?.map((menuItem) => {
                const unionMenu = unionMenus?.find((um) => um.menu_item_id === menuItem.id);
                const menuPermissions = permissions?.filter((p) => p.menu_item_id === menuItem.id) || [];

                return {
                    id: menuItem.id,
                    key: menuItem.key,
                    labelDefault: menuItem.label_default,
                    customLabel: unionMenu?.custom_label || null,
                    path: menuItem.path,
                    depth: menuItem.depth,
                    parentId: menuItem.parent_id,
                    isAdminArea: menuItem.is_admin_area,
                    enabled: unionMenu?.enabled ?? true, // 기본값: true
                    displayOrder: unionMenu?.display_order ?? menuItem.display_order,
                    permissions: menuPermissions.map((p: any) => ({
                        roleId: p.role_id,
                        roleName: p.roles?.name || '',
                        canView: p.can_view,
                    })),
                };
            }) || [];

        // 7. 통계 계산
        const stats = {
            totalMenus: menuDetails.length,
            enabledMenus: menuDetails.filter((menu) => menu.enabled).length,
            customLabels: menuDetails.filter((menu) => menu.customLabel).length,
            lastUpdated: new Date().toISOString().split('T')[0], // 오늘 날짜
        };

        const responseData = {
            union: {
                id: union.id,
                name: union.name,
                homepage: union.homepage,
                address: union.address,
                phone: union.phone,
                email: union.email,
                chairman: union.union_chairman,
                area: union.area,
                members: union.union_members,
            },
            menus: menuDetails,
            stats,
        };

        return NextResponse.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        console.error('Nav 상세 데이터 조회 오류:', error);
        return NextResponse.json(
            {
                success: false,
                message: '상세 데이터 조회 중 오류가 발생했습니다.',
            },
            { status: 500 }
        );
    }
}
