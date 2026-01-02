import { NextRequest, NextResponse } from 'next/server';

const PROXY_SERVER_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

/**
 * 사전 등록 비동기 처리 API
 * 프록시 서버의 큐를 통해 대량 사전 등록을 비동기로 처리
 * 
 * POST /api/member-invite/pre-register
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId, members } = body;

        // 필수 파라미터 검증
        if (!unionId || !members || !Array.isArray(members)) {
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

        console.log(`[Pre-Register Async] Starting async pre-register for union: ${unionId}, members: ${members.length}`);

        // 프록시 서버로 비동기 작업 요청
        const response = await fetch(`${PROXY_SERVER_URL}/api/member/pre-register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                unionId,
                members,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Pre-Register Async] Proxy server error:', errorData);
            return NextResponse.json({ 
                success: false,
                error: errorData.error || '프록시 서버 오류가 발생했습니다.' 
            }, { status: response.status });
        }

        const result = await response.json();

        console.log(`[Pre-Register Async] Job created: ${result.jobId}`);

        return NextResponse.json({
            success: true,
            jobId: result.jobId,
            jobType: result.jobType,
            status: result.status,
            totalCount: result.totalCount,
            message: '비동기 처리가 시작되었습니다. 진행 상태를 확인하세요.',
        });

    } catch (error) {
        console.error('[Pre-Register Async] API error:', error);
        return NextResponse.json({ 
            success: false,
            error: '비동기 사전 등록 요청 중 오류가 발생했습니다.' 
        }, { status: 500 });
    }
}
