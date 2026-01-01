'use server';

import { createClient } from '@supabase/supabase-js';

// Supabase Admin 클라이언트 생성
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

export interface UpdateParcelInput {
    pnu: string;
    total_units?: number;
    owner_count?: number;
    land_area?: number;
}

export interface DeleteParcelInput {
    pnu: string;
    unionId: string;
}

/**
 * 필지 정보 수정
 */
export async function updateParcelInfo(input: UpdateParcelInput) {
    const supabase = getSupabaseAdmin();

    const updateData: Record<string, number | undefined> = {};
    if (input.total_units !== undefined) updateData.total_units = input.total_units;
    if (input.owner_count !== undefined) updateData.owner_count = input.owner_count;
    if (input.land_area !== undefined) updateData.area = input.land_area;

    const { error } = await supabase
        .from('land_lots')
        .update(updateData)
        .eq('pnu', input.pnu);

    if (error) {
        console.error('Update parcel error:', error);
        throw new Error(`필지 정보 수정에 실패했습니다: ${error.message}`);
    }

    return { success: true };
}

/**
 * 필지 삭제 (union_land_lots, land_lots, 관련 user_consents 삭제)
 */
export async function deleteParcel(input: DeleteParcelInput) {
    const supabase = getSupabaseAdmin();

    // 1. 해당 PNU에 연결된 조합원들의 동의 정보 삭제
    // property_pnu가 이 PNU인 사용자들의 user_consents 삭제
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('property_pnu', input.pnu)
        .eq('union_id', input.unionId);

    if (usersError) {
        console.error('Find users error:', usersError);
        throw new Error(`필지 삭제 중 오류가 발생했습니다: ${usersError.message}`);
    }

    if (users && users.length > 0) {
        const userIds = users.map((u) => u.id);
        const { error: consentsError } = await supabase
            .from('user_consents')
            .delete()
            .in('user_id', userIds);

        if (consentsError) {
            console.error('Delete user consents error:', consentsError);
            throw new Error(`동의 정보 삭제에 실패했습니다: ${consentsError.message}`);
        }
    }

    // 2. union_land_lots에서 삭제
    const { error: unionLotError } = await supabase
        .from('union_land_lots')
        .delete()
        .eq('pnu', input.pnu)
        .eq('union_id', input.unionId);

    if (unionLotError) {
        console.error('Delete union_land_lots error:', unionLotError);
        throw new Error(`조합 필지 삭제에 실패했습니다: ${unionLotError.message}`);
    }

    // 3. 다른 조합에서 사용하지 않는 경우에만 land_lots에서도 삭제
    const { data: otherUnions, error: checkError } = await supabase
        .from('union_land_lots')
        .select('union_id')
        .eq('pnu', input.pnu);

    if (checkError) {
        console.error('Check other unions error:', checkError);
    }

    // 다른 조합에서 사용하지 않으면 land_lots에서도 삭제
    if (!otherUnions || otherUnions.length === 0) {
        const { error: landLotError } = await supabase
            .from('land_lots')
            .delete()
            .eq('pnu', input.pnu);

        if (landLotError) {
            console.error('Delete land_lots error:', landLotError);
            // 이 오류는 무시하고 진행 (다른 조합에서 사용 중일 수 있음)
        }
    }

    return { success: true };
}

/**
 * 필지의 조합원 목록 조회 (users.property_pnu 기준)
 */
export async function getParcelMembers(pnu: string, unionId: string) {
    const supabase = getSupabaseAdmin();

    const { data: users, error } = await supabase
        .from('users')
        .select(`
            id,
            name,
            phone_number,
            property_address_jibun,
            property_pnu,
            user_status
        `)
        .eq('property_pnu', pnu)
        .eq('union_id', unionId)
        .eq('user_status', 'APPROVED');

    if (error) {
        console.error('Get parcel members error:', error);
        throw new Error(`조합원 정보 조회에 실패했습니다: ${error.message}`);
    }

    return users || [];
}

/**
 * 조합의 모든 승인된 조합원 목록 조회 (초기 로딩용)
 */
export async function getAllUnionMembers(unionId: string) {
    const supabase = getSupabaseAdmin();

    const { data: users, error } = await supabase
        .from('users')
        .select(`
            id,
            name,
            phone_number,
            property_address_jibun,
            property_pnu,
            user_status
        `)
        .eq('union_id', unionId)
        .eq('user_status', 'APPROVED')
        .not('property_pnu', 'is', null);

    if (error) {
        console.error('Get all union members error:', error);
        throw new Error(`조합원 정보 조회에 실패했습니다: ${error.message}`);
    }

    return users || [];
}
