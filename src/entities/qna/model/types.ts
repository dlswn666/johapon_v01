// Q&A 테이블 스키마에 맞는 타입 정의
export interface DbQnA {
    id: string; // UUID
    union_id: string | null;
    category_id: string | null;
    subcategory_id: string | null;
    title: string;
    content: string;
    is_secret: boolean; // 비밀글 여부
    is_anonymous: boolean; // 익명글 여부
    is_answered: boolean; // 답변 완료 여부
    answer_content: string | null; // 관리자 답변 내용
    answered_at: string | null; // 답변 일시
    answered_by: string | null; // 답변한 관리자 UUID
    view_count: number; // 조회수
    created_at: string; // ISO timestamp
    created_by: string | null; // 작성자 UUID
    updated_at: string | null;
    updated_by: string | null; // 수정자 UUID
    creator?: { name: string } | null; // 작성자 정보 (JOIN 결과)
    answerer?: { name: string } | null; // 답변자 정보 (JOIN 결과)
}

// 카테고리 정보를 포함한 확장 타입
export interface DbQnAWithCategory extends DbQnA {
    category_name?: string | null;
    category_key?: string | null;
    subcategory_name?: string | null;
    author_name?: string | null; // 작성자 이름
    answerer_name?: string | null; // 답변자 이름
}

// 프론트엔드에서 사용할 Q&A 타입
export interface QnAItem {
    id: string;
    title: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD 형식
    category: string;
    views: number;
    isSecret: boolean;
    isAnswered: boolean;
    answerContent?: string | null;
    answeredAt?: string | null;
    answererName?: string | null;
    subcategory_id?: string;
}

// Q&A 상세 정보 타입
export interface QnADetail extends QnAItem {
    created_at: string;
    updated_at?: string | null;
    author_name?: string;
    created_by?: string | null;
}

// Q&A 생성 요청 타입
export interface QnACreateData {
    title: string;
    content: string;
    subcategory_id: string;
    is_secret?: boolean;
}

// Q&A 수정 요청 타입
export interface QnAUpdateData {
    title?: string;
    content?: string;
    subcategory_id?: string;
    is_secret?: boolean;
}

// Q&A 답변 요청 타입
export interface QnAAnswerData {
    answer_content: string;
}

// API 응답 타입
export interface QnAApiResponse {
    items: DbQnAWithCategory[];
    page: number;
    page_size: number;
    total: number;
}

// API 래퍼 응답 타입 (success/data 구조)
export interface QnAApiWrapperResponse {
    success: boolean;
    data: QnAApiResponse;
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
