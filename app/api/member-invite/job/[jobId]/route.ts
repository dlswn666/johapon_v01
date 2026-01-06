import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PROXY_SERVER_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3100';

// Supabase 서비스 클라이언트 (직접 DB 조회용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Supabase에서 직접 작업 상태를 조회하는 폴백 함수
 */
async function getJobStatusFromDB(jobId: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.from('sync_jobs').select('*').eq('id', jobId).single();

    if (error || !data) {
        return null;
    }

    // 프론트엔드가 기대하는 응답 형식으로 변환
    return {
        success: true,
        data: {
            jobId: data.id,
            jobType: data.preview_data?.job_type || 'UNKNOWN',
            status: data.status.toLowerCase(),
            progress: data.progress,
            totalCount: data.preview_data?.totalCount || 0,
            processedCount: data.preview_data?.syncedCount || data.preview_data?.savedCount || 0,
            result: data.preview_data,
            error: data.error_log,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        },
    };
}

/**
 * 조합원 처리 작업 상태 조회 API
 *
 * GET /api/member-invite/job/:jobId
 *
 * 프록시 서버 조회 실패 시 Supabase 직접 조회 폴백 지원
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'jobId가 필요합니다.',
                },
                { status: 400 }
            );
        }

        try {
            // 먼저 인메모리 상태 조회 시도 (프록시 서버)
            let response = await fetch(`${PROXY_SERVER_URL}/api/member/job/${jobId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // 인메모리에서 찾지 못하면 프록시 서버를 통한 DB 조회
            if (response.status === 404) {
                response = await fetch(`${PROXY_SERVER_URL}/api/member/job/${jobId}/db`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }

            if (response.ok) {
                const result = await response.json();
                return NextResponse.json(result);
            }

            // 프록시 서버 응답이 실패하면 직접 DB 조회 시도
            console.warn(`[Member Job Status] Proxy server failed, falling back to direct DB query for job: ${jobId}`);
            const dbResult = await getJobStatusFromDB(jobId);

            if (dbResult) {
                return NextResponse.json(dbResult);
            }

            // DB에서도 찾지 못한 경우
            return NextResponse.json(
                {
                    success: false,
                    error: '작업을 찾을 수 없습니다.',
                },
                { status: 404 }
            );
        } catch (proxyError) {
            // 프록시 서버 연결 실패 (서버 미실행 등) - Supabase 직접 조회 폴백
            console.warn(
                `[Member Job Status] Proxy server unreachable, using direct DB query for job: ${jobId}`,
                proxyError
            );

            const dbResult = await getJobStatusFromDB(jobId);

            if (dbResult) {
                return NextResponse.json(dbResult);
            }

            return NextResponse.json(
                {
                    success: false,
                    error: '작업을 찾을 수 없습니다.',
                },
                { status: 404 }
            );
        }
    } catch (error) {
        console.error('[Member Job Status] API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: '작업 상태 조회 중 오류가 발생했습니다.',
            },
            { status: 500 }
        );
    }
}
