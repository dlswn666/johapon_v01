import { NextRequest, NextResponse } from 'next/server';

const PROXY_SERVER_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

/**
 * 조합원 처리 작업 상태 조회 API
 * 
 * GET /api/member-invite/job/:jobId
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json({ 
                success: false,
                error: 'jobId가 필요합니다.' 
            }, { status: 400 });
        }

        // 먼저 인메모리 상태 조회 시도
        let response = await fetch(`${PROXY_SERVER_URL}/api/member/job/${jobId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // 인메모리에서 찾지 못하면 DB에서 조회
        if (response.status === 404) {
            response = await fetch(`${PROXY_SERVER_URL}/api/member/job/${jobId}/db`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({ 
                success: false,
                error: errorData.error || '작업 상태 조회에 실패했습니다.' 
            }, { status: response.status });
        }

        const result = await response.json();

        return NextResponse.json(result);

    } catch (error) {
        console.error('[Member Job Status] API error:', error);
        return NextResponse.json({ 
            success: false,
            error: '작업 상태 조회 중 오류가 발생했습니다.' 
        }, { status: 500 });
    }
}
