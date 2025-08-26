// 댓글 테이블 스키마에 맞는 타입 정의
export interface DbComment {
    id: string; // UUID
    union_id: string | null;
    target_table: string; // 'announcements', 'qna', 'community_posts'
    target_id: string; // 대상 게시글 ID
    parent_id: string | null; // 대댓글의 경우 부모 댓글 ID
    content: string;
    is_anonymous: boolean; // 익명 댓글 여부
    created_at: string; // ISO timestamp
    created_by: string | null; // 작성자 UUID
    updated_at: string | null;
    updated_by: string | null; // 수정자 UUID
    creator?: { name: string } | null; // 작성자 정보 (JOIN 결과)
}

// 작성자 정보를 포함한 확장 타입
export interface DbCommentWithAuthor extends DbComment {
    author_name?: string | null; // 작성자 이름
}

// 프론트엔드에서 사용할 댓글 타입
export interface CommentItem {
    id: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD 형식
    isAnonymous: boolean;
    parentId?: string | null;
    replies?: CommentItem[]; // 대댓글들
    created_by?: string | null;
}

// 댓글 상세 정보 타입
export interface CommentDetail extends CommentItem {
    created_at: string;
    updated_at?: string | null;
    author_name?: string;
}

// 댓글 생성 요청 타입
export interface CommentCreateData {
    target_table: string;
    target_id: string;
    content: string;
    parent_id?: string | null;
    is_anonymous?: boolean;
}

// 댓글 수정 요청 타입
export interface CommentUpdateData {
    content: string;
    is_anonymous?: boolean;
}

// API 응답 타입
export interface CommentApiResponse {
    items: DbCommentWithAuthor[];
    page: number;
    page_size: number;
    total: number;
}

// API 래퍼 응답 타입 (success/data 구조)
export interface CommentApiWrapperResponse {
    success: boolean;
    data: CommentApiResponse;
    error?: {
        code: string;
        message: string;
    };
}
