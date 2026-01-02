import { NextRequest, NextResponse } from 'next/server';

const PROXY_SERVER_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

/**
 * 조합원 초대 비동기 동기화 API
 * 프록시 서버의 큐를 통해 대량 데이터를 비동기로 처리
 * 
 * POST /api/member-invite/sync-async
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId, createdBy, expiresHours = 8760, members } = body;

        // 필수 파라미터 검증
        if (!unionId || !createdBy || !members || !Array.isArray(members)) {
            return NextResponse.json({ 
                success: false,
                error: '필수 파라미터가 누락되었습니다.' 
            }, { status: 400 });
        }

        if (members.length === 0) {
            return NextResponse.json({ 
                success: false,
                error: '멤버 목록이 비어있습니다.' 
            }, { status: 400 });
        }

        console.log(`[Member Sync Async] Starting async sync for union: ${unionId}, members: ${members.length}`);

        // 프록시 서버로 비동기 작업 요청
        const response = await fetch(`${PROXY_SERVER_URL}/api/member/invite-sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                unionId,
                createdBy,
                expiresHours,
                members,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Member Sync Async] Proxy server error:', errorData);
            return NextResponse.json({ 
                success: false,
                error: errorData.error || '프록시 서버 오류가 발생했습니다.' 
            }, { status: response.status });
        }

        const result = await response.json();

        console.log(`[Member Sync Async] Job created: ${result.jobId}`);

        return NextResponse.json({
            success: true,
            jobId: result.jobId,
            jobType: result.jobType,
            status: result.status,
            totalCount: result.totalCount,
            message: '비동기 처리가 시작되었습니다. 진행 상태를 확인하세요.',
        });

    } catch (error) {
        console.error('[Member Sync Async] API error:', error);
        return NextResponse.json({ 
            success: false,
            error: '비동기 동기화 요청 중 오류가 발생했습니다.' 
        }, { status: 500 });
    }
}
