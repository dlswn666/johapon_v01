import { Metadata } from 'next';
import { tenantStore, type TenantInfo } from '@/shared/store/tenantStore';

/**
 * 테넌트별 메타데이터 생성 함수
 */
export async function generateTenantMetadata(
    slug: string,
    pageTitle?: string,
    pageDescription?: string
): Promise<Metadata> {
    try {
        // 테넌트 정보 조회 (스토어에서 우선 확인)
        let tenantInfo = tenantStore.get(slug);

        if (!tenantInfo) {
            tenantInfo = await tenantStore.getOrFetchBySlug(slug);
        }

        if (!tenantInfo) {
            return {
                title: '조합을 찾을 수 없습니다',
                description: '요청하신 조합 정보를 찾을 수 없습니다.',
            };
        }

        const tenantName = tenantInfo.name || tenantInfo.homepage;
        const tenantAddress = tenantInfo.address || '';

        // 페이지별 제목과 설명 설정
        const title = pageTitle ? `${pageTitle} - ${tenantName}` : tenantName;
        const description = pageDescription || `${tenantName} 정비사업조합 공식 홈페이지입니다. ${tenantAddress}`;

        return {
            title,
            description,
            keywords: [tenantName, pageTitle, '정비사업', '재개발', '재건축', '조합', tenantAddress].filter(
                Boolean
            ) as string[],
            openGraph: {
                title,
                description,
                type: 'website',
                locale: 'ko_KR',
                siteName: tenantName,
            },
            twitter: {
                card: 'summary',
                title,
                description,
            },
        };
    } catch (error) {
        console.error('[TENANT_METADATA] Failed to generate metadata:', error);
        return {
            title: pageTitle || '조합 정보 로드 중 오류',
            description: pageDescription || '조합 정보를 불러오는 중 오류가 발생했습니다.',
        };
    }
}

/**
 * 공지사항 페이지용 메타데이터
 */
export async function generateAnnouncementsMetadata(slug: string): Promise<Metadata> {
    return generateTenantMetadata(slug, '공지사항', '조합의 주요 공지사항과 안내사항을 확인하세요.');
}

/**
 * Q&A 페이지용 메타데이터
 */
export async function generateQnAMetadata(slug: string): Promise<Metadata> {
    return generateTenantMetadata(slug, 'Q&A', '조합원들의 궁금한 점을 질문하고 답변을 받아보세요.');
}

/**
 * 커뮤니티 페이지용 메타데이터
 */
export async function generateCommunityMetadata(slug: string): Promise<Metadata> {
    return generateTenantMetadata(slug, '커뮤니티', '조합원들과 정보를 공유하고 소통하세요.');
}

/**
 * 사무실 안내 페이지용 메타데이터
 */
export async function generateOfficeMetadata(slug: string): Promise<Metadata> {
    return generateTenantMetadata(slug, '사무실 안내', '조합 사무실 위치 및 연락처 정보를 확인하세요.');
}
