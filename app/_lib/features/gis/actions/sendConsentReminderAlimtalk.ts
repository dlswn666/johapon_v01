'use server';

/**
 * 동의 촉구 알림톡 발송 대상 타입
 */
export type AlimtalkTargetType = 'NON_AGREED' | 'NON_REGISTERED';

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
}

/**
 * 동의/가입 촉구 알림톡 발송 함수 (스텁)
 *
 * 실제 알림톡 템플릿이 준비되면 이 함수에서 프록시 서버 API를 호출합니다.
 *
 * @param params 발송 파라미터
 * @returns 발송 결과
 */
export async function sendConsentReminderAlimtalk(
    params: SendConsentReminderParams
): Promise<SendConsentReminderResult> {
    const { unionId, targetType, ownerIds, stageId, message } = params;

    // 유효성 검사
    if (!unionId) {
        return { success: false, message: '조합 ID가 필요합니다.' };
    }

    if (!ownerIds || ownerIds.length === 0) {
        return { success: false, message: '발송 대상이 없습니다.' };
    }

    // TODO: 실제 알림톡 템플릿 연동 시 구현
    // 1. 소유주 ID로 연락처 정보 조회
    // 2. 템플릿 코드 결정 (targetType에 따라)
    //    - NON_AGREED: 동의 촉구 템플릿
    //    - NON_REGISTERED: 가입 촉구 템플릿
    // 3. 프록시 서버 API 호출하여 알림톡 발송

    console.log('[알림톡 발송 스텁] 발송 요청:', {
        unionId,
        targetType,
        ownerIds,
        stageId,
        message,
        targetCount: ownerIds.length,
    });

    // 스텁 응답
    return {
        success: true,
        message: `알림톡 발송 기능이 준비 중입니다. (대상: ${ownerIds.length}명)`,
        sentCount: 0,
        failedCount: 0,
    };
}

/**
 * 필지별 미동의/미가입 소유주 목록 조회
 *
 * @param unionId 조합 ID
 * @param pnus 필지 PNU 목록
 * @param targetType 조회 대상 타입
 * @param stageId 동의 단계 ID (NON_AGREED일 때 필요)
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

    // TODO: 실제 DB 조회 구현
    // 1. pnus에 해당하는 building_units 조회
    // 2. owners 조인
    // 3. targetType에 따라 필터링:
    //    - NON_AGREED: owner_consents에서 해당 stage_id에 AGREED가 아닌 소유주
    //    - NON_REGISTERED: users 테이블에 없는 소유주

    console.log('[미동의/미가입 소유주 조회] 요청:', {
        unionId,
        pnus,
        targetType,
        stageId,
    });

    // 스텁 응답
    return {
        success: true,
        owners: [],
        message: '소유주 조회 기능이 준비 중입니다.',
    };
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
