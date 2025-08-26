// 메뉴 아이템 타입
export interface MenuItem {
    id: string;
    label: string;
    href?: string;
    subItems?: SubMenuItem[];
    icon?: string;
}

export interface SubMenuItem {
    id: string;
    label: string;
    href: string;
    action?: () => void;
}

// 사용자 프로필 타입
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'member';
    avatar?: string;
}

// 공지사항 타입
export interface Announcement {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string;
    category: '중요공지' | '일반공지';
    views?: number;
}

// Q&A 타입
export interface QnA {
    id: number;
    title: string;
    content: string;
    author: string;
    date: string;
    status: 'pending' | 'answered';
    answer?: string;
    answerDate?: string;
}

// 커뮤니티 게시글 타입은 entities/community/model/types.ts에서 import
export type { CommunityPostItem } from '../entities/community/model/types';

// 통계 정보 타입
export interface Stats {
    visitors: number;
    members: number;
    area: string;
    phase: string;
    consentRate: number;
}

// 협력업체 타입
export interface Partner {
    id: number;
    name: string;
    description: string;
    logo?: string;
}

// 배너 광고 타입
export interface Banner {
    id: number;
    image: string;
    title: string;
    subtitle: string;
    link?: string;
}

// 바로가기 링크 타입
export interface Shortcut {
    id: string;
    title: string;
    icon: string;
    href: string;
    color: string;
}

// Footer 정보 타입
export interface FooterInfo {
    associationName: string;
    associationSubtitle: string;
    contact: {
        phone: string;
        email: string;
        address: string;
    };
    business: {
        businessPhone: string;
        webmasterEmail: string;
    };
}

// 조직도 멤버 타입
export interface OrgMember {
    id: string;
    name: string;
    position: string;
    level: number;
    department?: string;
    parentId?: string;
}

export interface CommunityCategory {
    id: string;
    name: string;
}
