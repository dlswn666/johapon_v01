import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/_lib/shared/supabase/server';
import { PropertyConflict, ConflictCheckResult } from '@/app/_lib/shared/type/conflict.types';
import { User, OwnershipType } from '@/app/_lib/shared/type/database.types';

/**
 * 조합원 승인 전 충돌 검사 API
 * GET /api/members/check-conflict?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. 승인 대기 사용자 정보 조회
    const { data: pendingUser, error: userError } = await supabase
      .from('users')
      .select('id, name, phone_number, property_address')
      .eq('id', userId)
      .single();

    if (userError || !pendingUser) {
      return NextResponse.json(
        { error: '승인 대기 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 승인 대기 사용자의 물건지 목록 조회
    const { data: pendingUserUnits, error: unitsError } = await supabase
      .from('user_property_units')
      .select('*')
      .eq('user_id', userId);

    if (unitsError) {
      return NextResponse.json(
        { error: '물건지 정보를 조회할 수 없습니다.' },
        { status: 500 }
      );
    }

    // 물건지가 없으면 충돌 없음
    if (!pendingUserUnits || pendingUserUnits.length === 0) {
      const result: ConflictCheckResult = {
        hasConflict: false,
        conflicts: [],
        pendingUser: {
          id: pendingUser.id,
          name: pendingUser.name,
          phone: pendingUser.phone_number,
          propertyAddress: pendingUser.property_address,
        },
      };
      return NextResponse.json(result);
    }

    // 3. 각 물건지에 대해 충돌 검사
    const conflicts: PropertyConflict[] = [];

    for (const unit of pendingUserUnits) {
      // building_unit_id 또는 pnu로 다른 소유자 찾기
      let query = supabase
        .from('user_property_units')
        .select(`
          id,
          building_unit_id,
          pnu,
          dong,
          ho,
          ownership_type,
          land_ownership_ratio,
          property_address_jibun,
          property_address_road,
          user_id,
          users!inner(
            id,
            name,
            phone_number,
            user_status
          )
        `)
        .neq('user_id', userId); // 본인 제외

      // building_unit_id가 있으면 동일 building_unit 검색
      if (unit.building_unit_id) {
        query = query.eq('building_unit_id', unit.building_unit_id);
      }
      // pnu로 검색 (토지의 경우)
      else if (unit.pnu) {
        query = query.eq('pnu', unit.pnu);
      } else {
        // 물건지 식별 정보 없으면 스킵
        continue;
      }

      const { data: existingUnits, error: conflictError } = await query;

      if (conflictError) {
        console.error('Conflict check error:', conflictError);
        continue;
      }

      // 승인된 사용자와의 충돌만 확인
      for (const existingUnit of existingUnits || []) {
        const existingUser = existingUnit.users as unknown as User;

        // BUG-014: APPROVED 또는 PRE_REGISTERED 상태인 사용자와 충돌 확인
        // (사전등록 조합원과의 충돌도 감지해야 함)
        if (!['APPROVED', 'PRE_REGISTERED'].includes(existingUser.user_status || '')) {
          continue;
        }

        conflicts.push({
          propertyUnitId: unit.id,
          buildingUnitId: unit.building_unit_id,
          pnu: unit.pnu,
          dong: unit.dong,
          ho: unit.ho,
          address: unit.property_address_jibun || unit.property_address_road || '',
          existingOwner: {
            userId: existingUser.id,
            name: existingUser.name,
            phone: existingUser.phone_number,
            ownershipType: existingUnit.ownership_type as OwnershipType,
            shareRatio: existingUnit.land_ownership_ratio,
            status: existingUser.user_status,
          },
        });
      }
    }

    const result: ConflictCheckResult = {
      hasConflict: conflicts.length > 0,
      conflicts,
      pendingUser: {
        id: pendingUser.id,
        name: pendingUser.name,
        phone: pendingUser.phone_number,
        propertyAddress: pendingUser.property_address,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/members/check-conflict:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
