import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail, requireAuth } from '@/shared/lib/api';
import type { Ad, AdUpdateData, DbAdWithPlacements, DbAdPlacement } from '@/entities/advertisement/model/types';

// 광고가 사이드 광고인지 확인하는 헬퍼 함수
async function checkIfSideAd(supabase: any, adId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('ad_placements')
        .select('placement')
        .eq('ad_id', adId)
        .eq('placement', 'SIDE')
        .single();

    return !error && !!data;
}

// GET /api/admin/ads/[id] - 광고 상세 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const supabase = getSupabaseClient();

        const { data: ad, error } = await supabase
            .from('ads')
            .select(
                `
                *,
                placements:ad_placements(placement)
            `
            )
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return fail('NOT_FOUND', '광고를 찾을 수 없습니다.', 404);
            }
            console.error('[ADS_API] Database error:', error);
            return fail('DATABASE_ERROR', `데이터 조회 실패: ${error.message}`, 500);
        }

        // 데이터 변환
        const result: Ad = {
            id: ad.id,
            union_id: ad.union_id,
            title: ad.title,
            partner_name: ad.partner_name,
            phone: ad.phone,
            thumbnail_url: ad.thumbnail_url,
            detail_image_url: ad.detail_image_url,
            desktop_image_url: ad.desktop_image_url,
            mobile_image_url: ad.mobile_image_url,
            desktop_enabled: ad.desktop_enabled,
            mobile_enabled: ad.mobile_enabled,
            is_active: ad.is_active,
            created_at: ad.created_at,
            updated_at: ad.updated_at,
            placements: (ad.placements || []).map((p: DbAdPlacement) => p.placement),
        };

        return ok(result);
    } catch (error) {
        console.error('[ADS_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// PUT /api/admin/ads/[id] - 광고 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const data: AdUpdateData = await request.json();

        const supabase = getSupabaseClient();

        // 광고 존재 확인
        const { data: existingAd, error: checkError } = await supabase.from('ads').select('id').eq('id', id).single();

        if (checkError) {
            if (checkError.code === 'PGRST116') {
                return fail('NOT_FOUND', '광고를 찾을 수 없습니다.', 404);
            }
            return fail('DATABASE_ERROR', `광고 확인 실패: ${checkError.message}`, 500);
        }

        // 사이드 광고 10개 제한 검증 (활성화하려는 경우)
        if (data.is_active === true || (data.is_active === undefined && data.placements?.includes('SIDE'))) {
            // 현재 광고가 사이드 광고인지 확인
            const isSideAd =
                data.placements?.includes('SIDE') ||
                (data.placements === undefined && (await checkIfSideAd(supabase, id)));

            if (isSideAd) {
                // 먼저 SIDE 배치를 가진 광고 ID들을 조회
                const { data: sideAdIds, error: sideAdIdsError } = await supabase
                    .from('ad_placements')
                    .select('ad_id')
                    .eq('placement', 'SIDE');

                if (sideAdIdsError) {
                    console.error('[ADS_API] Error fetching side ad IDs:', sideAdIdsError);
                    return fail('DATABASE_ERROR', '사이드 광고 ID 조회 중 오류가 발생했습니다.', 500);
                }

                const sideAdIdArray = sideAdIds?.map((item) => item.ad_id) || [];

                if (sideAdIdArray.length > 0) {
                    const { count: activeSideAdsCount, error: countError } = await supabase
                        .from('ads')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_active', true)
                        .neq('id', id) // 현재 수정 중인 광고는 제외
                        .in('id', sideAdIdArray);

                    if (countError) {
                        console.error('[ADS_API] Error counting active side ads:', countError);
                        return fail('DATABASE_ERROR', '활성 광고 개수 확인 중 오류가 발생했습니다.', 500);
                    }

                    if ((activeSideAdsCount || 0) >= 10) {
                        return fail('VALIDATION_ERROR', '사이드 광고는 최대 10개까지만 활성화할 수 있습니다.', 400);
                    }
                }
            }
        }

        // 디바이스별 검증 (수정 시)
        if (data.desktop_enabled !== undefined || data.mobile_enabled !== undefined) {
            const hasDesktopEnabled = data.desktop_enabled !== false;
            const hasMobileEnabled = data.mobile_enabled !== false;

            if (!hasDesktopEnabled && !hasMobileEnabled) {
                return fail('VALIDATION_ERROR', '적어도 하나의 디바이스가 활성화되어야 합니다.', 400);
            }
        }

        // 광고 기본 정보 업데이트
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.partner_name !== undefined) updateData.partner_name = data.partner_name;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.thumbnail_url !== undefined) updateData.thumbnail_url = data.thumbnail_url;
        if (data.detail_image_url !== undefined) updateData.detail_image_url = data.detail_image_url;
        if (data.desktop_image_url !== undefined) updateData.desktop_image_url = data.desktop_image_url;
        if (data.mobile_image_url !== undefined) updateData.mobile_image_url = data.mobile_image_url;
        if (data.desktop_enabled !== undefined) updateData.desktop_enabled = data.desktop_enabled;
        if (data.mobile_enabled !== undefined) updateData.mobile_enabled = data.mobile_enabled;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

        if (Object.keys(updateData).length > 0) {
            updateData.updated_at = new Date().toISOString();

            const { error: updateError } = await supabase.from('ads').update(updateData).eq('id', id);

            if (updateError) {
                console.error('[ADS_API] Ad update error:', updateError);
                return fail('DATABASE_ERROR', `광고 수정 실패: ${updateError.message}`, 500);
            }
        }

        // 게재 위치 업데이트
        if (data.placements !== undefined) {
            if (data.placements.length === 0) {
                return fail('VALIDATION_ERROR', '최소 하나의 게재 위치를 선택해야 합니다.', 400);
            }

            // 기존 게재 위치 삭제
            const { error: deleteError } = await supabase.from('ad_placements').delete().eq('ad_id', id);

            if (deleteError) {
                console.error('[ADS_API] Placement delete error:', deleteError);
                return fail('DATABASE_ERROR', `게재 위치 삭제 실패: ${deleteError.message}`, 500);
            }

            // 새 게재 위치 생성
            const placementInserts = data.placements.map((placement) => ({
                ad_id: id,
                placement,
            }));

            const { error: insertError } = await supabase.from('ad_placements').insert(placementInserts);

            if (insertError) {
                console.error('[ADS_API] Placement insert error:', insertError);
                return fail('DATABASE_ERROR', `게재 위치 설정 실패: ${insertError.message}`, 500);
            }
        }

        return ok({ message: '광고가 성공적으로 수정되었습니다.' });
    } catch (error) {
        console.error('[ADS_API] Exception in PUT:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}

// DELETE /api/admin/ads/[id] - 광고 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = requireAuth(request);
        if (!auth) {
            return fail('UNAUTHORIZED', '인증이 필요합니다.', 401);
        }

        const { id } = await params;
        const supabase = getSupabaseClient();

        // 활성 계약이 있는지 확인
        const { data: activeContracts, error: contractCheckError } = await supabase
            .from('ad_contracts')
            .select('id')
            .eq('ad_id', id)
            .eq('status', 'ACTIVE');

        if (contractCheckError) {
            console.error('[ADS_API] Contract check error:', contractCheckError);
            return fail('DATABASE_ERROR', `계약 확인 실패: ${contractCheckError.message}`, 500);
        }

        if (activeContracts && activeContracts.length > 0) {
            return fail(
                'VALIDATION_ERROR',
                '활성 계약이 있는 광고는 삭제할 수 없습니다. 먼저 계약을 종료해 주세요.',
                400
            );
        }

        // 광고 삭제 (CASCADE로 관련 데이터 자동 삭제)
        const { error: deleteError } = await supabase.from('ads').delete().eq('id', id);

        if (deleteError) {
            console.error('[ADS_API] Delete error:', deleteError);
            return fail('DATABASE_ERROR', `광고 삭제 실패: ${deleteError.message}`, 500);
        }

        return ok({ message: '광고가 성공적으로 삭제되었습니다.' });
    } catch (error) {
        console.error('[ADS_API] Exception in DELETE:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
