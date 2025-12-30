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

/**
 * 수동 입력 데이터 타입
 */
export interface ManualInputData {
    unionId: string;
    address: string;
    pnu: string;
    area?: number;
    officialPrice?: number;
    ownerCount?: number;
    boundary?: string; // GeoJSON 또는 WKT 문자열
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
 * 주소 검색 (법정동코드 + 지번으로 PNU 생성)
 *
 * @param address - 검색할 주소 (예: 서울시 강북구 미아동 123-45)
 * @returns 검색 결과 (address, pnu)
 */
export async function searchAddress(address: string): Promise<AddressSearchResult> {
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

    console.log(`[Manual Search] Searching address: "${address}"`);

    try {
        // JWT 토큰 생성
        const token = await generateProxyToken('system', user.id);

        // 프록시 서버 호출 (법정동코드 기반 PNU 생성)
        const response = await fetch(`${PROXY_URL}/api/gis/search-address`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                address: address.trim(),
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
 * 수동 입력 (API 조회 없이 직접 데이터 저장)
 *
 * @param data - 수동 입력 데이터
 * @returns 저장된 데이터 정보
 */
export async function manualAddAddress(data: ManualInputData): Promise<AddressAddResult> {
    const { unionId, address, pnu, area, officialPrice, ownerCount, boundary } = data;

    if (!unionId || !address || !pnu) {
        return { success: false, error: '필수 정보가 누락되었습니다. (조합ID, 주소, PNU)' };
    }

    if (pnu.length !== 19 || !/^\d+$/.test(pnu)) {
        return { success: false, error: 'PNU는 19자리 숫자여야 합니다.' };
    }

    // 인증 확인
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' };
    }

    console.log(`[Manual Input] Adding: unionId=${unionId}, pnu=${pnu}`);

    try {
        // JWT 토큰 생성
        const token = await generateProxyToken(unionId, user.id);

        // 프록시 서버 호출 (수동 입력 API)
        const response = await fetch(`${PROXY_URL}/api/gis/manual-add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                unionId,
                address: address.trim(),
                pnu,
                area: area !== undefined ? Number(area) : undefined,
                officialPrice: officialPrice !== undefined ? Number(officialPrice) : undefined,
                ownerCount: ownerCount !== undefined ? Number(ownerCount) : undefined,
                boundary: boundary || undefined,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`[Manual Input] API error: ${result.error}`);
            return {
                success: false,
                error: result.error || `API 오류: ${response.status}`,
            };
        }

        if (result.success && result.data) {
            console.log(`[Manual Input] Success: PNU=${pnu}`);
            return {
                success: true,
                data: result.data,
            };
        }

        return {
            success: false,
            error: result.error || '수동 입력에 실패했습니다.',
        };
    } catch (error) {
        console.error('[Manual Input] Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '수동 입력 중 오류가 발생했습니다.',
        };
    }
}

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
