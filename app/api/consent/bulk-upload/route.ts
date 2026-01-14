import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// 대량 처리 기준 (이 이상이면 비동기 처리)
const ASYNC_THRESHOLD = 50;

// 알림톡 프록시 서버 URL
const ALIMTALK_PROXY_URL = process.env.ALIMTALK_PROXY_URL || 'http://localhost:3005';

interface ConsentUploadRow {
    rowNumber: number;
    name: string;
    address: string;
    dong?: string;
    ho?: string;
    status: string;
}

// 동의 상태 파싱 헬퍼 함수: 한글/영문 모두 지원
function parseConsentStatus(statusStr: string): 'AGREED' | 'DISAGREED' {
    const normalizedStatus = statusStr?.toString().trim().toUpperCase();
    // 동의: "동의", "AGREED" 허용
    if (normalizedStatus === 'AGREED' || normalizedStatus === '동의') {
        return 'AGREED';
    }
    // 비동의: "비동의", "DISAGREED" 허용 (기본값)
    return 'DISAGREED';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { unionId, stageId, data } = body;

        // 유효성 검사
        if (!unionId || !stageId || !data) {
            return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }

        if (!Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: '처리할 데이터가 없습니다.' }, { status: 400 });
        }

        // 대량 데이터는 비동기 처리
        if (data.length >= ASYNC_THRESHOLD) {
            // sync_jobs에 작업 생성
            const { data: job, error: jobError } = await supabase
                .from('sync_jobs')
                .insert({
                    union_id: unionId,
                    job_type: 'CONSENT_UPLOAD',
                    status: 'PROCESSING',
                    progress: 0,
                    is_published: true, // 동의서 업로드는 배포 불필요
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
                return NextResponse.json({ error: '작업 생성 실패' }, { status: 500 });
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
        return NextResponse.json({ error: '동의 업로드 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

// 동기 처리 함수
async function processConsentUploadSync(unionId: string, stageId: string, data: ConsentUploadRow[]) {
    let successCount = 0;
    let failCount = 0;
    const errors: { row: number; message: string }[] = [];

    for (const row of data) {
        try {
            // 조합원 찾기 (이름으로 1차 필터) - 승인 + 사전등록 조합원 모두 포함
            // 스키마 변경으로 property_address_jibun, property_dong, property_ho는 user_property_units에만 존재
            let query = supabase
                .from('users')
                .select(`
                    id,
                    property_address,
                    user_property_units!left(property_address_jibun, dong, ho)
                `)
                .eq('union_id', unionId)
                .in('user_status', ['APPROVED', 'PRE_REGISTERED'])
                .ilike('name', row.name.trim());

            // 주소로 필터 (users.property_address로만 1차 필터)
            if (row.address) {
                query = query.ilike('property_address', `%${row.address}%`);
            }

            const { data: members, error: searchError } = await query;

            if (searchError || !members || members.length === 0) {
                errors.push({ row: row.rowNumber, message: `조합원을 찾을 수 없습니다: ${row.name}` });
                failCount++;
                continue;
            }

            // 2차 필터: 주소, 동/호 상세 매칭 (user_property_units 기준)
            type UserWithPropertyUnits = {
                id: string;
                property_address: string | null;
                user_property_units: { property_address_jibun: string | null; dong: string | null; ho: string | null }[] | null;
            };

            let matchedMember: UserWithPropertyUnits | null = null;
            for (const member of members as UserWithPropertyUnits[]) {
                const propertyUnits = member.user_property_units || [];

                // 주소, 동, 호 조건이 모두 없으면 첫 번째 조합원 매칭
                if (!row.address && !row.dong && !row.ho) {
                    matchedMember = member;
                    break;
                }

                // 상세 물건지 정보가 없으면 users.property_address로만 매칭
                if (propertyUnits.length === 0) {
                    if (row.address && member.property_address?.includes(row.address)) {
                        matchedMember = member;
                        break;
                    }
                    continue;
                }

                // user_property_units에서 주소, 동, 호 매칭
                for (const unit of propertyUnits) {
                    let addressMatch = true;
                    let dongMatch = true;
                    let hoMatch = true;

                    // 주소 매칭 (property_address_jibun 또는 users.property_address)
                    if (row.address) {
                        addressMatch = (unit.property_address_jibun?.includes(row.address) ?? false) ||
                                       (member.property_address?.includes(row.address) ?? false);
                    }

                    // 동 매칭
                    if (row.dong) {
                        dongMatch = unit.dong?.toLowerCase().includes(row.dong.toLowerCase()) ?? false;
                    }

                    // 호 매칭
                    if (row.ho) {
                        hoMatch = unit.ho?.toLowerCase().includes(row.ho.toLowerCase()) ?? false;
                    }

                    if (addressMatch && dongMatch && hoMatch) {
                        matchedMember = member;
                        break;
                    }
                }

                if (matchedMember) break;
            }

            if (!matchedMember) {
                errors.push({ row: row.rowNumber, message: `조합원을 찾을 수 없습니다: ${row.name}` });
                failCount++;
                continue;
            }

            const memberId = matchedMember.id;
            // 한글/영문 동의 상태 파싱
            const status = parseConsentStatus(row.status);

            // 동의 상태 upsert
            const { error: upsertError } = await supabase.from('user_consents').upsert(
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
            errors.push({
                row: row.rowNumber,
                message: `처리 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
            });
            failCount++;
        }
    }

    return { successCount, failCount, errors };
}

// 비동기 처리 함수 (폴백용)
async function processConsentUpload(jobId: string, unionId: string, stageId: string, data: ConsentUploadRow[]) {
    let successCount = 0;
    let failCount = 0;
    const total = data.length;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        try {
            // 조합원 찾기 - 승인 + 사전등록 조합원 모두 포함
            // 스키마 변경으로 property_address_jibun, property_dong, property_ho는 user_property_units에만 존재
            let query = supabase
                .from('users')
                .select(`
                    id,
                    property_address,
                    user_property_units!left(property_address_jibun, dong, ho)
                `)
                .eq('union_id', unionId)
                .in('user_status', ['APPROVED', 'PRE_REGISTERED'])
                .ilike('name', row.name.trim());

            // 주소로 필터 (users.property_address로만 1차 필터)
            if (row.address) {
                query = query.ilike('property_address', `%${row.address}%`);
            }

            const { data: members } = await query;

            if (!members || members.length === 0) {
                failCount++;
                continue;
            }

            // 2차 필터: 주소, 동/호 상세 매칭 (user_property_units 기준)
            type UserWithPropertyUnits = {
                id: string;
                property_address: string | null;
                user_property_units: { property_address_jibun: string | null; dong: string | null; ho: string | null }[] | null;
            };

            let matchedMember: UserWithPropertyUnits | null = null;
            for (const member of members as UserWithPropertyUnits[]) {
                const propertyUnits = member.user_property_units || [];

                // 주소, 동, 호 조건이 모두 없으면 첫 번째 조합원 매칭
                if (!row.address && !row.dong && !row.ho) {
                    matchedMember = member;
                    break;
                }

                // 상세 물건지 정보가 없으면 users.property_address로만 매칭
                if (propertyUnits.length === 0) {
                    if (row.address && member.property_address?.includes(row.address)) {
                        matchedMember = member;
                        break;
                    }
                    continue;
                }

                // user_property_units에서 주소, 동, 호 매칭
                for (const unit of propertyUnits) {
                    let addressMatch = true;
                    let dongMatch = true;
                    let hoMatch = true;

                    if (row.address) {
                        addressMatch = (unit.property_address_jibun?.includes(row.address) ?? false) ||
                                       (member.property_address?.includes(row.address) ?? false);
                    }
                    if (row.dong) {
                        dongMatch = unit.dong?.toLowerCase().includes(row.dong.toLowerCase()) ?? false;
                    }
                    if (row.ho) {
                        hoMatch = unit.ho?.toLowerCase().includes(row.ho.toLowerCase()) ?? false;
                    }

                    if (addressMatch && dongMatch && hoMatch) {
                        matchedMember = member;
                        break;
                    }
                }

                if (matchedMember) break;
            }

            if (!matchedMember) {
                failCount++;
                continue;
            }

            const memberId = matchedMember.id;
            // 한글/영문 동의 상태 파싱
            const status = parseConsentStatus(row.status);

            const { error: upsertError } = await supabase.from('user_consents').upsert(
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
