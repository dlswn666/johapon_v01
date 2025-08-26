import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
    CommunityPostItem,
    CommunityPostDetail,
    CommunityPostCreateData,
    CommunityPostUpdateData,
    CategoryOption,
    DbCommunityPostWithCategory,
} from '@/entities/community/model/types';

interface Subcategory {
    id: string;
    name: string;
    category_key: string;
}

interface CommunityState {
    // 상태
    posts: CommunityPostItem[];
    currentPost: CommunityPostDetail | null;
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
        isAnonymous?: boolean;
    };

    // 액션
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setPosts: (posts: CommunityPostItem[]) => void;
    addPosts: (posts: CommunityPostItem[]) => void;
    setCurrentPost: (post: CommunityPostDetail | null) => void;
    setCategories: (categories: CategoryOption[]) => void;
    setSubcategories: (subcategories: Subcategory[]) => void;
    setTotal: (total: number) => void;
    setHasMore: (hasMore: boolean) => void;
    setPage: (page: number) => void;
    setFilters: (filters: Partial<CommunityState['filters']>) => void;
    resetState: () => void;

    // API 호출 액션
    fetchPosts: (slug: string, reset?: boolean) => Promise<void>;
    fetchPostDetail: (slug: string, id: string) => Promise<void>;
    createPost: (
        slug: string,
        data: CommunityPostCreateData
    ) => Promise<{ success: boolean; id?: string; message: string }>;
    updatePost: (
        slug: string,
        id: string,
        data: CommunityPostUpdateData
    ) => Promise<{ success: boolean; message: string }>;
    deletePost: (slug: string, id: string) => Promise<{ success: boolean; message: string }>;
    likePost: (slug: string, id: string) => Promise<{ success: boolean; message: string }>;
    fetchMetadata: (slug: string) => Promise<void>;
}

// 데이터 변환 함수
function transformDbCommunityPostToItem(post: DbCommunityPostWithCategory): CommunityPostItem {
    let contentText = post.content;
    try {
        const parsed = JSON.parse(post.content);
        if (Array.isArray(parsed)) {
            contentText = parsed
                .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
                .join('')
                .trim();
        }
    } catch {
        contentText = post.content;
    }

    contentText = contentText.replace(/<[^>]*>/g, '').substring(0, 200);

    return {
        id: post.id,
        title: post.title,
        content: contentText,
        author: post.is_anonymous ? '익명' : post.author_name || post.created_by || '작성자',
        date: new Date(post.created_at).toISOString().split('T')[0],
        category: post.subcategory_name || post.category_name || '자유게시판',
        views: post.view_count || 0,
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        isAnonymous: post.is_anonymous || false,
        subcategory_id: post.subcategory_id || undefined,
    };
}

function transformDbCommunityPostToDetail(post: DbCommunityPostWithCategory): CommunityPostDetail {
    const item = transformDbCommunityPostToItem(post);
    return {
        ...item,
        content: post.content, // 상세에서는 원본 컨텐츠 사용
        created_at: post.created_at,
        updated_at: post.updated_at || undefined,
        author_name: post.author_name || undefined,
        created_by: post.created_by || undefined,
    };
}

export const useCommunityStore = create<CommunityState>()(
    devtools(
        (set, get) => ({
            // 초기 상태
            posts: [],
            currentPost: null,
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
            setPosts: (posts) => set({ posts }),
            addPosts: (newPosts) =>
                set((state) => ({
                    posts: [...state.posts, ...newPosts],
                })),
            setCurrentPost: (post) => set({ currentPost: post }),
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
                    posts: [],
                    currentPost: null,
                    loading: false,
                    error: null,
                    total: 0,
                    hasMore: false,
                    page: 1,
                    filters: {},
                }),

            // API 호출 액션
            fetchPosts: async (slug: string, reset = false) => {
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
                    if (filters.isAnonymous !== undefined) {
                        queryParams.set('is_anonymous', String(filters.isAnonymous));
                    }

                    const response = await fetch(`/api/tenant/${slug}/community?${queryParams}`);

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

                    const transformedPosts = data.items.map(transformDbCommunityPostToItem);

                    set((state) => ({
                        posts: reset ? transformedPosts : [...state.posts, ...transformedPosts],
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

            fetchPostDetail: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/community/${id}`);

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message ||
                                errorData.message ||
                                `게시글을 찾을 수 없습니다. (${response.status})`
                        );
                    }

                    const responseData = await response.json();

                    if (!responseData.success) {
                        throw new Error(responseData.error?.message || '게시글을 불러올 수 없습니다.');
                    }

                    const post = transformDbCommunityPostToDetail(responseData.data);
                    set({ currentPost: post, loading: false });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '게시글을 불러올 수 없습니다.';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            createPost: async (slug: string, data: CommunityPostCreateData) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/community`, {
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
                        throw new Error(result.error?.message || '게시글 등록에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        id: result.data.id,
                        message: '게시글이 성공적으로 등록되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '게시글 등록에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            updatePost: async (slug: string, id: string, data: CommunityPostUpdateData) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/community/${id}`, {
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
                        throw new Error(result.error?.message || '게시글 수정에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: '게시글이 성공적으로 수정되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '게시글 수정에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            deletePost: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/community/${id}`, {
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
                        throw new Error(result.error?.message || '게시글 삭제에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: '게시글이 성공적으로 삭제되었습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '게시글 삭제에 실패했습니다.';
                    set({ loading: false, error: errorMessage });
                    return {
                        success: false,
                        message: errorMessage,
                    };
                }
            },

            likePost: async (slug: string, id: string) => {
                set({ loading: true, error: null });

                try {
                    const response = await fetch(`/api/tenant/${slug}/community/${id}/like`, {
                        method: 'POST',
                        headers: {
                            Authorization: 'Bearer temp-token', // 임시 토큰
                        },
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(
                            errorData.error?.message ||
                                errorData.message ||
                                `좋아요 처리에 실패했습니다. (${response.status})`
                        );
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error?.message || '좋아요 처리에 실패했습니다.');
                    }

                    set({ loading: false });

                    return {
                        success: true,
                        message: result.data.liked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.',
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '좋아요 처리에 실패했습니다.';
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

                    // 자유게시판 서브카테고리만 필터링
                    const communitySubcategories =
                        data.data?.subcategories?.filter((sub: any) => sub.category_key === 'community') || [];

                    set({
                        subcategories: communitySubcategories,
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
            name: 'community-store',
        }
    )
);
