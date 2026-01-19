'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/app/_lib/shared/supabase/client';
import {
  ConflictCheckResult,
  ConflictResolutionRequest,
  ConflictResolutionResult,
  PropertyConflict,
  ConflictComparisonData,
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

          // APPROVED 상태인 사용자와만 충돌 확인
          if (existingUser.user_status !== 'APPROVED') {
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
          // 공동 소유자 추가
          return await handleAddCoOwner(
            pendingUserId,
            existingUserId,
            conflictedPropertyUnitId,
            request.shareRatioForExisting || 50,
            request.shareRatioForNew || 50
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
 * 동일인 처리 - 정보 덮어쓰기
 */
async function handleSamePersonUpdate(
  pendingUserId: string,
  existingUserId: string
): Promise<ConflictResolutionResult> {
  // 1. 승인 대기 사용자 정보 조회
  const { data: pendingUser, error: pendingError } = await supabase
    .from('users')
    .select('name, phone_number, email, birth_date, property_address, property_address_detail')
    .eq('id', pendingUserId)
    .single();

  if (pendingError || !pendingUser) {
    return { success: false, message: '승인 대기 사용자 정보를 찾을 수 없습니다.' };
  }

  // 2. 기존 사용자 정보 업데이트
  const { error: updateError } = await supabase
    .from('users')
    .update({
      name: pendingUser.name,
      phone_number: pendingUser.phone_number,
      email: pendingUser.email,
      birth_date: pendingUser.birth_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existingUserId);

  if (updateError) {
    return { success: false, message: '기존 사용자 정보 업데이트에 실패했습니다.' };
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
 */
async function handleOwnershipTransfer(
  pendingUserId: string,
  existingUserId: string,
  propertyUnitId: string
): Promise<ConflictResolutionResult> {
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
    // 다른 물건지가 없으면 ARCHIVED 처리
    await supabase
      .from('users')
      .update({
        user_status: 'REJECTED', // ARCHIVED 상태가 없으므로 REJECTED 사용
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

  return {
    success: true,
    message: '소유권이 이전되었습니다.',
    resolvedUserId: pendingUserId,
  };
}

/**
 * 공동 소유자 추가 처리
 */
async function handleAddCoOwner(
  pendingUserId: string,
  existingUserId: string,
  propertyUnitId: string,
  existingRatio: number,
  newRatio: number
): Promise<ConflictResolutionResult> {
  // 1. 기존 소유자 지분율 업데이트
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

  // 2. 신규 소유자 승인 및 지분율 설정
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

  // 3. 신규 소유자 물건지 지분율 설정
  await supabase
    .from('user_property_units')
    .update({
      ownership_type: 'CO_OWNER',
      land_ownership_ratio: newRatio,
      building_ownership_ratio: newRatio,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', pendingUserId);

  return {
    success: true,
    message: `공동 소유자로 추가되었습니다. (기존 ${existingRatio}%, 신규 ${newRatio}%)`,
    resolvedUserId: pendingUserId,
  };
}

/**
 * 가족/대리인 추가 처리
 */
async function handleAddProxy(
  pendingUserId: string,
  existingUserId: string,
  propertyUnitId: string,
  relationshipType: 'FAMILY' | 'PROXY'
): Promise<ConflictResolutionResult> {
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

  const typeLabel = relationshipType === 'FAMILY' ? '소유주 가족' : '대리인';
  return {
    success: true,
    message: `${typeLabel}으로 등록되었습니다.`,
    resolvedUserId: pendingUserId,
  };
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
