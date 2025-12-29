'use server';

import { createClient } from '@/app/_lib/shared/supabase/server';
import { SignJWT } from 'jose';

// ============================================================
// 타입 정의
// ============================================================

/**
 * GIS 동기화 요청 파라미터
 */
export interface GisSyncParams {
    unionId: string;
    addresses: string[];
}

/**
 * GIS 동기화 결과
 */
export interface GisSyncResult {
    success: boolean;
    message?: string;
    error?: string;
    jobId?: string;
    totalCount?: number;
    status?: string;
}

/**
 * GIS 작업 상태 결과
 */
export interface GisJobStatusResult {
    success: boolean;
    error?: string;
    jobId?: string;
    status?: string;
    totalCount?: number;
    processedCount?: number;
}

// 프록시 서버 URL (알림톡과 동일)
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
        throw new Error('JWT_SECRET is not configured.');
    }

    const secret = new TextEncoder().encode(jwtSecret);

    return await new SignJWT({ unionId, userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('10m') // GIS 수집은 시간이 오래 걸릴 수 있으므로 10분
        .sign(secret);
}

// ============================================================
// GIS 동기화 함수
// ============================================================

/**
 * GIS 데이터 동기화 시작
 *
 * @param params - unionId와 addresses 배열
 * @returns 작업 ID와 상태 정보
 */
export async function startGisSync(params: GisSyncParams): Promise<GisSyncResult> {
    const { unionId, addresses } = params;

    // 필수 파라미터 검증
    if (!unionId || !addresses || addresses.length === 0) {
        return { success: false, error: 'Required parameters are missing.' };
    }

    // 인증 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'User is not authenticated.' };
    }

    console.log(`[GIS Sync] Starting sync for unionId=${unionId}, addresses=${addresses.length}`);

    try {
        // JWT 토큰 생성
        const token = await generateProxyToken(unionId, user.id);

        // 프록시 서버 호출
        const response = await fetch(`${PROXY_URL}/api/gis/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                unionId,
                addresses,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`[GIS Sync] API error: ${result.error}`);
            return {
                success: false,
                error: result.error || `API error: ${response.status}`,
            };
        }

        console.log(`[GIS Sync] Job created: jobId=${result.jobId}`);

        return {
            success: true,
            message: 'GIS sync job has been started.',
            jobId: result.jobId,
            totalCount: result.totalCount,
            status: result.status,
        };
    } catch (error) {
        console.error('[GIS Sync] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start GIS sync.',
        };
    }
}

// ============================================================
// GIS 작업 상태 조회 함수
// ============================================================

/**
 * GIS 작업 상태 조회
 *
 * @param jobId - 작업 ID
 * @returns 작업 상태 정보
 */
export async function getGisJobStatus(jobId: string): Promise<GisJobStatusResult> {
    if (!jobId) {
        return { success: false, error: 'jobId is required.' };
    }

    // 인증 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'User is not authenticated.' };
    }

    try {
        // JWT 토큰 생성
        const token = await generateProxyToken('system', user.id);

        // 프록시 서버 호출
        const response = await fetch(`${PROXY_URL}/api/gis/status/${jobId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: result.error || `API error: ${response.status}`,
            };
        }

        return {
            success: true,
            jobId: result.jobId,
            status: result.status,
            totalCount: result.totalCount,
            processedCount: result.processedCount,
        };
    } catch (error) {
        console.error('[GIS Status] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get job status.',
        };
    }
}

