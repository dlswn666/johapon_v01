'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import {
  ConflictCheckResult,
  ConflictResolutionRequest,
  ConflictResolutionResult,
  PropertyConflict,
  ConflictComparisonData,
  ExistingCoOwnerInfo,
  CoOwnerRatioAdjustment,
} from '@/app/_lib/shared/type/conflict.types';
import { User, OwnershipType } from '@/app/_lib/shared/type/database.types';

/**
 * 승인 대기 사용자의 물건지 충돌 검사
 * 동일한 물건지(building_unit_id 또는 pnu)에 이미 승인된 사용자가 있는지 확인
 */
export function useConflictCheck(userId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['conflict-check', userId],
    queryFn: async (): Promise<ConflictCheckResult> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // 1. 승인 대기 사용자 정보 조회
      const { data: pendingUser, error: userError } = await supabase
        .from('users')
        .select('id, name, phone_number, property_address, property_pnu')
        .eq('id', userId)
        .single();

      if (userError || !pendingUser) {
        throw new Error('승인 대기 사용자를 찾을 수 없습니다.');
      }

      // 2. 승인 대기 사용자의 물건지 목록 조회
      const { data: pendingUserUnits, error: unitsError } = await supabase
        .from('user_property_units')
        .select('*')
        .eq('user_id', userId);

      if (unitsError) {
        throw new Error('물건지 정보를 조회할 수 없습니다.');
      }

      // 물건지가 없으면 충돌 없음
      if (!pendingUserUnits || pendingUserUnits.length === 0) {
        return {
          hasConflict: false,
          conflicts: [],
          pendingUser: {
            id: pendingUser.id,
            name: pendingUser.name,
            phone: pendingUser.phone_number,
            propertyAddress: pendingUser.property_address,
          },
        };
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

      return {
        hasConflict: conflicts.length > 0,
        conflicts,
        pendingUser: {
          id: pendingUser.id,
          name: pendingUser.name,
          phone: pendingUser.phone_number,
          propertyAddress: pendingUser.property_address,
        },
      };
    },
    enabled: !!userId && enabled,
  });
}

/**
 * 충돌 해결 처리 Mutation
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation<ConflictResolutionResult, Error, ConflictResolutionRequest>({
    mutationFn: async (request): Promise<ConflictResolutionResult> => {
      const { action, pendingUserId, existingUserId, conflictedPropertyUnitId } = request;

      switch (action) {
        case 'update':
          // 동일인 - 기존 사용자 정보를 신규 정보로 업데이트하고 승인
          return await handleSamePersonUpdate(pendingUserId, existingUserId);

        case 'transfer':
          // 소유권 이전 - 기존 소유자 ARCHIVED, 신규 소유자 승인
          return await handleOwnershipTransfer(pendingUserId, existingUserId, conflictedPropertyUnitId);

        case 'add_co_owner':
          // 공동 소유자 추가 (FEAT-012: 다른 공동소유자 지분 조정 포함)
          return await handleAddCoOwner(
            pendingUserId,
            existingUserId,
            conflictedPropertyUnitId,
            request.shareRatioForExisting || 50,
            request.shareRatioForNew || 50,
            request.otherCoOwnerAdjustments
          );

        case 'add_proxy':
          // 가족/대리인 추가
          return await handleAddProxy(
            pendingUserId,
            existingUserId,
            conflictedPropertyUnitId,
            request.relationshipType || 'FAMILY'
          );

        default:
          throw new Error('Invalid action');
      }
    },
    onSuccess: () => {
      // 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['conflict-check'] });
    },
  });
}

/**
 * 동일 물건지의 기존 공동소유자 목록 조회
 * 지분율 검증을 위해 현재 충돌 대상(기존+신규) 외의 다른 공동소유자들을 조회
 */
export async function fetchExistingCoOwners(
  buildingUnitId: string | null,
  pnu: string | null,
  excludeUserIds: string[]
): Promise<ExistingCoOwnerInfo[]> {
  if (!buildingUnitId && !pnu) {
    return [];
  }

  let query = supabase
    .from('user_property_units')
    .select(`
      user_id,
      land_ownership_ratio,
      building_ownership_ratio,
      ownership_type,
      users!inner(
        id,
        name,
        user_status
      )
    `)
    .in('ownership_type', ['OWNER', 'CO_OWNER']); // 소유자/공동소유자만 조회

  // building_unit_id 또는 pnu로 검색
  if (buildingUnitId) {
    query = query.eq('building_unit_id', buildingUnitId);
  } else if (pnu) {
    query = query.eq('pnu', pnu);
  }

  // 충돌 대상 사용자들 제외
  if (excludeUserIds.length > 0) {
    query = query.not('user_id', 'in', `(${excludeUserIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch existing co-owners:', error);
    return [];
  }

  // APPROVED 상태의 사용자만 필터링하고 형식 변환
  const coOwners: ExistingCoOwnerInfo[] = [];
  for (const item of data || []) {
    const user = item.users as unknown as { id: string; name: string; user_status: string };
    if (user.user_status === 'APPROVED') {
      coOwners.push({
        userId: user.id,
        name: user.name,
        landOwnershipRatio: item.land_ownership_ratio ?? 0,
        buildingOwnershipRatio: item.building_ownership_ratio ?? 0,
      });
    }
  }

  return coOwners;
}

/**
 * 동일인 처리 - 정보 덮어쓰기
 * BUG-013: 물건지 정보 이관
 * BUG-015: user_auth_links 이관
 * BUG-017: notes 병합
 * BUG-018: 거주지 주소 업데이트
 */
async function handleSamePersonUpdate(
  pendingUserId: string,
  existingUserId: string
): Promise<ConflictResolutionResult> {
  // 1. 승인 대기 사용자 정보 조회 (BUG-018: 거주지 주소 필드 추가)
  const { data: pendingUser, error: pendingError } = await supabase
    .from('users')
    .select(`
      name, phone_number, email, birth_date,
      property_address, property_address_detail,
      resident_address, resident_address_detail,
      resident_address_road, resident_address_jibun, resident_zonecode,
      notes
    `)
    .eq('id', pendingUserId)
    .single();

  if (pendingError || !pendingUser) {
    return { success: false, message: '승인 대기 사용자 정보를 찾을 수 없습니다.' };
  }

  // BUG-017: 기존 사용자의 notes 조회 (병합용)
  const { data: existingUser } = await supabase
    .from('users')
    .select('notes')
    .eq('id', existingUserId)
    .single();

  // notes 병합 로직: 기존 + 신규 (중복 제거)
  let mergedNotes = existingUser?.notes || '';
  if (pendingUser.notes) {
    if (mergedNotes && !mergedNotes.includes(pendingUser.notes)) {
      mergedNotes = `${mergedNotes}\n---\n${pendingUser.notes}`;
    } else if (!mergedNotes) {
      mergedNotes = pendingUser.notes;
    }
  }

  // 2. 기존 사용자 정보 업데이트 (BUG-017, BUG-018 반영)
  const { error: updateError } = await supabase
    .from('users')
    .update({
      name: pendingUser.name,
      phone_number: pendingUser.phone_number,
      email: pendingUser.email,
      birth_date: pendingUser.birth_date,
      // BUG-018: 거주지 주소 업데이트
      resident_address: pendingUser.resident_address,
      resident_address_detail: pendingUser.resident_address_detail,
      resident_address_road: pendingUser.resident_address_road,
      resident_address_jibun: pendingUser.resident_address_jibun,
      resident_zonecode: pendingUser.resident_zonecode,
      // BUG-017: notes 병합
      notes: mergedNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingUserId);

  if (updateError) {
    return { success: false, message: '기존 사용자 정보 업데이트에 실패했습니다.' };
  }

  // BUG-013: 신규 사용자의 물건지 정보를 기존 사용자로 이관
  const { error: propertyTransferError } = await supabase
    .from('user_property_units')
    .update({
      user_id: existingUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', pendingUserId);

  if (propertyTransferError) {
    console.error('Failed to transfer property units:', propertyTransferError);
    // 물건지 이관 실패해도 계속 진행 (기존 동작 유지)
  }

  // BUG-015: 신규 사용자의 카카오 로그인 연결을 기존 사용자로 이관
  const { error: authLinkTransferError } = await supabase
    .from('user_auth_links')
    .update({
      user_id: existingUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', pendingUserId);

  if (authLinkTransferError) {
    console.error('Failed to transfer auth links:', authLinkTransferError);
    // 인증 링크 이관 실패해도 계속 진행
  }

  // 3. 승인 대기 사용자를 REJECTED 처리 (중복이므로)
  const { error: rejectError } = await supabase
    .from('users')
    .update({
      user_status: 'REJECTED',
      rejected_at: new Date().toISOString(),
      rejected_reason: '동일인 정보 통합 처리됨',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingUserId);

  if (rejectError) {
    console.error('Failed to reject duplicate user:', rejectError);
  }

  return {
    success: true,
    message: '동일인으로 처리되어 기존 정보가 업데이트되었습니다.',
    resolvedUserId: existingUserId,
  };
}

/**
 * 소유권 이전 처리
 * FEAT-010: 소유권 변동 이력 기록
 */
async function handleOwnershipTransfer(
  pendingUserId: string,
  existingUserId: string,
  propertyUnitId: string
): Promise<ConflictResolutionResult> {
  // 0. 기존 소유자의 지분율 조회 (이력 기록용)
  const { data: existingPropertyUnit } = await supabase
    .from('user_property_units')
    .select('land_ownership_ratio')
    .eq('user_id', existingUserId)
    .eq('id', propertyUnitId)
    .single();

  const previousRatio = existingPropertyUnit?.land_ownership_ratio || 100;

  // 1. 기존 소유자의 해당 물건지 소유권을 0으로 변경
  const { error: _archiveError } = await supabase
    .from('user_property_units')
    .update({
      ownership_type: 'OWNER',
      land_ownership_ratio: 0,
      building_ownership_ratio: 0,
      notes: '소유권 이전으로 인한 변경',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', existingUserId)
    .eq('id', propertyUnitId);

  // 기존 사용자를 ARCHIVED 처리 (다른 물건이 없으면)
  const { data: remainingUnits } = await supabase
    .from('user_property_units')
    .select('id')
    .eq('user_id', existingUserId)
    .gt('land_ownership_ratio', 0);

  if (!remainingUnits || remainingUnits.length === 0) {
    // 다른 물건지가 없으면 TRANSFERRED 처리 (FEAT-008)
    await supabase
      .from('users')
      .update({
        user_status: 'TRANSFERRED', // 소유권 이전(매매)으로 인한 탈퇴
        rejected_at: new Date().toISOString(),
        rejected_reason: '소유권 이전으로 인한 조합원 자격 상실',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingUserId);
  }

  // 2. 신규 소유자 승인
  const { error: approveError } = await supabase
    .from('users')
    .update({
      user_status: 'APPROVED',
      role: 'USER',
      approved_at: new Date().toISOString(),
      rejected_reason: null,
      rejected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingUserId);

  if (approveError) {
    return { success: false, message: '신규 소유자 승인에 실패했습니다.' };
  }

  // 3. 신규 소유자의 물건지 소유권 설정
  await supabase
    .from('user_property_units')
    .update({
      ownership_type: 'OWNER',
      land_ownership_ratio: 100,
      building_ownership_ratio: 100,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', pendingUserId);

  // FEAT-010: 소유권 이전 이력 기록
  await supabase
    .from('property_ownership_history')
    .insert({
      property_unit_id: propertyUnitId,
      from_user_id: existingUserId,
      to_user_id: pendingUserId,
      change_type: 'TRANSFER',
      previous_ratio: previousRatio,
      new_ratio: 100,
      change_reason: '소유권 이전 (매매)',
    });

  return {
    success: true,
    message: '소유권이 이전되었습니다.',
    resolvedUserId: pendingUserId,
  };
}

/**
 * 공동 소유자 추가 처리
 * FEAT-010: 소유권 변동 이력 기록
 * FEAT-012: 다른 공동소유자 지분율 조정
 */
async function handleAddCoOwner(
  pendingUserId: string,
  existingUserId: string,
  propertyUnitId: string,
  existingRatio: number,
  newRatio: number,
  otherCoOwnerAdjustments?: CoOwnerRatioAdjustment[]
): Promise<ConflictResolutionResult> {
  // 0. 물건지 정보 조회 (building_unit_id, pnu 획득)
  const { data: propertyUnit, error: unitError } = await supabase
    .from('user_property_units')
    .select('building_unit_id, pnu, land_ownership_ratio')
    .eq('id', propertyUnitId)
    .single();

  if (unitError || !propertyUnit) {
    return { success: false, message: '물건지 정보를 찾을 수 없습니다.' };
  }

  const previousRatio = propertyUnit.land_ownership_ratio || 100;

  // 1. 다른 공동소유자들의 지분율 합계 조회 (기존 소유자 + 신규 소유자 제외)
  const otherCoOwners = await fetchExistingCoOwners(
    propertyUnit.building_unit_id,
    propertyUnit.pnu,
    [existingUserId, pendingUserId]
  );

  const otherCoOwnersTotal = otherCoOwners.reduce(
    (sum, owner) => sum + owner.landOwnershipRatio,
    0
  );

  // 2. 지분율 합계 검증 (FEAT-012: 조정된 다른 공동소유자 지분 반영)
  const adjustedOtherTotal = otherCoOwnerAdjustments
    ? otherCoOwnerAdjustments.reduce((sum, adj) => sum + adj.newRatio, 0)
    : otherCoOwnersTotal;

  const totalRatio = adjustedOtherTotal + existingRatio + newRatio;
  if (totalRatio > 100) {
    return {
      success: false,
      message: `지분율 합계가 100%를 초과합니다. (현재 합계: ${totalRatio}%)`,
    };
  }

  if (totalRatio < 100) {
    return {
      success: false,
      message: `지분율 합계가 100%에 도달하지 않습니다. (현재 합계: ${totalRatio}%)`,
    };
  }

  // 3. 기존 소유자 지분율 업데이트
  const { error: existingUpdateError } = await supabase
    .from('user_property_units')
    .update({
      ownership_type: 'CO_OWNER',
      land_ownership_ratio: existingRatio,
      building_ownership_ratio: existingRatio,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', existingUserId)
    .eq('id', propertyUnitId);

  if (existingUpdateError) {
    return { success: false, message: '기존 소유자 지분율 업데이트에 실패했습니다.' };
  }

  // FEAT-010: 기존 소유자 지분율 변경 이력 기록
  if (previousRatio !== existingRatio) {
    await supabase
      .from('property_ownership_history')
      .insert({
        property_unit_id: propertyUnitId,
        from_user_id: existingUserId,
        to_user_id: existingUserId,
        change_type: 'RATIO_CHANGED',
        previous_ratio: previousRatio,
        new_ratio: existingRatio,
        change_reason: '공동소유자 추가로 인한 지분율 변경',
      });
  }

  // FEAT-012: 다른 공동소유자들의 지분율 업데이트
  if (otherCoOwnerAdjustments && otherCoOwnerAdjustments.length > 0) {
    for (const adjustment of otherCoOwnerAdjustments) {
      // 지분율이 변경된 경우에만 업데이트
      if (adjustment.previousRatio !== adjustment.newRatio) {
        // 해당 공동소유자의 물건지 조회
        let query = supabase
          .from('user_property_units')
          .select('id')
          .eq('user_id', adjustment.userId);

        if (propertyUnit.building_unit_id) {
          query = query.eq('building_unit_id', propertyUnit.building_unit_id);
        } else if (propertyUnit.pnu) {
          query = query.eq('pnu', propertyUnit.pnu);
        }

        const { data: otherUnit } = await query.single();

        if (otherUnit) {
          // 지분율 업데이트
          await supabase
            .from('user_property_units')
            .update({
              land_ownership_ratio: adjustment.newRatio,
              building_ownership_ratio: adjustment.newRatio,
              updated_at: new Date().toISOString(),
            })
            .eq('id', otherUnit.id);

          // 이력 기록
          await supabase
            .from('property_ownership_history')
            .insert({
              property_unit_id: otherUnit.id,
              from_user_id: adjustment.userId,
              to_user_id: adjustment.userId,
              change_type: 'RATIO_CHANGED',
              previous_ratio: adjustment.previousRatio,
              new_ratio: adjustment.newRatio,
              change_reason: '공동소유자 추가로 인한 지분율 변경',
            });
        }
      }
    }
  }

  // 4. 신규 소유자 승인 및 지분율 설정
  const { error: approveError } = await supabase
    .from('users')
    .update({
      user_status: 'APPROVED',
      role: 'USER',
      approved_at: new Date().toISOString(),
      rejected_reason: null,
      rejected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingUserId);

  if (approveError) {
    return { success: false, message: '신규 소유자 승인에 실패했습니다.' };
  }

  // 5. 신규 소유자 물건지 지분율 설정
  const { data: newPropertyUnit } = await supabase
    .from('user_property_units')
    .update({
      ownership_type: 'CO_OWNER',
      land_ownership_ratio: newRatio,
      building_ownership_ratio: newRatio,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', pendingUserId)
    .select('id')
    .single();

  // FEAT-010: 공동소유자 추가 이력 기록
  if (newPropertyUnit) {
    await supabase
      .from('property_ownership_history')
      .insert({
        property_unit_id: newPropertyUnit.id,
        from_user_id: null,
        to_user_id: pendingUserId,
        change_type: 'CO_OWNER_ADDED',
        previous_ratio: 0,
        new_ratio: newRatio,
        change_reason: '공동소유자로 신규 등록',
      });
  }

  return {
    success: true,
    message: `공동 소유자로 추가되었습니다. (기존 ${existingRatio}%, 신규 ${newRatio}%)`,
    resolvedUserId: pendingUserId,
  };
}

/**
 * 가족/대리인 추가 처리
 * FEAT-009: 사용자 관계 테이블 기록
 * FEAT-011: 원 소유자 알림 발송
 */
async function handleAddProxy(
  pendingUserId: string,
  existingUserId: string,
  propertyUnitId: string,
  relationshipType: 'FAMILY' | 'PROXY'
): Promise<ConflictResolutionResult> {
  // 0. 신규 사용자 정보 조회 (알림 발송용)
  const { data: pendingUser } = await supabase
    .from('users')
    .select('name')
    .eq('id', pendingUserId)
    .single();

  // 1. 신규 사용자 승인 (FAMILY 또는 PROXY 타입으로)
  const { error: approveError } = await supabase
    .from('users')
    .update({
      user_status: 'APPROVED',
      role: 'USER',
      approved_at: new Date().toISOString(),
      rejected_reason: null,
      rejected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingUserId);

  if (approveError) {
    return { success: false, message: '가족/대리인 승인에 실패했습니다.' };
  }

  // 2. 신규 사용자의 물건지를 FAMILY 또는 PROXY로 설정
  // 지분율은 0 (소유권은 없지만 접근 권한 있음)
  await supabase
    .from('user_property_units')
    .update({
      ownership_type: relationshipType,
      land_ownership_ratio: 0,
      building_ownership_ratio: 0,
      notes: relationshipType === 'FAMILY'
        ? `소유주 가족 (원 소유주: ${existingUserId})`
        : `대리인 (원 소유주: ${existingUserId})`,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', pendingUserId);

  // FEAT-009: 사용자 관계 테이블에 관계 기록
  const dbRelationshipType = relationshipType === 'FAMILY' ? 'FAMILY' : 'PROXY';
  const { error: relationshipError } = await supabase
    .from('user_relationships')
    .insert({
      user_id: existingUserId, // 원 소유자
      related_user_id: pendingUserId, // 대리인/가족
      relationship_type: dbRelationshipType,
      verified: false, // 기본값: 미인증
    });

  if (relationshipError) {
    console.error('Failed to create user relationship:', relationshipError);
    // 관계 기록 실패해도 대리인 등록은 성공 처리
  }

  // FEAT-011: 원 소유자에게 알림 발송 (선택적 - 알림 실패해도 등록은 진행)
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('name, phone_number, union_id')
      .eq('id', existingUserId)
      .single();

    if (existingUser?.phone_number && existingUser?.union_id) {
      // 조합 정보 조회
      const { data: union } = await supabase
        .from('unions')
        .select('name')
        .eq('id', existingUser.union_id)
        .single();

      // 알림톡 발송 (프록시 서버 호출)
      // 실패해도 무시 - 대리인 등록이 더 중요
      const typeLabel = relationshipType === 'FAMILY' ? '가족' : '대리인';
      const today = new Date().toLocaleDateString('ko-KR');

      await sendProxyRegistrationNotification({
        ownerName: existingUser.name,
        ownerPhone: existingUser.phone_number,
        proxyName: pendingUser?.name || '알 수 없음',
        relationshipType: typeLabel,
        registeredDate: today,
        unionName: union?.name || '조합',
      }).catch((err) => {
        console.warn('Failed to send proxy registration notification:', err);
      });
    }
  } catch (notifyError) {
    console.warn('Proxy notification skipped:', notifyError);
  }

  const typeLabel = relationshipType === 'FAMILY' ? '소유주 가족' : '대리인';
  return {
    success: true,
    message: `${typeLabel}으로 등록되었습니다.`,
    resolvedUserId: pendingUserId,
  };
}

/**
 * FEAT-011: 대리인 등록 알림 발송 (프록시 서버 경유)
 */
async function sendProxyRegistrationNotification(params: {
  ownerName: string;
  ownerPhone: string;
  proxyName: string;
  relationshipType: string;
  registeredDate: string;
  unionName: string;
}): Promise<void> {
  // 프록시 서버가 없거나 알림톡 템플릿이 없으면 스킵
  // 이 함수는 선택적이며 실패해도 대리인 등록에 영향 없음
  console.log('[FEAT-011] Proxy registration notification:', params);
  // TODO: 프록시 서버에 알림톡 템플릿 등록 후 실제 발송 구현
  // const proxyUrl = process.env.NEXT_PUBLIC_PROXY_SERVER_URL;
  // if (!proxyUrl) return;
  // await fetch(`${proxyUrl}/api/alimtalk/send`, { ... });
}

/**
 * 충돌 비교 데이터 생성 유틸리티
 */
export function createConflictComparisonData(
  pendingUser: { name: string; phone_number: string | null; property_address: string | null },
  conflict: PropertyConflict
): ConflictComparisonData {
  return {
    pending: {
      name: pendingUser.name,
      phone: pendingUser.phone_number,
      propertyAddress: pendingUser.property_address,
      dong: conflict.dong,
      ho: conflict.ho,
    },
    existing: {
      userId: conflict.existingOwner.userId,
      name: conflict.existingOwner.name,
      phone: conflict.existingOwner.phone,
      propertyAddress: conflict.address,
      dong: conflict.dong,
      ho: conflict.ho,
      ownershipType: conflict.existingOwner.ownershipType,
      status: conflict.existingOwner.status,
    },
  };
}
