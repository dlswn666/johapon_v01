// 데이터베이스의 posts 테이블 스키마에 맞는 타입 정의
export interface DbPost {
    id: string; // UUID
    union_id: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    title: string;
    content: string;
    popup: boolean;
    created_at: string; // ISO timestamp
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;
}

// 카테고리 정보를 포함한 확장 타입
export interface DbPostWithCategory extends DbPost {
    category_name?: string | null;
    category_key?: string | null;
    subcategory_name?: string | null;
}

// API 응답 타입
export interface AnnouncementApiResponse {
    items: DbPostWithCategory[];
    page: number;
    page_size: number;
    total: number;
}

// 프론트엔드에서 사용할 공지사항 타입 (기존 컴포넌트 호환성 유지)
export interface AnnouncementItem {
    id: string; // UUID에서 string으로 변경
    title: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD 형식으로 변환
    category: string;
    views: number;
    isPinned: boolean;
}

// 카테고리 옵션 타입
export interface CategoryOption {
    id: string;
    key: string;
    name: string;
    count?: number;
}
