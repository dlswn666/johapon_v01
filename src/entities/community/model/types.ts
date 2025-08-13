export type CommunityCategory = '일반토론' | '정보공유' | '모임후기' | '공지' | '질문답변' | '건의사항';

export interface CommunityPost {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string; // YYYY-MM-DD
    category: CommunityCategory;
    views?: number;
    likes?: number;
    comments?: number;
    isLiked?: boolean;
    createdAt?: string; // ISO string
    attachments?: AttachedFile[];
}

export interface AttachedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    url?: string;
}
