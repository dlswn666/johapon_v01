import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseClient } from '@/shared/lib/supabase';

// 요청 스키마 정의
const CreateMenuItemSchema = z.object({
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

const UpdateMenuItemSchema = CreateMenuItemSchema;

export async function GET() {
    try {
        const supabase = getSupabaseClient();

        // 전체 메뉴 아이템 조회 (MAIN_HEADER 메뉴만)
        const { data: menuItems, error } = await supabase
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
            .eq('nav_menus.key', 'MAIN_HEADER')
            .order('depth')
            .order('display_order');

        if (error) {
            console.error('메뉴 아이템 조회 오류:', error);
            return NextResponse.json(
                { message: '메뉴 아이템 조회 중 오류가 발생했습니다', error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: menuItems || [],
        });
    } catch (error) {
        console.error('메뉴 아이템 조회 오류:', error);
        return NextResponse.json({ message: '서버 오류가 발생했습니다' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = CreateMenuItemSchema.parse(body);

        const supabase = getSupabaseClient();

        // MAIN_HEADER 메뉴 ID 조회
        const { data: mainMenu, error: menuError } = await supabase
            .from('nav_menus')
            .select('id')
            .eq('key', 'MAIN_HEADER')
            .single();

        if (menuError || !mainMenu) {
            return NextResponse.json({ message: 'MAIN_HEADER 메뉴를 찾을 수 없습니다' }, { status: 404 });
        }

        // 중복 키 체크
        const { data: existingKey, error: keyError } = await supabase
            .from('nav_menu_items')
            .select('id')
            .eq('menu_id', mainMenu.id)
            .eq('key', validatedData.key)
            .single();

        if (keyError && keyError.code !== 'PGRST116') {
            console.error('키 중복 체크 오류:', keyError);
            return NextResponse.json({ message: '키 중복 체크 중 오류가 발생했습니다' }, { status: 500 });
        }

        if (existingKey) {
            return NextResponse.json({ message: '이미 존재하는 메뉴 키입니다' }, { status: 400 });
        }

        // 순서 중복 체크
        let orderQuery = supabase
            .from('nav_menu_items')
            .select('id')
            .eq('menu_id', mainMenu.id)
            .eq('depth', validatedData.depth)
            .eq('display_order', validatedData.display_order);

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

        // 메뉴 아이템 생성
        const insertData = {
            menu_id: mainMenu.id,
            key: validatedData.key,
            label_default: validatedData.label_default,
            path: validatedData.path || null,
            depth: validatedData.depth,
            parent_id: validatedData.parent_id,
            display_order: validatedData.display_order,
            is_admin_area: validatedData.is_admin_area,
        };

        const { data: newMenuItem, error: insertError } = await supabase
            .from('nav_menu_items')
            .insert(insertData)
            .select()
            .single();

        if (insertError) {
            console.error('메뉴 아이템 생성 오류:', insertError);
            return NextResponse.json(
                { message: '메뉴 아이템 생성 중 오류가 발생했습니다', error: insertError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: newMenuItem,
            message: '메뉴 아이템이 성공적으로 생성되었습니다',
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: '입력 데이터가 올바르지 않습니다', errors: error.issues },
                { status: 400 }
            );
        }

        console.error('메뉴 아이템 생성 오류:', error);
        return NextResponse.json({ message: '서버 오류가 발생했습니다' }, { status: 500 });
    }
}
