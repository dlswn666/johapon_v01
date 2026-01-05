import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 대량 처리 기준 (이 이상이면 비동기 처리)
const ASYNC_THRESHOLD = 50;

// 알림톡 프록시 서버 URL
const ALIMTALK_PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3005';

interface ConsentUploadRow {
    rowNumber: number;
    name: string;
    address: string;
    buildingName: string;
    dong: string;
    ho: string;
    status: string;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId, stageId, data } = body;

        // 유효성 검사
        if (!unionId || !stageId || !data) {
            return NextResponse.json(
                { error: '필수 파라미터가 누락되었습니다.' },
                { status: 400 }
            );
        }

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json(
                { error: '처리할 데이터가 없습니다.' },
                { status: 400 }
            );
        }

        // 대량 데이터는 비동기 처리
        if (data.length >= ASYNC_THRESHOLD) {
            // sync_jobs에 작업 생성
            const { data: job, error: jobError } = await supabase
                .from('sync_jobs')
                .insert({
                    union_id: unionId,
                    status: 'PROCESSING',
                    progress: 0,
                    preview_data: {
                        type: 'consent_bulk_upload',
                        stageId,
                        rowCount: data.length,
                    },
                })
                .select()
                .single();

            if (jobError) {
                console.error('작업 생성 오류:', jobError);
                return NextResponse.json(
                    { error: '작업 생성 실패' },
                    { status: 500 }
                );
            }

            // 프록시 서버에 비동기 처리 요청
            try {
                await fetch(`${ALIMTALK_PROXY_URL}/api/consent/upload-queue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobId: job.id,
                        unionId,
                        stageId,
                        data,
                    }),
                });
            } catch (proxyError) {
                console.error('프록시 서버 요청 오류:', proxyError);
                // 프록시 서버 실패 시 직접 처리로 폴백
                await processConsentUpload(job.id, unionId, stageId, data);
            }

            return NextResponse.json({
                jobId: job.id,
                message: '비동기 처리가 시작되었습니다.',
            });
        }

        // 소량 데이터는 동기 처리
        const results = await processConsentUploadSync(unionId, stageId, data);

        return NextResponse.json({
            successCount: results.successCount,
            failCount: results.failCount,
            errors: results.errors,
        });
    } catch (error) {
        console.error('동의 업로드 오류:', error);
        return NextResponse.json(
            { error: '동의 업로드 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

// 동기 처리 함수
async function processConsentUploadSync(
    unionId: string,
    stageId: string,
    data: ConsentUploadRow[]
) {
    let successCount = 0;
    let failCount = 0;
    const errors: { row: number; message: string }[] = [];

    for (const row of data) {
        try {
            // 조합원 찾기 (이름 + 주소로 매칭)
            let query = supabase
                .from('users')
                .select('id')
                .eq('union_id', unionId)
                .eq('user_status', 'APPROVED')
                .ilike('name', row.name.trim());

            // 주소로 필터
            if (row.address) {
                query = query.or(
                    `property_address.ilike.%${row.address}%,property_address_jibun.ilike.%${row.address}%`
                );
            }

            // 동/호로 추가 필터
            if (row.dong) {
                query = query.ilike('property_dong', `%${row.dong}%`);
            }
            if (row.ho) {
                query = query.ilike('property_ho', `%${row.ho}%`);
            }

            const { data: members, error: searchError } = await query.limit(1);

            if (searchError || !members || members.length === 0) {
                errors.push({ row: row.rowNumber, message: `조합원을 찾을 수 없습니다: ${row.name}` });
                failCount++;
                continue;
            }

            const memberId = members[0].id;
            const status = row.status.toUpperCase() === 'AGREED' ? 'AGREED' : 'DISAGREED';

            // 동의 상태 upsert
            const { error: upsertError } = await supabase
                .from('user_consents')
                .upsert(
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

            if (upsertError) {
                errors.push({ row: row.rowNumber, message: `동의 처리 실패: ${upsertError.message}` });
                failCount++;
            } else {
                successCount++;
            }
        } catch (error) {
            errors.push({ row: row.rowNumber, message: `처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}` });
            failCount++;
        }
    }

    return { successCount, failCount, errors };
}

// 비동기 처리 함수 (폴백용)
async function processConsentUpload(
    jobId: string,
    unionId: string,
    stageId: string,
    data: ConsentUploadRow[]
) {
    let successCount = 0;
    let failCount = 0;
    const total = data.length;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        try {
            // 조합원 찾기
            let query = supabase
                .from('users')
                .select('id')
                .eq('union_id', unionId)
                .eq('user_status', 'APPROVED')
                .ilike('name', row.name.trim());

            if (row.address) {
                query = query.or(
                    `property_address.ilike.%${row.address}%,property_address_jibun.ilike.%${row.address}%`
                );
            }

            const { data: members } = await query.limit(1);

            if (!members || members.length === 0) {
                failCount++;
                continue;
            }

            const memberId = members[0].id;
            const status = row.status.toUpperCase() === 'AGREED' ? 'AGREED' : 'DISAGREED';

            const { error: upsertError } = await supabase
                .from('user_consents')
                .upsert(
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

            if (upsertError) {
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
            await supabase
                .from('sync_jobs')
                .update({ progress })
                .eq('id', jobId);
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
