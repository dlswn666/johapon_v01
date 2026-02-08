'use server';

import { createClient } from '@supabase/supabase-js';
import { normalizeDong, normalizeHo } from '@/app/_lib/shared/utils/dong-ho-utils';
import { normalizeJibunAddress } from '@/app/_lib/shared/utils/address-utils';
// normalizeJibunAddress, normalizeName는 RPC 함수 내부에서 처리됨
import { OwnershipType } from '@/app/_lib/shared/type/database.types';
import { escapeLikeWildcards } from '@/app/_lib/shared/utils/escapeLike';

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
 * TASK-S005: 정규화된 주소로 매칭 성공률 개선 (80% → 90% 이상)
 */
export async function matchAddressToPnu(
    unionId: string,
    propertyAddress: string
): Promise<{ pnu: string | null; matchedAddress: string | null; error?: string }> {
    try {
        // ✅ Step 1: 정규화된 주소로 1차 매칭 (괄호 제거, 특수문자 제거)
        const normalizedAddress = normalizeJibunAddress(propertyAddress);

        // land_lots에서 주소 검색 (union_land_lots 병합됨)
        const escapedAddress = escapeLikeWildcards(normalizedAddress);
        const { data, error } = await supabase
            .from('land_lots')
            .select('pnu, address_text, address')
            .eq('union_id', unionId)
            .or(`address_text.ilike.%${escapedAddress}%,address.ilike.%${escapedAddress}%`)
            .limit(1);

        if (error) {
            return { pnu: null, matchedAddress: null, error: error.message };
        }

        if (data && data.length > 0) {
            return { pnu: data[0].pnu, matchedAddress: data[0].address_text || data[0].address };
        }

        // ✅ Step 2: 부분 매칭 (지번만 추출해서 검색)
        const jibunMatch = normalizedAddress.match(/(\d+(-\d+)?)/);
        if (jibunMatch) {

            const escapedJibun = escapeLikeWildcards(jibunMatch[0]);
            const { data: partialData, error: partialError } = await supabase
                .from('land_lots')
                .select('pnu, address_text, address')
                .eq('union_id', unionId)
                .or(`address_text.ilike.%${escapedJibun}%,address.ilike.%${escapedJibun}%`)
                .limit(1);

            if (!partialError && partialData && partialData.length > 0) {
                return { pnu: partialData[0].pnu, matchedAddress: partialData[0].address_text || partialData[0].address };
            }
        }

        return { pnu: null, matchedAddress: null };
    } catch (error) {
        console.error('[GIS] Address matching error:', error instanceof Error ? error.message : error);
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
 * user_property_units 테이블을 통해 조회
 */
export async function checkDuplicatePnu(
    unionId: string,
    pnu: string,
    dong: string | null,
    ho: string | null,
    excludeUserId?: string
): Promise<{ isDuplicate: boolean; existingUser?: { id: string; name: string } }> {
    try {
        // user_property_units에서 PNU, 동, 호로 조회
        let query = supabase
            .from('user_property_units')
            .select(`
                user_id,
                dong,
                ho,
                users!inner (
                    id,
                    name,
                    union_id
                )
            `)
            .eq('pnu', pnu);

        // 동/호수 조건 추가
        if (dong) {
            query = query.eq('dong', dong);
        } else {
            query = query.is('dong', null);
        }

        if (ho) {
            query = query.eq('ho', ho);
        } else {
            query = query.is('ho', null);
        }

        const { data, error } = await query.limit(10);

        if (error) {
            console.error('Duplicate check error:', error);
            return { isDuplicate: false };
        }

        // 사용자 타입 정의
        interface UserData {
            id: string;
            name: string;
            union_id: string;
        }

        // 해당 조합의 사용자 중 excludeUserId가 아닌 사용자 필터링
        const matchingUsers = (data || [])
            .filter((pu) => {
                const user = pu.users as unknown as UserData | null;
                return user && user.union_id === unionId && (!excludeUserId || user.id !== excludeUserId);
            })
            .map((pu) => {
                const user = pu.users as unknown as UserData;
                return { id: user.id, name: user.name };
            });

        if (matchingUsers.length > 0) {
            return { isDuplicate: true, existingUser: matchingUsers[0] };
        }

        return { isDuplicate: false };
    } catch (error) {
        console.error('Duplicate check error:', error);
        return { isDuplicate: false };
    }
}

/**
 * 이름 + 거주지 지번 기준으로 중복 사용자 ID 배열을 조회합니다.
 * (새 사용자 제외)
 */
async function findDuplicateUserIds(
    unionId: string,
    name: string,
    residentAddressJibun: string,
    excludeUserId: string
): Promise<string[]> {
    try {
        const { data, error } = await supabase.rpc('find_duplicate_users_by_name_residence', {
            p_union_id: unionId,
            p_name: name,
            p_resident_address_jibun: residentAddressJibun,
            p_exclude_user_id: excludeUserId,
        });

        if (error) {
            console.error('[findDuplicateUserIds] RPC error:', error.message);
            return [];
        }

        return (data || []).map((row: { user_id: string }) => row.user_id);
    } catch (err) {
        console.error('[findDuplicateUserIds] Error:', err);
        return [];
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

        // 거주지 주소를 지번으로 정규화 (중복 검사용)
        const residentAddressJibun = row.residentAddress || null;

        // users 테이블에 저장 (스키마 변경: property_pnu, property_address_jibun, property_dong, property_ho는 user_property_units에 저장)
        const { error } = await supabase.from('users').insert({
            id,
            name: row.name,
            phone_number: row.phoneNumber || null,
            email: null, // 사전 등록 시 이메일 없음
            role: 'USER',
            union_id: unionId,
            user_status: 'PRE_REGISTERED',
            resident_address: row.residentAddress || null,
            resident_address_jibun: residentAddressJibun,
            property_address: row.propertyAddress || null, // 기본 주소는 users에 저장
        });

        if (error) {
            errors.push(`${row.name}: ${error.message}`);
        } else {
            // user_property_units에 물건지 상세 정보 저장
            const { error: propertyUnitError } = await supabase.from('user_property_units').insert({
                user_id: id,
                pnu: pnu,
                property_address_jibun: row.propertyAddress,
                dong: normalizedDong,
                ho: normalizedHo,
                is_primary: true, // 사전등록 시 첫 번째 물건지를 대표로 설정
            });

            if (propertyUnitError) {
                console.error(`[사전등록] 물건지 정보 저장 실패 (${row.name}):`, propertyUnitError.message);
            }

            savedCount++;

            // 이름 + 거주지 지번 기준으로 중복 사용자 검사 및 병합 (새 사용자가 keeper)
            if (residentAddressJibun) {
                try {
                    const { data: mergeResult, error: mergeError } = await supabase.rpc('merge_users_keep_new', {
                        p_keeper_id: id,
                        p_duplicate_ids: await findDuplicateUserIds(unionId, row.name, residentAddressJibun, id),
                    });

                    if (mergeError) {
                        console.error(`[사전등록] 중복 병합 실패 (${row.name}):`, mergeError.message);
                    } else if (mergeResult?.merged_count > 0) {
                        console.log(`[사전등록] ${row.name}: 중복 ${mergeResult.merged_count}명 병합 완료`);
                    }
                } catch (mergeErr) {
                    console.error(`[사전등록] 중복 병합 오류 (${row.name}):`, mergeErr);
                }
            }
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

        // users.property_address 업데이트
        const { error: userError } = await supabase
            .from('users')
            .update({
                property_address: newPropertyAddress,
            })
            .eq('id', userId);

        if (userError) {
            return { success: false, error: userError.message };
        }

        // user_property_units에서 기존 대표 물건지 확인
        const { data: existingUnit } = await supabase
            .from('user_property_units')
            .select('id')
            .eq('user_id', userId)
            .eq('is_primary', true)
            .single();

        if (existingUnit) {
            // 기존 대표 물건지 업데이트
            const { error: updateError } = await supabase
                .from('user_property_units')
                .update({
                    pnu: matchResult.pnu,
                    property_address_jibun: newPropertyAddress,
                    dong: normalizedDong,
                    ho: normalizedHo,
                })
                .eq('id', existingUnit.id);

            if (updateError) {
                return { success: false, error: updateError.message };
            }
        } else {
            // 새 대표 물건지 생성
            const { error: insertError } = await supabase.from('user_property_units').insert({
                user_id: userId,
                pnu: matchResult.pnu,
                property_address_jibun: newPropertyAddress,
                dong: normalizedDong,
                ho: normalizedHo,
                is_primary: true,
            });

            if (insertError) {
                return { success: false, error: insertError.message };
            }
        }

        return { success: true, pnu: matchResult.pnu };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * 조합의 사전 등록된 조합원 목록을 조회합니다.
 * @param unionId 조합 ID
 * @param options 페이지네이션 옵션 (offset, limit, searchTerm, matchFilter)
 */
export async function getPreRegisteredMembers(
    unionId: string,
    options?: { offset?: number; limit?: number; searchTerm?: string; matchFilter?: 'all' | 'matched' | 'unmatched' }
): Promise<{
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
    totalCount?: number;
    hasMore?: boolean;
    error?: string;
}> {
    try {
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? 30;
        const searchTerm = options?.searchTerm?.trim();
        const matchFilter = options?.matchFilter ?? 'all';

        // user_property_units 조인하여 물건지 정보 조회 (스키마 변경으로 property_pnu 등은 user_property_units에만 존재)
        let dataQuery = supabase
            .from('users')
            .select(`
                id, name, phone_number, resident_address, created_at, property_address,
                user_property_units!left(pnu, property_address_jibun, dong, ho, is_primary)
            `)
            .eq('union_id', unionId)
            .eq('user_status', 'PRE_REGISTERED');

        // 검색어가 있으면 검색 조건 추가 (users.property_address로 검색)
        if (searchTerm) {
            const searchPattern = `%${escapeLikeWildcards(searchTerm)}%`;
            const searchFilter = `name.ilike.${searchPattern},phone_number.ilike.${searchPattern},property_address.ilike.${searchPattern}`;
            dataQuery = dataQuery.or(searchFilter);
        }

        // 데이터 조회
        const { data: rawData, error } = await dataQuery.order('name', { ascending: true });

        if (error) {
            return { success: false, error: error.message };
        }

        // user_property_units 배열을 평탄화하여 property_pnu, property_address_jibun 등 추출
        type PropertyUnit = { pnu: string | null; property_address_jibun: string | null; dong: string | null; ho: string | null; is_primary: boolean | null };
        const mappedData = (rawData || []).map((user) => {
            const primaryUnit = (user.user_property_units as PropertyUnit[] | null)?.find((u) => u.is_primary) ||
                                (user.user_property_units as PropertyUnit[] | null)?.[0] || null;
            return {
                id: user.id,
                name: user.name,
                phone_number: user.phone_number,
                property_pnu: primaryUnit?.pnu || null,
                property_address_jibun: primaryUnit?.property_address_jibun || user.property_address || null,
                property_dong: primaryUnit?.dong || null,
                property_ho: primaryUnit?.ho || null,
                resident_address: user.resident_address,
                created_at: user.created_at,
            };
        });

        // 클라이언트에서 매칭 필터 적용
        let filteredData = mappedData;
        if (matchFilter === 'matched') {
            filteredData = mappedData.filter((d) => d.property_pnu !== null);
        } else if (matchFilter === 'unmatched') {
            filteredData = mappedData.filter((d) => d.property_pnu === null);
        }

        // 지번 기준 정렬
        filteredData.sort((a, b) => {
            const aAddr = a.property_address_jibun || '';
            const bAddr = b.property_address_jibun || '';
            return aAddr.localeCompare(bAddr, 'ko');
        });

        const totalCount = filteredData.length;

        // 페이지네이션 적용
        const paginatedData = filteredData.slice(offset, offset + limit);
        const hasMore = offset + paginatedData.length < totalCount;

        return { success: true, data: paginatedData, totalCount, hasMore };
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
 * 비매칭 조합원의 소유지 정보를 수정하고 GIS 재매칭을 시도합니다.
 * 엑셀 업로드와 동일한 매칭 로직을 사용하며, 매칭 실패 시에도 주소 정보는 저장됩니다.
 */
export async function updateUnmatchedMember(
    userId: string,
    unionId: string,
    propertyAddress: string,
    dong?: string,
    ho?: string
): Promise<{ success: boolean; matched: boolean; pnu?: string; error?: string }> {
    try {
        // 동호수 정규화 적용
        const normalizedDong = normalizeDong(dong);
        const normalizedHo = normalizeHo(ho);

        // GIS 매칭 시도 (엑셀 업로드와 동일한 로직)
        const matchResult = await matchAddressToPnu(unionId, propertyAddress);
        const pnu = matchResult.pnu;

        // PNU가 매칭된 경우 중복 체크
        if (pnu) {
            const duplicateCheck = await checkDuplicatePnu(unionId, pnu, normalizedDong, normalizedHo, userId);
            if (duplicateCheck.isDuplicate) {
                return {
                    success: false,
                    matched: false,
                    error: `이미 다른 사용자(${duplicateCheck.existingUser?.name})에게 할당된 소유지입니다.`,
                };
            }
        }

        // users.property_address 업데이트
        const { error: userError } = await supabase
            .from('users')
            .update({
                property_address: propertyAddress,
            })
            .eq('id', userId);

        if (userError) {
            return { success: false, matched: false, error: userError.message };
        }

        // user_property_units에서 기존 대표 물건지 확인
        const { data: existingUnit } = await supabase
            .from('user_property_units')
            .select('id')
            .eq('user_id', userId)
            .eq('is_primary', true)
            .single();

        if (existingUnit) {
            // 기존 대표 물건지 업데이트
            const { error: updateError } = await supabase
                .from('user_property_units')
                .update({
                    pnu: pnu, // 매칭 실패 시 null
                    property_address_jibun: propertyAddress,
                    dong: normalizedDong,
                    ho: normalizedHo,
                })
                .eq('id', existingUnit.id);

            if (updateError) {
                return { success: false, matched: false, error: updateError.message };
            }
        } else {
            // 새 대표 물건지 생성
            const { error: insertError } = await supabase.from('user_property_units').insert({
                user_id: userId,
                pnu: pnu, // 매칭 실패 시 null
                property_address_jibun: propertyAddress,
                dong: normalizedDong,
                ho: normalizedHo,
                is_primary: true,
            });

            if (insertError) {
                return { success: false, matched: false, error: insertError.message };
            }
        }

        return {
            success: true,
            matched: !!pnu,
            pnu: pnu ?? undefined
        };
    } catch (error) {
        return { success: false, matched: false, error: String(error) };
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