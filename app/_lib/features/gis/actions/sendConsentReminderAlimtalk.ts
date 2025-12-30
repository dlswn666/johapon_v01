'use server';

import { createClient } from '@supabase/supabase-js';

/**
 * 동의 촉구 알림톡 발송 대상 타입
 */
export type AlimtalkTargetType = 'NON_AGREED' | 'NON_REGISTERED';

/**
 * 알림톡 템플릿 코드 매핑
 * - NON_AGREED: 동의 독려 알림톡 (UE_5005) - 승인 대기 중
 * - NON_REGISTERED: 조합원 본인 확인 안내 (UE_1876) - 승인됨
 */
const TEMPLATE_CODES: Record<AlimtalkTargetType, string> = {
    NON_AGREED: 'UE_5005', // 동의 독려 알림톡
    NON_REGISTERED: 'UE_1876', // 조합원 본인 확인 안내
};

/**
 * 알림톡 발송 요청 파라미터
 */
interface SendConsentReminderParams {
    unionId: string;
    targetType: AlimtalkTargetType;
    ownerIds: string[];
    stageId?: string; // NON_AGREED일 때 동의 단계 ID
    message?: string; // 커스텀 메시지 (선택)
}

/**
 * 알림톡 발송 결과
 */
interface SendConsentReminderResult {
    success: boolean;
    message: string;
    sentCount?: number;
    failedCount?: number;
    templateCode?: string;
}

/**
 * Supabase 클라이언트 생성 (서버 사이드)
 */
function getSupabaseClient() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * 동의/가입 촉구 알림톡 발송 함수
 *
 * @param params 발송 파라미터
 * @returns 발송 결과
 */
export async function sendConsentReminderAlimtalk(
    params: SendConsentReminderParams
): Promise<SendConsentReminderResult> {
    const { unionId, targetType, ownerIds, stageId } = params;

    // 유효성 검사
    if (!unionId) {
        return { success: false, message: '조합 ID가 필요합니다.' };
    }

    if (!ownerIds || ownerIds.length === 0) {
        return { success: false, message: '발송 대상이 없습니다.' };
    }

    const templateCode = TEMPLATE_CODES[targetType];
    const supabase = getSupabaseClient();

    try {
        // 1. 조합 정보 조회
        const { data: union, error: unionError } = await supabase
            .from('unions')
            .select('id, name, phone, business_hours, slug')
            .eq('id', unionId)
            .single();

        if (unionError || !union) {
            return { success: false, message: '조합 정보를 찾을 수 없습니다.' };
        }

        // 2. 동의 단계 정보 조회 (NON_AGREED인 경우)
        let stageName = '';
        if (targetType === 'NON_AGREED' && stageId) {
            const { data: stage } = await supabase
                .from('consent_stages')
                .select('stage_name')
                .eq('id', stageId)
                .single();
            stageName = stage?.stage_name || '';
        }

        // 3. 소유주 정보 조회 (연락처 포함)
        type OwnerWithUnit = {
            id: string;
            name: string;
            phone: string | null;
            unit_id: string;
            building_units:
                | {
                      pnu: string;
                      land_lots: { address: string } | { address: string }[] | null;
                  }
                | {
                      pnu: string;
                      land_lots: { address: string } | { address: string }[] | null;
                  }[]
                | null;
        };

        const { data: owners, error: ownersError } = await supabase
            .from('owners')
            .select(
                `
                id,
                name,
                phone,
                unit_id,
                building_units (
                    pnu,
                    land_lots (
                        address
                    )
                )
            `
            )
            .in('id', ownerIds);

        if (ownersError || !owners || owners.length === 0) {
            return { success: false, message: '소유주 정보를 찾을 수 없습니다.' };
        }

        const typedOwners = owners as OwnerWithUnit[];

        // 4. 발송 대상 필터링 (연락처가 있는 소유주만)
        const validRecipients = typedOwners.filter((o) => o.phone && o.phone.length >= 10);

        if (validRecipients.length === 0) {
            return {
                success: false,
                message: '유효한 연락처가 있는 대상이 없습니다.',
                templateCode,
            };
        }

        // 5. 알림톡 발송 데이터 구성
        const recipients = validRecipients.map((owner) => {
            const buildingUnit = Array.isArray(owner.building_units) ? owner.building_units[0] : owner.building_units;
            const landLot = buildingUnit?.land_lots;
            const address = Array.isArray(landLot)
                ? landLot[0]?.address
                : (landLot as { address: string } | null)?.address;

            if (targetType === 'NON_AGREED') {
                // UE_5005 동의 독려 알림톡 변수
                return {
                    phone: owner.phone,
                    variables: {
                        소유주명: owner.name || '소유주',
                        조합명: union.name,
                        동의단계명: stageName,
                        물건지주소: address || '(주소 정보 없음)',
                        조합전화번호: union.phone || '(연락처 정보 없음)',
                        운영시간: union.business_hours || '09:00~18:00',
                    },
                };
            } else {
                // UE_1876 조합원 본인 확인 안내 변수
                // 이 경우 member_invites를 생성하고 토큰을 발급해야 함
                return {
                    phone: owner.phone,
                    variables: {
                        조합명: union.name,
                        이름: owner.name || '소유주',
                        도메인: `johapon.co.kr/${union.slug}`,
                        // 초대토큰과 만료시간은 별도 처리 필요
                        초대토큰: 'PLACEHOLDER', // TODO: 실제 초대 토큰 생성
                        만료시간: '24시간',
                    },
                };
            }
        });

        // 6. 프록시 서버 API 호출 (실제 발송)
        // TODO: 프록시 서버 엔드포인트 구현 후 연동
        console.log('[알림톡 발송] 발송 준비 완료:', {
            templateCode,
            unionId,
            targetType,
            recipientCount: recipients.length,
            recipients: recipients.map((r) => ({
                phone: r.phone?.substring(0, 7) + '****',
                variables: r.variables,
            })),
        });

        // 현재는 스텁 응답 반환 (프록시 서버 연동 시 실제 발송)
        return {
            success: true,
            message: `알림톡 발송 준비 완료 (템플릿: ${templateCode}, 대상: ${recipients.length}명)`,
            sentCount: recipients.length,
            failedCount: validRecipients.length - recipients.length,
            templateCode,
        };
    } catch (error) {
        console.error('[알림톡 발송] 오류:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '알림톡 발송 중 오류가 발생했습니다.',
            templateCode,
        };
    }
}

/**
 * 필지별 미동의/미가입 소유주 목록 조회
 *
 * @param params 조회 파라미터
 */
export async function getNonConsentOwners(params: {
    unionId: string;
    pnus: string[];
    targetType: AlimtalkTargetType;
    stageId?: string;
}): Promise<{
    success: boolean;
    owners: Array<{
        id: string;
        name: string;
        phone: string | null;
        pnu: string;
        address: string | null;
    }>;
    message?: string;
}> {
    const { unionId, pnus, targetType, stageId } = params;
    const supabase = getSupabaseClient();

    try {
        if (targetType === 'NON_AGREED') {
            // 미동의 소유주 조회
            if (!stageId) {
                return { success: false, owners: [], message: '동의 단계 ID가 필요합니다.' };
            }

            // 해당 PNU의 건물 호수 및 소유주 조회
            const { data: units, error: unitsError } = await supabase
                .from('building_units')
                .select(
                    `
                    id,
                    pnu,
                    land_lots (address),
                    owners (
                        id,
                        name,
                        phone,
                        owner_consents (
                            status,
                            stage_id
                        )
                    )
                `
                )
                .in('pnu', pnus);

            if (unitsError) {
                return { success: false, owners: [], message: '데이터 조회 오류' };
            }

            // 미동의 소유주 필터링
            const nonAgreedOwners: Array<{
                id: string;
                name: string;
                phone: string | null;
                pnu: string;
                address: string | null;
            }> = [];

            units?.forEach((unit) => {
                const landLot = Array.isArray(unit.land_lots) ? unit.land_lots[0] : unit.land_lots;
                const address = landLot?.address || null;

                const owners = Array.isArray(unit.owners) ? unit.owners : [unit.owners].filter(Boolean);
                owners.forEach(
                    (owner: {
                        id: string;
                        name: string;
                        phone: string | null;
                        owner_consents:
                            | Array<{ status: string; stage_id: string }>
                            | { status: string; stage_id: string }
                            | null;
                    }) => {
                        if (!owner) return;

                        const consents = Array.isArray(owner.owner_consents)
                            ? owner.owner_consents
                            : [owner.owner_consents].filter(Boolean);

                        const hasAgreed = consents.some((c) => c && c.stage_id === stageId && c.status === 'AGREED');

                        if (!hasAgreed) {
                            nonAgreedOwners.push({
                                id: owner.id,
                                name: owner.name,
                                phone: owner.phone,
                                pnu: unit.pnu,
                                address,
                            });
                        }
                    }
                );
            });

            return { success: true, owners: nonAgreedOwners };
        } else {
            // 미가입 소유주 조회 (users 테이블에 없는 소유주)
            const { data: units, error: unitsError } = await supabase
                .from('building_units')
                .select(
                    `
                    id,
                    pnu,
                    land_lots (address),
                    owners (
                        id,
                        name,
                        phone
                    )
                `
                )
                .in('pnu', pnus);

            if (unitsError) {
                return { success: false, owners: [], message: '데이터 조회 오류' };
            }

            // 해당 조합의 가입된 사용자 PNU 목록 조회
            const { data: users } = await supabase
                .from('users')
                .select('property_pnu')
                .eq('union_id', unionId)
                .eq('user_status', 'APPROVED');

            const registeredPnus = new Set(users?.map((u) => u.property_pnu) || []);

            // 미가입 소유주 필터링
            const nonRegisteredOwners: Array<{
                id: string;
                name: string;
                phone: string | null;
                pnu: string;
                address: string | null;
            }> = [];

            units?.forEach((unit) => {
                // 해당 PNU에 가입된 사용자가 없는 경우
                if (!registeredPnus.has(unit.pnu)) {
                    const landLot = Array.isArray(unit.land_lots) ? unit.land_lots[0] : unit.land_lots;
                    const address = landLot?.address || null;

                    const owners = Array.isArray(unit.owners) ? unit.owners : [unit.owners].filter(Boolean);
                    owners.forEach((owner: { id: string; name: string; phone: string | null }) => {
                        if (!owner) return;
                        nonRegisteredOwners.push({
                            id: owner.id,
                            name: owner.name,
                            phone: owner.phone,
                            pnu: unit.pnu,
                            address,
                        });
                    });
                }
            });

            return { success: true, owners: nonRegisteredOwners };
        }
    } catch (error) {
        console.error('[미동의/미가입 소유주 조회] 오류:', error);
        return {
            success: false,
            owners: [],
            message: error instanceof Error ? error.message : '조회 중 오류가 발생했습니다.',
        };
    }
}

/**
 * 다중 필지 선택 후 알림톡 발송 처리
 *
 * @param params 발송 파라미터
 */
export async function sendBulkReminderAlimtalk(params: {
    unionId: string;
    pnus: string[];
    targetType: AlimtalkTargetType;
    stageId?: string;
}): Promise<SendConsentReminderResult> {
    const { unionId, pnus, targetType, stageId } = params;

    // 1. 선택된 필지들의 미동의/미가입 소유주 조회
    const ownersResult = await getNonConsentOwners({
        unionId,
        pnus,
        targetType,
        stageId,
    });

    if (!ownersResult.success) {
        return {
            success: false,
            message: ownersResult.message || '소유주 조회 실패',
        };
    }

    if (ownersResult.owners.length === 0) {
        return {
            success: false,
            message: '발송 대상이 없습니다.',
        };
    }

    // 2. 알림톡 발송
    const ownerIds = ownersResult.owners.map((o) => o.id);
    return await sendConsentReminderAlimtalk({
        unionId,
        targetType,
        ownerIds,
        stageId,
    });
}

/**
 * 템플릿 정보 조회 (UI에서 템플릿 내용 미리보기용)
 */
export async function getAlimtalkTemplate(templateCode: string): Promise<{
    success: boolean;
    template?: {
        code: string;
        name: string;
        content: string;
        buttons: Array<{ name: string; linkMo: string }>;
        status: string;
        inspStatus: string;
    };
    message?: string;
}> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from('alimtalk_templates')
            .select('template_code, template_name, template_content, buttons, status, insp_status')
            .eq('template_code', templateCode)
            .single();

        if (error || !data) {
            return { success: false, message: '템플릿을 찾을 수 없습니다.' };
        }

        return {
            success: true,
            template: {
                code: data.template_code,
                name: data.template_name,
                content: data.template_content,
                buttons: data.buttons || [],
                status: data.status,
                inspStatus: data.insp_status,
            },
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : '템플릿 조회 오류',
        };
    }
}
