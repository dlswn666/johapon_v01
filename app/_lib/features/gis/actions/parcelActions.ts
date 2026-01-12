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
    // land_lots 필드
    owner_count?: number;
    land_area?: number;
    official_price?: number;
    land_category?: string;
    // buildings 필드 (building_id가 있을 경우)
    building_id?: string;
    building_type?: string;
    building_name?: string;
    main_purpose?: string;
    floor_count?: number;
    total_unit_count?: number;
}

export interface DeleteParcelInput {
    pnu: string;
    unionId: string;
}

export interface LinkMemberToParcelInput {
    pnu: string;
    userId: string;
    dong?: string;
    ho?: string;
    buildingUnitId?: string;
    ownershipType?: string;
}

/**
 * 필지 정보 수정 (land_lots + buildings 확장)
 */
export async function updateParcelInfo(input: UpdateParcelInput) {
    const supabase = getSupabaseAdmin();

    // land_lots 업데이트
    const landLotsUpdate: Record<string, number | string | undefined> = {};
    if (input.owner_count !== undefined) landLotsUpdate.owner_count = input.owner_count;
    if (input.land_area !== undefined) landLotsUpdate.area = input.land_area;
    if (input.official_price !== undefined) landLotsUpdate.official_price = input.official_price;
    if (input.land_category !== undefined) landLotsUpdate.land_category = input.land_category;

    if (Object.keys(landLotsUpdate).length > 0) {
        const { error: landError } = await supabase
            .from('land_lots')
            .update(landLotsUpdate)
            .eq('pnu', input.pnu);

        if (landError) {
            console.error('Update land_lots error:', landError);
            throw new Error(`필지 정보 수정에 실패했습니다: ${landError.message}`);
        }
    }

    // buildings 업데이트 (building_id가 있을 경우)
    if (input.building_id) {
        const buildingsUpdate: Record<string, string | number | undefined> = {};
        if (input.building_type !== undefined) buildingsUpdate.building_type = input.building_type;
        if (input.building_name !== undefined) buildingsUpdate.building_name = input.building_name;
        if (input.main_purpose !== undefined) buildingsUpdate.main_purpose = input.main_purpose;
        if (input.floor_count !== undefined) buildingsUpdate.floor_count = input.floor_count;
        if (input.total_unit_count !== undefined) buildingsUpdate.total_unit_count = input.total_unit_count;

        if (Object.keys(buildingsUpdate).length > 0) {
            const { error: buildingError } = await supabase
                .from('buildings')
                .update(buildingsUpdate)
                .eq('id', input.building_id);

            if (buildingError) {
                console.error('Update buildings error:', buildingError);
                throw new Error(`건물 정보 수정에 실패했습니다: ${buildingError.message}`);
            }
        }
    }

    return { success: true };
}

/**
 * 기존 조합원을 해당 PNU에 연결 (user_property_units upsert)
 */
export async function linkMemberToParcel(input: LinkMemberToParcelInput) {
    const supabase = getSupabaseAdmin();

    // 기존에 동일한 user_id + pnu 조합이 있는지 확인
    const { data: existingUnit, error: checkError } = await supabase
        .from('user_property_units')
        .select('id')
        .eq('user_id', input.userId)
        .eq('pnu', input.pnu)
        .maybeSingle();

    if (checkError) {
        console.error('Check existing unit error:', checkError);
        throw new Error(`조합원 연결 확인에 실패했습니다: ${checkError.message}`);
    }

    const unitData = {
        user_id: input.userId,
        pnu: input.pnu,
        dong: input.dong || null,
        ho: input.ho || null,
        building_unit_id: input.buildingUnitId || null,
        ownership_type: input.ownershipType || 'OWNER',
        is_primary: false, // 연결 시에는 대표가 아닌 것으로 설정
    };

    if (existingUnit) {
        // 업데이트
        const { error: updateError } = await supabase
            .from('user_property_units')
            .update({
                dong: unitData.dong,
                ho: unitData.ho,
                building_unit_id: unitData.building_unit_id,
                ownership_type: unitData.ownership_type,
            })
            .eq('id', existingUnit.id);

        if (updateError) {
            console.error('Update user_property_units error:', updateError);
            throw new Error(`조합원 연결 수정에 실패했습니다: ${updateError.message}`);
        }
    } else {
        // 생성
        const { error: insertError } = await supabase.from('user_property_units').insert(unitData);

        if (insertError) {
            console.error('Insert user_property_units error:', insertError);
            throw new Error(`조합원 연결에 실패했습니다: ${insertError.message}`);
        }
    }

    return { success: true };
}

/**
 * 필지 삭제 (union_land_lots, land_lots, 관련 user_consents 삭제)
 */
export async function deleteParcel(input: DeleteParcelInput) {
    const supabase = getSupabaseAdmin();

    // 1. 해당 PNU에 연결된 조합원들의 동의 정보 삭제
    // user_property_units.pnu가 이 PNU인 사용자들의 user_consents 삭제
    const { data: propertyUnits, error: usersError } = await supabase
        .from('user_property_units')
        .select(`
            user_id,
            users!inner (
                id,
                union_id
            )
        `)
        .eq('pnu', input.pnu);

    if (usersError) {
        console.error('Find users error:', usersError);
        throw new Error(`필지 삭제 중 오류가 발생했습니다: ${usersError.message}`);
    }

    // 해당 조합의 사용자만 필터링
    interface UserData {
        id: string;
        union_id: string;
    }

    const users = (propertyUnits || [])
        .filter((pu) => {
            const user = pu.users as unknown as UserData | null;
            return user && user.union_id === input.unionId;
        })
        .map((pu) => {
            const user = pu.users as unknown as UserData;
            return { id: user.id };
        });

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
 * 필지의 조합원 목록 조회 (user_property_units.pnu 기준)
 */
export async function getParcelMembers(pnu: string, unionId: string) {
    const supabase = getSupabaseAdmin();

    // user_property_units 테이블에서 해당 PNU에 연결된 사용자 조회
    const { data: propertyUnits, error } = await supabase
        .from('user_property_units')
        .select(`
            pnu,
            property_address_jibun,
            users!inner (
                id,
                name,
                phone_number,
                user_status,
                union_id
            )
        `)
        .eq('pnu', pnu);

    if (error) {
        console.error('Get parcel members error:', error);
        throw new Error(`조합원 정보 조회에 실패했습니다: ${error.message}`);
    }

    // 사용자 타입 정의
    interface UserData {
        id: string;
        name: string;
        phone_number: string;
        user_status: string;
        union_id: string;
    }

    // 해당 조합의 승인된 조합원만 필터링하고 결과 형식 변환
    const users = (propertyUnits || [])
        .filter((pu) => {
            const user = pu.users as unknown as UserData | null;
            return user && user.union_id === unionId && user.user_status === 'APPROVED';
        })
        .map((pu) => {
            const user = pu.users as unknown as UserData;
            return {
                id: user.id,
                name: user.name,
                phone_number: user.phone_number,
                property_address_jibun: pu.property_address_jibun,
                property_pnu: pu.pnu,
                user_status: user.user_status,
            };
        });

    return users;
}

/**
 * 조합의 모든 승인된 조합원 목록 조회 (초기 로딩용)
 * user_property_units 테이블에서 PNU가 있는 조합원을 조회
 */
export async function getAllUnionMembers(unionId: string) {
    const supabase = getSupabaseAdmin();

    // 해당 조합의 승인된 사용자 중 user_property_units에 PNU가 있는 사용자 조회
    const { data: propertyUnits, error } = await supabase
        .from('user_property_units')
        .select(`
            pnu,
            property_address_jibun,
            users!inner (
                id,
                name,
                phone_number,
                user_status,
                union_id
            )
        `)
        .not('pnu', 'is', null);

    if (error) {
        console.error('Get all union members error:', error);
        throw new Error(`조합원 정보 조회에 실패했습니다: ${error.message}`);
    }

    // 사용자 타입 정의
    interface UserData {
        id: string;
        name: string;
        phone_number: string;
        user_status: string;
        union_id: string;
    }

    // 해당 조합의 승인된 조합원만 필터링하고 결과 형식 변환
    const users = (propertyUnits || [])
        .filter((pu) => {
            const user = pu.users as unknown as UserData | null;
            return user && user.union_id === unionId && user.user_status === 'APPROVED';
        })
        .map((pu) => {
            const user = pu.users as unknown as UserData;
            return {
                id: user.id,
                name: user.name,
                phone_number: user.phone_number,
                property_address_jibun: pu.property_address_jibun,
                property_pnu: pu.pnu,
                user_status: user.user_status,
            };
        });

    return users;
}

/**
 * 조합의 조합원 검색 (이름 또는 전화번호)
 */
export async function searchUnionMembers(unionId: string, query: string) {
    const supabase = getSupabaseAdmin();

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, phone_number')
        .eq('union_id', unionId)
        .in('user_status', ['APPROVED', 'PRE_REGISTERED'])
        .or(`name.ilike.%${query}%,phone_number.ilike.%${query}%`)
        .limit(20);

    if (error) {
        console.error('Search union members error:', error);
        throw new Error(`조합원 검색에 실패했습니다: ${error.message}`);
    }

    return users || [];
}
