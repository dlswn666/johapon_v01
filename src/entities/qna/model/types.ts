export interface QnA {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD
    status: 'pending' | 'answered';
    answer?: string;
    answerDate?: string;
    category?: string;
    views?: number;
    author_id?: string;
    created_at?: string;
    answered_at?: string;
}

export interface QnAApiResponse {
    items: QnADbItem[];
    page: number;
    page_size: number;
    total: number;
}

export interface QnADbItem {
    id: number;
    title: string;
    content: string;
    author_id: string;
    status: 'pending' | 'answered';
    created_at: string;
    answered_at?: string;
    answer?: string;
}

export interface QnAItem {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string;
    category: string;
    status: 'pending' | 'answered';
    views: number;
    answer?: string;
    answeredBy?: string;
    answeredDate?: string;
}
