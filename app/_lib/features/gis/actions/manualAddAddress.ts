'use server';

import { createClient } from '@/app/_lib/shared/supabase/server';
import { SignJWT } from 'jose';

// ============================================================
// 타입 정의
// ============================================================

/**
 * 주소 검색 결과
 */
export interface AddressSearchResult {
    success: boolean;
    data?: {
        address: string;
        pnu: string;
    } | null;
    message?: string;
    error?: string;
}

/**
 * 주소 추가 결과
 */
export interface AddressAddResult {
    success: boolean;
    data?: {
        pnu: string;
        address: string;
        area: number | null;
        officialPrice: number | null;
        ownerCount: number;
        hasBoundary: boolean;
    };
    error?: string;
}

// 프록시 서버 URL
const PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

// ============================================================
// JWT 토큰 생성 (프록시 서버 인증용)
// ============================================================

async function generateProxyToken(unionId: string, userId: string): Promise<string> {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error('JWT_SECRET is not configured.');
    }

    const secret = new TextEncoder().encode(jwtSecret);

    return await new SignJWT({ unionId, userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(secret);
}

// ============================================================
// 주소 검색 함수
// ============================================================

/**
 * 주소 검색 (PNU만 반환)
 *
 * @param address - 검색할 주소
 * @param source - 데이터 소스 ('vworld' | 'data_portal')
 * @returns 검색 결과 (address, pnu)
 */
export async function searchAddress(
    address: string,
    source: 'vworld' | 'data_portal' = 'vworld'
): Promise<AddressSearchResult> {
    if (!address || address.trim() === '') {
        return { success: false, error: '주소를 입력해주세요.' };
    }

    // 인증 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' };
    }

    console.log(`[Manual Search] Searching address: "${address}" via ${source}`);

    try {
        // JWT 토큰 생성
        const token = await generateProxyToken('system', user.id);

        // 프록시 서버 호출
        const response = await fetch(`${PROXY_URL}/api/gis/search-address`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                address: address.trim(),
                source,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`[Manual Search] API error: ${result.error}`);
            return {
                success: false,
                error: result.error || `API 오류: ${response.status}`,
            };
        }

        if (result.success && result.data) {
            console.log(`[Manual Search] Found: ${result.data.pnu}`);
            return {
                success: true,
                data: result.data,
            };
        }

        return {
            success: false,
            data: null,
            message: result.message || '검색 결과가 없습니다.',
        };
    } catch (error) {
        console.error('[Manual Search] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.',
        };
    }
}

// ============================================================
// 주소 추가 함수
// ============================================================

/**
 * 주소 추가 (전체 데이터 조회 후 DB 저장)
 *
 * @param unionId - 조합 ID
 * @param address - 주소
 * @param pnu - 필지고유번호
 * @returns 저장된 데이터 정보
 */
export async function addAddressToUnion(unionId: string, address: string, pnu: string): Promise<AddressAddResult> {
    if (!unionId || !address || !pnu) {
        return { success: false, error: '필수 정보가 누락되었습니다.' };
    }

    // 인증 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' };
    }

    console.log(`[Manual Add] Adding address: unionId=${unionId}, pnu=${pnu}`);

    try {
        // JWT 토큰 생성
        const token = await generateProxyToken(unionId, user.id);

        // 프록시 서버 호출
        const response = await fetch(`${PROXY_URL}/api/gis/add-address`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                unionId,
                address: address.trim(),
                pnu,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`[Manual Add] API error: ${result.error}`);
            return {
                success: false,
                error: result.error || `API 오류: ${response.status}`,
            };
        }

        if (result.success && result.data) {
            console.log(
                `[Manual Add] Success: PNU=${pnu}, price=${result.data.officialPrice}, owners=${result.data.ownerCount}`
            );
            return {
                success: true,
                data: result.data,
            };
        }

        return {
            success: false,
            error: result.error || '주소 추가에 실패했습니다.',
        };
    } catch (error) {
        console.error('[Manual Add] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '주소 추가 중 오류가 발생했습니다.',
        };
    }
}
