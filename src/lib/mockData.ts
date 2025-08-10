import {
    MenuItem,
    Announcement,
    QnA,
    CommunityPost,
    Stats,
    Partner,
    Banner,
    Shortcut,
    FooterInfo,
    OrgMember,
} from './types';

// 메뉴 데이터
export const menuItems: MenuItem[] = [
    {
        id: 'association',
        label: '조합소개',
        subItems: [
            {
                id: 'association-greeting',
                label: '조합장 인사',
                href: '/chairman-greeting',
            },
            {
                id: 'association-business',
                label: '사무실 안내',
                href: '/office',
            },
            {
                id: 'association-org',
                label: '조직도',
                href: '/organization-chart',
            },
        ],
    },
    {
        id: 'redevelopment',
        label: '재개발 소개',
        subItems: [
            {
                id: 'redevelopment-process',
                label: '재개발 진행 과정',
                href: '/redevelopment-process',
            },
            {
                id: 'redevelopment-info',
                label: '재개발 정보',
                href: '/redevelopment',
            },
        ],
    },
    {
        id: 'community',
        label: '커뮤니티',
        subItems: [
            {
                id: 'community-announcements',
                label: '공지사항',
                href: '/announcements',
            },
            {
                id: 'community-qna',
                label: 'Q&A',
                href: '/qna',
            },
            {
                id: 'community-share',
                label: '정보공유방',
                href: '/community',
            },
        ],
    },
];

// 관리자 메뉴 (조건부 추가)
export const adminMenuItems: MenuItem[] = [
    {
        id: 'admin',
        label: '관리자',
        subItems: [
            {
                id: 'admin-homepage',
                label: '홈페이지 관리',
                href: '/admin/homepage-management',
            },
            {
                id: 'admin-business',
                label: '슬라이드 관리',
                href: '/admin',
            },
            {
                id: 'admin-banner',
                label: '광고 업체 관리',
                href: '/admin/ad-list',
            },
            {
                id: 'admin-schedule',
                label: '알림톡 관리',
                href: '/admin',
            },
            {
                id: 'admin-users',
                label: '사용자 관리',
                href: '/admin',
            },
            {
                id: 'admin-settings',
                label: '기본정보 관리',
                href: '/admin',
            },
        ],
    },
];

// 공지사항 샘플 데이터
export const sampleAnnouncements: Announcement[] = [
    {
        id: 1,
        title: '톡시그처법가책에 대한 안내공지',
        content:
            '톡시그처법가책에 대한 상세한 안내사항을 공지드립니다. 조합원 여러분께서는 관련 내용을 숙지하시어 불편함이 없도록 하시기 바랍니다. 자세한 사항은 조합사무실로 문의해 주시기 바랍니다. 추가적으로 이번 안내사항은 모든 조합원분들께 매우 중요한 내용이므로 반드시 숙지하시어 향후 진행될 재개발 사업에 차질이 없도록 협조해 주시기 바랍니다. 관련 문서는 조합 사무실에서 직접 수령하실 수 있으며, 온라인으로도 확인이 가능합니다.',
        author: '관리자',
        date: '2025-04-21',
        category: '중요공지',
    },
    {
        id: 2,
        title: '[문영캘리] 2025년 3월 31일 기준 운영캘리 참여',
        content: '문영캘리 운영캘리 참여에 관한 안내입니다.',
        author: '관리자',
        date: '2025-04-21',
        category: '일반공지',
    },
    {
        id: 3,
        title: '서울시 신육아파트 공급 가족이 불척업으로 시각됩니다.',
        content: '서울시 신육아파트 공급 관련 안내사항입니다.',
        author: '관리자',
        date: '2025-04-21',
        category: '일반공지',
    },
    {
        id: 4,
        title: '코로나 19 역학 희망 균등사회 확하지 모집 광고 (2023-03-31)',
        content: '코로나19 관련 모집 광고 안내입니다.',
        author: '관리자',
        date: '2025-04-21',
        category: '일반공지',
    },
    {
        id: 5,
        title: '2025년 재개발 일정 안내',
        content: '2025년 재개발 추진 일정에 대해 안내드립니다.',
        author: '관리자',
        date: '2025-04-20',
        category: '일반공지',
    },
];

// Q&A 샘플 데이터
export const sampleQnAList: QnA[] = [
    {
        id: 1,
        title: '재개발 완료 시기는 언제인가요?',
        content:
            '재개발 완료 예정 시기에 대해 문의드립니다. 현재 진행 상황을 보면 언제쯤 완료될 것인지 구체적인 일정을 알고 싶습니다. 또한 완료 후 입주 예정일과 관련된 세부 사항도 함께 안내해 주시면 감사하겠습니다. 주변 재개발 지역의 사례를 보면 보통 몇 년 정도 소요되는지도 궁금합니다. 가족들과 함께 향후 계획을 세우기 위해 정확한 정보가 필요한 상황입니다.',
        author: '김조합원',
        date: '2025-04-21',
        status: 'pending',
    },
    {
        id: 2,
        title: '임시거주지 지원 관련 질문',
        content: '임시거주지 지원 방법에 대해 궁금합니다.',
        author: '이회원',
        date: '2025-04-20',
        status: 'answered',
        answer: '임시거주지 지원에 대해 답변드립니다. 조합에서 임시거주지 지원 프로그램을 운영하고 있으며, 자세한 사항은 사무실로 문의해 주시기 바랍니다.',
        answerDate: '2025-04-21',
    },
    {
        id: 3,
        title: '조합비 납부 방법 문의',
        content: '조합비 납부 방법에 대해 알고 싶습니다.',
        author: '박조합원',
        date: '2025-04-19',
        status: 'answered',
        answer: '조합비는 매월 1일부터 10일까지 납부 가능합니다. 온라인 뱅킹, 자동이체, 현금 납부 등 다양한 방법으로 납부하실 수 있습니다.',
        answerDate: '2025-04-20',
    },
];

// 커뮤니티 게시글 샘플 데이터
export const sampleCommunityPosts: CommunityPost[] = [
    {
        id: 1,
        title: '새로운 재개발 계획에 대한 의견 나눔',
        content:
            '조합원 여러분들과 함께 새로운 재개발 계획에 대해 토론하고 의견을 나누고 싶습니다. 많은 참여 부탁드립니다. 최근 발표된 새로운 계획안을 검토해보니 이전 계획과 비교했을 때 여러 가지 개선점이 있는 것 같습니다. 특히 공용시설 배치나 교통 접근성 부분에서 눈에 띄는 변화가 있어 조합원분들의 다양한 의견을 듣고 싶습니다. 건설적인 토론을 통해 더 나은 방향으로 발전시켜 나갈 수 있기를 기대합니다.',
        author: '김조합원',
        date: '2025-01-21',
        category: '일반토론',
    },
    {
        id: 2,
        title: '주변 개발 현황 정보 공유',
        content: '인근 지역의 재개발 진행 상황과 시세 변동 등 유용한 정보를 공유합니다.',
        author: '이정보',
        date: '2025-01-20',
        category: '정보공유',
    },
    {
        id: 3,
        title: '조합원 모임 후기',
        content: '지난 주말 조합원 모임에서 나눈 이야기들을 정리해서 공유드립니다.',
        author: '박회원',
        date: '2025-01-19',
        category: '모임후기',
    },
    {
        id: 4,
        title: '재개발 관련 법령 변경사항',
        content: '최근 변경된 재개발 관련 법령과 규정에 대해 알려드립니다.',
        author: '관리자',
        date: '2025-01-18',
        category: '공지',
    },
];

// 통계 데이터
export const statsData: Stats = {
    visitors: 2252,
    members: 1089,
    area: '1,025.20m²',
    phase: 'step 2',
    consentRate: 58,
};

// 협력업체 데이터
export const samplePartners: Partner[] = [
    {
        id: 1,
        name: '현대건설',
        description: '시공사 - 우수한 품질과 기술력',
    },
    {
        id: 2,
        name: '삼성물산',
        description: '건설부문 - 혁신적인 설계와 시공',
    },
    {
        id: 3,
        name: '대우건설',
        description: '종합건설 - 안전하고 견고한 시공',
    },
    {
        id: 4,
        name: '롯데건설',
        description: '주택사업 - 고품질 주거공간 제공',
    },
    {
        id: 5,
        name: '포스코건설',
        description: '철강기반 건설 - 첨단 기술 적용',
    },
];

// 배너 광고 데이터
export const bannerData: Banner[] = [
    {
        id: 1,
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&h=200&fit=crop',
        title: '현대건설',
        subtitle: '건축자재 Sale',
    },
    {
        id: 2,
        image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=300&h=200&fit=crop',
        title: '삼성물산',
        subtitle: '프리미엄 건축 서비스',
    },
    {
        id: 3,
        image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=300&h=200&fit=crop',
        title: '대우건설',
        subtitle: '안전한 시공 보장',
    },
    {
        id: 4,
        image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=300&h=200&fit=crop',
        title: '롯데건설',
        subtitle: '고품질 주거공간',
    },
    {
        id: 5,
        image: 'https://images.unsplash.com/photo-1626178793926-22b28830aa30?w=300&h=200&fit=crop',
        title: '포스코건설',
        subtitle: '첨단 기술 적용',
    },
];

// 바로가기 링크 데이터
export const shortcutData: Shortcut[] = [
    {
        id: 'naver-cafe',
        title: '네이버카페 바로가기',
        icon: 'N',
        href: '#',
        color: 'green',
    },
    {
        id: 'youtube',
        title: '유튜브 채널',
        icon: 'play',
        href: '#',
        color: 'red',
    },
    {
        id: 'kakao-talk',
        title: '카카오톡 단체방',
        icon: 'message-circle',
        href: '#',
        color: 'yellow',
    },
    {
        id: 'official-website',
        title: '공식 홈페이지',
        icon: 'globe',
        href: '#',
        color: 'blue',
    },
];

// Footer 정보 데이터
export const footerInfo: FooterInfo = {
    associationName: '작전현대아파트구역',
    associationSubtitle: '주택재개발정비사업조합',
    contact: {
        phone: '032-221-4328',
        email: 'info@redevelopment.kr',
        address: '인천광역시 계양구 작전동 123-45',
    },
    business: {
        businessPhone: '032-221-4329',
        webmasterEmail: 'webmaster@redevelopment.kr',
    },
};

// 조직도 데이터
export const organizationData: OrgMember[] = [
    // Level 1 - 조합장
    {
        id: '1',
        name: '김조합장',
        position: '조합장',
        level: 1,
    },
    // Level 2 - 부조합장
    {
        id: '2',
        name: '이부조합장',
        position: '부조합장',
        level: 2,
        parentId: '1',
    },
    // Level 3 - 사무직원
    {
        id: '3',
        name: '박사무장',
        position: '사무장',
        level: 3,
        parentId: '2',
        department: '사무실',
    },
    {
        id: '4',
        name: '최주무',
        position: '주무',
        level: 3,
        parentId: '2',
        department: '사무실',
    },
    {
        id: '5',
        name: '정서기',
        position: '서기',
        level: 3,
        parentId: '2',
        department: '사무실',
    },
];
