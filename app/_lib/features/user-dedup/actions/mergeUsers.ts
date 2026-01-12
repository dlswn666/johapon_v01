'use server';

import { createClient } from '@supabase/supabase-js';
import { normalizeJibunAddress, normalizeName } from '@/app/_lib/shared/utils/address-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 서버 액션에서는 서비스 롤 키 사용
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 중복 사용자 검색 결과 타입
 */
export interface DuplicateUser {
    id: string;
    name: string;
    user_status: string;
    created_at: string;
}

/**
 * 중복 사용자 병합 결과 타입
 */
export interface MergeUsersResult {
    success: boolean;
    keeper_id?: string;
    merged_count?: number;
    affected?: Record<string, number>;
    error?: string;
}

/**
 * 동일 조합 내에서 이름 + 거주지 지번(정규화) 기준으로 중복 사용자를 조회합니다
 *
 * @param unionId - 조합 ID
 * @param name - 이름
 * @param residentAddressJibun - 거주지 지번 주소
 * @param excludeUserId - 제외할 사용자 ID (본인)
 * @returns 중복 사용자 목록
 */
export async function findDuplicateUsersByNameResidence(
    unionId: string,
    name: string,
    residentAddressJibun: string | null | undefined,
    excludeUserId?: string
): Promise<{ success: boolean; duplicates: DuplicateUser[]; error?: string }> {
    try {
        const normalizedName = normalizeName(name);
        const normalizedJibun = normalizeJibunAddress(residentAddressJibun);

        // 정규화된 값이 비어있으면 중복 검사 불가
        if (!normalizedName || !normalizedJibun) {
            return { success: true, duplicates: [] };
        }

        // DB RPC 함수 호출
        const { data, error } = await supabase.rpc('find_duplicate_users_by_name_residence', {
            p_union_id: unionId,
            p_name: name,
            p_resident_address_jibun: residentAddressJibun || '',
            p_exclude_user_id: excludeUserId || null,
        });

        if (error) {
            console.error('[findDuplicateUsers] RPC error:', error);
            return { success: false, duplicates: [], error: error.message };
        }

        // RPC 함수 반환 타입
        interface DuplicateUserRow {
            user_id: string;
            user_name: string;
            user_status: string;
            created_at: string;
        }

        const duplicates: DuplicateUser[] = (data || []).map((row: DuplicateUserRow) => ({
            id: row.user_id,
            name: row.user_name,
            user_status: row.user_status,
            created_at: row.created_at,
        }));

        return { success: true, duplicates };
    } catch (error) {
        console.error('[findDuplicateUsers] Error:', error);
        return { success: false, duplicates: [], error: String(error) };
    }
}

/**
 * 중복 사용자를 병합합니다 (새로 등록된 사용자를 keeper로 유지)
 * 기존 레코드들의 모든 참조를 keeper로 이관한 후 삭제합니다
 *
 * @param keeperId - 새로 생성된 사용자 ID (유지할 레코드)
 * @param duplicateIds - 삭제할 기존 레코드 ID 배열
 * @returns 병합 결과
 */
export async function mergeUsersKeepNew(keeperId: string, duplicateIds: string[]): Promise<MergeUsersResult> {
    try {
        if (!keeperId) {
            return { success: false, error: 'keeper_id는 필수입니다' };
        }

        if (!duplicateIds || duplicateIds.length === 0) {
            return { success: true, keeper_id: keeperId, merged_count: 0, affected: {} };
        }

        // keeper를 중복 목록에서 제거
        const filteredDuplicates = duplicateIds.filter((id) => id !== keeperId);

        if (filteredDuplicates.length === 0) {
            return { success: true, keeper_id: keeperId, merged_count: 0, affected: {} };
        }

        console.log(`[mergeUsersKeepNew] Merging ${filteredDuplicates.length} duplicates into keeper ${keeperId}`);

        // DB RPC 함수 호출
        const { data, error } = await supabase.rpc('merge_users_keep_new', {
            p_keeper_id: keeperId,
            p_duplicate_ids: filteredDuplicates,
        });

        if (error) {
            console.error('[mergeUsersKeepNew] RPC error:', error);
            return { success: false, error: error.message };
        }

        console.log('[mergeUsersKeepNew] Result:', data);

        return {
            success: data?.success ?? false,
            keeper_id: data?.keeper_id,
            merged_count: data?.merged_count,
            affected: data?.affected,
        };
    } catch (error) {
        console.error('[mergeUsersKeepNew] Error:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * 새 사용자 생성 후 중복 검사 및 병합을 수행합니다
 * 이름 + 거주지 지번 기준으로 기존 중복 사용자를 찾아 새 사용자로 이관합니다
 *
 * @param newUserId - 새로 생성된 사용자 ID
 * @param unionId - 조합 ID
 * @param name - 이름
 * @param residentAddressJibun - 거주지 지번 주소
 * @returns 병합 결과
 */
export async function checkAndMergeDuplicateUsers(
    newUserId: string,
    unionId: string,
    name: string,
    residentAddressJibun: string | null | undefined
): Promise<MergeUsersResult> {
    try {
        // 1. 중복 사용자 조회 (본인 제외)
        const findResult = await findDuplicateUsersByNameResidence(unionId, name, residentAddressJibun, newUserId);

        if (!findResult.success) {
            console.error('[checkAndMergeDuplicateUsers] Find duplicates failed:', findResult.error);
            // 중복 검사 실패는 치명적이지 않으므로 성공으로 처리
            return { success: true, keeper_id: newUserId, merged_count: 0, affected: {} };
        }

        if (findResult.duplicates.length === 0) {
            console.log('[checkAndMergeDuplicateUsers] No duplicates found');
            return { success: true, keeper_id: newUserId, merged_count: 0, affected: {} };
        }

        console.log(
            `[checkAndMergeDuplicateUsers] Found ${findResult.duplicates.length} duplicate(s) for user ${name}`
        );

        // 2. 중복 사용자 병합 (새 사용자가 keeper)
        const duplicateIds = findResult.duplicates.map((d) => d.id);
        return await mergeUsersKeepNew(newUserId, duplicateIds);
    } catch (error) {
        console.error('[checkAndMergeDuplicateUsers] Error:', error);
        // 병합 실패는 치명적이지 않으므로 성공으로 처리하되 에러 로깅
        return { success: true, keeper_id: newUserId, merged_count: 0, error: String(error) };
    }
}
