// 자유게시판 테이블 스키마에 맞는 타입 정의
export interface DbCommunityPost {
    id: string; // UUID
    union_id: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    title: string;
    content: string;
    view_count: number; // 조회수
    like_count: number; // 좋아요 수
    comment_count: number; // 댓글 수
    is_anonymous: boolean; // 익명 작성 여부
    created_at: string; // ISO timestamp
    created_by: string | null; // 작성자 UUID
    updated_at: string | null;
    updated_by: string | null; // 수정자 UUID
    creator?: { name: string } | null; // 작성자 정보 (JOIN 결과)
}

// 카테고리 정보를 포함한 확장 타입
export interface DbCommunityPostWithCategory extends DbCommunityPost {
    category_name?: string | null;
    category_key?: string | null;
    subcategory_name?: string | null;
    author_name?: string | null; // 작성자 이름
}

// 프론트엔드에서 사용할 자유게시판 타입
export interface CommunityPostItem {
    id: string;
    title: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD 형식
    category: string;
    views: number;
    likes: number;
    comments: number;
    isAnonymous: boolean;
    subcategory_id?: string;
}

// 자유게시판 상세 정보 타입
export interface CommunityPostDetail extends CommunityPostItem {
    created_at: string;
    updated_at?: string | null;
    author_name?: string;
    created_by?: string | null;
}

// 자유게시판 생성 요청 타입
export interface CommunityPostCreateData {
    title: string;
    content: string;
    subcategory_id: string;
    is_anonymous?: boolean;
}

// 자유게시판 수정 요청 타입
export interface CommunityPostUpdateData {
    title?: string;
    content?: string;
    subcategory_id?: string;
    is_anonymous?: boolean;
}

// API 응답 타입
export interface CommunityPostApiResponse {
    items: DbCommunityPostWithCategory[];
    page: number;
    page_size: number;
    total: number;
}

// API 래퍼 응답 타입 (success/data 구조)
export interface CommunityPostApiWrapperResponse {
    success: boolean;
    data: CommunityPostApiResponse;
    error?: {
        code: string;
        message: string;
    };
}

// 카테고리 옵션 타입
export interface CategoryOption {
    id: string;
    key: string;
    name: string;
    count?: number;
}
