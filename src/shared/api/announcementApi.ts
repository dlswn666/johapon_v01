import type {
    AnnouncementItem,
    AnnouncementDetail,
    AnnouncementCreateData,
    AnnouncementUpdateData,
    CategoryOption,
    DbAnnouncementWithCategory,
} from '@/entities/announcement/model/types';

interface Subcategory {
    id: string;
    name: string;
    category_key: string;
}

interface FetchAnnouncementsParams {
    slug: string;
    page: number;
    pageSize: number;
    categoryKey?: string;
    subcategoryId?: string;
    searchTerm?: string;
    popupOnly?: boolean;
    isUrgent?: boolean;
    isPinned?: boolean;
    popup?: boolean;
    alrimtalkSent?: boolean;
}

interface FetchAnnouncementsResponse {
    items: AnnouncementItem[];
    total: number;
    hasMore: boolean;
}

// 데이터 변환 함수
function transformDbAnnouncementToItem(announcement: DbAnnouncementWithCategory): AnnouncementItem {
    let contentText = announcement.content;
    try {
        const parsed = JSON.parse(announcement.content);
        if (Array.isArray(parsed)) {
            contentText = parsed
                .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                .join('')
                .trim();
        }
    } catch {
        contentText = announcement.content;
    }

    contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

    return {
        id: announcement.id,
        title: announcement.title,
        content: contentText,
        author: `${announcement.creator?.name || announcement.author_name || '관리자'}님`,
        date: new Date(announcement.created_at).toISOString().split('T')[0],
        category: announcement.subcategory_name || announcement.category_name || '일반공지',
        views: announcement.view_count || 0,
        isPinned: announcement.is_pinned || false,
        isUrgent: announcement.is_urgent || false,
        priority: announcement.priority || 0,
        popup: announcement.popup || false,
        publishedAt: announcement.published_at || undefined,
        expiresAt: announcement.expires_at || undefined,
        alrimtalkSent: announcement.alrimtalk_sent || false,
        alrimtalkSentAt: announcement.alrimtalk_sent_at || undefined,
        subcategory_id: announcement.subcategory_id || undefined,
    };
}

function transformDbAnnouncementToDetail(announcement: DbAnnouncementWithCategory): AnnouncementDetail {
    const item = transformDbAnnouncementToItem(announcement);
    return {
        ...item,
        content: announcement.content, // 상세에서는 원본 컨텐츠 사용
        created_at: announcement.created_at,
        updated_at: announcement.updated_at || undefined,
        author_name: announcement.creator?.name
            ? `${announcement.creator.name}님`
            : announcement.author_name
            ? `${announcement.author_name}님`
            : undefined,
        // 수정 API용 필드들
        published_at: announcement.published_at || undefined,
        expires_at: announcement.expires_at || undefined,
        is_urgent: announcement.is_urgent,
        is_pinned: announcement.is_pinned,
    };
}

export const announcementApi = {
    // 공지사항 목록 조회
    async fetchAnnouncements(params: FetchAnnouncementsParams): Promise<FetchAnnouncementsResponse> {
        const { slug, page, pageSize, categoryKey, subcategoryId, searchTerm, popupOnly, isUrgent, isPinned, popup, alrimtalkSent } = params;
        
        const queryParams = new URLSearchParams({
            page: String(page),
            page_size: String(pageSize),
        });

        if (categoryKey && categoryKey !== 'all') {
            queryParams.set('category_key', categoryKey);
        }
        if (subcategoryId) {
            queryParams.set('subcategory_id', subcategoryId);
        }
        if (popupOnly) {
            queryParams.set('popup', 'true');
        }
        if (popup !== undefined) {
            queryParams.set('popup', String(popup));
        }
        if (isUrgent !== undefined) {
            queryParams.set('is_urgent', String(isUrgent));
        }
        if (isPinned !== undefined) {
            queryParams.set('is_pinned', String(isPinned));
        }
        if (alrimtalkSent !== undefined) {
            queryParams.set('alrimtalk_sent', String(alrimtalkSent));
        }
        if (searchTerm) {
            queryParams.set('search', searchTerm);
        }

        const response = await fetch(`/api/tenant/${slug}/notices?${queryParams}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `API 호출 실패 (${response.status})`
            );
        }

        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.error?.message || 'API 호출이 실패했습니다.');
        }

        const data = responseData.data;
        if (!data || !Array.isArray(data.items)) {
            throw new Error('API 응답 데이터 형식이 올바르지 않습니다.');
        }

        const transformedAnnouncements = data.items.map(transformDbAnnouncementToItem);

        return {
            items: transformedAnnouncements,
            total: data.total,
            hasMore: data.items.length === pageSize,
        };
    },

    // 공지사항 상세 조회
    async fetchAnnouncementDetail(slug: string, id: string): Promise<AnnouncementDetail> {
        const response = await fetch(`/api/tenant/${slug}/notices/${id}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message ||
                errorData.message ||
                `공지사항을 찾을 수 없습니다. (${response.status})`
            );
        }

        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.error?.message || '공지사항을 불러올 수 없습니다.');
        }

        return transformDbAnnouncementToDetail(responseData.data);
    },

    // 공지사항 생성
    async createAnnouncement(
        slug: string,
        data: AnnouncementCreateData & { sendNotification: boolean }
    ): Promise<{ success: boolean; id?: string; message: string; notificationSent?: boolean }> {
        const response = await fetch(`/api/tenant/${slug}/notices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer temp-token', // 임시 토큰
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `등록에 실패했습니다. (${response.status})`
            );
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '공지사항 등록에 실패했습니다.');
        }

        return {
            success: true,
            id: result.data.id,
            message: '공지사항이 성공적으로 등록되었습니다.',
            notificationSent: result.data.notification_sent,
        };
    },

    // 공지사항 수정
    async updateAnnouncement(
        slug: string,
        id: string,
        data: AnnouncementUpdateData
    ): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/tenant/${slug}/notices/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer temp-token', // 임시 토큰
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `수정에 실패했습니다. (${response.status})`
            );
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '공지사항 수정에 실패했습니다.');
        }

        return {
            success: true,
            message: '공지사항이 성공적으로 수정되었습니다.',
        };
    },

    // 공지사항 삭제
    async deleteAnnouncement(slug: string, id: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/tenant/${slug}/notices/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer temp-token', // 임시 토큰
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `삭제에 실패했습니다. (${response.status})`
            );
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '공지사항 삭제에 실패했습니다.');
        }

        return {
            success: true,
            message: '공지사항이 성공적으로 삭제되었습니다.',
        };
    },

    // 메타데이터 조회
    async fetchMetadata(slug: string): Promise<{ categories: CategoryOption[]; subcategories: Subcategory[] }> {
        const response = await fetch(`/api/tenant/${slug}/meta`);

        if (!response.ok) {
            throw new Error(`메타데이터를 불러올 수 없습니다. (${response.status})`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || '메타데이터 로딩 실패');
        }

        // 공지사항 카테고리만 필터링
        const noticeCategories = data.data?.categories?.filter((cat: any) => cat.key === 'notice') || [];

        // 공지사항 서브카테고리만 필터링
        const noticeSubcategories =
            data.data?.subcategories?.filter((sub: any) => sub.category_key === 'notice') || [];

        // CategoryOption 형식으로 변환
        const categoryOptions: CategoryOption[] = noticeCategories.map((cat: any) => ({
            key: cat.key,
            name: cat.name,
            count: 0, // 카운트는 별도 API에서 가져와야 함
        }));

        return {
            categories: categoryOptions,
            subcategories: noticeSubcategories,
        };
    },
};