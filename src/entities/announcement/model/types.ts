// 새로운 announcements 테이블 스키마에 맞는 타입 정의
export interface DbAnnouncement {
    id: string; // UUID
    union_id: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    title: string;
    content: string;
    popup: boolean;
    priority: number; // 우선순위 (높을수록 상위 노출)
    is_urgent: boolean; // 긴급 공지사항 여부
    is_pinned: boolean; // 상단 고정 여부
    published_at: string | null; // 게시 시작일
    expires_at: string | null; // 게시 종료일
    view_count: number; // 조회수
    alrimtalk_sent: boolean; // 알림톡 발송 여부
    alrimtalk_sent_at: string | null; // 알림톡 발송 일시
    created_at: string; // ISO timestamp
    created_by: string | null; // 작성자 (관리자만)
    updated_at: string | null;
    updated_by: string | null;
}

// 카테고리 정보를 포함한 확장 타입
export interface DbAnnouncementWithCategory extends DbAnnouncement {
    category_name?: string | null;
    category_key?: string | null;
    subcategory_name?: string | null;
    author_name?: string | null; // 작성자 이름
}

// 기존 posts 테이블 타입 (호환성 유지)
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

// 카테고리 정보를 포함한 확장 타입 (기존 호환성)
export interface DbPostWithCategory extends DbPost {
    category_name?: string | null;
    category_key?: string | null;
    subcategory_name?: string | null;
}

// API 응답 타입
export interface AnnouncementApiResponse {
    items: DbAnnouncementWithCategory[];
    page: number;
    page_size: number;
    total: number;
}

// API 래퍼 응답 타입 (success/data 구조)
export interface AnnouncementApiWrapperResponse {
    success: boolean;
    data: AnnouncementApiResponse;
    error?: {
        code: string;
        message: string;
    };
}

// 프론트엔드에서 사용할 공지사항 타입
export interface AnnouncementItem {
    id: string;
    title: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD 형식으로 변환
    category: string;
    views: number;
    isPinned: boolean;
    isUrgent: boolean; // 긴급 공지사항 여부
    priority: number; // 우선순위
    popup: boolean; // 팝업 여부
    publishedAt?: string | null; // 게시 시작일
    expiresAt?: string | null; // 게시 종료일
    alrimtalkSent: boolean; // 알림톡 발송 여부
    alrimtalkSentAt?: string | null; // 알림톡 발송 일시
    subcategory_id?: string; // 서브카테고리 ID
}

// 공지사항 상세 정보 타입
export interface AnnouncementDetail extends AnnouncementItem {
    content: string;
    created_at: string;
    updated_at?: string | null;
    author_name?: string;
    sendNotification?: boolean; // 알림톡 발송 여부 (UI용)
    // AnnouncementItem에서 상속받지만 명시적으로 추가 (타입 안전성을 위해)
    priority: number;
    isUrgent: boolean;
    isPinned: boolean;
    publishedAt?: string | null;
    expiresAt?: string | null;
    // 수정 API용 필드들
    published_at?: string | null;
    expires_at?: string | null;
    is_urgent?: boolean;
    is_pinned?: boolean;
}

// 공지사항 생성 요청 타입
export interface AnnouncementCreateData {
    title: string;
    content: string;
    subcategory_id: string;
    popup: boolean;
    priority?: number;
    is_urgent?: boolean;
    is_pinned?: boolean;
    published_at?: string | null;
    expires_at?: string | null;
    sendNotification?: boolean; // 알림톡 발송 여부
}

// 공지사항 수정 요청 타입
export interface AnnouncementUpdateData {
    title?: string;
    content?: string;
    subcategory_id?: string;
    popup?: boolean;
    priority?: number;
    is_urgent?: boolean;
    is_pinned?: boolean;
    published_at?: string | null;
    expires_at?: string | null;
}

// 카테고리 옵션 타입
export interface CategoryOption {
    id: string;
    key: string;
    name: string;
    count?: number;
}
