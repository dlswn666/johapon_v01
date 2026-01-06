'use server';

import { createClient } from '@supabase/supabase-js';
import { normalizeDong, normalizeHo } from '@/app/_lib/shared/utils/dong-ho-utils';
import { OwnershipType } from '@/app/_lib/shared/type/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 서버 액션에서는 서비스 롤 키 사용
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 엑셀에서 읽은 조합원 데이터 타입
export interface MemberExcelRow {
    name: string;
    phoneNumber?: string;
    residentAddress?: string;
    propertyAddress: string; // 소유지 지번 (필수)
    propertyRoadAddress?: string; // 물건지 도로명 주소
    buildingName?: string; // 건물이름 (아파트/빌라 등)
    dong?: string;
    ho?: string;
    // 기존 필드 (하위 호환성 유지)
    area?: number; // 면적(m2) - deprecated, landArea/buildingArea 사용 권장
    officialPrice?: number; // 공시지가(원)
    ownershipRatio?: number; // 지분율(%) - deprecated, landOwnershipRatio/buildingOwnershipRatio 사용 권장
    // 신규 필드: 토지/건축물 분리
    landArea?: number; // 토지 소유 면적 (m2)
    landOwnershipRatio?: number; // 토지 지분율 (%)
    buildingArea?: number; // 건축물 소유 면적 (m2)
    buildingOwnershipRatio?: number; // 건축물 지분율 (%)
    ownershipType?: OwnershipType; // 소유유형
    notes?: string; // 특이사항
}

// 매칭 결과 타입
export interface MatchingResult {
    row: MemberExcelRow;
    matched: boolean;
    pnu: string | null;
    matchedAddress: string | null;
    error?: string;
}

// 사전 등록 결과 타입
export interface PreRegisterResult {
    success: boolean;
    totalCount: number;
    matchedCount: number;
    unmatchedCount: number;
    savedCount: number;
    errors: string[];
    results: MatchingResult[];
}

/**
 * 소유지 지번 주소를 union_land_lots와 매칭하여 PNU를 찾습니다.
 */
export async function matchAddressToPnu(
    unionId: string,
    propertyAddress: string
): Promise<{ pnu: string | null; matchedAddress: string | null; error?: string }> {
    try {
        // 주소 정규화 (공백 제거, 특수문자 제거)
        const normalizedAddress = propertyAddress.trim().replace(/\s+/g, ' ');

        // union_land_lots에서 주소 검색 (정확히 일치 또는 포함)
        const { data, error } = await supabase
            .from('union_land_lots')
            .select('pnu, address_text')
            .eq('union_id', unionId)
            .or(`address_text.ilike.%${normalizedAddress}%,address_text.eq.${normalizedAddress}`)
            .limit(1);

        if (error) {
            return { pnu: null, matchedAddress: null, error: error.message };
        }

        if (data && data.length > 0) {
            return { pnu: data[0].pnu, matchedAddress: data[0].address_text };
        }

        // 정확한 매칭이 없으면 부분 매칭 시도 (지번만 추출해서 검색)
        const jibunMatch = normalizedAddress.match(/(\d+(-\d+)?)/);
        if (jibunMatch) {
            const { data: partialData, error: partialError } = await supabase
                .from('union_land_lots')
                .select('pnu, address_text')
                .eq('union_id', unionId)
                .ilike('address_text', `%${jibunMatch[0]}%`)
                .limit(1);

            if (!partialError && partialData && partialData.length > 0) {
                return { pnu: partialData[0].pnu, matchedAddress: partialData[0].address_text };
            }
        }

        return { pnu: null, matchedAddress: null };
    } catch (error) {
        return { pnu: null, matchedAddress: null, error: String(error) };
    }
}

/**
 * 엑셀 데이터를 GIS 데이터와 매칭합니다.
 */
export async function matchMembersWithGis(
    unionId: string,
    members: MemberExcelRow[]
): Promise<MatchingResult[]> {
    const results: MatchingResult[] = [];

    for (const member of members) {
        const matchResult = await matchAddressToPnu(unionId, member.propertyAddress);
        results.push({
            row: member,
            matched: !!matchResult.pnu,
            pnu: matchResult.pnu,
            matchedAddress: matchResult.matchedAddress,
            error: matchResult.error,
        });
    }

    return results;
}

/**
 * 중복 PNU 체크 (동일 조합 내에서 같은 PNU+동+호수를 가진 다른 사용자가 있는지)
 */
export async function checkDuplicatePnu(
    unionId: string,
    pnu: string,
    dong: string | null,
    ho: string | null,
    excludeUserId?: string
): Promise<{ isDuplicate: boolean; existingUser?: { id: string; name: string } }> {
    try {
        let query = supabase
            .from('users')
            .select('id, name')
            .eq('union_id', unionId)
            .eq('property_pnu', pnu);

        // 동/호수 조건 추가
        if (dong) {
            query = query.eq('property_dong', dong);
        } else {
            query = query.is('property_dong', null);
        }

        if (ho) {
            query = query.eq('property_ho', ho);
        } else {
            query = query.is('property_ho', null);
        }

        // 자기 자신 제외
        if (excludeUserId) {
            query = query.neq('id', excludeUserId);
        }

        const { data, error } = await query.limit(1);

        if (error) {
            console.error('Duplicate check error:', error);
            return { isDuplicate: false };
        }

        if (data && data.length > 0) {
            return { isDuplicate: true, existingUser: data[0] };
        }

        return { isDuplicate: false };
    } catch (error) {
        console.error('Duplicate check error:', error);
        return { isDuplicate: false };
    }
}

/**
 * 매칭된 조합원 데이터를 users 테이블에 PRE_REGISTERED 상태로 저장합니다.
 */
export async function savePreRegisteredMembers(
    unionId: string,
    matchingResults: MatchingResult[]
): Promise<PreRegisterResult> {
    const errors: string[] = [];
    let savedCount = 0;

    for (const result of matchingResults) {
        const { row, pnu } = result;

        // 동호수 정규화 적용 (이미 정규화된 값이어도 안전하게 한 번 더 처리)
        const normalizedDong = normalizeDong(row.dong);
        const normalizedHo = normalizeHo(row.ho);

        // PNU가 매칭되지 않은 경우도 저장 (나중에 수동 매칭 가능)
        // 중복 체크 (정규화된 동호수로 비교)
        if (pnu) {
            const duplicateCheck = await checkDuplicatePnu(unionId, pnu, normalizedDong, normalizedHo);
            if (duplicateCheck.isDuplicate) {
                errors.push(
                    `${row.name}: 이미 등록된 소유지입니다. (기존 등록자: ${duplicateCheck.existingUser?.name})`
                );
                continue;
            }
        }

        // UUID 생성 (서버에서 생성)
        const id = crypto.randomUUID();

        // users 테이블에 저장 (정규화된 동호수 사용)
        const { error } = await supabase.from('users').insert({
            id,
            name: row.name,
            phone_number: row.phoneNumber || null,
            email: null, // 사전 등록 시 이메일 없음
            role: 'USER',
            union_id: unionId,
            user_status: 'PRE_REGISTERED',
            resident_address: row.residentAddress || null,
            property_pnu: pnu,
            property_address_jibun: row.propertyAddress,
            property_dong: normalizedDong,
            property_ho: normalizedHo,
        });

        if (error) {
            errors.push(`${row.name}: ${error.message}`);
        } else {
            savedCount++;
        }
    }

    const matchedCount = matchingResults.filter((r) => r.matched).length;
    const unmatchedCount = matchingResults.filter((r) => !r.matched).length;

    return {
        success: errors.length === 0,
        totalCount: matchingResults.length,
        matchedCount,
        unmatchedCount,
        savedCount,
        errors,
        results: matchingResults,
    };
}

/**
 * 수동 매칭: 비매칭된 사용자의 PNU를 수동으로 업데이트합니다.
 */
export async function manualMatchUser(
    userId: string,
    unionId: string,
    newPropertyAddress: string,
    dong?: string,
    ho?: string
): Promise<{ success: boolean; error?: string; pnu?: string }> {
    try {
        // 동호수 정규화 적용
        const normalizedDong = normalizeDong(dong);
        const normalizedHo = normalizeHo(ho);

        // 새 주소로 PNU 매칭 시도
        const matchResult = await matchAddressToPnu(unionId, newPropertyAddress);

        if (!matchResult.pnu) {
            return { success: false, error: '해당 주소를 GIS 데이터에서 찾을 수 없습니다.' };
        }

        // 중복 체크 (정규화된 동호수로 비교)
        const duplicateCheck = await checkDuplicatePnu(unionId, matchResult.pnu, normalizedDong, normalizedHo, userId);
        if (duplicateCheck.isDuplicate) {
            return {
                success: false,
                error: `이미 다른 사용자(${duplicateCheck.existingUser?.name})에게 할당된 소유지입니다.`,
            };
        }

        // 사용자 정보 업데이트 (정규화된 동호수 사용)
        const { error } = await supabase
            .from('users')
            .update({
                property_pnu: matchResult.pnu,
                property_address_jibun: newPropertyAddress,
                property_dong: normalizedDong,
                property_ho: normalizedHo,
            })
            .eq('id', userId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, pnu: matchResult.pnu };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * 조합의 사전 등록된 조합원 목록을 조회합니다.
 */
export async function getPreRegisteredMembers(unionId: string): Promise<{
    success: boolean;
    data?: Array<{
        id: string;
        name: string;
        phone_number: string | null;
        property_pnu: string | null;
        property_address_jibun: string | null;
        property_dong: string | null;
        property_ho: string | null;
        resident_address: string | null;
        created_at: string;
    }>;
    error?: string;
}> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, phone_number, property_pnu, property_address_jibun, property_dong, property_ho, resident_address, created_at')
            .eq('union_id', unionId)
            .eq('user_status', 'PRE_REGISTERED')
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * 사전 등록된 조합원을 삭제합니다.
 */
export async function deletePreRegisteredMember(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // PRE_REGISTERED 상태인지 확인
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('user_status')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return { success: false, error: '사용자를 찾을 수 없습니다.' };
        }

        if (user.user_status !== 'PRE_REGISTERED') {
            return { success: false, error: '사전 등록된 조합원만 삭제할 수 있습니다.' };
        }

        // 삭제
        const { error } = await supabase.from('users').delete().eq('id', userId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * 조합의 사전 등록된 조합원을 모두 삭제합니다. (데이터 초기화)
 */
export async function deleteAllPreRegisteredMembers(unionId: string): Promise<{ 
    success: boolean; 
    deletedCount: number;
    error?: string 
}> {
    try {
        // 먼저 삭제할 조합원 수 확인
        const { data: members, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('union_id', unionId)
            .eq('user_status', 'PRE_REGISTERED');

        if (fetchError) {
            return { success: false, deletedCount: 0, error: fetchError.message };
        }

        if (!members || members.length === 0) {
            return { success: true, deletedCount: 0 };
        }

        const memberIds = members.map(m => m.id);

        // user_property_units 테이블에서 관련 레코드 삭제 (외래키 제약조건)
        const { error: propertyUnitsError } = await supabase
            .from('user_property_units')
            .delete()
            .in('user_id', memberIds);

        if (propertyUnitsError) {
            console.error('user_property_units 삭제 오류:', propertyUnitsError);
            // 외래키 제약이 없을 수도 있으므로 계속 진행
        }

        // users 테이블에서 PRE_REGISTERED 상태 조합원 일괄 삭제
        const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('union_id', unionId)
            .eq('user_status', 'PRE_REGISTERED');

        if (deleteError) {
            return { success: false, deletedCount: 0, error: deleteError.message };
        }

        return { success: true, deletedCount: members.length };
    } catch (error) {
        return { success: false, deletedCount: 0, error: String(error) };
    }
}