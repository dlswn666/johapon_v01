import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail } from '@/shared/lib/api';

const bodySchema = z.object({
    unionId: z.string().uuid(),
    overrides: z
        .array(
            z.object({
                menuItemId: z.string().uuid(),
                enabled: z.boolean().optional(),
                customLabel: z.string().nullable().optional(),
                displayOrder: z.number().int().nullable().optional(),
            })
        )
        .min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parseResult = bodySchema.safeParse(body);

        if (!parseResult.success) {
            return NextResponse.json(fail('BAD_REQUEST', 'Invalid request body', 400));
        }

        const { unionId, overrides } = parseResult.data;
        const supabase = getSupabaseClient();

        // TODO: 인증 확인 - 사용자가 해당 조합의 관리자인지 확인
        // const session = await getServerSession();
        // if (!session || !hasUnionAdminPermission(session.user.id, unionId)) {
        //     return NextResponse.json(fail('FORBIDDEN', 'Insufficient permissions', 403));
        // }

        // 1. 조합 존재 여부 확인
        const { data: unionData, error: unionError } = await supabase
            .from('unions')
            .select('id')
            .eq('id', unionId)
            .single();

        if (unionError || !unionData) {
            return NextResponse.json(fail('NOT_FOUND', 'Union not found', 404));
        }

        // 2. 데이터 변환
        const rows = overrides.map((override) => ({
            union_id: unionId,
            menu_item_id: override.menuItemId,
            enabled: override.enabled ?? true,
            custom_label: override.customLabel ?? null,
            display_order: override.displayOrder ?? null,
        }));

        // 3. Upsert 실행
        const { error } = await supabase.from('union_menus').upsert(rows, {
            onConflict: 'union_id,menu_item_id',
            ignoreDuplicates: false,
        });

        if (error) {
            console.error('Union menu upsert error:', error);
            return NextResponse.json(fail('DB_ERROR', error.message, 500));
        }

        return NextResponse.json(
            ok({
                message: '메뉴 설정이 성공적으로 저장되었습니다.',
                updatedCount: rows.length,
            })
        );
    } catch (error) {
        console.error('Union menus API error:', error);
        return NextResponse.json(fail('INTERNAL_ERROR', 'Internal server error', 500));
    }
}

