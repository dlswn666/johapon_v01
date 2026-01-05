import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// 대량 처리 기준 (이 이상이면 비동기 처리)
const ASYNC_THRESHOLD = 50;

// 알림톡 프록시 서버 URL
const ALIMTALK_PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3005';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId, stageId, memberIds, status } = body;

        // 유효성 검사
        if (!unionId || !stageId || !memberIds || !status) {
            return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }

        if (!Array.isArray(memberIds) || memberIds.length === 0) {
            return NextResponse.json({ error: '처리할 조합원이 없습니다.' }, { status: 400 });
        }

        if (status !== 'AGREED' && status !== 'DISAGREED') {
            return NextResponse.json({ error: '유효하지 않은 동의 상태입니다.' }, { status: 400 });
        }

        // 대량 데이터는 비동기 처리
        if (memberIds.length >= ASYNC_THRESHOLD) {
            // sync_jobs에 작업 생성
            const { data: job, error: jobError } = await supabase
                .from('sync_jobs')
                .insert({
                    union_id: unionId,
                    status: 'PROCESSING',
                    progress: 0,
                    preview_data: {
                        type: 'consent_bulk_update',
                        stageId,
                        memberCount: memberIds.length,
                        status,
                    },
                })
                .select()
                .single();

            if (jobError) {
                console.error('작업 생성 오류:', jobError);
                return NextResponse.json({ error: '작업 생성 실패' }, { status: 500 });
            }

            // 프록시 서버에 비동기 처리 요청
            try {
                await fetch(`${ALIMTALK_PROXY_URL}/api/consent/queue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobId: job.id,
                        unionId,
                        stageId,
                        memberIds,
                        status,
                    }),
                });
            } catch (proxyError) {
                console.error('프록시 서버 요청 오류:', proxyError);
                // 프록시 서버 실패 시 직접 처리로 폴백
                await processConsentUpdate(job.id, stageId, memberIds, status);
            }

            return NextResponse.json({
                jobId: job.id,
                message: '비동기 처리가 시작되었습니다.',
            });
        }

        // 소량 데이터는 동기 처리
        const results = await processConsentUpdateSync(stageId, memberIds, status);

        return NextResponse.json({
            successCount: results.successCount,
            failCount: results.failCount,
        });
    } catch (error) {
        console.error('동의 처리 오류:', error);
        return NextResponse.json({ error: '동의 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

// 동기 처리 함수
async function processConsentUpdateSync(stageId: string, memberIds: string[], status: 'AGREED' | 'DISAGREED') {
    let successCount = 0;
    let failCount = 0;

    for (const memberId of memberIds) {
        try {
            // upsert 처리
            const { error } = await supabase.from('user_consents').upsert(
                {
                    user_id: memberId,
                    stage_id: stageId,
                    status,
                    consent_date: new Date().toISOString().split('T')[0],
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id,stage_id',
                }
            );

            if (error) {
                console.error(`동의 처리 실패 (${memberId}):`, error);
                failCount++;
            } else {
                successCount++;
            }
        } catch (error) {
            console.error(`동의 처리 오류 (${memberId}):`, error);
            failCount++;
        }
    }

    return { successCount, failCount };
}

// 비동기 처리 함수 (폴백용)
async function processConsentUpdate(
    jobId: string,
    stageId: string,
    memberIds: string[],
    status: 'AGREED' | 'DISAGREED'
) {
    let successCount = 0;
    let failCount = 0;
    const total = memberIds.length;

    for (let i = 0; i < memberIds.length; i++) {
        const memberId = memberIds[i];

        try {
            const { error } = await supabase.from('user_consents').upsert(
                {
                    user_id: memberId,
                    stage_id: stageId,
                    status,
                    consent_date: new Date().toISOString().split('T')[0],
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: 'user_id,stage_id',
                }
            );

            if (error) {
                failCount++;
            } else {
                successCount++;
            }
        } catch {
            failCount++;
        }

        // 진행률 업데이트 (10% 단위)
        if ((i + 1) % Math.max(1, Math.floor(total / 10)) === 0 || i === total - 1) {
            const progress = Math.round(((i + 1) / total) * 100);
            await supabase.from('sync_jobs').update({ progress }).eq('id', jobId);
        }
    }

    // 작업 완료 처리
    await supabase
        .from('sync_jobs')
        .update({
            status: 'COMPLETED',
            progress: 100,
            preview_data: {
                successCount,
                failCount,
            },
        })
        .eq('id', jobId);
}
