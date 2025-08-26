import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
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

interface QnAState {
    // 상태
    qnaList: QnAItem[];
    currentQnA: QnADetail | null;
    categories: CategoryOption[];
    subcategories: Subcategory[];
    loading: boolean;
    error: string | null;
    total: number;
    hasMore: boolean;
    page: number;
    pageSize: number;
    filters: {
        categoryKey?: string;
        subcategoryId?: string;
        searchTerm?: string;
        isAnswered?: boolean;
        isSecret?: boolean;
    };

    // 액션
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setQnAList: (qnaList: QnAItem[]) => void;
    addQnAList: (qnaList: QnAItem[]) => void;
    setCurrentQnA: (qna: QnADetail | null) => void;
    setCategories: (categories: CategoryOption[]) => void;
    setSubcategories: (subcategories: Subcategory[]) => void;
    setTotal: (total: number) => void;
    setHasMore: (hasMore: boolean) => void;
    setPage: (page: number) => void;
    setFilters: (filters: Partial<QnAState['filters']>) => void;
    resetState: () => void;

    // API 호출 액션
    fetchQnAList: (slug: string, reset?: boolean) => Promise<void>;
    fetchQnADetail: (slug: string, id: string) => Promise<void>;
    createQnA: (slug: string, data: QnACreateData) => Promise<{ success: boolean; id?: string; message: string }>;
    updateQnA: (slug: string, id: string, data: QnAUpdateData) => Promise<{ success: boolean; message: string }>;
    answerQnA: (slug: string, id: string, data: QnAAnswerData) => Promise<{ success: boolean; message: string }>;
    deleteQnA: (slug: string, id: string) => Promise<{ success: boolean; message: string }>;
    fetchMetadata: (slug: string) => Promise<void>;
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
        author: qna.is_anonymous ? '익명' : qna.author_name || qna.created_by || '작성자',
        date: new Date(qna.created_at).toISOString().split('T')[0],
        category: qna.subcategory_name || qna.category_name || 'Q&A',
        views: qna.view_count || 0,
        isSecret: qna.is_secret || false,
        isAnswered: qna.is_answered || false,
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
        author_name: qna.author_name || undefined,
        created_by: qna.created_by || undefined,
    };
}

export const useQnAStore = create<QnAState>()(
    devtools(
        (set, get) => ({
            // 초기 상태
            qnaList: [],
            currentQnA: null,
            categories: [],
            subcategories: [],
            loading: false,
            error: null,
            total: 0,
            hasMore: false,
            page: 1,
            pageSize: 10,
            filters: {},

            // 기본 액션
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setQnAList: (qnaList) => set({ qnaList }),
            addQnAList: (newQnAList) =>
                set((state) => ({
                    qnaList: [...state.qnaList, ...newQnAList],
                })),
            setCurrentQnA: (qna) => set({ currentQnA: qna }),
            setCategories: (categories) => set({ categories }),
            setSubcategories: (subcategories) => set({ subcategories }),
            setTotal: (total) => set({ total }),
            setHasMore: (hasMore) => set({ hasMore }),
            setPage: (page) => set({ page }),
            setFilters: (filters) =>
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                })),
            resetState: () =>
                set({
                    qnaList: [],
                    currentQnA: null,
                    loading: false,
                    error: null,
                    total: 0,
                    hasMore: false,
                    page: 1,
                    filters: {},
                }),

            // API 호출 액션
            fetchQnAList: async (slug: string, reset = false) => {
                const { page, pageSize, filters } = get();
                const currentPage = reset ? 1 : page;

                set({ loading: true, error: null });

                try {
                    const queryParams = new URLSearchParams({
                        page: String(currentPage),
                        page_size: String(pageSize),
                    });

                    if (filters.categoryKey && filters.categoryKey !== 'all') {
                        queryParams.set('category_key', filters.categoryKey);
                    }
                    if (filters.subcategoryId) {
                        queryParams.set('subcategory_id', filters.subcategoryId);
                    }
                    if (filters.searchTerm) {
                        queryParams.set('search', filters.searchTerm);
                    }
                    if (filters.isAnswered !== undefined) {
                        queryParams.set('is_answered', String(filters.isAnswered));
                    }
                    if (filters.isSecret !== undefined) {
                        queryParams.set('is_secret', String(filters.isSecret));
                    }

                    const response = await fetch(`/api/tenant/${slug}/qna?${queryParams}`);

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

                    const transformedQnAList = data.items.map(transformDbQnAToItem);

                    set((state) => ({
                        qnaList: reset ? transformedQnAList : [...state.qnaList, ...transformedQnAList],
                        total: data.total,
                        hasMore: data.items.length === pageSize,
                        page: currentPage + 1,
                        loading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            fetchQnADetail: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/qna/${id}`);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message ||
                                errorData.message ||
                                `Q&A를 찾을 수 없습니다. (${response.status})`
                        );
                    }

                    const responseData = await response.json();

                    if (!responseData.success) {
                        throw new Error(responseData.error?.message || 'Q&A를 불러올 수 없습니다.');
                    }

                    const qna = transformDbQnAToDetail(responseData.data);
                    set({ currentQnA: qna, loading: false });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Q&A를 불러올 수 없습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            createQnA: async (slug: string, data: QnACreateData) => {
                set({ loading: true, error: null });

                try {
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

                    set({ loading: false });

                    return {
                        success: true,
                        id: result.data.id,
                        message: 'Q&A가 성공적으로 등록되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Q&A 등록에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            updateQnA: async (slug: string, id: string, data: QnAUpdateData) => {
                set({ loading: true, error: null });

                try {
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

                    set({ loading: false });

                    return {
                        success: true,
                        message: 'Q&A가 성공적으로 수정되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Q&A 수정에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            answerQnA: async (slug: string, id: string, data: QnAAnswerData) => {
                set({ loading: true, error: null });

                try {
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
                            errorData.error?.message ||
                                errorData.message ||
                                `답변 등록에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '답변 등록에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: '답변이 성공적으로 등록되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '답변 등록에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            deleteQnA: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
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

                    set({ loading: false });

                    return {
                        success: true,
                        message: 'Q&A가 성공적으로 삭제되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Q&A 삭제에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            fetchMetadata: async (slug: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/meta`);

                    if (!response.ok) {
                        throw new Error(`메타데이터를 불러올 수 없습니다. (${response.status})`);
                    }

                    const data = await response.json();
                    if (!data.success) {
                        throw new Error(data.message || '메타데이터 로딩 실패');
                    }

                    // Q&A 서브카테고리만 필터링
                    const qnaSubcategories =
                        data.data?.subcategories?.filter((sub: any) => sub.category_key === 'qna') || [];

                    set({
                        subcategories: qnaSubcategories,
                        loading: false,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '메타데이터를 불러올 수 없습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },
        }),
        {
            name: 'qna-store',
        }
    )
);
