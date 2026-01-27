import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/app/_lib/shared/api/auth';

const PROXY_SERVER_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

/**
 * 소유지 동기화 API
 * GIS 데이터(land_lots, buildings, building_units)와 조합원 데이터(users)를 매칭하여
 * user_property_units 테이블에 연결 레코드를 생성합니다.
 *
 * POST /api/member-invite/sync-properties
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId } = body;

        // ========== SECURITY: 인증 검사 ==========
        const auth = await authenticateApiRequest({
            requireAdmin: true,
            requireUnionId: true,
            unionId: unionId,
        });

        if (!auth.authenticated) {
            return auth.response;
        }

        console.log(`[Sync Properties] User ${auth.user.id} (${auth.user.name}) syncing properties`);
        // ==========================================

        // 필수 파라미터 검증
        if (!unionId) {
            return NextResponse.json({
                success: false,
                error: 'unionId가 필요합니다.'
            }, { status: 400 });
        }

        console.log(`[Sync Properties] Starting sync for union: ${unionId}`);

        // 프록시 서버로 동기화 요청
        const response = await fetch(`${PROXY_SERVER_URL}/api/member/sync-properties`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ unionId }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Sync Properties] Proxy server error:', errorData);
            return NextResponse.json({ 
                success: false,
                error: errorData.error || '프록시 서버 오류가 발생했습니다.' 
            }, { status: response.status });
        }

        const result = await response.json();

        console.log(`[Sync Properties] Job created: ${result.jobId}`);

        return NextResponse.json({
            success: true,
            jobId: result.jobId,
            jobType: result.jobType,
            status: result.status,
            totalCount: result.totalCount,
            message: 'GIS 동기화가 시작되었습니다. 진행 상태를 확인하세요.',
        });

    } catch (error) {
        console.error('[Sync Properties] API error:', error);
        return NextResponse.json({ 
            success: false,
            error: 'GIS 동기화 요청 중 오류가 발생했습니다.' 
        }, { status: 500 });
    }
}
