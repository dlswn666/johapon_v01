import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail } from '@/shared/lib/api';

const bodySchema = z.object({
    unionId: z.string().uuid(),
    rules: z
        .array(
            z.object({
                menuItemId: z.string().uuid(),
                roleKey: z.string(),
                canView: z.boolean(),
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

        const { unionId, rules } = parseResult.data;
        const supabase = getSupabaseClient();

        // TODO: 인증 확인 - 사용자가 해당 조합의 관리자 또는 시스템 관리자인지 확인

        // 1. 조합 존재 여부 확인
        const { data: unionData, error: unionError } = await supabase
            .from('unions')
            .select('id')
            .eq('id', unionId)
            .single();

        if (unionError || !unionData) {
            return NextResponse.json(fail('NOT_FOUND', 'Union not found', 404));
        }

        // 2. 역할 ID 조회
        const roleKeys = [...new Set(rules.map((r) => r.roleKey))];
        const { data: roleRows, error: roleError } = await supabase.from('roles').select('id, key').in('key', roleKeys);

        if (roleError) {
            return NextResponse.json(fail('DB_ERROR', roleError.message, 500));
        }

        const roleMap = new Map(roleRows?.map((r) => [r.key, r.id]) || []);

        // 3. 데이터 변환 및 검증
        const rows = rules.map((rule) => {
            const roleId = roleMap.get(rule.roleKey);
            if (!roleId) {
                throw new Error(`Unknown role: ${rule.roleKey}`);
            }
            return {
                union_id: unionId,
                menu_item_id: rule.menuItemId,
                role_id: roleId,
                can_view: rule.canView,
            };
        });

        // 4. Upsert 실행
        const { error } = await supabase.from('menu_permissions').upsert(rows, {
            onConflict: 'union_id,menu_item_id,role_id',
            ignoreDuplicates: false,
        });

        if (error) {
            console.error('Menu permissions upsert error:', error);
            return NextResponse.json(fail('DB_ERROR', error.message, 500));
        }

        return NextResponse.json(
            ok({
                message: '권한 설정이 성공적으로 저장되었습니다.',
                updatedCount: rows.length,
            })
        );
    } catch (error) {
        console.error('Menu permissions API error:', error);
        return NextResponse.json(fail('INTERNAL_ERROR', 'Internal server error', 500));
    }
}

