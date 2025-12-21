'use server';

import { createClient } from '@/app/_lib/shared/supabase/server';
import { SignJWT } from 'jose';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 알림톡 발송 요청 파라미터
 * 클라이언트에서는 templateCode와 수신자 정보만 전달
 * 템플릿 내용, 버튼 등은 프록시 서버에서 DB 조회하여 구성
 */
export interface SendAlimTalkParams {
    unionId: string;
    templateCode: string;
    recipients: {
        phoneNumber: string;
        name: string;
        variables?: Record<string, string>;
    }[];
    noticeId?: number; // 공지사항용 (선택)
}

/**
 * 알림톡 발송 결과
 */
export interface AlimTalkResult {
    success: boolean;
    message?: string;
    error?: string;
    jobId?: string; // 비동기 처리 시 작업 ID
    sentCount?: number;
    failCount?: number;
    kakaoCount?: number;
    smsCount?: number;
    estimatedCost?: number;
    channelName?: string;
}

// 알림톡 프록시 서버 URL
const PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

// ============================================================
// JWT 토큰 생성 (프록시 서버 인증용)
// ============================================================

/**
 * 프록시 서버 인증을 위한 JWT 토큰 생성
 * @param unionId 조합 ID
 * @param userId 사용자 ID
 * @returns JWT 토큰 문자열
 */
async function generateProxyToken(unionId: string, userId: string): Promise<string> {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
    }

    const secret = new TextEncoder().encode(jwtSecret);

    return await new SignJWT({ unionId, userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m') // 5분 후 만료
        .sign(secret);
}

// ============================================================
// 통합 알림톡 발송 함수
// ============================================================

/**
 * 알림톡 발송 (통합 함수)
 *
 * 클라이언트에서는 templateCode와 수신자 정보(변수 포함)만 전달하면 됩니다.
 * 템플릿 내용, 버튼, 강조표기, 대체발송 등은 프록시 서버에서 DB를 조회하여 자동 구성합니다.
 *
 * @example
 * // 조합원 초대 발송
 * await sendAlimTalk({
 *     unionId: 'union-id',
 *     templateCode: 'UE_1876',
 *     recipients: [{
 *         phoneNumber: '01012345678',
 *         name: '홍길동',
 *         variables: {
 *             조합명: '테스트조합',
 *             이름: '홍길동',
 *             만료시간: '2024.12.31 23:59',
 *             도메인: 'johapon.kr',
 *             초대토큰: 'abc123...',
 *         },
 *     }],
 * });
 */
export async function sendAlimTalk(params: SendAlimTalkParams): Promise<AlimTalkResult> {
    const { unionId, templateCode, recipients, noticeId } = params;

    // 필수 파라미터 검증
    if (!unionId || !templateCode || !recipients || recipients.length === 0) {
        return { success: false, error: '필수 파라미터가 누락되었습니다.' };
    }

    // 인증 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '인증되지 않은 사용자입니다.' };
    }

    console.log(`[알림톡 발송] 템플릿=${templateCode}, 수신자=${recipients.length}명`);

    try {
        // JWT 토큰 생성
        const token = await generateProxyToken(unionId, user.id);

        // 프록시 서버 호출
        const response = await fetch(`${PROXY_URL}/api/alimtalk/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                unionId,
                senderId: user.id,
                templateCode,
                recipients,
                noticeId,
            }),
        });

        const result = await response.json();

        // 비동기 처리 응답 (202 Accepted)
        if (response.status === 202 && result.data?.jobId) {
            console.log(`[알림톡 발송] 작업 등록됨: jobId=${result.data.jobId}`);
            return {
                success: true,
                message: result.data.message || '발송 요청이 접수되었습니다.',
                jobId: result.data.jobId,
                sentCount: result.data.recipientCount,
            };
        }

        // 동기 처리 응답
        if (!response.ok || !result.success) {
            console.error(`[알림톡 발송 실패] ${result.error}`);
            return {
                success: false,
                error: result.error || '프록시 서버 호출 실패',
            };
        }

        console.log(`[알림톡 발송 완료] 성공=${result.data.kakaoSuccessCount}, 실패=${result.data.failCount}`);

        return {
            success: true,
            message: '알림톡이 발송되었습니다.',
            sentCount: (result.data.kakaoSuccessCount || 0) + (result.data.smsSuccessCount || 0),
            failCount: result.data.failCount,
            kakaoCount: result.data.kakaoSuccessCount,
            smsCount: result.data.smsSuccessCount,
            estimatedCost: result.data.estimatedCost,
            channelName: result.data.channelName,
        };
    } catch (error) {
        console.error('[알림톡 발송 오류]', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '알림톡 발송에 실패했습니다.',
        };
    }
}

// ============================================================
// 템플릿 동기화 함수
// ============================================================

export async function syncAlimtalkTemplates(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    data?: {
        totalFromAligo: number;
        inserted: number;
        updated: number;
        deleted: number;
        syncedAt: string;
    };
}> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: '인증되지 않은 사용자입니다.' };
        }

        // 시스템 관리자용 JWT 토큰 생성 (unionId는 'system'으로 설정)
        const token = await generateProxyToken('system', user.id);

        const response = await fetch(`${PROXY_URL}/api/alimtalk/sync-templates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            return {
                success: false,
                error: result.error || '템플릿 동기화 실패',
            };
        }

        return {
            success: true,
            message: '템플릿 동기화가 완료되었습니다.',
            data: result.data,
        };
    } catch (error) {
        console.error('템플릿 동기화 오류:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '템플릿 동기화에 실패했습니다.',
        };
    }
}
