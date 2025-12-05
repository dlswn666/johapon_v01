export interface MockPost {
    id: string;
    title: string;
    author: string;
    date: string;
    content?: string; // 주요 공지에만
}

export const mockGeneralPosts: MockPost[] = [
    {
        id: '1',
        title: '12월 조합비 납부 안내',
        author: '재무팀',
        date: '2024.11.28',
    },
    {
        id: '2',
        title: '건축 심의 결과 공지',
        author: '조합 사무국',
        date: '2024.11.25',
    },
    {
        id: '3',
        title: '주차장 배치 계획 설명회 개최',
        author: '기획팀',
        date: '2024.11.20',
    },
];

export const mockQuestions: MockPost[] = [
    {
        id: 'q1',
        title: '재개발 사업 진행 일정 문의',
        author: '조합원 A',
        date: '2024.11.30',
    },
    {
        id: 'q2',
        title: '이전 비용 지원 범위에 대해',
        author: '조합원 B',
        date: '2024.11.28',
    },
    {
        id: 'q3',
        title: '신규 입주 예정일 확인',
        author: '조합원 C',
        date: '2024.11.25',
    },
];

