import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/shared/lib/supabase';

// 요청 스키마 정의
const UpdateMenuItemSchema = z.object({
    key: z
        .string()
        .min(1, '메뉴 키는 필수입니다')
        .regex(/^[A-Z_]+$/, '메뉴 키는 영문 대문자와 언더스코어만 사용 가능합니다'),
    label_default: z.string().min(1, '메뉴명은 필수입니다'),
    path: z.string().optional(),
    depth: z.number().int().min(1).max(2),
    parent_id: z.string().uuid().nullable(),
    display_order: z.number().int().min(1),
    is_admin_area: z.boolean(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = getSupabaseClient();

        // 특정 메뉴 아이템 조회
        const { data: menuItem, error } = await supabase
            .from('nav_menu_items')
            .select(
                `
                id,
                key,
                label_default,
                path,
                depth,
                parent_id,
                display_order,
                is_admin_area,
                nav_menus!inner(key)
            `
            )
            .eq('id', id)
            .eq('nav_menus.key', 'MAIN_HEADER')
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ message: '메뉴 아이템을 찾을 수 없습니다' }, { status: 404 });
            }
            console.error('메뉴 아이템 조회 오류:', error);
            return NextResponse.json({ message: '메뉴 아이템 조회 중 오류가 발생했습니다' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: menuItem,
        });
    } catch (error) {
        console.error('메뉴 아이템 조회 오류:', error);
        return NextResponse.json({ message: '서버 오류가 발생했습니다' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validatedData = UpdateMenuItemSchema.parse(body);

        const supabase = getSupabaseClient();

        // 기존 메뉴 아이템 확인
        const { data: existingItem, error: existingError } = await supabase
            .from('nav_menu_items')
            .select(
                `
                id,
                menu_id,
                key,
                depth,
                parent_id,
                nav_menus!inner(key)
            `
            )
            .eq('id', id)
            .eq('nav_menus.key', 'MAIN_HEADER')
            .single();

        if (existingError) {
            if (existingError.code === 'PGRST116') {
                return NextResponse.json({ message: '메뉴 아이템을 찾을 수 없습니다' }, { status: 404 });
            }
            console.error('기존 메뉴 아이템 조회 오류:', existingError);
            return NextResponse.json({ message: '메뉴 아이템 조회 중 오류가 발생했습니다' }, { status: 500 });
        }

        // 중복 키 체크 (자신 제외)
        const { data: existingKey, error: keyError } = await supabase
            .from('nav_menu_items')
            .select('id')
            .eq('menu_id', existingItem.menu_id)
            .eq('key', validatedData.key)
            .neq('id', id)
            .single();

        if (keyError && keyError.code !== 'PGRST116') {
            console.error('키 중복 체크 오류:', keyError);
            return NextResponse.json({ message: '키 중복 체크 중 오류가 발생했습니다' }, { status: 500 });
        }

        if (existingKey) {
            return NextResponse.json({ message: '이미 존재하는 메뉴 키입니다' }, { status: 400 });
        }

        // 순서 중복 체크 (자신 제외)
        let orderQuery = supabase
            .from('nav_menu_items')
            .select('id')
            .eq('menu_id', existingItem.menu_id)
            .eq('depth', validatedData.depth)
            .eq('display_order', validatedData.display_order)
            .neq('id', id);

        if (validatedData.depth === 2 && validatedData.parent_id) {
            orderQuery = orderQuery.eq('parent_id', validatedData.parent_id);
        } else if (validatedData.depth === 1) {
            orderQuery = orderQuery.is('parent_id', null);
        }

        const { data: existingOrder, error: orderError } = await orderQuery.single();

        if (orderError && orderError.code !== 'PGRST116') {
            console.error('순서 중복 체크 오류:', orderError);
            return NextResponse.json({ message: '순서 중복 체크 중 오류가 발생했습니다' }, { status: 500 });
        }

        if (existingOrder) {
            const levelText = validatedData.depth === 1 ? '1차' : '2차';
            return NextResponse.json({ message: `동일한 순서의 ${levelText} 메뉴가 이미 존재합니다` }, { status: 400 });
        }

        // 2차 메뉴인 경우 상위 메뉴 존재 여부 확인
        if (validatedData.depth === 2 && validatedData.parent_id) {
            const { data: parentMenu, error: parentError } = await supabase
                .from('nav_menu_items')
                .select('id')
                .eq('id', validatedData.parent_id)
                .eq('depth', 1)
                .single();

            if (parentError || !parentMenu) {
                return NextResponse.json({ message: '유효하지 않은 상위 메뉴입니다' }, { status: 400 });
            }
        }

        // 1차 메뉴인 경우 parent_id는 null이어야 함
        if (validatedData.depth === 1 && validatedData.parent_id) {
            return NextResponse.json({ message: '1차 메뉴는 상위 메뉴를 가질 수 없습니다' }, { status: 400 });
        }

        // depth가 변경되는 경우, 하위 메뉴가 있으면 1차로 변경 불가
        if (existingItem.depth === 1 && validatedData.depth === 2) {
            const { data: childMenus, error: childError } = await supabase
                .from('nav_menu_items')
                .select('id')
                .eq('parent_id', id)
                .limit(1);

            if (childError) {
                console.error('하위 메뉴 확인 오류:', childError);
                return NextResponse.json({ message: '하위 메뉴 확인 중 오류가 발생했습니다' }, { status: 500 });
            }

            if (childMenus && childMenus.length > 0) {
                return NextResponse.json(
                    { message: '하위 메뉴가 있는 메뉴는 2차 메뉴로 변경할 수 없습니다' },
                    { status: 400 }
                );
            }
        }

        // 메뉴 아이템 업데이트
        const updateData = {
            key: validatedData.key,
            label_default: validatedData.label_default,
            path: validatedData.path || null,
            depth: validatedData.depth,
            parent_id: validatedData.parent_id,
            display_order: validatedData.display_order,
            is_admin_area: validatedData.is_admin_area,
        };

        const { data: updatedMenuItem, error: updateError } = await supabase
            .from('nav_menu_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('메뉴 아이템 업데이트 오류:', updateError);
            return NextResponse.json(
                { message: '메뉴 아이템 업데이트 중 오류가 발생했습니다', error: updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updatedMenuItem,
            message: '메뉴 아이템이 성공적으로 업데이트되었습니다',
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: '입력 데이터가 올바르지 않습니다', errors: error.issues },
                { status: 400 }
            );
        }

        console.error('메뉴 아이템 업데이트 오류:', error);
        return NextResponse.json({ message: '서버 오류가 발생했습니다' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = getSupabaseClient();

        // 기존 메뉴 아이템 확인
        const { data: existingItem, error: existingError } = await supabase
            .from('nav_menu_items')
            .select(
                `
                id,
                key,
                label_default,
                depth,
                nav_menus!inner(key)
            `
            )
            .eq('id', id)
            .eq('nav_menus.key', 'MAIN_HEADER')
            .single();

        if (existingError) {
            if (existingError.code === 'PGRST116') {
                return NextResponse.json({ message: '메뉴 아이템을 찾을 수 없습니다' }, { status: 404 });
            }
            console.error('기존 메뉴 아이템 조회 오류:', existingError);
            return NextResponse.json({ message: '메뉴 아이템 조회 중 오류가 발생했습니다' }, { status: 500 });
        }

        // 하위 메뉴가 있는지 확인
        const { data: childMenus, error: childError } = await supabase
            .from('nav_menu_items')
            .select('id, label_default')
            .eq('parent_id', id);

        if (childError) {
            console.error('하위 메뉴 확인 오류:', childError);
            return NextResponse.json({ message: '하위 메뉴 확인 중 오류가 발생했습니다' }, { status: 500 });
        }

        // 하위 메뉴들도 함께 삭제 (CASCADE)
        if (childMenus && childMenus.length > 0) {
            // 하위 메뉴의 union_menus, menu_permissions 삭제
            for (const childMenu of childMenus) {
                await supabase.from('union_menus').delete().eq('menu_item_id', childMenu.id);
                await supabase.from('menu_permissions').delete().eq('menu_item_id', childMenu.id);
            }

            // 하위 메뉴들 삭제
            const { error: childDeleteError } = await supabase.from('nav_menu_items').delete().eq('parent_id', id);

            if (childDeleteError) {
                console.error('하위 메뉴 삭제 오류:', childDeleteError);
                return NextResponse.json({ message: '하위 메뉴 삭제 중 오류가 발생했습니다' }, { status: 500 });
            }
        }

        // 관련된 union_menus, menu_permissions 삭제
        await supabase.from('union_menus').delete().eq('menu_item_id', id);
        await supabase.from('menu_permissions').delete().eq('menu_item_id', id);

        // 메뉴 아이템 삭제
        const { error: deleteError } = await supabase.from('nav_menu_items').delete().eq('id', id);

        if (deleteError) {
            console.error('메뉴 아이템 삭제 오류:', deleteError);
            return NextResponse.json(
                { message: '메뉴 아이템 삭제 중 오류가 발생했습니다', error: deleteError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `메뉴 아이템 '${existingItem.label_default}'이 성공적으로 삭제되었습니다${
                childMenus && childMenus.length > 0 ? ` (하위 메뉴 ${childMenus.length}개 포함)` : ''
            }`,
        });
    } catch (error) {
        console.error('메뉴 아이템 삭제 오류:', error);
        return NextResponse.json({ message: '서버 오류가 발생했습니다' }, { status: 500 });
    }
}
