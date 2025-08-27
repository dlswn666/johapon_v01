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

interface FetchCommunityPostsParams {
    slug: string;
    page: number;
    pageSize: number;
    categoryKey?: string;
    subcategoryId?: string;
    searchTerm?: string;
    isAnonymous?: boolean;
}

interface FetchCommunityPostsResponse {
    items: CommunityPostItem[];
    total: number;
    hasMore: boolean;
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
        author: post.is_anonymous ? '익명님' : `${post.creator?.name || post.author_name || '작성자'}님`,
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
        author_name: post.is_anonymous
            ? '익명님'
            : post.creator?.name
            ? `${post.creator.name}님`
            : post.author_name
            ? `${post.author_name}님`
            : undefined,
        is_anonymous: post.is_anonymous,
    };
}

export const communityApi = {
    // 게시글 목록 조회
    async fetchPosts(params: FetchCommunityPostsParams): Promise<FetchCommunityPostsResponse> {
        const { slug, page, pageSize, categoryKey, subcategoryId, searchTerm, isAnonymous } = params;

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
        if (isAnonymous !== undefined) {
            queryParams.set('is_anonymous', String(isAnonymous));
        }

        const response = await fetch(`/api/tenant/${slug}/community?${queryParams}`);

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

        const transformedPosts = data.items.map(transformDbCommunityPostToItem);

        return {
            items: transformedPosts,
            total: data.total,
            hasMore: data.items.length === pageSize,
        };
    },

    // 게시글 상세 조회
    async fetchPostDetail(slug: string, id: string): Promise<CommunityPostDetail> {
        const response = await fetch(`/api/tenant/${slug}/community/${id}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `게시글을 찾을 수 없습니다. (${response.status})`
            );
        }

        const responseData = await response.json();

        if (!responseData.success) {
            throw new Error(responseData.error?.message || '게시글을 불러올 수 없습니다.');
        }

        return transformDbCommunityPostToDetail(responseData.data);
    },

    // 게시글 생성
    async createPost(
        slug: string,
        data: CommunityPostCreateData
    ): Promise<{ success: boolean; id?: string; message: string }> {
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

        return {
            success: true,
            id: result.data.id,
            message: '게시글이 성공적으로 등록되었습니다.',
        };
    },

    // 게시글 수정
    async updatePost(
        slug: string,
        id: string,
        data: CommunityPostUpdateData
    ): Promise<{ success: boolean; message: string }> {
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

        return {
            success: true,
            message: '게시글이 성공적으로 수정되었습니다.',
        };
    },

    // 게시글 삭제
    async deletePost(slug: string, id: string): Promise<{ success: boolean; message: string }> {
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

        return {
            success: true,
            message: '게시글이 성공적으로 삭제되었습니다.',
        };
    },

    // 게시글 좋아요
    async likePost(slug: string, id: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`/api/tenant/${slug}/community/${id}/like`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer temp-token', // 임시 토큰
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.error?.message || errorData.message || `좋아요 처리에 실패했습니다. (${response.status})`
            );
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error?.message || '좋아요 처리에 실패했습니다.');
        }

        return {
            success: true,
            message: result.message || '좋아요 처리되었습니다.',
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

        // 커뮤니티 카테고리만 필터링
        const communityCategories = data.data?.categories?.filter((cat: any) => cat.key === 'community') || [];

        // 커뮤니티 서브카테고리만 필터링
        const communitySubcategories =
            data.data?.subcategories?.filter((sub: any) => sub.category_key === 'community') || [];

        // CategoryOption 형식으로 변환
        const categoryOptions: CategoryOption[] = communityCategories.map((cat: any) => ({
            key: cat.key,
            name: cat.name,
            count: 0, // 카운트는 별도 API에서 가져와야 함
        }));

        return {
            categories: categoryOptions,
            subcategories: communitySubcategories,
        };
    },
};