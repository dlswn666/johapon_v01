import type {
    QnAItem,
    QnADetail,
    QnACreateData,
    QnAUpdateData,
    QnAAnswerData,
    CategoryOption,
    DbQnAWithCategory,
} from '@/entities/qna/model/types';

interface Subcategory {
    id: string;
    name: string;
    category_key: string;
}

interface FetchQnAListParams {
    slug: string;
    page: number;
    pageSize: number;
    categoryKey?: string;
    subcategoryId?: string;
    searchTerm?: string;
    isAnswered?: boolean;
    isSecret?: boolean;
}

interface FetchQnAListResponse {
    items: QnAItem[];
    total: number;
    hasMore: boolean;
}

// 데이터 변환 함수
function transformDbQnAToItem(qna: DbQnAWithCategory): QnAItem {
    let contentText = qna.content;
    try {
        const parsed = JSON.parse(qna.content);
        if (Array.isArray(parsed)) {
            contentText = parsed
                .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                .join('')
                .trim();
        }
    } catch {
        contentText = qna.content;
    }

    contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

    return {
        id: qna.id,
        title: qna.title,
        content: contentText,
        author: qna.is_anonymous ? '익명님' : `${qna.creator?.name || qna.author_name || '작성자'}님`,
        date: new Date(qna.created_at).toISOString().split('T')[0],
        category: qna.subcategory_name || qna.category_name || 'Q&A',
        views: qna.view_count || 0,
        isSecret: qna.is_secret || false,
        isAnswered: qna.is_answered || false,
        isAnonymous: qna.is_anonymous || false,
        answerContent: qna.answer_content || undefined,
        answeredAt: qna.answered_at || undefined,
        answererName: qna.answerer_name || undefined,
        subcategory_id: qna.subcategory_id || undefined,
    };
}

function transformDbQnAToDetail(qna: DbQnAWithCategory): QnADetail {
    const item = transformDbQnAToItem(qna);
    return {
        ...item,
        content: qna.content, // 상세에서는 원본 컨텐츠 사용
        created_at: qna.created_at,
        updated_at: qna.updated_at || undefined,
        author_name: qna.is_anonymous
            ? '익명님'
            : qna.creator?.name
            ? `${qna.creator.name}님`
            : qna.author_name
            ? `${qna.author_name}님`
            : undefined,
        is_anonymous: qna.is_anonymous,
        is_secret: qna.is_secret,
        is_answered: qna.is_answered,
    };
}

export const qnaApi = {
    // Q&A 목록 조회
    async fetchQnAList(params: FetchQnAListParams): Promise<FetchQnAListResponse> {
        const { slug, page, pageSize, categoryKey, subcategoryId, searchTerm, isAnswered, isSecret } = params;

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
        if (searchTerm) {
            queryParams.set('search', searchTerm);
        }
        if (isAnswered !== undefined) {
            queryParams.set('is_answered', String(isAnswered));
        }
        if (isSecret !== undefined) {
            queryParams.set('is_secret', String(isSecret));
        }

        const response = await fetch(`/api/tenant/${slug}/qna?${queryParams}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || errorData.message || `API 호출 실패 (${response.status})`);
        }

        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.error?.message || 'API 호출이 실패했습니다.');
        }

        const data = responseData.data;
        if (!data || !Array.isArray(data.items)) {
            throw new Error('API 응답 데이터 형식이 올바르지 않습니다.');
        }

        const transformedQnAList = data.items.map(transformDbQnAToItem);

        return {
            items: transformedQnAList,
            total: data.total,
            hasMore: data.items.length === pageSize,
        };
    },

    // Q&A 상세 조회
    async fetchQnADetail(slug: string, id: string): Promise<QnADetail> {
        const response = await fetch(`/api/tenant/${slug}/qna/${id}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `Q&A를 찾을 수 없습니다. (${response.status})`
            );
        }

        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.error?.message || 'Q&A를 불러올 수 없습니다.');
        }

        return transformDbQnAToDetail(responseData.data);
    },

    // Q&A 생성
    async createQnA(
        slug: string,
        data: QnACreateData
    ): Promise<{ success: boolean; id?: string; message: string }> {
        const response = await fetch(`/api/tenant/${slug}/qna`, {
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
            throw new Error(result.error?.message || 'Q&A 등록에 실패했습니다.');
        }

        return {
            success: true,
            id: result.data.id,
            message: 'Q&A가 성공적으로 등록되었습니다.',
        };
    },

    // Q&A 수정
    async updateQnA(slug: string, id: string, data: QnAUpdateData): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/tenant/${slug}/qna/${id}`, {
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
            throw new Error(result.error?.message || 'Q&A 수정에 실패했습니다.');
        }

        return {
            success: true,
            message: 'Q&A가 성공적으로 수정되었습니다.',
        };
    },

    // Q&A 답변
    async answerQnA(slug: string, id: string, data: QnAAnswerData): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/tenant/${slug}/qna/${id}/answer`, {
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
                errorData.error?.message || errorData.message || `답변 등록에 실패했습니다. (${response.status})`
            );
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '답변 등록에 실패했습니다.');
        }

        return {
            success: true,
            message: '답변이 성공적으로 등록되었습니다.',
        };
    },

    // Q&A 삭제
    async deleteQnA(slug: string, id: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/tenant/${slug}/qna/${id}`, {
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
            throw new Error(result.error?.message || 'Q&A 삭제에 실패했습니다.');
        }

        return {
            success: true,
            message: 'Q&A가 성공적으로 삭제되었습니다.',
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

        // Q&A 카테고리만 필터링
        const qnaCategories = data.data?.categories?.filter((cat: any) => cat.key === 'qna') || [];

        // Q&A 서브카테고리만 필터링
        const qnaSubcategories = data.data?.subcategories?.filter((sub: any) => sub.category_key === 'qna') || [];

        // CategoryOption 형식으로 변환
        const categoryOptions: CategoryOption[] = qnaCategories.map((cat: any) => ({
            key: cat.key,
            name: cat.name,
            count: 0, // 카운트는 별도 API에서 가져와야 함
        }));

        return {
            categories: categoryOptions,
            subcategories: qnaSubcategories,
        };
    },
};