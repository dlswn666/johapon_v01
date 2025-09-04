import { NextRequest } from 'next/server';
import { getSupabaseClient } from '@/shared/lib/supabase';
import { ok, fail } from '@/shared/lib/api';
import { getTenantIdBySlug } from '@/shared/store/tenantStore';
import type { AdPlacement } from '@/entities/advertisement/model/types';

// 기본 광고 이미지 - 로컬 SVG 파일 사용
const DEFAULT_AD_IMAGE = '/ad/default_ad.svg';

// Fisher-Yates 셔플 알고리즘
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 기본 광고 생성
function createDefaultAd(index: number, placement: AdPlacement) {
    return {
        id: `default-${index}`,
        title: '광고 문의',
        partner_name: '조합 사무소',
        phone: '문의 바랍니다',
        thumbnail_url: DEFAULT_AD_IMAGE,
        detail_image_url: DEFAULT_AD_IMAGE,
        placement: placement,
        is_default: true,
    };
}

// GET /api/tenant/[slug]/ads - 테넌트별 광고 조회 (사이드/홈 배너용)
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const { searchParams } = new URL(request.url);
        const placement = searchParams.get('placement') as AdPlacement | null;
        const device = searchParams.get('device') as 'DESKTOP' | 'MOBILE' | null;

        if (!placement || !['SIDE', 'HOME'].includes(placement)) {
            return fail('VALIDATION_ERROR', '유효한 게재 위치(SIDE, HOME)를 지정해 주세요.', 400);
        }

        if (!device || !['DESKTOP', 'MOBILE'].includes(device)) {
            return fail('VALIDATION_ERROR', '유효한 디바이스(DESKTOP, MOBILE)를 지정해 주세요.', 400);
        }

        // 조합 ID 조회 (캐시 사용)
        console.log('[TENANT_ADS_API] Resolving unionId for slug:', slug);
        const unionId = await getTenantIdBySlug(slug);

        if (!unionId) {
            console.log('[TENANT_ADS_API] Union not found for slug:', slug);
            return fail('NOT_FOUND', '조합을 찾을 수 없습니다.', 404);
        }

        console.log('[TENANT_ADS_API] Found unionId:', unionId);
        const supabase = getSupabaseClient();
        const today = new Date().toISOString().split('T')[0];

        // 현재 유효한 광고 조회 (공통 광고 + 해당 조합 광고)
        let ads: any[] = [];
        let adsError: any = null;

        try {
            // 더 안전한 쿼리 방식: 단계별로 조회
            const result = await supabase
                .from('ads')
                .select(
                    `
                    id,
                    title,
                    partner_name,
                    phone,
                    thumbnail_url,
                    desktop_image_url,
                    mobile_image_url,
                    ad_placements(placement),
                    ad_contracts(
                        start_date,
                        end_date,
                        status
                    )
                `
                )
                .eq('is_active', true)
                .or(`union_id.is.null,union_id.eq.${unionId}`);

            ads = result.data || [];
            adsError = result.error;
        } catch (error) {
            console.error('[TENANT_ADS_API] Ads query exception:', error);
            // 테이블이 없거나 스키마 문제인 경우 빈 배열로 처리
            ads = [];
            adsError = null;
        }

        // 광고 조회 에러 처리
        if (adsError) {
            console.error('[TENANT_ADS_API] Ads query error:', adsError);
            return fail('DATABASE_ERROR', `광고 조회 실패: ${adsError.message}`, 500);
        }

        // 데이터 변환 및 필터링 (중복 제거 및 정리)
        const uniqueAds = new Map();

        (ads || []).forEach((ad: any) => {
            if (!uniqueAds.has(ad.id)) {
                // 게재 위치 확인
                const hasPlacement = ad.ad_placements?.some((p: any) => p.placement === placement);
                if (!hasPlacement) return;

                // 활성 계약 확인
                const hasActiveContract = ad.ad_contracts?.some(
                    (contract: any) =>
                        contract.status === 'ACTIVE' && contract.start_date <= today && contract.end_date >= today
                );
                if (!hasActiveContract) return;

                // 디바이스별 이미지 선택 (없으면 기본 이미지 사용)
                const deviceImageUrl =
                    device === 'DESKTOP'
                        ? ad.desktop_image_url || DEFAULT_AD_IMAGE
                        : ad.mobile_image_url || DEFAULT_AD_IMAGE;

                uniqueAds.set(ad.id, {
                    id: ad.id,
                    title: ad.title,
                    partner_name: ad.partner_name,
                    phone: ad.phone,
                    thumbnail_url: ad.thumbnail_url,
                    detail_image_url: deviceImageUrl, // 디바이스별 이미지 사용
                    placement: placement,
                    device: device,
                });
            }
        });

        // 시간 기반 순회 방식으로 공평한 노출 기회 제공
        const allAds = Array.from(uniqueAds.values());
        const maxSlots = placement === 'SIDE' ? 10 : 6;
        const displayCount = placement === 'SIDE' ? 1 : 6;

        // 실제 광고가 없는 경우 기본 광고만 반환
        if (allAds.length === 0) {
            console.log('[TENANT_ADS_API] No real ads found, returning default ads only');
            const defaultAds = [];
            for (let i = 0; i < displayCount; i++) {
                defaultAds.push(createDefaultAd(i, placement));
            }

            return ok({
                items: defaultAds,
                total: defaultAds.length,
                placement: placement,
                device: device,
                real_ads_count: 0,
                default_ads_count: defaultAds.length,
            });
        }

        // 실제 광고가 부족하면 기본 광고로 채우기
        const finalAds = [...allAds];
        for (let i = allAds.length; i < maxSlots; i++) {
            finalAds.push(createDefaultAd(i, placement));
        }

        // 랜덤 셔플링 (디바이스별로 독립적인 키 사용)
        const shuffledAds = shuffleArray(finalAds);

        // 시간 기반 순회: 매 10분마다 시작 인덱스가 변경되어 순회 (테넌트/디바이스별 독립)
        const now = new Date();
        const rotationInterval = 10; // 10분마다 순회
        const totalMinutes = now.getHours() * 60 + now.getMinutes();
        const rotationCycle = Math.floor(totalMinutes / rotationInterval);

        // slug/placement/device 조합으로 고유한 시드 생성
        const seedString = `${slug}-${placement}-${device}`;
        const hashSeed = seedString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const startIndex = (rotationCycle + hashSeed) % shuffledAds.length;

        // 시작 인덱스부터 순환하여 필요한 개수만큼 선택
        const result = [];
        for (let i = 0; i < displayCount; i++) {
            const index = (startIndex + i) % shuffledAds.length;
            result.push(shuffledAds[index]);
        }

        return ok({
            items: result,
            total: result.length,
            placement: placement,
            device: device,
            real_ads_count: allAds.length,
            default_ads_count: maxSlots - allAds.length,
        });
    } catch (error) {
        console.error('[TENANT_ADS_API] Exception in GET:', error);
        return fail('INTERNAL_ERROR', '서버 오류가 발생했습니다.', 500);
    }
}
